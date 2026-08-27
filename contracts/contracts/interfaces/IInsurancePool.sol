// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IInsurancePool - 保险资金池接口
interface IInsurancePool {
    function payout(address to, uint256 amount, uint256 tradeId) external;
    function getPoolBalance() external view returns (uint256);
    function MAX_SINGLE_PAYOUT() external view returns (uint256);
    function totalPayouts() external view returns (uint256);
    function totalDeposits() external view returns (uint256);
    function maxPoolSize() external view returns (uint256);
}
