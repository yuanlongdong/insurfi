// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDEXRouter {
    struct Trade {
        uint256 id;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 blockNumber;
        uint256 timestamp;
        bool isBuy;
    }

    function swapETHForTokens(uint256 amountOutMin, address[] calldata path, uint256 deadline) external payable returns (uint256 tradeId);
    function swapTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, uint256 deadline) external returns (uint256 tradeId);
    function getTrade(uint256 tradeId) external view returns (Trade memory);
    function getUserTrades(address user) external view returns (uint256[] memory);
    function getUserTradeCount(address user) external view returns (uint256);
    function tradeCount() external view returns (uint256);
    function isSupportedDEX(address dex) external view returns (bool);
    function insurancePool() external view returns (address);
    function feeBasisPoints() external view returns (uint256);
    function totalFeesCollected() external view returns (uint256);
    function addSupportedDEX(address dex) external;
    function removeSupportedDEX(address dex) external;
    function setPancakeRouter(address router) external;
    function setInsurancePool(address pool) external;
    function setFeeBasisPoints(uint256 bps) external;
    event TradeExecuted(uint256 indexed tradeId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool isBuy, uint256 timestamp);
    event FeeCollected(address indexed trader, uint256 fee, uint256 timestamp);
}
