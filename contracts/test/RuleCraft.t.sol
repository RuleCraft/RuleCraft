// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {PoolManager} from "@v4-core/PoolManager.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@v4-core/interfaces/callback/IUnlockCallback.sol";
import {IHooks} from "@v4-core/interfaces/IHooks.sol";
import {TickMath} from "@v4-core/libraries/TickMath.sol";
import {StateLibrary} from "@v4-core/libraries/StateLibrary.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@v4-core/types/PoolId.sol";
import {Currency} from "@v4-core/types/Currency.sol";
import {SwapParams} from "@v4-core/types/PoolOperation.sol";
import {Rules, RuleBounds} from "../src/RuleTypes.sol";
import {RuleCraftHook} from "../src/RuleCraftHook.sol";
import {RuleCraftLauncher} from "../src/RuleCraftLauncher.sol";
import {RuleCraftToken} from "../src/RuleCraftToken.sol";
import {BlueprintRegistry} from "../src/BlueprintRegistry.sol";

/// Tries an exact-output swap, which the hook must refuse.
contract ExactOutRouter is IUnlockCallback {
    IPoolManager immutable pm;
    constructor(IPoolManager pm_) { pm = pm_; }
    function go(PoolKey calldata key) external { pm.unlock(abi.encode(key)); }
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        PoolKey memory key = abi.decode(data, (PoolKey));
        pm.swap(key, SwapParams({zeroForOne: true, amountSpecified: 1e18, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}), "");
        return "";
    }
}

