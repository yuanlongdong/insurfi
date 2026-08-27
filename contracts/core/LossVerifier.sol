// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ILossVerifier} from "./ILossVerifier.sol";
import {IInsurancePool} from "./IInsurancePool.sol";
import {IPolicyManager} from "./IPolicyManager.sol";
import {IDEXRouter} from "./IDEXRouter.sol";
import {IInsurToken} from "./IInsurToken.sol";

/**
 * @title LossVerifier
 * @notice Verifies trading losses from DEXRouter records and triggers insurance payouts.
 * @dev Users submit a buy tradeId and sell tradeId pair. The verifier:
 *      1. Validates both trades belong to the caller
 *      2. Validates buy is ETH→Token, sell is Token→ETH, same token pair
 *      3. Calculates loss = ETH spent on buy - ETH received from sell
 *      4. Checks policy was active at the sell trade block (snapshot-based)
 *      5. Checks claim not already processed
 *      6. Computes payout = min(loss * payoutRatio, coverageLimit)
 *      7. Calls InsurancePool.payout
 */
contract LossVerifier is ILossVerifier {
    address public owner;
    IInsurToken public insurToken;
    IInsurancePool public insurancePool;
    IPolicyManager public policyManager;
    IDEXRouter public dexRouter;

    uint256 public override payoutRatio;   // in basis points (e.g. 5000 = 50%)
    uint256 public override minLossAmount;  // minimum loss in wei to be eligible

    // claimId => processed (mirror of pool, checked locally too)
    mapping(bytes32 => bool) private _claims;

    modifier onlyOwner() {
        require(msg.sender == owner, "LossVerifier: not owner");
        _;
    }

    constructor(
        address _insurToken,
        address _insurancePool,
        address _policyManager,
        address _dexRouter
    ) {
        require(_insurToken != address(0), "LossVerifier: zero token");
        require(_insurancePool != address(0), "LossVerifier: zero pool");
        require(_policyManager != address(0), "LossVerifier: zero policy");
        require(_dexRouter != address(0), "LossVerifier: zero dex");
        owner = msg.sender;
        insurToken = IInsurToken(_insurToken);
        insurancePool = IInsurancePool(_insurancePool);
        policyManager = IPolicyManager(_policyManager);
        dexRouter = IDEXRouter(_dexRouter);
        payoutRatio = 5000;     // 50% default
        minLossAmount = 0.001 ether; // 0.001 BNB minimum
    }

    /**
     * @notice Submit a claim for a buy-sell trade pair.
     * @param buyTradeId Trade ID of the buy (ETH→Token) transaction.
     * @param sellTradeId Trade ID of the sell (Token→ETH) transaction.
     */
    function verifyAndPayout(uint256 buyTradeId, uint256 sellTradeId) external override {
        bytes32 claimId = _getClaimId(msg.sender, buyTradeId, sellTradeId);

        // 1. Claim not already processed
        require(!_claims[claimId], "LossVerifier: claim already processed");

        // 2. Fetch trades
        IDEXRouter.Trade memory buyTrade = dexRouter.getTrade(buyTradeId);
        IDEXRouter.Trade memory sellTrade = dexRouter.getTrade(sellTradeId);

        // 3. Validate ownership
        require(buyTrade.trader == msg.sender, "LossVerifier: buy not owned");
        require(sellTrade.trader == msg.sender, "LossVerifier: sell not owned");

        // 4. Validate trade directions and token pair
        require(buyTrade.isBuy, "LossVerifier: buyTrade not a buy");
        require(!sellTrade.isBuy, "LossVerifier: sellTrade not a sell");
        require(buyTrade.tokenOut == sellTrade.tokenIn, "LossVerifier: token mismatch");

        // 5. Validate timing: buy before sell
        require(buyTrade.blockNumber < sellTrade.blockNumber, "LossVerifier: buy after sell");

        // 6. Calculate loss (ETH spent - ETH received)
        // buyTrade.amountIn = ETH spent (wei)
        // sellTrade.amountOut = ETH received (wei)
        uint256 ethSpent = buyTrade.amountIn;
        uint256 ethReceived = sellTrade.amountOut;
        require(ethSpent > ethReceived, "LossVerifier: no loss");
        uint256 lossAmount = ethSpent - ethReceived;

        // 7. Minimum loss check
        require(lossAmount >= minLossAmount, "LossVerifier: loss below minimum");

        // 8. Policy active at sell block (anti post-loss insurance)
        require(
            policyManager.isPolicyActiveAt(msg.sender, sellTrade.blockNumber),
            "LossVerifier: policy inactive at sell time"
        );

        // 9. Calculate payout
        uint256 coverageLimit = policyManager.getCoverageLimit(msg.sender);
        uint256 rawPayout = (lossAmount * payoutRatio) / 10000;
        uint256 payoutAmount = rawPayout < coverageLimit ? rawPayout : coverageLimit;
        require(payoutAmount > 0, "LossVerifier: zero payout");

        // 10. Mark claim processed and execute payout
        _claims[claimId] = true;
        insurancePool.payout(msg.sender, payoutAmount, claimId);

        emit ClaimSubmitted(msg.sender, buyTradeId, sellTradeId, lossAmount, payoutAmount, claimId);
    }

    /**
     * @notice View function to pre-calculate loss and validity for a trade pair.
     */
    function calculateLoss(uint256 buyTradeId, uint256 sellTradeId) external view override returns (uint256 lossAmount, bool isValid) {
        try dexRouter.getTrade(buyTradeId) returns (IDEXRouter.Trade memory buyTrade) {
            try dexRouter.getTrade(sellTradeId) returns (IDEXRouter.Trade memory sellTrade) {
                if (buyTrade.trader != msg.sender) return (0, false);
                if (sellTrade.trader != msg.sender) return (0, false);
                if (!buyTrade.isBuy || sellTrade.isBuy) return (0, false);
                if (buyTrade.tokenOut != sellTrade.tokenIn) return (0, false);
                if (buyTrade.blockNumber >= sellTrade.blockNumber) return (0, false);
                if (buyTrade.amountIn <= sellTrade.amountOut) return (0, false);
                lossAmount = buyTrade.amountIn - sellTrade.amountOut;
                if (lossAmount < minLossAmount) return (0, false);
                isValid = true;
                return (lossAmount, true);
            } catch { return (0, false); }
        } catch { return (0, false); }
    }

    function setPayoutRatio(uint256 ratio) external override onlyOwner {
        require(ratio <= 10000, "LossVerifier: ratio > 100%");
        payoutRatio = ratio;
    }

    function setMinLossAmount(uint256 amount) external override onlyOwner {
        minLossAmount = amount;
    }

    function setInsurancePool(address pool) external onlyOwner {
        require(pool != address(0), "LossVerifier: zero pool");
        insurancePool = IInsurancePool(pool);
    }

    function setPolicyManager(address pm) external onlyOwner {
        require(pm != address(0), "LossVerifier: zero pm");
        policyManager = IPolicyManager(pm);
    }

    function setDEXRouter(address router) external onlyOwner {
        require(router != address(0), "LossVerifier: zero router");
        dexRouter = IDEXRouter(router);
    }

    function _getClaimId(address user, uint256 buyId, uint256 sellId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, buyId, sellId));
    }
}
