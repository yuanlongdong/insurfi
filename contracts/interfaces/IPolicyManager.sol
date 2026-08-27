// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPolicyManager {
    function getPolicyStatus(address user) external view returns (bool isActive, uint8 tier, uint256 coverageLimit);
    function isPolicyActiveAt(address user, uint256 blockNumber) external view returns (bool);
    function getCoverageLimit(address user) external view returns (uint256);
    function minHoldingThreshold() external view returns (uint256);
    function updatePolicyStatus(address user) external;
    function setMinHoldingThreshold(uint256 threshold) external;
    function setTiers(uint256[] calldata holdings, uint256[] calldata coverages) external;
    function getTierCount() external view returns (uint256);
    function getTierInfo(uint8 tier) external view returns (uint256 minHolding, uint256 coverageLimit);
    event PolicyActivated(address indexed user, uint8 tier, uint256 coverageLimit);
    event PolicyDeactivated(address indexed user);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TiersUpdated(uint256 tierCount);
}
