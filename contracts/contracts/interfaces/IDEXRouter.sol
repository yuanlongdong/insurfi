// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IDEXRouter - DEX 交易代理接口
interface IDEXRouter {
    /// @notice 交易记录结构体
    struct TradeRecord {
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 timestamp;
        uint256 blockNumber;
        bytes32 txHash;
        bool isBuy;
        bool exists;
    }

    function getTradeRecord(uint256 tradeId) external view returns (TradeRecord memory);
    function getUserTradeCount(address user) external view returns (uint256);
    function getUserTradeId(address user, uint256 index) external view returns (uint256);
    function tradeCount() external view returns (uint256);
}
