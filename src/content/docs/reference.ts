import { CHAIN, CONTRACTS, UNISWAP_V4 } from "@/config/brand";
import { MODULES } from "@/config/modules";
import { FLAGS } from "@/lib/hooks";
import { type DocPage, code, h2, note, p, table } from "./types";

export const REFERENCE: DocPage[] = [
  {
    slug: "reference/contracts",
    title: "Contracts and addresses",
    section: "Reference",
    summary: "The three Rule Craft contracts and the Uniswap v4 contracts they build on.",
    body: [
      h2(`Uniswap v4 on ${CHAIN.name}`),
      p("From Uniswap's official v4 deployment list for chain 4663; bytecode checked on 2 Oct 2026."),
      table(
        ["Contract", "Address", "Used for"],
        [
          ["PoolManager", UNISWAP_V4.poolManager, "Every pool, every swap"],
          ["V4 Quoter", UNISWAP_V4.quoter, "Swap quotes on pool pages"],
          ["PositionManager", UNISWAP_V4.positionManager, "Other LPs' positions"],
          ["StateView", UNISWAP_V4.stateView, "Read-only pool state"],
          ["Universal Router", UNISWAP_V4.universalRouter, "Not used by Rule Craft (it routes exact-input swaps through its own launcher)"],
          ["Permit2", UNISWAP_V4.permit2, "Not used by Rule Craft"],
        ],
      ),
      h2("Rule Craft"),
      table(
        ["Contract", "Role", "Address"],
        CONTRACTS.map((c) => [c.name, c.role, c.address || "Not deployed yet"]),
      ),
      note("The Rule Craft contracts are unaudited. They have no owner and no upgrade path; the launcher's single admin call (setting the hook) can be made once, by its deployer.", "warn"),
      p("The hook is deployed through the deterministic CREATE2 deployer `0x4e59b44847b379578588920cA78FbF26c0B4956C` with a salt mined so its address ends in the permission mask 0x20C4. Sources and tests live in the repository under `contracts/` (Foundry: `contracts/setup.sh`, then `forge build` and `forge test`)."),
      note("Only trust addresses shown here and on the site. Any other address claiming to be Rule Craft is not.", "warn"),
    ],
  },
  {
    slug: "reference/hook-permissions",
    title: "Hook permissions",
    section: "Reference",
    summary: "All 14 Uniswap v4 callbacks, their bit, and what to watch for.",
    body: [
      p("Bit numbers count from the least significant bit of the hook address."),
      table(
        ["Callback", "Bit", "Meaning", "Watch for"],
        FLAGS.map((f) => [f.key, String(f.bit), f.meaning, f.watch]),
      ),
    ],
  },
  {
    slug: "reference/module-parameters",
    title: "Module parameters",
    section: "Reference",
    summary: "Every parameter, its bounds and its default.",
    body: [
      p("Bounds are enforced on chain (RuleBounds, used by the registry, the launcher and the hook). The composer uses the same values. Planned modules are drafting-only."),
      ...MODULES.flatMap((m) => [
        h2(`${m.name}${m.status === "planned" ? " (planned)" : ""}`),
        table(
          ["Key", "Label", "Min", "Max", "Default", "Unit"],
          m.params.map((x) => [x.key, x.label, String(x.min), String(x.max), String(x.def), x.unit]),
        ),
      ]),
    ],
  },
  {
    slug: "reference/config-schema",
    title: "Config schema",
    section: "Reference",
    summary: "The Rules struct every Rule Craft pool is created with.",
    body: [
      p("A pool's rules are one Solidity struct, validated by the contracts and frozen when the pool opens. Fees are in v4 pips (1,000,000 = 100%); shares are in basis points (10,000 = 100%). Fields of modules that are off must be zero, so one rule set has exactly one encoding and one hash."),
      code(`struct Rules {
  uint8  modules;      // bit flags: 1 Snipe Guard, 2 Size-Scaled Fee, 4 Buy Burn, 8 LP Stream, 16 Liquidity Timelock
  uint24 baseFee;      // pips; 500, 3000 or 10000 when Size-Scaled Fee is off, else 0
  uint32 guardBlocks;  // 5–600
  uint16 maxBuyBps;    // share of supply all buyers may receive per block during the guard, 10–500
  uint16 guardTaxBps;  // 0–6000
  uint24 minFee;       // pips, 500–10000 (Size-Scaled Fee)
  uint24 maxFee;       // pips, minFee–50000
  uint16 depthBps;     // trade size vs in-range virtual reserve where maxFee applies, 50–1000
  uint16 burnBps;      // 10–500
  uint16 streamBps;    // 10–300
  uint32 lockDays;     // 1–3650
}`),
      p("guardTaxBps + burnBps + streamBps may not exceed 5,000 (50%). A pool's key is ETH (currency0) / token (currency1), fee `0x800000` (dynamic) when Size-Scaled Fee is on, tick spacing 10 / 60 / 200 by fee tier (60 for dynamic), hooks = RuleCraftHook."),
      p("The composer's \"Copy spec\" JSON shows the same rule set in percent, plus the worst-case take it computes."),
    ],
  },
  {
    slug: "reference/errors",
    title: "Errors",
    section: "Reference",
    summary: "Custom errors the contracts revert with.",
    body: [
      table(
        ["Error", "Contract", "When"],
        [
          ["BadRules(uint8 code)", "all", "A rule parameter is outside its bounds, a disabled module carries non-zero fields, or the add-ons exceed 50%. The code names the check."],
          ["GuardCapExceeded(uint256 cap, uint256 wouldHave)", "Hook", "Snipe Guard: this block's buy cap is full."],
          ["ExactInputOnly()", "Hook", "An exact-output swap on a Rule Craft pool."],
          ["NotLauncher()", "Hook", "Someone other than the launcher tried to register or open a pool on the hook."],
          ["NotRegistered()", "Hook", "A swap or initialize on a pool the hook has no rules for."],
          ["WrongPoolShape()", "Hook", "Pool key does not match the rules (currency, fee or hook)."],
          ["RulesMismatch()", "Launcher", "Launch names a blueprint whose rules differ."],
          ["Slippage(uint256 out, uint256 minOut)", "Launcher", "Output below the minimum."],
          ["StillLocked(uint64 unlockAt)", "Launcher", "Founding liquidity withdrawal before the unlock time."],
          ["NotCreator()", "Launcher", "Fee collection or withdrawal by someone other than the creator."],
          ["HookAlreadySet()", "Launcher", "setHook called a second time."],
          ["NotDeployer()", "Launcher", "setHook from a wallet other than the deployer."],
          ["UnknownPool()", "Launcher", "swapExactIn on a pool the launcher did not open."],
          ["BadShare()", "Registry", "Royalty above 25%, or protocol share above 30% at deployment."],
          ["BadName()", "Registry, Launcher", "Empty or too long name or ticker."],
          ["BadTreasury()", "Registry", "Zero treasury address at deployment."],
          ["UnknownBlueprint()", "Registry", "Blueprint id does not exist."],
        ],
      ),
    ],
  },
  {
    slug: "reference/events",
    title: "Events",
    section: "Reference",
    summary: "Events for indexers.",
    body: [
      code(`// RuleCraftHook
event PoolRulesSet(PoolId indexed id, uint64 indexed blueprintId, address author, Rules rules, uint128 maxBuyPerBlock);
event RulesApplied(PoolId indexed id, uint256 burned, uint256 toLps, uint256 royalty, uint256 protocol);
event Claimed(address indexed account, Currency indexed currency, uint256 amount);

// RuleCraftLauncher
event HookSet(address hook);
event Launched(uint256 indexed launchId, address indexed token, PoolId indexed poolId, address creator, uint64 blueprintId, uint256 supply, uint256 devBuyOut);
event Swapped(PoolId indexed poolId, address indexed trader, bool buy, uint256 amountIn, uint256 amountOut);
event FeesCollected(uint256 indexed launchId, uint256 amount0, uint256 amount1);
event LiquidityWithdrawn(uint256 indexed launchId, uint256 amount0, uint256 amount1);

// BlueprintRegistry
event BlueprintPublished(uint256 indexed id, address indexed author, bytes32 rulesHash, uint16 royaltyBps, string name, Rules rules);`),
      p(`Pool creation is also visible through the PoolManager's \`Initialize\` event on ${CHAIN.name}, which is what the [pools page](/app) reads for every v4 pool.`),
    ],
  },
];
