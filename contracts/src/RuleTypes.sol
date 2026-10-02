// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice The rule set a pool is created with. Frozen once the pool opens.
/// @dev Fees are in v4 "pips" (1_000_000 = 100%). Shares are in basis points (10_000 = 100%).
struct Rules {
    /// Bit flags: 1 Snipe Guard, 2 Size-Scaled Fee, 4 Buy Burn, 8 LP Stream, 16 Liquidity Timelock.
    uint8 modules;
    /// Static LP fee when Size-Scaled Fee is off: 500, 3000 or 10000.
    uint24 baseFee;
    uint32 guardBlocks;
    /// Share of total supply all buyers together may receive in one block during the guard.
    uint16 maxBuyBps;
    uint16 guardTaxBps;
    uint24 minFee;
    uint24 maxFee;
    /// Trade size, as a share of in-range virtual reserves, at which the fee reaches maxFee.
    uint16 depthBps;
    uint16 burnBps;
    uint16 streamBps;
    uint32 lockDays;
}

library RuleBounds {
    uint8 internal constant GUARD = 1;
    uint8 internal constant SIZE_FEE = 2;
    uint8 internal constant BURN = 4;
    uint8 internal constant STREAM = 8;
    uint8 internal constant LOCK = 16;
    uint8 internal constant ALL = 31;

    /// @notice Hard ceiling on what rules may take from one buy, in basis points.
    uint256 internal constant MAX_TAKE_BPS = 5000;

    error BadRules(uint8 code);

    /// @notice Reverts unless every enabled module's numbers sit inside its published bounds.
    /// Disabled modules must carry zeroes, so one rule set has exactly one encoding (and one hash).
    function validate(Rules memory r) internal pure {
        if (r.modules == 0 || r.modules & ~ALL != 0) revert BadRules(1);
        bool guard = r.modules & GUARD != 0;
        bool sizeFee = r.modules & SIZE_FEE != 0;
        bool burn = r.modules & BURN != 0;
        bool stream = r.modules & STREAM != 0;
        bool lock = r.modules & LOCK != 0;

        if (sizeFee) {
            if (r.baseFee != 0) revert BadRules(2);
            if (r.minFee < 500 || r.minFee > 10_000) revert BadRules(3);
            if (r.maxFee < r.minFee || r.maxFee > 50_000) revert BadRules(4);
            if (r.depthBps < 50 || r.depthBps > 1000) revert BadRules(5);
        } else {
            if (r.baseFee != 500 && r.baseFee != 3000 && r.baseFee != 10_000) revert BadRules(6);
            if (r.minFee != 0 || r.maxFee != 0 || r.depthBps != 0) revert BadRules(7);
        }
        if (guard) {
            if (r.guardBlocks < 5 || r.guardBlocks > 600) revert BadRules(8);
            if (r.maxBuyBps < 10 || r.maxBuyBps > 500) revert BadRules(9);
            if (r.guardTaxBps > 6000) revert BadRules(10);
        } else if (r.guardBlocks != 0 || r.maxBuyBps != 0 || r.guardTaxBps != 0) {
            revert BadRules(11);
        }
        if (burn) {
            if (r.burnBps < 10 || r.burnBps > 500) revert BadRules(12);
        } else if (r.burnBps != 0) {
            revert BadRules(13);
        }
        if (stream) {
            if (r.streamBps < 10 || r.streamBps > 300) revert BadRules(14);
        } else if (r.streamBps != 0) {
            revert BadRules(15);
        }
        if (lock) {
            if (r.lockDays < 1 || r.lockDays > 3650) revert BadRules(16);
        } else if (r.lockDays != 0) {
            revert BadRules(17);
        }
        if (uint256(r.guardTaxBps) + r.burnBps + r.streamBps > MAX_TAKE_BPS) revert BadRules(18);
    }

    function hash(Rules memory r) internal pure returns (bytes32) {
        return keccak256(abi.encode(r));
    }
}
