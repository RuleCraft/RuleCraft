// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "@v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@v4-core/interfaces/callback/IUnlockCallback.sol";
import {LPFeeLibrary} from "@v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "@v4-core/libraries/TickMath.sol";
import {FullMath} from "@v4-core/libraries/FullMath.sol";
import {FixedPoint96} from "@v4-core/libraries/FixedPoint96.sol";
import {SafeCast} from "@v4-core/libraries/SafeCast.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@v4-core/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@v4-core/types/Currency.sol";
import {BalanceDelta} from "@v4-core/types/BalanceDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@v4-core/types/PoolOperation.sol";
import {Rules, RuleBounds} from "./RuleTypes.sol";
import {RuleCraftToken} from "./RuleCraftToken.sol";
import {RuleCraftHook} from "./RuleCraftHook.sol";
import {BlueprintRegistry} from "./BlueprintRegistry.sol";

/// @title RuleCraftLauncher
/// @notice Launches a fixed-supply token straight into its own Uniswap v4 pool with a rule
/// set, holds the founding liquidity (optionally time-locked for the creator), and routes
/// exact-input swaps for Rule Craft pools.
/// @dev No owner. The deployer may set the hook address exactly once, right after deploying it.
contract RuleCraftLauncher is IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using SafeCast for uint256;
    using SafeCast for int256;

    struct LaunchParams {
        string name;
        string symbol;
        uint256 supply;
        /// Opening price as sqrt(token per ETH) in Q64.96. Rounded to a tick boundary.
        uint160 sqrtPriceX96;
        Rules rules;
        uint64 blueprintId;
        /// Tokens the creator must receive from the optional dev buy (msg.value).
        uint256 devBuyMinOut;
    }

    struct Launch {
        address creator;
        address token;
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint64 unlockAt;
        bool withdrawn;
    }

    enum Action {
        Launch,
        Swap,
        Collect,
        Withdraw
    }

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant MIN_SUPPLY = 1_000 ether;
    uint256 public constant MAX_SUPPLY = 1e30;

    IPoolManager public immutable poolManager;
    BlueprintRegistry public immutable registry;
    address public immutable deployer;
    RuleCraftHook public hook;

    Launch[] private _launches;
    mapping(PoolId => uint256) public launchOfPool;

    event HookSet(address hook);
    event Launched(uint256 indexed launchId, address indexed token, PoolId indexed poolId, address creator, uint64 blueprintId, uint256 supply, uint256 devBuyOut);
    event Swapped(PoolId indexed poolId, address indexed trader, bool buy, uint256 amountIn, uint256 amountOut);
    event FeesCollected(uint256 indexed launchId, uint256 amount0, uint256 amount1);
    event LiquidityWithdrawn(uint256 indexed launchId, uint256 amount0, uint256 amount1);

    error NotDeployer();
    error HookAlreadySet();
    error HookNotSet();
    error BadHook();
    error BadSupply();
    error BadName();
    error BadPrice();
    error RulesMismatch();
    error NotPoolManager();
    error NotCreator();
    error StillLocked(uint64 unlockAt);
    error AlreadyWithdrawn();
    error Slippage(uint256 out, uint256 minOut);
    error WrongValue();
    error UnknownPool();

    constructor(IPoolManager poolManager_, BlueprintRegistry registry_) {
        poolManager = poolManager_;
        registry = registry_;
        deployer = msg.sender;
        _launches.push(); // id 0 = none
    }

    receive() external payable {
        if (msg.sender != address(poolManager)) revert WrongValue();
    }

    /// @notice One-time wiring of the mined hook. The hook must point back at this launcher.
    function setHook(RuleCraftHook hook_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (address(hook) != address(0)) revert HookAlreadySet();
        if (hook_.launcher() != address(this) || address(hook_.poolManager()) != address(poolManager)) revert BadHook();
        if (hook_.treasury() != registry.treasury()) revert BadHook();
        hook = hook_;
        emit HookSet(address(hook_));
    }

    // ------------------------------------------------------------------
    // Launch
    // ------------------------------------------------------------------

    function launch(LaunchParams calldata p) external payable returns (uint256 launchId, address token, PoolId poolId) {
        if (address(hook) == address(0)) revert HookNotSet();
        if (p.supply < MIN_SUPPLY || p.supply > MAX_SUPPLY) revert BadSupply();
        if (bytes(p.name).length == 0 || bytes(p.name).length > 32 || bytes(p.symbol).length < 2 || bytes(p.symbol).length > 10) revert BadName();
        RuleBounds.validate(p.rules);

        address author;
        uint16 royaltyBps;
        if (p.blueprintId != 0) {
            BlueprintRegistry.Blueprint memory bp = registry.get(p.blueprintId);
            if (bp.rulesHash != RuleBounds.hash(p.rules)) revert RulesMismatch();
            author = bp.author;
            royaltyBps = bp.royaltyBps;
        }

        token = address(new RuleCraftToken(p.name, p.symbol, p.supply, address(this)));
        bool dynamic = p.rules.modules & RuleBounds.SIZE_FEE != 0;
        int24 spacing = _spacing(dynamic, p.rules.baseFee);
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: dynamic ? LPFeeLibrary.DYNAMIC_FEE_FLAG : p.rules.baseFee,
            tickSpacing: spacing,
            hooks: IHooks(address(hook))
        });

        // All supply sits in one token-only range just below the opening price. Buys move
        // the price down (ETH is currency0), into the range.
        if (p.sqrtPriceX96 < TickMath.MIN_SQRT_PRICE || p.sqrtPriceX96 >= TickMath.MAX_SQRT_PRICE) revert BadPrice();
        int24 tick = TickMath.getTickAtSqrtPrice(p.sqrtPriceX96);
        int24 tickUpper = (tick / spacing) * spacing;
        if (tick < 0 && tick % spacing != 0) tickUpper -= spacing;
        int24 tickLower = TickMath.minUsableTick(spacing);
        if (tickUpper - tickLower < spacing * 10) revert BadPrice();
        uint160 sqrtStart = TickMath.getSqrtPriceAtTick(tickUpper);

        uint128 maxBuy = p.rules.modules & RuleBounds.GUARD != 0 ? uint128(p.supply * p.rules.maxBuyBps / 10_000) : 0;
        hook.register(key, p.rules, maxBuy, p.blueprintId, author, royaltyBps, registry.protocolBps());
        poolManager.initialize(key, sqrtStart);

        uint128 liquidity = _liquidityForAmount1(TickMath.getSqrtPriceAtTick(tickLower), sqrtStart, p.supply);
        launchId = _launches.length;
        poolId = key.toId();
        uint64 unlockAt = p.rules.modules & RuleBounds.LOCK != 0 ? uint64(block.timestamp + uint256(p.rules.lockDays) * 1 days) : uint64(block.timestamp);
        _launches.push(Launch(msg.sender, token, key, tickLower, tickUpper, liquidity, unlockAt, false));
        launchOfPool[poolId] = launchId;

        bytes memory res = poolManager.unlock(abi.encode(Action.Launch, abi.encode(launchId, msg.value, msg.sender)));
        uint256 devOut = abi.decode(res, (uint256));
        if (devOut < p.devBuyMinOut) revert Slippage(devOut, p.devBuyMinOut);

        // Rounding dust that did not fit the range is burned, never kept.
        uint256 dust = RuleCraftToken(token).balanceOf(address(this));
        if (dust != 0 && !RuleCraftToken(token).transfer(DEAD, dust)) revert WrongValue();

        emit Launched(launchId, token, poolId, msg.sender, p.blueprintId, p.supply, devOut);
    }

    // ------------------------------------------------------------------
    // Swaps (exact input) for Rule Craft pools
    // ------------------------------------------------------------------

    /// @notice Buy with ETH (`buy = true`, send `amountIn` as value) or sell tokens (approve first).
    function swapExactIn(PoolKey calldata key, bool buy, uint128 amountIn, uint256 minOut, address to)
        external
        payable
        returns (uint256 amountOut)
    {
        if (launchOfPool[key.toId()] == 0) revert UnknownPool();
        if (buy ? msg.value != amountIn : msg.value != 0) revert WrongValue();
        bytes memory res = poolManager.unlock(abi.encode(Action.Swap, abi.encode(key, buy, amountIn, msg.sender, to)));
        amountOut = abi.decode(res, (uint256));
        if (amountOut < minOut) revert Slippage(amountOut, minOut);
        emit Swapped(key.toId(), msg.sender, buy, amountIn, amountOut);
    }

    // ------------------------------------------------------------------
    // Founding liquidity
    // ------------------------------------------------------------------

    /// @notice Sends the founding position's accrued LP fees to the creator. Allowed at any time.
    function collectFees(uint256 launchId) external returns (uint256 amount0, uint256 amount1) {
        Launch storage l = _launches[launchId];
        if (msg.sender != l.creator) revert NotCreator();
        if (l.withdrawn) revert AlreadyWithdrawn();
        (amount0, amount1) = abi.decode(poolManager.unlock(abi.encode(Action.Collect, abi.encode(launchId))), (uint256, uint256));
        emit FeesCollected(launchId, amount0, amount1);
    }

    /// @notice Removes the founding position once its lock has passed. Everything goes to the creator.
    function withdrawLiquidity(uint256 launchId) external returns (uint256 amount0, uint256 amount1) {
        Launch storage l = _launches[launchId];
        if (msg.sender != l.creator) revert NotCreator();
        if (l.withdrawn) revert AlreadyWithdrawn();
        if (block.timestamp < l.unlockAt) revert StillLocked(l.unlockAt);
        l.withdrawn = true;
        (amount0, amount1) = abi.decode(poolManager.unlock(abi.encode(Action.Withdraw, abi.encode(launchId))), (uint256, uint256));
        emit LiquidityWithdrawn(launchId, amount0, amount1);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function launchCount() external view returns (uint256) {
        return _launches.length - 1;
    }

    function getLaunch(uint256 launchId) external view returns (Launch memory) {
        return _launches[launchId];
    }

    // ------------------------------------------------------------------
    // PoolManager callback
    // ------------------------------------------------------------------

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (Action action, bytes memory inner) = abi.decode(data, (Action, bytes));
        if (action == Action.Launch) return _doLaunch(inner);
        if (action == Action.Swap) return _doSwap(inner);
        if (action == Action.Collect) return _doModify(inner, false);
        return _doModify(inner, true);
    }

    function _doLaunch(bytes memory inner) private returns (bytes memory) {
        (uint256 launchId, uint256 devBuy, address creator) = abi.decode(inner, (uint256, uint256, address));
        Launch storage l = _launches[launchId];
        (BalanceDelta delta,) = poolManager.modifyLiquidity(
            l.key,
            ModifyLiquidityParams({tickLower: l.tickLower, tickUpper: l.tickUpper, liquidityDelta: int256(uint256(l.liquidity)), salt: bytes32(launchId)}),
            ""
        );
        // A token-only range below the price owes only currency1.
        _pay(l.key.currency1, uint256(uint128(-delta.amount1())), address(this));
        uint256 devOut;
        if (devBuy != 0) devOut = _swap(l.key, true, devBuy, address(this), creator);
        return abi.encode(devOut);
    }

    function _doSwap(bytes memory inner) private returns (bytes memory) {
        (PoolKey memory key, bool buy, uint128 amountIn, address payer, address to) = abi.decode(inner, (PoolKey, bool, uint128, address, address));
        return abi.encode(_swap(key, buy, amountIn, payer, to));
    }

    function _swap(PoolKey memory key, bool buy, uint256 amountIn, address payer, address to) private returns (uint256 out) {
        BalanceDelta d = poolManager.swap(
            key,
            SwapParams({
                zeroForOne: buy,
                amountSpecified: -int256(amountIn),
                sqrtPriceLimitX96: buy ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            ""
        );
        (int128 inDelta, int128 outDelta) = buy ? (d.amount0(), d.amount1()) : (d.amount1(), d.amount0());
        uint256 paid = uint256(uint128(-inDelta));
        out = uint256(uint128(outDelta));
        _pay(buy ? key.currency0 : key.currency1, paid, payer);
        poolManager.take(buy ? key.currency1 : key.currency0, to, out);
        // A price limit can leave part of an ETH input unspent: refund it.
        if (buy && paid < amountIn) {
            (bool ok,) = (payer == address(this) ? to : payer).call{value: amountIn - paid}("");
            if (!ok) revert WrongValue();
        }
    }

    function _doModify(bytes memory inner, bool withdraw) private returns (bytes memory) {
        uint256 launchId = abi.decode(inner, (uint256));
        Launch storage l = _launches[launchId];
        (BalanceDelta delta,) = poolManager.modifyLiquidity(
            l.key,
            ModifyLiquidityParams({
                tickLower: l.tickLower,
                tickUpper: l.tickUpper,
                liquidityDelta: withdraw ? -int256(uint256(l.liquidity)) : int256(0),
                salt: bytes32(launchId)
            }),
            ""
        );
        uint256 a0 = delta.amount0() > 0 ? uint256(uint128(delta.amount0())) : 0;
        uint256 a1 = delta.amount1() > 0 ? uint256(uint128(delta.amount1())) : 0;
        if (a0 != 0) poolManager.take(l.key.currency0, l.creator, a0);
        if (a1 != 0) poolManager.take(l.key.currency1, l.creator, a1);
        return abi.encode(a0, a1);
    }

    /// @dev Settles `amount` of `currency` owed to the PoolManager, pulling ERC-20s from `payer`.
    function _pay(Currency currency, uint256 amount, address payer) private {
        if (amount == 0) return;
        if (currency.isAddressZero()) {
            poolManager.settle{value: amount}();
        } else {
            poolManager.sync(currency);
            if (payer == address(this)) {
                if (!RuleCraftToken(Currency.unwrap(currency)).transfer(address(poolManager), amount)) revert WrongValue();
            } else {
                if (!RuleCraftToken(Currency.unwrap(currency)).transferFrom(payer, address(poolManager), amount)) revert WrongValue();
            }
            poolManager.settle();
        }
    }

    function _spacing(bool dynamic, uint24 baseFee) private pure returns (int24) {
        if (dynamic) return 60;
        if (baseFee == 500) return 10;
        if (baseFee == 3000) return 60;
        return 200;
    }

    function _liquidityForAmount1(uint160 sqrtA, uint160 sqrtB, uint256 amount1) private pure returns (uint128) {
        return FullMath.mulDiv(amount1, FixedPoint96.Q96, sqrtB - sqrtA).toUint128();
    }
}
