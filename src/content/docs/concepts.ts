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
    summary: "Three contracts next to the Uniswap v4 PoolManager: one hook, one launcher, one blueprint registry.",
    body: [
      p(
        `Every Uniswap v4 pool on ${CHAIN.name} lives inside one singleton contract, the PoolManager (\`${UNISWAP_V4.poolManager}\`). A pool can name one hook contract; the PoolManager calls that hook at the points its address allows. Rule Craft does not fork or wrap the PoolManager. It supplies the hook.`,
      ),
      h2("Contracts"),
      table(
        ["Contract", "Job"],
        [
          ["RuleCraftHook", "The one hook every Rule Craft pool points at (permission mask 0x20C4). Stores each pool's frozen rules, refuses exact-output swaps, applies add-ons to buys and pays royalties and protocol share to whoever is owed. No owner."],
          ["RuleCraftLauncher", "Mints a fixed-supply token, opens its pool with the rules, seeds the whole supply as liquidity, holds that founding position for the creator and routes exact-input swaps."],
          ["BlueprintRegistry", "Stores published blueprints (rules, author, royalty). Fixes the treasury and the protocol share when it is deployed."],
        ],
      ),
      note("The contracts are written and tested but not deployed yet, and they are unaudited. Their addresses appear on the [contracts page](/docs/reference/contracts) once the owner deploys them."),
      h2("Why one hook"),
      p("A v4 hook's permissions are fixed by its address. RuleCraftHook is mined to an address ending in 0x20C4: beforeInitialize, beforeSwap, afterSwap and afterSwapReturnDelta. Every Rule Craft pool points at it, so every pool shows the same four bits; what differs is the frozen rule set stored for each pool, which decides what those callbacks do."),
      h2("Flow of a swap"),
      ul(
        "The PoolManager calls `beforeSwap` on RuleCraftHook. It refuses exact-output swaps and, if Size-Scaled Fee is on, returns the LP fee for this trade.",
        "The swap executes against concentrated liquidity as usual.",
        "On a buy, `afterSwap` checks the Snipe Guard cap, then takes the burn, guard tax and LP stream from the token output.",
        "From the guard tax and stream (add-on revenue) it sets aside the blueprint royalty and protocol share, and donates the rest to in-range LPs. Sells pay only the LP fee.",
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
      p("Inside the hook the order is fixed: the size fee is set in beforeSwap; in afterSwap the guard cap is checked first, then burn, guard tax and stream are taken from the buy's token output, then royalty and protocol share are set aside and the rest is donated. Liquidity Timelock needs no callback: the launcher owns the founding position."),
      note("Milestone Pot and Arb Recapture are planned and not part of the on-chain v1. Rule sets can be drafted with them but cannot launch with them.", "warn"),
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
          ["Buy Burn", "The dead address (0x…dEaD), in full."],
          ["Guard tax and LP Stream (add-on revenue)", "Blueprint royalty and protocol share come out first; the rest is donated to in-range LPs. If no liquidity is in range, the add-on is not charged."],
        ],
      ),
      h2("Numbers"),
      table(
        ["Parameter", "Value"],
        [
          ["Protocol share of add-on revenue", `${FEE_MODEL.protocolSharePct}% by default, set once when the registry is deployed (contract cap ${FEE_MODEL.protocolShareCapPct}%)`],
          ["Blueprint royalty range", `${FEE_MODEL.royaltyMinPct}–${FEE_MODEL.royaltyMaxPct}% of add-on revenue`],
          ["Composer warning on steady take", `above ${FEE_MODEL.steadyWarnPct}% per trade`],
          ["Composer hard ceiling on any single trade", `${FEE_MODEL.hardCeilingPct}%`],
        ],
      ),
      note("Royalty and protocol share are copied into each pool when it opens and never change for that pool. The treasury address is fixed in the registry; nobody can redirect it."),
      p("A pool that opts into no add-ons pays nothing to the protocol or to any author."),
    ],
  },
  {
    slug: "concepts/royalties-and-blueprints",
    title: "Royalties and blueprints",
    section: "Concepts",
    summary: "A blueprint is a published rule set. Its author earns a share of add-on revenue from every pool that uses it.",
    body: [
      p("A blueprint is a name, a rule set, an author address and a royalty rate, stored in the BlueprintRegistry by `publish(name, rules, royaltyBps)`. Anyone can publish. It cannot be edited after publishing; a changed version is a new blueprint."),
      h2("How royalties flow"),
      ul(
        "A launch names a blueprint id. The launcher checks that the rules are identical to the published ones (same hash), or reverts with RulesMismatch.",
        `The author's royalty (between ${FEE_MODEL.royaltyMinPct}% and ${FEE_MODEL.royaltyMaxPct}% of add-on revenue) is written into that pool and frozen.`,
        "Each buy that produces add-on revenue credits the author's balance inside RuleCraftHook, in the pool's token.",
        "Anyone can call `claim(account, currency)`; it always pays the account it was credited to. Nothing is pushed automatically.",
      ),
      h2("Remixing"),
      p("Anyone can start from a blueprint, change parameters and publish the result as their own. The original author earns nothing from a remix; royalties follow the exact blueprint a pool was opened with."),
      note("The example blueprints on this site are written by the team and are not on chain. Published blueprints are listed separately on the rules page, read from the registry."),
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
          ["Create", "One `launch` transaction mints the token, registers its frozen rules on RuleCraftHook, opens the v4 pool at a tick boundary and puts the whole supply in one token-only range below the opening price. An optional dev buy runs in the same transaction under the same rules."],
          ["Guard window", "If Snipe Guard is on, per-block caps and the guard tax apply for the chosen number of blocks."],
          ["Steady state", "Fees, burns and streams run on every buy; sells pay only the LP fee. Parameters never change."],
          ["Unlock", "The creator can collect the founding position's fees at any time. With Liquidity Timelock the position can be withdrawn only after the unlock time; without it, at any time."],
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
        "Nothing on chain. The hook and registry have no owner, and the launcher's only admin call (setting the hook) can be made once.",
        "New modules mean new contracts and new pools. Existing pools never pick them up.",
      ),
      note("RuleCraftHook has no admin function at all. If you see a pool whose rules changed, it is not a Rule Craft pool.", "warn"),
    ],
  },
];
