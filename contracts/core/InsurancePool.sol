// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IInsurancePool} from "../interfaces/IInsurancePool.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InsurancePool
 * @notice Holds BNB insurance funds and executes payouts authorized by LossVerifier.
 * @dev Only the LossVerifier contract can trigger payouts. All payouts are non-reentrant.
 *      Supports emergency pause to halt payouts while allowing admin withdrawals.
 */
contract InsurancePool is IInsurancePool, ReentrancyGuard {
    address public owner;
    address public lossVerifier;

    uint256 public override totalDeposited;
    uint256 public override totalPaidOut;
    uint256 public override payoutCount;
    bool public override paused;

    mapping(address => uint256) public override userTotalPayout;
    mapping(bytes32 => bool) public override isClaimProcessed;

    modifier onlyOwner() {
        require(msg.sender == owner, "InsurancePool: not owner");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == lossVerifier, "InsurancePool: not verifier");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "InsurancePool: paused");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Anyone can deposit BNB into the insurance pool.
     */
    function deposit() external payable override whenNotPaused {
        require(msg.value > 0, "InsurancePool: zero deposit");
        totalDeposited += msg.value;
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Executes a BNB payout to a user. Only callable by LossVerifier.
     * @param user Recipient address.
     * @param amount Payout amount in wei.
     * @param claimId Unique claim identifier (hash of buyTradeId + sellTradeId).
     */
    function payout(address user, uint256 amount, bytes32 claimId) external override onlyVerifier whenNotPaused nonReentrant {
        require(user != address(0), "InsurancePool: zero user");
        require(amount > 0, "InsurancePool: zero payout");
        require(!isClaimProcessed[claimId], "InsurancePool: claim already processed");
        require(address(this).balance >= amount, "InsurancePool: insufficient pool balance");

        isClaimProcessed[claimId] = true;
        totalPaidOut += amount;
        payoutCount++;
        userTotalPayout[user] += amount;

        (bool success, ) = payable(user).call{value: amount}("");
        require(success, "InsurancePool: BNB transfer failed");

        emit PayoutExecuted(user, amount, claimId, block.timestamp);
    }

    /**
     * @notice Admin withdraws BNB from the pool (e.g. for migration or emergency).
     */
    function withdraw(uint256 amount) external override onlyOwner nonReentrant {
        require(amount > 0, "InsurancePool: zero withdraw");
        require(address(this).balance >= amount, "InsurancePool: insufficient balance");
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "InsurancePool: withdraw failed");
        emit Withdraw(owner, amount, block.timestamp);
    }

    function getPoolBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    function setLossVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "InsurancePool: zero verifier");
        lossVerifier = verifier;
    }

    function togglePause() external onlyOwner {
        paused = !paused;
        if (paused) emit Paused(msg.sender);
        else emit Unpaused(msg.sender);
    }

    receive() external payable {}
}
