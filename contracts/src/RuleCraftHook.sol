// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "@v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "@v4-core/libraries/Hooks.sol";
import {LPFeeLibrary} from "@v4-core/libraries/LPFeeLibrary.sol";
import {StateLibrary} from "@v4-core/libraries/StateLibrary.sol";
import {FullMath} from "@v4-core/libraries/FullMath.sol";
import {FixedPoint96} from "@v4-core/libraries/FixedPoint96.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@v4-core/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@v4-core/types/Currency.sol";
import {BalanceDelta} from "@v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@v4-core/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@v4-core/types/PoolOperation.sol";
import {Rules, RuleBounds} from "./RuleTypes.sol";

/// @title RuleCraftHook
/// @notice One Uniswap v4 hook for every Rule Craft pool. Each pool carries its own
/// rule set, written once by the launcher before the pool opens and never changed.
/// Pools are ETH (currency0) / token (currency1); a buy is a zeroForOne swap.
/// @dev Permission bits: beforeInitialize, beforeSwap, afterSwap, afterSwapReturnDelta
/// (mask 0x20C4). The address must be mined so its lowest 14 bits equal that mask.
/// There is no owner and no function that can move pool or user funds.
contract RuleCraftHook is IHooks {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using CurrencyLibrary for Currency;

    uint160 public constant FLAGS = uint160(
        Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
    );
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    struct PoolRules {
        Rules rules;
        uint128 maxBuyPerBlock;
        uint64 openBlock;
        uint64 blueprintId;
        address author;
        uint16 royaltyBps;
        uint16 protocolBps;
        bool registered;
    }

    struct Window {
        uint64 blockNumber;
        uint128 bought;
    }

    IPoolManager public immutable poolManager;
    address public immutable launcher;
    address public immutable treasury;

    mapping(PoolId => PoolRules) private _pools;
    mapping(PoolId => Window) public buyWindow;
    /// @notice Royalties and protocol share waiting to be claimed: account => currency => amount.
    mapping(address => mapping(Currency => uint256)) public owed;

    event PoolRulesSet(PoolId indexed id, uint64 indexed blueprintId, address author, Rules rules, uint128 maxBuyPerBlock);
    event RulesApplied(PoolId indexed id, uint256 burned, uint256 toLps, uint256 royalty, uint256 protocol);
    event Claimed(address indexed account, Currency indexed currency, uint256 amount);

    error NotPoolManager();
    error NotLauncher();
    error AlreadyRegistered();
    error NotRegistered();
    error WrongPoolShape();
    error ExactInputOnly();
    error GuardCapExceeded(uint256 cap, uint256 wouldHave);
    error HookNotImplemented();

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    constructor(IPoolManager poolManager_, address launcher_, address treasury_) {
        poolManager = poolManager_;
        launcher = launcher_;
        treasury = treasury_;
        Hooks.validateHookPermissions(
            IHooks(address(this)),
            Hooks.Permissions({
                beforeInitialize: true,
                afterInitialize: false,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: true,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: true,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            })
        );
    }

    receive() external payable {}

    // ------------------------------------------------------------------
    // Registration (launcher only, once per pool, before it opens)
    // ------------------------------------------------------------------

    function register(
        PoolKey calldata key,
        Rules calldata rules,
        uint128 maxBuyPerBlock,
        uint64 blueprintId,
        address author,
        uint16 royaltyBps,
        uint16 protocolBps
    ) external {
        if (msg.sender != launcher) revert NotLauncher();
        RuleBounds.validate(rules);
        if (address(key.hooks) != address(this) || !key.currency0.isAddressZero()) revert WrongPoolShape();
        bool sizeFee = rules.modules & RuleBounds.SIZE_FEE != 0;
        if (sizeFee ? key.fee != LPFeeLibrary.DYNAMIC_FEE_FLAG : key.fee != rules.baseFee) revert WrongPoolShape();
        if (uint256(royaltyBps) + protocolBps > 10_000) revert WrongPoolShape();
        PoolId id = key.toId();
        PoolRules storage p = _pools[id];
        if (p.registered) revert AlreadyRegistered();
        p.rules = rules;
        p.maxBuyPerBlock = maxBuyPerBlock;
        p.blueprintId = blueprintId;
        p.author = author;
        p.royaltyBps = author == address(0) ? 0 : royaltyBps;
        p.protocolBps = protocolBps;
        p.registered = true;
        emit PoolRulesSet(id, blueprintId, author, rules, maxBuyPerBlock);
    }

    function poolRules(PoolId id) external view returns (PoolRules memory) {
        return _pools[id];
    }

    /// @notice True while the pool's Snipe Guard window is open.
    function guardActive(PoolId id) public view returns (bool) {
        PoolRules storage p = _pools[id];
        return p.rules.modules & RuleBounds.GUARD != 0 && p.openBlock != 0 && block.number < uint256(p.openBlock) + p.rules.guardBlocks;
    }

    // ------------------------------------------------------------------
    // Hook callbacks
    // ------------------------------------------------------------------

    function beforeInitialize(address sender, PoolKey calldata key, uint160) external onlyPoolManager returns (bytes4) {
        if (sender != launcher) revert NotLauncher();
        PoolRules storage p = _pools[key.toId()];
        if (!p.registered || p.openBlock != 0) revert NotRegistered();
        p.openBlock = uint64(block.number);
        return IHooks.beforeInitialize.selector;
    }

    function beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        external
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId id = key.toId();
        PoolRules storage p = _pools[id];
        if (!p.registered) revert NotRegistered();
        // Rules are priced on what goes in; exact-output swaps are refused.
        if (params.amountSpecified >= 0) revert ExactInputOnly();
        uint24 fee;
        if (p.rules.modules & RuleBounds.SIZE_FEE != 0) {
            fee = sizeFee(id, p.rules, params.zeroForOne, uint256(-params.amountSpecified)) | LPFeeLibrary.OVERRIDE_FEE_FLAG;
        }
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee);
    }

    function afterSwap(address, PoolKey calldata key, SwapParams calldata params, BalanceDelta delta, bytes calldata)
        external
        onlyPoolManager
        returns (bytes4, int128)
    {
        // Only buys (ETH in, token out) carry add-on rules.
        if (!params.zeroForOne) return (IHooks.afterSwap.selector, 0);
        PoolId id = key.toId();
        PoolRules storage p = _pools[id];
        int128 out128 = delta.amount1();
        if (out128 <= 0) return (IHooks.afterSwap.selector, 0);
        uint256 out = uint256(uint128(out128));
        Rules memory r = p.rules;
        bool guard = guardActive(id);

        if (guard) {
            Window storage w = buyWindow[id];
            uint256 bought = w.blockNumber == block.number ? uint256(w.bought) + out : out;
            if (bought > p.maxBuyPerBlock) revert GuardCapExceeded(p.maxBuyPerBlock, bought);
            w.blockNumber = uint64(block.number);
            w.bought = uint128(bought);
        }

        uint256 burned = r.modules & RuleBounds.BURN != 0 ? out * r.burnBps / 10_000 : 0;
        uint256 addOn = (guard ? out * r.guardTaxBps / 10_000 : 0) + (r.modules & RuleBounds.STREAM != 0 ? out * r.streamBps / 10_000 : 0);

        uint256 royalty;
        uint256 protocol;
        uint256 toLps;
        if (addOn != 0) {
            if (poolManager.getLiquidity(id) == 0) {
                // Nobody in range to receive it: the add-on is simply not charged.
                addOn = 0;
            } else {
                royalty = addOn * p.royaltyBps / 10_000;
                protocol = addOn * p.protocolBps / 10_000;
                toLps = addOn - royalty - protocol;
            }
        }

        uint256 total = burned + addOn;
        if (total == 0) return (IHooks.afterSwap.selector, 0);

        Currency token = key.currency1;
        if (burned != 0) poolManager.take(token, DEAD, burned);
        if (royalty + protocol != 0) {
            poolManager.take(token, address(this), royalty + protocol);
            if (royalty != 0) owed[p.author][token] += royalty;
            if (protocol != 0) owed[treasury][token] += protocol;
        }
        if (toLps != 0) poolManager.donate(key, 0, toLps, "");
        emit RulesApplied(id, burned, toLps, royalty, protocol);
        return (IHooks.afterSwap.selector, int128(int256(total)));
    }

    /// @notice LP fee for a swap of `amountIn`: the floor for small trades, rising linearly to
    /// the ceiling once the trade reaches `depthBps` of the in-range virtual reserve of the input.
    function sizeFee(PoolId id, Rules memory r, bool zeroForOne, uint256 amountIn) public view returns (uint24) {
        uint128 liquidity = poolManager.getLiquidity(id);
        if (liquidity == 0) return r.minFee;
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(id);
        uint256 reserve = zeroForOne
            ? FullMath.mulDiv(liquidity, FixedPoint96.Q96, sqrtPriceX96)
            : FullMath.mulDiv(liquidity, sqrtPriceX96, FixedPoint96.Q96);
        if (reserve == 0) return r.maxFee;
        uint256 threshold = FullMath.mulDiv(reserve, r.depthBps, 10_000);
        if (threshold == 0 || amountIn >= threshold) return r.maxFee;
        return uint24(r.minFee + FullMath.mulDiv(uint256(r.maxFee - r.minFee), amountIn, threshold));
    }

    // ------------------------------------------------------------------
    // Claims
    // ------------------------------------------------------------------

    /// @notice Pays `account` everything it is owed in `currency`. Anyone may call it;
    /// funds only ever go to the account they were credited to.
    function claim(address account, Currency currency) external returns (uint256 amount) {
        amount = owed[account][currency];
        if (amount == 0) return 0;
        owed[account][currency] = 0;
        currency.transfer(account, amount);
        emit Claimed(account, currency, amount);
    }

    // ------------------------------------------------------------------
    // Unused callbacks (their permission bits are off, so the PoolManager never calls them)
    // ------------------------------------------------------------------

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, BalanceDelta, BalanceDelta, bytes calldata)
        external
        pure
        returns (bytes4, BalanceDelta)
    {
        revert HookNotImplemented();
    }

    function beforeRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, BalanceDelta, BalanceDelta, bytes calldata)
        external
        pure
        returns (bytes4, BalanceDelta)
    {
        revert HookNotImplemented();
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotImplemented();
    }
}
