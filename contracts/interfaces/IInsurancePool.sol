// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInsurancePool {
    function deposit() external payable;
    function payout(address user, uint256 amount, bytes32 claimId) external;
    function withdraw(uint256 amount) external;
    function getPoolBalance() external view returns (uint256);
    function isClaimProcessed(bytes32 claimId) external view returns (bool);
    function totalDeposited() external view returns (uint256);
    function totalPaidOut() external view returns (uint256);
    function payoutCount() external view returns (uint256);
    function userTotalPayout(address user) external view returns (uint256);
    function paused() external view returns (bool);
    event Deposit(address indexed depositor, uint256 amount, uint256 timestamp);
    event PayoutExecuted(address indexed user, uint256 amount, bytes32 indexed claimId, uint256 timestamp);
    event Withdraw(address indexed owner, uint256 amount, uint256 timestamp);
    event Paused(address account);
    event Unpaused(address account);
}
