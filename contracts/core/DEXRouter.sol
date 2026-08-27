// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDEXRouter} from "./IDEXRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DEXRouter
 * @notice Proxy router that executes trades through PancakeSwap and records every trade on-chain.
 * @dev Users must trade through this contract to be eligible for insurance. Every swap is
 *      recorded with a unique tradeId, enabling LossVerifier to read trade data directly
 *      from storage (no historical log parsing needed).
 */
contract DEXRouter is IDEXRouter {
    using SafeERC20 for IERC20;

    address public owner;
    address public pancakeRouter;
    address public WETH;

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
        // WETH address will be set from router in setPancakeRouter or constructor fallback
        WETH = address(0); // resolved lazily
    }

    /**
     * @notice Swap ETH for tokens through PancakeSwap, records the trade.
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

        uint256 amountOut = _swapExactETHForTokens(amountOutMin, path, deadline);
        tradeId = _recordTrade(msg.sender, path[0], path[path.length - 1], msg.value, amountOut, true);
        return tradeId;
    }

    /**
     * @notice Swap tokens for ETH through PancakeSwap, records the trade.
     * @param amountIn Token amount to sell.
     * @param amountOutMin Minimum ETH expected.
     * @param path Token path (e.g. [token, WETH]).
     * @param deadline Transaction deadline.
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
        IERC20(path[0]).safeApprove(pancakeRouter, amountIn);

        uint256 amountOut = _swapExactTokensForETH(amountIn, amountOutMin, path, deadline);
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
        address[] memory path,
        uint256 deadline
    ) internal returns (uint256) {
        (bool success, bytes memory data) = pancakeRouter.call{value: msg.value}(
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
                payable(msg.sender),
                deadline
            )
        );
        require(success, "DEXRouter: token swap failed");
        uint256[] memory amounts = abi.decode(data, (uint256[]));
        uint256 ethOut = amounts[amounts.length - 1];
        // Forward ETH to user (PancakeRouter sends to `to` which is msg.sender)
        return ethOut;
    }

    receive() external payable {}
}
