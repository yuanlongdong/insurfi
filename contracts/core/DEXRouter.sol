// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDEXRouter} from "../interfaces/IDEXRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DEXRouter
 * @notice Proxy router that executes trades through PancakeSwap, records every trade on-chain,
 *         and collects a small fee to fund the insurance pool.
 * @dev Users must trade through this contract to be eligible for insurance. Every swap is
 *      recorded with a unique tradeId, enabling LossVerifier to read trade data directly
 *      from storage (no historical log parsing needed).
 *      A configurable fee (default 0.1%) is deducted from every trade and sent to the
 *      insurance pool, creating a sustainable revenue stream for payouts.
 */
contract DEXRouter is IDEXRouter {
    using SafeERC20 for IERC20;

    address public owner;
    address public pancakeRouter;
    address public WETH;

    address public override insurancePool;
    uint256 public override feeBasisPoints; // fee in basis points (e.g. 10 = 0.1%)
    uint256 public override totalFeesCollected;

    uint256 public override tradeCount;
    mapping(uint256 => Trade) private _trades;
    mapping(address => uint256[]) private _userTrades;
    mapping(address => bool) public override isSupportedDEX;

    modifier onlyOwner() {
        require(msg.sender == owner, "DEXRouter: not owner");
        _;
    }

    constructor(address _pancakeRouter) {
        require(_pancakeRouter != address(0), "DEXRouter: zero router");
        owner = msg.sender;
        pancakeRouter = _pancakeRouter;
        isSupportedDEX[_pancakeRouter] = true;
        WETH = address(0); // resolved lazily
        feeBasisPoints = 10; // 0.1% default fee
    }

    /**
     * @notice Swap ETH for tokens through PancakeSwap, records the trade, collects fee.
     * @param amountOutMin Minimum token amount expected (slippage protection).
     * @param path Token path (e.g. [WETH, token]).
     * @param deadline Transaction deadline timestamp.
     * @return tradeId The unique ID of the recorded trade.
     */
    function swapETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable override returns (uint256 tradeId) {
        require(msg.value > 0, "DEXRouter: zero ETH");
        require(path.length >= 2, "DEXRouter: invalid path");
        require(deadline >= block.timestamp, "DEXRouter: expired");

        // Deduct fee from ETH amount, send to insurance pool
        uint256 fee = (msg.value * feeBasisPoints) / 10000;
        uint256 swapAmount = msg.value - fee;

        if (fee > 0 && insurancePool != address(0)) {
            (bool feeSuccess, ) = payable(insurancePool).call{value: fee}(
                abi.encodeWithSignature("depositFee()")
            );
            require(feeSuccess, "DEXRouter: fee transfer failed");
            totalFeesCollected += fee;
            emit FeeCollected(msg.sender, fee, block.timestamp);
        }

        uint256 amountOut = _swapExactETHForTokens(amountOutMin, path, deadline, swapAmount);
        tradeId = _recordTrade(msg.sender, path[0], path[path.length - 1], swapAmount, amountOut, true);
        return tradeId;
    }

    /**
     * @notice Swap tokens for ETH through PancakeSwap, records the trade, collects fee.
     * @param amountIn Token amount to sell.
     * @param amountOutMin Minimum ETH expected.
     * @param path Token path (e.g. [token, WETH]).
     * @param deadline Transaction deadline timestamp.
     * @return tradeId The unique ID of the recorded trade.
     */
    function swapTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external override returns (uint256 tradeId) {
        require(amountIn > 0, "DEXRouter: zero amount");
        require(path.length >= 2, "DEXRouter: invalid path");
        require(deadline >= block.timestamp, "DEXRouter: expired");

        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(path[0]).forceApprove(pancakeRouter, amountIn);

        // Swap to this contract first so we can deduct fee before sending to user
        uint256 amountOut = _swapExactTokensForETH(amountIn, amountOutMin, path, deadline);

        // Deduct fee from ETH received
        uint256 fee = (amountOut * feeBasisPoints) / 10000;
        uint256 userAmount = amountOut - fee;

        if (fee > 0 && insurancePool != address(0)) {
            (bool feeSuccess, ) = payable(insurancePool).call{value: fee}(
                abi.encodeWithSignature("depositFee()")
            );
            require(feeSuccess, "DEXRouter: fee transfer failed");
            totalFeesCollected += fee;
            emit FeeCollected(msg.sender, fee, block.timestamp);
        }

        // Send remaining ETH to user
        (bool userSuccess, ) = payable(msg.sender).call{value: userAmount}("");
        require(userSuccess, "DEXRouter: user transfer failed");

        tradeId = _recordTrade(msg.sender, path[0], path[path.length - 1], amountIn, amountOut, false);
        return tradeId;
    }

    function getTrade(uint256 tradeId) external view override returns (Trade memory) {
        require(tradeId > 0 && tradeId <= tradeCount, "DEXRouter: invalid tradeId");
        return _trades[tradeId];
    }

    function getUserTrades(address user) external view override returns (uint256[] memory) {
        return _userTrades[user];
    }

    function getUserTradeCount(address user) external view override returns (uint256) {
        return _userTrades[user].length;
    }

    function addSupportedDEX(address dex) external override onlyOwner {
        isSupportedDEX[dex] = true;
    }

    function removeSupportedDEX(address dex) external override onlyOwner {
        isSupportedDEX[dex] = false;
    }

    function setPancakeRouter(address router) external override onlyOwner {
        require(router != address(0), "DEXRouter: zero router");
        pancakeRouter = router;
        isSupportedDEX[router] = true;
    }

    function setInsurancePool(address pool) external override onlyOwner {
        insurancePool = pool;
    }

    function setFeeBasisPoints(uint256 bps) external override onlyOwner {
        require(bps <= 1000, "DEXRouter: fee > 1%");
        feeBasisPoints = bps;
    }

    // --- Internal ---

    function _recordTrade(
        address trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bool isBuy
    ) internal returns (uint256) {
        tradeCount++;
        uint256 id = tradeCount;
        _trades[id] = Trade({
            id: id,
            trader: trader,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            blockNumber: block.number,
            timestamp: block.timestamp,
            isBuy: isBuy
        });
        _userTrades[trader].push(id);
        emit TradeExecuted(id, trader, tokenIn, tokenOut, amountIn, amountOut, isBuy, block.timestamp);
        return id;
    }

    function _swapExactETHForTokens(
        uint256 amountOutMin,
        uint256 amountIn,
        address[] memory path,
        uint256 deadline
    ) internal returns (uint256) {
        (bool success, bytes memory data) = pancakeRouter.call{value: amountIn}(
            abi.encodeWithSignature(
                "swapExactETHForTokens(uint256,address[],address,uint256)",
                amountOutMin,
                path,
                msg.sender,
                deadline
            )
        );
        require(success, "DEXRouter: ETH swap failed");
        uint256[] memory amounts = abi.decode(data, (uint256[]));
        return amounts[amounts.length - 1];
    }

    function _swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        uint256 deadline
    ) internal returns (uint256) {
        (bool success, bytes memory data) = pancakeRouter.call(
            abi.encodeWithSignature(
                "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
                amountIn,
                amountOutMin,
                path,
                payable(address(this)),
                deadline
            )
        );
        require(success, "DEXRouter: token swap failed");
        uint256[] memory amounts = abi.decode(data, (uint256[]));
        return amounts[amounts.length - 1];
    }

    receive() external payable {}
}
