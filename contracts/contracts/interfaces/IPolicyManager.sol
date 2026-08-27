// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IPolicyManager - 保单管理器接口（含风控参数）
interface IPolicyManager {
    enum PolicyTier { None, Basic, Advanced, Premium }

    struct MonthlyStats {
        uint256 month;
        uint256 claimCount;
        uint256 payoutTotal;
    }

    function getPolicyTier(address user) external view returns (PolicyTier);
    function isPolicyActive(address user) external view returns (bool);
    function wasPolicyActiveAt(address user, uint256 blockNum) external view returns (bool);
    function getMaxPayout(address user) external view returns (uint256);
    function getPayoutBps(address user) external view returns (uint256);
    function getPolicyInfo(address user) external view returns (PolicyTier, uint256, uint256, bool);
    function minHoldingsThreshold() external view returns (uint256);

    // 风控参数
    function waitingPeriod() external view returns (uint256);
    function deductibleBps() external view returns (uint256);
    function monthlyClaimLimit() external view returns (uint256);
    function monthlyPayoutLimit() external view returns (uint256);

    // 月度统计
    function getCurrentMonthlyStats(address user) external view returns (uint256, uint256, uint256);
    function canClaimThisMonth(address user) external view returns (bool, uint256, uint256);
    function recordClaim(address user, uint256 payoutAmount) external;
}
