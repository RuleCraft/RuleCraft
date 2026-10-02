import { CHAIN, UNISWAP_V4 } from "@/config/brand";
import { FEE_MODEL, MODULES } from "@/config/modules";
import { FLAGS } from "@/lib/hooks";
import { type DocPage, code, h2, note, p, table, ul } from "./types";

const delta = FLAGS.filter((f) => f.group === "delta").map((f) => `\`${f.key}\``);

export const CONCEPTS: DocPage[] = [
  {
    slug: "concepts/architecture",
    title: "Architecture",
    section: "Concepts",
    summary: "One root hook, two registries, a launcher and a splitter, all sitting next to the Uniswap v4 PoolManager.",
    body: [
      p(
        `Every Uniswap v4 pool on ${CHAIN.name} lives inside one singleton contract, the PoolManager (\`${UNISWAP_V4.poolManager}\`). A pool can name one hook contract; the PoolManager calls that hook at the points its address allows. Rule Craft does not fork or wrap the PoolManager. It supplies the hook.`,
      ),
      h2("Contracts"),
      table(
        ["Contract", "Job"],
        [
          ["RuleHook", "The root hook every Rule Craft pool points at. Holds each pool's frozen rule set and dispatches to modules."],
          ["ModuleRegistry", "Lists approved modules, the callbacks each needs and the hard bounds of every parameter."],
          ["BlueprintRegistry", "Stores published blueprints: module list, parameters, author and royalty."],
          ["PoolLauncher", "Deploys a fixed-supply token, initializes the pool and adds the founding liquidity in one transaction."],
          ["RoyaltySplitter", "Splits add-on revenue between authors, LPs and the treasury."],
          ["RuleLens", "Read-only view that returns a pool's complete rule set in one call."],
        ],
      ),
      note("None of these contracts is deployed yet. Their addresses are published at launch on the [contracts page](/docs/reference/contracts)."),
      h2("Why one root hook"),
      p("A v4 hook's permissions are fixed by its address, so a hook that might need any callback must be deployed at an address that enables them all. The root hook does that once. Each pool then turns on only the modules it chose, and a callback that no chosen module uses returns immediately. The composer shows the narrower mask a pool's rules actually need, which is what you should judge it by."),
      h2("Flow of a swap"),
      ul(
        "The PoolManager calls `beforeSwap` on the root hook.",
        "The hook loads the pool's rule set and runs the modules that listen there, in a fixed order.",
        "The swap executes against concentrated liquidity as usual.",
        "`afterSwap` runs the remaining modules: burns, pots, streams, guard taxes.",
        "Add-on revenue is accounted to the splitter; the base LP fee never touches it.",
      ),
    ],
  },
  {
    slug: "concepts/rule-modules",
    title: "Rule modules",
    section: "Concepts",
    summary: "The building blocks of a rule set: what each one does and which callbacks it needs.",
    body: [
      p("A module is a small, single-purpose piece of pool logic with bounded parameters. Modules are combined, never edited: if you want different behaviour, you pick different parameters within the bounds, or a different module."),
      table(
        ["Module", "Status", "Callbacks", "What it does"],
        MODULES.map((m) => [m.name, m.status === "core" ? "Core" : "Planned", m.callbacks.map((c) => `\`${c}\``).join(", "), m.line]),
      ),
      h2("Order of execution"),
      p("When several modules listen on the same callback, they run in registry order: fee setters first, then caps and guards, then output adjustments (burn, pot), then donations. The order is fixed per module version and shown in the pool reader."),
      note("Arb Recapture is a design-stage module. Pools can be drafted with it but cannot launch with it.", "warn"),
      p("Full parameter bounds are listed in [module parameters](/docs/reference/module-parameters)."),
    ],
  },
  {
    slug: "concepts/permission-bits",
    title: "Permission bits",
    section: "Concepts",
    summary: "How a v4 hook address encodes which callbacks the PoolManager will call.",
    body: [
      p(`Uniswap v4 reads a hook's permissions from the lowest 14 bits of its address. If bit 7 is set, the PoolManager calls \`beforeSwap\`; if it is clear, it never does, whatever the code says. This makes permissions checkable by anyone in one step: take the address, mask the low 14 bits.`),
      code(`permissions = uint160(hookAddress) & 0x3FFF
beforeSwap enabled  <=>  permissions & (1 << 7) != 0`),
      h2("The delta flags matter most"),
      p(`Four flags let a hook change token amounts instead of only observing them: ${delta.join(", ")}. A hook with these can take a share of what you pay or receive. That is how burns, taxes and streams work, and it is also how a malicious hook would steal. Read every rule that uses them.`),
      h2("Consistency"),
      p("A delta flag without its base callback is invalid: `afterSwapReturnDelta` is meaningless without `afterSwap`. The composer and scanner both flag this."),
      p("The full list is in [hook permissions](/docs/reference/hook-permissions)."),
    ],
  },
  {
    slug: "concepts/fee-model",
    title: "Fee model",
    section: "Concepts",
    summary: "Base LP fee to LPs in full; the protocol and authors share only in add-on revenue.",
    body: [
      p("A trade on a Rule Craft pool can pay two kinds of charge. Keeping them separate is the core promise of the fee model."),
      table(
        ["Charge", "Who receives it"],
        [
          ["Base LP fee (static tier or Size-Scaled Fee)", "Liquidity in range, 100%."],
          ["Add-ons (guard tax, LP stream, pot, burn)", "As the module defines: LPs, the pot, or the dead address. Revenue-bearing add-ons pay a bounded share to the protocol and the blueprint author."],
        ],
      ),
      h2("Design numbers"),
      table(
        ["Parameter", "Value"],
        [
          ["Protocol share of add-on revenue", `${FEE_MODEL.protocolSharePct}% (hard cap ${FEE_MODEL.protocolShareCapPct}%)`],
          ["Blueprint royalty range", `${FEE_MODEL.royaltyMinPct}–${FEE_MODEL.royaltyMaxPct}% of add-on revenue`],
          ["Composer warning on steady take", `above ${FEE_MODEL.steadyWarnPct}% per trade`],
          ["Composer hard ceiling on any single trade", `${FEE_MODEL.hardCeilingPct}%`],
        ],
      ),
      note("These are design values for launch. They are frozen per pool at creation, so a later change never reaches an existing pool."),
      p("A pool that opts into no add-ons pays nothing to the protocol or to any author."),
    ],
  },
  {
    slug: "concepts/royalties-and-blueprints",
    title: "Royalties and blueprints",
    section: "Concepts",
    summary: "A blueprint is a published rule set. Its author earns a share of add-on revenue from every pool that uses it.",
    body: [
      p("A blueprint is a named module list with parameters, an author address and a royalty rate. It is stored on chain in the BlueprintRegistry and cannot be edited after publishing. A changed version is a new blueprint."),
      h2("How royalties flow"),
      ul(
        "A launcher opens a pool from a blueprint, or from a rule set that matches one exactly.",
        `The author's royalty (between ${FEE_MODEL.royaltyMinPct}% and ${FEE_MODEL.royaltyMaxPct}% of add-on revenue) is written into that pool and frozen.`,
        "Each swap that produces add-on revenue credits the author's balance in the RoyaltySplitter.",
        "The author claims whenever they like. Claims are pull-based; nothing is pushed to the author automatically.",
      ),
      h2("Remixing"),
      p("Anyone can start from a blueprint, change parameters and publish the result as their own. The original author earns nothing from a remix; royalties follow the exact blueprint a pool was opened with."),
      note("The blueprints shown on this site today are examples written by the team. They have no on-chain author, no pools and no royalties yet."),
    ],
  },
  {
    slug: "concepts/pool-lifecycle",
    title: "Pool lifecycle",
    section: "Concepts",
    summary: "Draft, create, guard window, steady state, unlock.",
    body: [
      table(
        ["Stage", "What happens"],
        [
          ["Draft", "You compose rules in the browser. Nothing touches the chain; the draft is saved locally."],
          ["Create", "One transaction deploys the token (for new tokens), initializes the v4 pool with the root hook and freezes the rule set."],
          ["Guard window", "If Snipe Guard is on, per-block caps and the guard tax apply for the chosen number of blocks."],
          ["Steady state", "Fees, burns, streams and pots run on every qualifying swap. Parameters never change."],
          ["Unlock", "If Liquidity Timelock is on, the founding position can be withdrawn after the unlock time."],
        ],
      ),
      p("There is no end of life. A pool keeps its rules as long as the PoolManager exists. If a better module ships later, the way to use it is a new pool, not an upgrade."),
    ],
  },
  {
    slug: "concepts/risk-score",
    title: "Risk score",
    section: "Concepts",
    summary: "How the 0–100 rule load and A–E grade are computed for composed and unknown hooks.",
    body: [
      p("The risk score measures how far a pool's rules can move a trade or a liquidity position away from a plain v4 pool. It is a reading aid, not an audit and not a safety rating of the code."),
      h2("For a composed rule set"),
      table(
        ["Factor", "Max points", "Based on"],
        [
          ["Hook permissions", "35", "Weighted callbacks the rules need"],
          ["Steady take per buy", "25", `Extra take above the LP fee, full points at ${FEE_MODEL.steadyWarnPct}%`],
          ["Opening window", "15", "Guard tax, full points at 50%"],
          ["Fee movement", "10", "Range of a size-scaled fee"],
          ["LP exits", "10", "Founding liquidity lock"],
          ["Unreleased code", "5", "Any planned module"],
        ],
      ),
      h2("For an unknown hook"),
      p("When the scanner reads a hook it did not compose, it only knows the address bits, the pool fee and whether bytecode exists. It scores permissions (40), delta rights (25), LP exit control (10), dynamic fees (10) and unknown code (15)."),
      table(["Grade", "Score", "Label"], [["A", "0–20", "Light rules"], ["B", "21–40", "Moderate rules"], ["C", "41–60", "Active rules"], ["D", "61–80", "Heavy rules"], ["E", "81–100", "Extreme rules"]]),
    ],
  },
  {
    slug: "concepts/immutability",
    title: "Immutability",
    section: "Concepts",
    summary: "What can never change after a pool is created, and what can.",
    body: [
      h2("Frozen per pool"),
      ul(
        "The module list and every parameter.",
        "The base fee tier, or the fee floor and ceiling of a size-scaled fee.",
        "The protocol share and blueprint royalty.",
        "The unlock time of a locked founding position.",
      ),
      h2("Not frozen"),
      ul(
        "The ModuleRegistry can approve new modules for new pools. Existing pools never pick them up.",
        "Treasury addresses that receive the protocol share may be rotated by governance, within the frozen rate.",
      ),
      note("The root hook has no admin function that edits a live pool's rules. If you see a pool whose rules changed, it is not a Rule Craft pool.", "warn"),
    ],
  },
];
