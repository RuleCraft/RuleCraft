import { CHAIN, CONTRACTS, UNISWAP_V4 } from "@/config/brand";
import { MODULES } from "@/config/modules";
import { FLAGS } from "@/lib/hooks";
import { type DocPage, code, h2, note, p, table } from "./types";

export const REFERENCE: DocPage[] = [
  {
    slug: "reference/contracts",
    title: "Contracts and addresses",
    section: "Reference",
    summary: "Rule Craft contracts (published at launch) and the Uniswap v4 contract they build on.",
    body: [
      h2(`Uniswap v4 on ${CHAIN.name}`),
      table(
        ["Contract", "Address", "Checked"],
        [["PoolManager", UNISWAP_V4.poolManager, "Bytecode present and emits the v4 `Initialize` event (2 Oct 2026)"]],
      ),
      h2("Rule Craft"),
      table(
        ["Contract", "Role", "Address"],
        CONTRACTS.map((c) => [c.name, c.role, c.address || "Published at launch"]),
      ),
      note("Only trust addresses shown here and on the site footer. Any other address claiming to be Rule Craft is not.", "warn"),
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
      p("Bounds are enforced by the ModuleRegistry at pool creation. The composer uses the same values."),
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
    summary: "The spec JSON produced by the composer.",
    body: [
      p("The composer's \"Copy spec\" button produces this shape. The launcher accepts the same structure."),
      code(`{
  "name": string,
  "chainId": 4663,
  "poolKey": {
    "currency0": "ETH (address(0))",
    "currency1": "<token>",
    "fee": number | "0x800000 (dynamic)",
    "tickSpacing": number,
    "hooks": "<RuleHook address ending in mask 0x....>"
  },
  "permissions": { "<callback>": boolean, ... 14 keys },
  "modules": [ { "module": slug, "status": "core" | "planned", "params": { key: number } } ],
  "royaltyPctOfAddOns": number,
  "protocolSharePctOfAddOns": number,
  "maxTakePct": { "buy": number, "sell": number, "buyDuringGuard": number },
  "frozenAtCreation": true
}`),
      p("`fee` is in hundredths of a basis point (3000 = 0.30%), as in v4."),
    ],
  },
  {
    slug: "reference/errors",
    title: "Errors",
    section: "Reference",
    summary: "Revert reasons the contracts are designed to use.",
    body: [
      note("Design names. Final selectors are published with the ABIs at launch."),
      table(
        ["Error", "When"],
        [
          ["UnknownModule(bytes32)", "A rule set names a module the registry has not approved."],
          ["ParamOutOfBounds(bytes32,uint256)", "A parameter is outside its registered bounds."],
          ["TakeAboveCeiling(uint256)", "The worst-case take of one trade exceeds the hard ceiling."],
          ["GuardCapReached(uint256)", "Snipe Guard: this block's buy cap is full."],
          ["LiquidityLocked(uint256)", "Liquidity Timelock: the founding position is locked until the given time."],
          ["PlannedModule(bytes32)", "A planned module was included in a launch."],
          ["NothingToClaim()", "A claim with a zero balance."],
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
      note("Design signatures, final at launch."),
      code(`event RulesFrozen(bytes32 indexed poolId, bytes32 indexed blueprintId, bytes rules);
event BlueprintPublished(bytes32 indexed blueprintId, address indexed author, uint16 royaltyBps);
event GuardTax(bytes32 indexed poolId, address indexed buyer, uint256 amount);
event Burned(bytes32 indexed poolId, uint256 amount);
event Streamed(bytes32 indexed poolId, uint256 amount);
event PotWon(bytes32 indexed poolId, address indexed winner, uint256 slot, uint256 amount);
event RoyaltyAccrued(bytes32 indexed blueprintId, uint256 amount);
event Claimed(address indexed account, uint256 amount);`),
      p(`Pool creation itself is visible today through the PoolManager's \`Initialize\` event on ${CHAIN.name}, which is what the [pools page](/app) reads.`),
    ],
  },
];
