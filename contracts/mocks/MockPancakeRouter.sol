// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockPancakeRouter
 * @notice Mock PancakeSwap router for testing. Returns predictable amounts.
 */
contract MockPancakeRouter {
    uint256 public constant RATE = 200; // 1 ETH = 200 token (for testing)
    address public WETH = address(0x1);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(msg.value > 0, "Mock: zero ETH");
        uint256 tokenOut = msg.value * RATE;
        require(tokenOut >= amountOutMin, "Mock: slippage");
        // Mint tokens to `to` by transferring from this contract's balance
        // In tests, pre-fund this mock contract with the token
        IERC20(path[path.length - 1]).transfer(to, tokenOut);
        amounts = new uint256[](2);
        amounts[0] = msg.value;
        amounts[1] = tokenOut;
        return amounts;
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(amountIn > 0, "Mock: zero amount");
        // Pull tokens from msg.sender (DEXRouter already approved)
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        uint256 ethOut = amountIn / RATE;
        require(ethOut >= amountOutMin, "Mock: slippage");
        require(address(this).balance >= ethOut, "Mock: no ETH");
        (bool success, ) = payable(to).call{value: ethOut}("");
        require(success, "Mock: ETH transfer failed");
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = ethOut;
        return amounts;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external pure returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i = 1; i < path.length; i++) {
            amounts[i] = amounts[i - 1] * RATE;
        }
        return amounts;
    }

    receive() external payable {}
}