contract RuleCraftTest is Test {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    address constant DEAD = 0x000000000000000000000000000000000000dEaD;
    PoolManager pm;
    BlueprintRegistry registry;
    RuleCraftLauncher launcher;
    RuleCraftHook hook;
    address treasury = makeAddr("treasury");
    address creator = makeAddr("creator");
    address trader = makeAddr("trader");
    address author = makeAddr("author");
    uint256 constant SUPPLY = 1_000_000_000 ether;

    function setUp() public {
        pm = new PoolManager(address(this));
        registry = new BlueprintRegistry(treasury, 1000);
        launcher = new RuleCraftLauncher(IPoolManager(address(pm)), registry);
        address target = address(uint160(0x4444 << 144) | uint160(0x20C4));
        deployCodeTo("RuleCraftHook.sol:RuleCraftHook", abi.encode(address(pm), address(launcher), treasury), target);
        hook = RuleCraftHook(payable(target));
        launcher.setHook(hook);
        vm.deal(creator, 100 ether);
        vm.deal(trader, 100 ether);
    }

    // ---------- helpers ----------

    function _rules(uint8 modules) internal pure returns (Rules memory r) {
        r.modules = modules;
        if (modules & RuleBounds.SIZE_FEE != 0) {
            r.minFee = 3000;
            r.maxFee = 15_000;
            r.depthBps = 200;
        } else {
            r.baseFee = 10_000;
        }
        if (modules & RuleBounds.GUARD != 0) {
            r.guardBlocks = 60;
            r.maxBuyBps = 50; // 0.5% of supply per block
            r.guardTaxBps = 2000;
        }
        if (modules & RuleBounds.BURN != 0) r.burnBps = 100;
        if (modules & RuleBounds.STREAM != 0) r.streamBps = 100;
        if (modules & RuleBounds.LOCK != 0) r.lockDays = 30;
    }

    /// sqrt(tokens per ETH) at a 5 ETH valuation for the whole supply.
    function _sqrtPrice() internal pure returns (uint160) {
        uint256 ratio = SUPPLY / 5 ether; // 2e8 tokens per ETH
        return uint160(_sqrt(ratio) << 96);
    }

    function _sqrt(uint256 x) internal pure returns (uint256 z) {
        z = x;
        uint256 y = (x + 1) / 2;
        while (y < z) { z = y; y = (x / y + y) / 2; }
    }

    function _launch(Rules memory r, uint64 bp, uint256 devBuy) internal returns (uint256 id, RuleCraftToken token, PoolKey memory key) {
        vm.prank(creator);
        (uint256 lid, address t,) = launcher.launch{value: devBuy}(
            RuleCraftLauncher.LaunchParams({name: "Quiet Harbor", symbol: "HARBOR", supply: SUPPLY, sqrtPriceX96: _sqrtPrice(), rules: r, blueprintId: bp, devBuyMinOut: 0})
        );
        id = lid;
        token = RuleCraftToken(t);
        key = launcher.getLaunch(lid).key;
    }

    function _buy(PoolKey memory key, uint256 amountIn) internal returns (uint256 out) {
        vm.prank(trader);
        out = launcher.swapExactIn{value: amountIn}(key, true, uint128(amountIn), 0, trader);
    }

    // ---------- wiring ----------

    function test_hookAddressCarriesPermissionBits() public view {
        assertEq(uint160(address(hook)) & 0x3FFF, 0x20C4);
    }

    function test_setHookOnlyOnce() public {
        vm.expectRevert(RuleCraftLauncher.HookAlreadySet.selector);
        launcher.setHook(hook);
    }

    function test_setHookOnlyDeployer() public {
        RuleCraftLauncher l2 = new RuleCraftLauncher(IPoolManager(address(pm)), registry);
        vm.prank(trader);
        vm.expectRevert(RuleCraftLauncher.NotDeployer.selector);
        l2.setHook(hook);
    }

    function test_strangersCannotOpenPoolsOnTheHook() public {
        PoolKey memory key = PoolKey(Currency.wrap(address(0)), Currency.wrap(address(0xBEEF)), 10_000, 200, IHooks(address(hook)));
        vm.expectRevert();
        pm.initialize(key, _sqrtPrice());
    }

    // ---------- launch ----------

    function test_launchPutsWholeSupplyInThePool() public {
        (, RuleCraftToken token, PoolKey memory key) = _launch(_rules(RuleBounds.BURN | RuleBounds.STREAM), 0, 0);
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(address(launcher)), 0);
        assertApproxEqRel(token.balanceOf(address(pm)), SUPPLY, 1e9);
        assertEq(token.balanceOf(address(pm)) + token.balanceOf(DEAD), SUPPLY);
        RuleCraftHook.PoolRules memory pr = hook.poolRules(key.toId());
        assertTrue(pr.registered);
        assertEq(pr.rules.burnBps, 100);
    }

    function test_devBuyGoesToCreator() public {
        (, RuleCraftToken token,) = _launch(_rules(RuleBounds.BURN), 0, 0.01 ether);
        assertGt(token.balanceOf(creator), 0);
    }

    function test_rejectsBadRules() public {
        Rules memory r = _rules(RuleBounds.BURN);
        r.burnBps = 900;
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(RuleBounds.BadRules.selector, uint8(12)));
        launcher.launch(RuleCraftLauncher.LaunchParams("X", "XX", SUPPLY, _sqrtPrice(), r, 0, 0));
    }

    // ---------- swap rules ----------

    function test_buyBurnsShareOfOutput() public {
        (, RuleCraftToken token, PoolKey memory key) = _launch(_rules(RuleBounds.BURN), 0, 0);
        uint256 deadBefore = token.balanceOf(DEAD);
        uint256 out = _buy(key, 0.1 ether);
        uint256 burned = token.balanceOf(DEAD) - deadBefore;
        // out is net of the burn: burned = gross * 1%, out = gross * 99%.
        assertApproxEqAbs(burned * 99, out, 99);
        assertEq(token.balanceOf(trader), out);
    }

    function test_streamDonatesToLps() public {
        (uint256 id,, PoolKey memory key) = _launch(_rules(RuleBounds.STREAM), 0, 0);
        _buy(key, 0.2 ether);
        _buy(key, 0.2 ether);
        vm.prank(creator);
        (uint256 a0, uint256 a1) = launcher.collectFees(id);
        assertGt(a0, 0, "LP fee in ETH");
        assertGt(a1, 0, "stream donated in tokens");
    }

    function test_royaltyAndProtocolShare() public {
        Rules memory r = _rules(RuleBounds.STREAM | RuleBounds.BURN);
        vm.prank(author);
        uint256 bp = registry.publish("Slow Burn", r, 1000);
        (, RuleCraftToken token, PoolKey memory key) = _launch(r, uint64(bp), 0);
        _buy(key, 0.5 ether);
        uint256 royalty = hook.owed(author, key.currency1);
        uint256 protocol = hook.owed(treasury, key.currency1);
        assertGt(royalty, 0);
        assertEq(royalty, protocol); // both 10% of the same add-on amount
        hook.claim(author, key.currency1);
        assertEq(token.balanceOf(author), royalty);
        assertEq(hook.owed(author, key.currency1), 0);
        hook.claim(treasury, key.currency1);
        assertEq(token.balanceOf(treasury), protocol);
    }

    function test_blueprintRulesMustMatch() public {
        Rules memory r = _rules(RuleBounds.STREAM);
        vm.prank(author);
        uint256 bp = registry.publish("Stream", r, 500);
        r.streamBps = 200;
        vm.prank(creator);
        vm.expectRevert(RuleCraftLauncher.RulesMismatch.selector);
        launcher.launch(RuleCraftLauncher.LaunchParams("X", "XX", SUPPLY, _sqrtPrice(), r, uint64(bp), 0));
    }

    function test_snipeGuardCapsBuysPerBlock() public {
        (,, PoolKey memory key) = _launch(_rules(RuleBounds.GUARD), 0, 0);
        // Cap = 0.5% of supply = 5,000,000 tokens; at ~2e8 tokens/ETH that is ~0.025 ETH.
        _buy(key, 0.01 ether);
        vm.prank(trader);
        vm.expectRevert();
        launcher.swapExactIn{value: 0.05 ether}(key, true, 0.05 ether, 0, trader);
        // Next block, a fresh allowance.
        vm.roll(vm.getBlockNumber() + 1);
        _buy(key, 0.01 ether);
        // After the window the cap is gone.
        vm.roll(vm.getBlockNumber() + 61);
        _buy(key, 1 ether);
    }

    function test_guardTaxOnlyInsideWindow() public {
        (,, PoolKey memory key) = _launch(_rules(RuleBounds.GUARD), 0, 0);
        uint256 inside = _buy(key, 0.01 ether);
        vm.roll(vm.getBlockNumber() + 61);
        // Price has moved a little; compare with a second launch instead of a ratio guess.
        (,, PoolKey memory key2) = _launch(_rules(RuleBounds.GUARD), 0, 0);
        key2; // same shape, fresh pool
        vm.roll(vm.getBlockNumber() + 61);
        uint256 outside = _buy(key2, 0.01 ether);
        assertApproxEqRel(inside * 10_000 / 8000, outside, 0.01e18);
    }

    function test_sizeFeeScalesWithTrade() public {
        (,, PoolKey memory key) = _launch(_rules(RuleBounds.SIZE_FEE), 0, 0);
        _buy(key, 0.05 ether); // moves price into the range so liquidity is active
        PoolId id = key.toId();
        RuleCraftHook.PoolRules memory pr = hook.poolRules(id);
        uint24 small = hook.sizeFee(id, pr.rules, true, 1e12);
        uint24 big = hook.sizeFee(id, pr.rules, true, 1000 ether);
        assertEq(small, 3000);
        assertEq(big, 15_000);
    }

    function test_exactOutputRefused() public {
        (,, PoolKey memory key) = _launch(_rules(RuleBounds.BURN), 0, 0);
        ExactOutRouter r = new ExactOutRouter(IPoolManager(address(pm)));
        vm.expectRevert();
        r.go(key);
    }

    function test_sellHasNoAddOns() public {
        (, RuleCraftToken token, PoolKey memory key) = _launch(_rules(RuleBounds.BURN | RuleBounds.STREAM), 0, 0);
        uint256 got = _buy(key, 0.5 ether);
        uint256 deadBefore = token.balanceOf(DEAD);
        vm.startPrank(trader);
        token.approve(address(launcher), got);
        uint256 eth = launcher.swapExactIn(key, false, uint128(got), 0, trader);
        vm.stopPrank();
        assertGt(eth, 0);
        assertEq(token.balanceOf(DEAD), deadBefore);
    }

    function test_slippageProtection() public {
        (,, PoolKey memory key) = _launch(_rules(RuleBounds.BURN), 0, 0);
        vm.prank(trader);
        vm.expectRevert();
        launcher.swapExactIn{value: 0.1 ether}(key, true, 0.1 ether, type(uint256).max, trader);
    }

    // ---------- founding liquidity ----------

    function test_timelockHoldsFoundingLiquidity() public {
        (uint256 id,, PoolKey memory key) = _launch(_rules(RuleBounds.LOCK | RuleBounds.BURN), 0, 0);
        _buy(key, 0.3 ether);
        vm.prank(creator);
        vm.expectRevert();
        launcher.withdrawLiquidity(id);
        vm.prank(trader);
        vm.expectRevert(RuleCraftLauncher.NotCreator.selector);
        launcher.withdrawLiquidity(id);
        vm.warp(vm.getBlockTimestamp() + 30 days);
        uint256 before = creator.balance;
        vm.prank(creator);
        (uint256 a0,) = launcher.withdrawLiquidity(id);
        assertGt(a0, 0);
        assertEq(creator.balance, before + a0);
    }

    function test_onlyKnownPoolsRoute() public {
        PoolKey memory key = PoolKey(Currency.wrap(address(0)), Currency.wrap(address(0xBEEF)), 10_000, 200, IHooks(address(hook)));
        vm.prank(trader);
        vm.expectRevert(RuleCraftLauncher.UnknownPool.selector);
        launcher.swapExactIn{value: 1}(key, true, 1, 0, trader);
    }

    // ---------- registry ----------

    function test_registryBounds() public {
        Rules memory r = _rules(RuleBounds.STREAM);
        vm.expectRevert(BlueprintRegistry.BadShare.selector);
        registry.publish("Too greedy", r, 3000);
        vm.expectRevert(BlueprintRegistry.BadName.selector);
        registry.publish("", r, 100);
        vm.expectRevert(BlueprintRegistry.BadShare.selector);
        new BlueprintRegistry(treasury, 4000);
    }

    // ---------- fuzz ----------

    function testFuzz_validateNeverAllowsHeavyTake(uint16 tax, uint16 burn, uint16 stream) public {
        Rules memory r = _rules(RuleBounds.GUARD | RuleBounds.BURN | RuleBounds.STREAM);
        r.guardTaxBps = tax;
        r.burnBps = burn;
        r.streamBps = stream;
        try this.validateExternal(r) {
            assertLe(uint256(tax) + burn + stream, 5000);
            assertLe(burn, 500);
            assertLe(stream, 300);
            assertLe(tax, 6000);
        } catch {}
    }

    function validateExternal(Rules memory r) external pure {
        RuleBounds.validate(r);
    }

    function testFuzz_sizeFeeStaysInBounds(uint96 amountIn, uint24 minFee, uint24 maxFee, uint16 depth) public {
        minFee = uint24(bound(minFee, 500, 10_000));
        maxFee = uint24(bound(maxFee, minFee, 50_000));
        depth = uint16(bound(depth, 50, 1000));
        (,, PoolKey memory key) = _launch(_rules(RuleBounds.SIZE_FEE), 0, 0);
        _buy(key, 0.05 ether);
        Rules memory r = _rules(RuleBounds.SIZE_FEE);
        r.minFee = minFee;
        r.maxFee = maxFee;
        r.depthBps = depth;
        uint24 fee = hook.sizeFee(key.toId(), r, true, amountIn);
        assertGe(fee, minFee);
        assertLe(fee, maxFee);
    }

    function testFuzz_buyBurnExact(uint64 amountIn) public {
        uint256 amt = bound(uint256(amountIn), 1e12, 2 ether);
        (, RuleCraftToken token, PoolKey memory key) = _launch(_rules(RuleBounds.BURN), 0, 0);
        uint256 dust = token.balanceOf(DEAD);
        uint256 out = _buy(key, amt);
        uint256 burned = token.balanceOf(DEAD) - dust;
        uint256 gross = out + burned;
        // The hook burns floor(gross * 1%): exact to the wei.
        assertEq(burned, gross * 100 / 10_000);
        // Supply is conserved: pool + trader + dead.
        assertEq(token.balanceOf(address(pm)) + out + burned + dust, SUPPLY);
    }
}
