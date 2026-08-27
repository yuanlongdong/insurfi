// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IPolicyManager - 保单管理器接口
interface IPolicyManager {
    enum PolicyTier { None, Basic, Advanced, Premium }

    function getPolicyTier(address user) external view returns (PolicyTier);
    function isPolicyActive(address user) external view returns (bool);
    function wasPolicyActiveAt(address user, uint256 blockNum) external view returns (bool);
    function getMaxPayout(address user) external view returns (uint256);
    function getPayoutBps(address user) external view returns (uint256);
    function getPolicyInfo(address user) external view returns (PolicyTier, uint256, uint256, bool);
    function minHoldingsThreshold() external view returns (uint256);
}
