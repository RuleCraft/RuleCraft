// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {Rules, RuleBounds} from "../src/RuleTypes.sol";
import {RuleCraftHook} from "../src/RuleCraftHook.sol";
import {RuleCraftLauncher} from "../src/RuleCraftLauncher.sol";
import {RuleCraftToken} from "../src/RuleCraftToken.sol";
import {BlueprintRegistry} from "../src/BlueprintRegistry.sol";

struct QuoteExactSingleParams {
    PoolKey poolKey;
    bool zeroForOne;
    uint128 exactAmount;
    bytes hookData;
}

interface IV4Quoter {
    function quoteExactInputSingle(QuoteExactSingleParams memory params) external returns (uint256 amountOut, uint256 gasEstimate);
}

/// Runs against Robinhood Chain (set FORK_URL): real PoolManager, real Quoter, the
/// deterministic CREATE2 deployer, and the same salt mining the /deploy page does.
contract ForkTest is Test {
    IPoolManager constant PM = IPoolManager(0x8366a39CC670B4001A1121B8F6A443A643e40951);
    IV4Quoter constant QUOTER = IV4Quoter(0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94);
    address constant CREATE2 = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function test_fork_launchSwapQuote() public {
        string memory url = vm.envOr("FORK_URL", string(""));
        if (bytes(url).length == 0) return;
        vm.createSelectFork(url);
        address treasury = makeAddr("treasury");
        BlueprintRegistry reg = new BlueprintRegistry(treasury, 1000);
        RuleCraftLauncher launcher = new RuleCraftLauncher(PM, reg);

        bytes memory init = abi.encodePacked(type(RuleCraftHook).creationCode, abi.encode(address(PM), address(launcher), treasury));
        bytes32 initHash = keccak256(init);
        bytes32 salt;
        address predicted;
        for (uint256 i = 0; i < 200_000; i++) {
            salt = bytes32(i);
            predicted = address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), CREATE2, salt, initHash)))));
            if (uint160(predicted) & 0x3FFF == 0x20C4) break;
        }
        (bool ok,) = CREATE2.call(abi.encodePacked(salt, init));
        require(ok, "create2");
        assertGt(predicted.code.length, 0);
        launcher.setHook(RuleCraftHook(payable(predicted)));

        Rules memory r;
        r.modules = RuleBounds.GUARD | RuleBounds.BURN | RuleBounds.STREAM;
        r.baseFee = 10_000;
        r.guardBlocks = 30;
        r.maxBuyBps = 100;
        r.guardTaxBps = 1500;
        r.burnBps = 100;
        r.streamBps = 50;
        uint256 supply = 1_000_000_000 ether;
        uint160 sqrtP = uint160(_sqrt(supply / 5 ether) << 96);
        (, address token,) = launcher.launch(RuleCraftLauncher.LaunchParams("Fork Test", "FORK", supply, sqrtP, r, 0, 0));
        PoolKey memory key = launcher.getLaunch(1).key;

        address trader = makeAddr("trader");
        vm.deal(trader, 1 ether);
        (uint256 quoted,) = QUOTER.quoteExactInputSingle(QuoteExactSingleParams(key, true, 0.01 ether, ""));
        vm.prank(trader);
        uint256 out = launcher.swapExactIn{value: 0.01 ether}(key, true, 0.01 ether, 0, trader);
        assertEq(out, quoted, "quoter matches execution");
        assertEq(RuleCraftToken(token).balanceOf(trader), out);
    }

    function _sqrt(uint256 x) internal pure returns (uint256 z) {
        z = x;
        uint256 y = (x + 1) / 2;
        while (y < z) { z = y; y = (x / y + y) / 2; }
    }
}
