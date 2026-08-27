// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPolicyManager} from "./IPolicyManager.sol";
import {IInsurToken} from "./IInsurToken.sol";

/**
 * @title PolicyManager
 * @notice Manages user insurance policy status based on INSUR token holdings.
 * @dev Policies are activated automatically when holdings meet the minimum threshold.
 *      Tiered coverage: higher INSUR holdings → higher BNB coverage limit.
 *      Historical policy validity uses token balance snapshots (anti post-loss insurance).
 */
contract PolicyManager is IPolicyManager {
    address public owner;
    IInsurToken public insurToken;

    uint256 public override minHoldingThreshold;

    // Tier configuration: parallel arrays
    uint256[] private _holdingTiers;   // minimum holding for each tier (ascending)
    uint256[] private _coverageTiers;  // corresponding coverage limit in wei

    modifier onlyOwner() {
        require(msg.sender == owner, "PolicyManager: not owner");
        _;
    }

    constructor(address _insurToken, uint256 _threshold) {
        require(_insurToken != address(0), "PolicyManager: zero token addr");
        owner = msg.sender;
        insurToken = IInsurToken(_insurToken);
        minHoldingThreshold = _threshold;
        // Default tiers: [min holding in INSUR (1e18)] → [coverage in BNB (wei)]
        _holdingTiers = [1000 * 1e18, 5000 * 1e18, 20000 * 1e18];
        _coverageTiers = [0.1 ether, 0.5 ether, 2 ether];
    }

    /**
     * @notice Returns full policy status for a user.
     */
    function getPolicyStatus(address user) external view override returns (bool isActive, uint8 tier, uint256 coverageLimit) {
        uint256 balance = insurToken.balanceOf(user);
        if (balance < minHoldingThreshold) return (false, 0, 0);
        tier = _getTier(balance);
        coverageLimit = _coverageTiers[tier - 1];
        return (true, tier, coverageLimit);
    }

    /**
     * @notice Checks whether user had an active policy at `blockNumber`.
     * @dev Uses token snapshot to prevent buying insurance after a loss.
     */
    function isPolicyActiveAt(address user, uint256 blockNumber) external view override returns (bool) {
        uint256 historicalBalance = insurToken.balanceOfAt(user, blockNumber);
        return historicalBalance >= minHoldingThreshold;
    }

    function getCoverageLimit(address user) external view override returns (uint256) {
        uint256 balance = insurToken.balanceOf(user);
        if (balance < minHoldingThreshold) return 0;
        uint8 tier = _getTier(balance);
        return _coverageTiers[tier - 1];
    }

    /**
     * @notice External hook to refresh policy status (emits events).
     * @dev Called by front-end or after large transfers. Status is view-computed otherwise.
     */
    function updatePolicyStatus(address user) external override {
        uint256 balance = insurToken.balanceOf(user);
        if (balance >= minHoldingThreshold) {
            uint8 tier = _getTier(balance);
            emit PolicyActivated(user, tier, _coverageTiers[tier - 1]);
        } else {
            emit PolicyDeactivated(user);
        }
    }

    function setMinHoldingThreshold(uint256 threshold) external override onlyOwner {
        uint256 old = minHoldingThreshold;
        minHoldingThreshold = threshold;
        emit ThresholdUpdated(old, threshold);
    }

    function setTiers(uint256[] calldata holdings, uint256[] calldata coverages) external override onlyOwner {
        require(holdings.length == coverages.length, "PolicyManager: array length mismatch");
        require(holdings.length > 0, "PolicyManager: empty tiers");
        // Validate ascending order
        for (uint256 i = 1; i < holdings.length; i++) {
            require(holdings[i] > holdings[i - 1], "PolicyManager: holdings not ascending");
        }
        _holdingTiers = holdings;
        _coverageTiers = coverages;
        emit TiersUpdated(holdings.length);
    }

    function getTierCount() external view override returns (uint256) { return _holdingTiers.length; }

    function getTierInfo(uint8 tier) external view override returns (uint256 minHolding, uint256 coverageLimit) {
        require(tier >= 1 && tier <= _holdingTiers.length, "PolicyManager: invalid tier");
        return (_holdingTiers[tier - 1], _coverageTiers[tier - 1]);
    }

    /**
     * @dev Returns the tier number (1-indexed) for a given balance.
     *      Finds the highest tier whose minimum holding <= balance.
     */
    function _getTier(uint256 balance) internal view returns (uint8) {
        uint8 tier = 1;
        for (uint256 i = 0; i < _holdingTiers.length; i++) {
            if (balance >= _holdingTiers[i]) tier = uint8(i + 1);
        }
        return tier;
    }
}
