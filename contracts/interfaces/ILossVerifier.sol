// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILossVerifier {
    function verifyAndPayout(uint256 buyTradeId, uint256 sellTradeId) external;
    function calculateLoss(uint256 buyTradeId, uint256 sellTradeId) external view returns (uint256 lossAmount, bool isValid);
    function payoutRatio() external view returns (uint256);
    function minLossAmount() external view returns (uint256);
    function maxHoldingPeriod() external view returns (uint256);
    function setPayoutRatio(uint256 ratio) external;
    function setMinLossAmount(uint256 amount) external;
    function setMaxHoldingPeriod(uint256 period) external;
    event ClaimSubmitted(address indexed user, uint256 buyTradeId, uint256 sellTradeId, uint256 lossAmount, uint256 payoutAmount, bytes32 claimId);
    event ClaimRejected(address indexed user, uint256 buyTradeId, uint256 sellTradeId, string reason);
}
