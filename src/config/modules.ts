import type { FlagKey } from "@/lib/hooks";

/*
 * Rule modules: the building blocks a pool's rule set is composed from. Each
 * one names the v4 callbacks it needs, its parameters with hard bounds, and
 * how much it can take from a trade at its current settings. The composer,
 * the blueprint pages, the launch form and the docs all read from here.
 *
 * Nothing here is deployed yet. Gas figures are design estimates.
 */

export type Param = {
  key: string;
  label: string;
  unit: "%" | "blocks" | "days" | "ETH" | "buys";
  min: number;
  max: number;
  step: number;
  def: number;
  help: string;
};

export type ModuleStatus = "core" | "planned";

export type RuleModule = {
  slug: string;
  name: string;
  /** Short verb line for cards. */
  line: string;
  summary: string;
  status: ModuleStatus;
  callbacks: FlagKey[];
  /** Pool must be created with the v4 dynamic fee flag. */
  dynamicFee: boolean;
  gas: string;
  params: Param[];
  /** Which side of a trade the module can touch. */
  touches: ("buy" | "sell" | "lp")[];
  how: string[];
  tradeoffs: string[];
  /** Personas who usually reach for it. */
  for: string[];
  glyph: "shield" | "gauge" | "flame" | "drip" | "bell" | "lock" | "loop";
};

export const MODULES: RuleModule[] = [
  {
    slug: "snipe-guard",
    name: "Snipe Guard",
    line: "Caps buys per block and taxes the opening window.",
    summary:
      "For a fixed number of blocks after the pool opens, each block accepts only a small slice of supply and every buy pays an extra tax to the LPs. Bots that race the first block get little and pay a lot.",
    status: "core",
    callbacks: ["beforeInitialize", "afterSwap", "afterSwapReturnDelta"],
    dynamicFee: false,
    gas: "~150k per swap (est.)",
    touches: ["buy"],
    params: [
      { key: "guardBlocks", label: "Guard window", unit: "blocks", min: 5, max: 600, step: 5, def: 60, help: "How many blocks after opening the guard stays on." },
      { key: "maxBuyPct", label: "Max buys per block", unit: "%", min: 0.1, max: 5, step: 0.1, def: 0.5, help: "Share of total supply all buyers together may take in one block." },
      { key: "guardTaxPct", label: "Guard tax", unit: "%", min: 0, max: 60, step: 1, def: 25, help: "Extra cut of each buy during the window, paid to in-range LPs." },
    ],
    how: [
      "beforeInitialize stores the opening block number for the pool.",
      "afterSwap adds each buy's token output to a per-block tally and reverts once the block's cap is full.",
      "afterSwap also takes the guard tax from the buyer's token output: royalty and protocol share are set aside, the rest is donated to in-range LPs.",
      "After the window both checks switch off for good; the hook keeps no switch to turn them back on.",
    ],
    tradeoffs: [
      "A very low cap with a short window can leave honest early buyers unfilled.",
      "Pairs badly with a Milestone Pot whose minimum buy is larger than the guard's per-block cap.",
    ],
    for: ["Launchers", "Traders"],
    glyph: "shield",
  },
  {
    slug: "size-fee",
    name: "Size-Scaled Fee",
    line: "The LP fee grows with trade size against depth.",
    summary:
      "Small trades pay the floor fee. As a trade gets large relative to the liquidity in range, the fee climbs toward the ceiling, so size that moves the price pays the LPs for it.",
    status: "core",
    callbacks: ["beforeSwap"],
    dynamicFee: true,
    gas: "~110k per swap (est.)",
    touches: ["buy", "sell"],
    params: [
      { key: "minFeePct", label: "Fee floor", unit: "%", min: 0.05, max: 1, step: 0.05, def: 0.3, help: "Fee a small trade pays." },
      { key: "maxFeePct", label: "Fee ceiling", unit: "%", min: 0.1, max: 5, step: 0.05, def: 1.5, help: "Fee once a trade reaches the depth threshold." },
      { key: "depthPct", label: "Depth threshold", unit: "%", min: 0.5, max: 10, step: 0.5, def: 2, help: "Trade size, as a share of in-range liquidity, where the ceiling applies." },
    ],
    how: [
      "The pool is created with the v4 dynamic-fee flag, so the hook sets the LP fee per swap.",
      "beforeSwap reads in-range liquidity, turns it into the virtual reserve of the input token, scales the fee linearly between floor and ceiling, and returns it with the override bit.",
      "All of the fee goes to LPs like any v4 fee; the module itself keeps nothing.",
    ],
    tradeoffs: ["Large trades get quoted higher than on a flat-fee pool; routers that split orders handle this better."],
    for: ["LPs", "Launchers"],
    glyph: "gauge",
  },
  {
    slug: "buy-burn",
    name: "Buy Burn",
    line: "Burns a share of every buy's token output.",
    summary: "A fixed share of the tokens each buyer receives is sent to the dead address inside the swap. Supply only goes down, and the receipt shows exactly how much.",
    status: "core",
    callbacks: ["afterSwap", "afterSwapReturnDelta"],
    dynamicFee: false,
    gas: "~130k per swap (est.)",
    touches: ["buy"],
    params: [{ key: "burnPct", label: "Burn share", unit: "%", min: 0.1, max: 5, step: 0.1, def: 1, help: "Share of each buy's token output that is burned." }],
    how: [
      "afterSwap sees the exact token amount the buy produces.",
      "With afterSwapReturnDelta it takes the burn share and sends it to 0x…dEaD in the same transaction.",
      "Sells are untouched.",
    ],
    tradeoffs: ["Buyers receive slightly less than the curve quote; quoters that ignore hooks will over-promise."],
    for: ["Launchers", "Traders"],
    glyph: "flame",
  },
  {
    slug: "lp-stream",
    name: "LP Stream",
    line: "Routes a share of every buy to in-range LPs.",
    summary: "Each buy sets aside a share of the tokens it receives and donates it to the liquidity in range, on top of the swap fee. LPs earn more from demand without a separate farm.",
    status: "core",
    callbacks: ["afterSwap", "afterSwapReturnDelta"],
    dynamicFee: false,
    gas: "~140k per swap (est.)",
    touches: ["buy", "lp"],
    params: [{ key: "sharePct", label: "Stream share", unit: "%", min: 0.1, max: 3, step: 0.1, def: 1, help: "Share of each buy's token output donated to in-range LPs." }],
    how: [
      "afterSwap takes the stream share from the tokens the buyer receives, using afterSwapReturnDelta.",
      "It donates them to in-range positions through the PoolManager in the same call. Royalty and protocol share come out of this amount first.",
      "Positions out of range earn nothing from the stream, just as with fees.",
    ],
    tradeoffs: ["A wide stream share makes buys more expensive than sells; it is visible in every quote."],
    for: ["LPs", "Launchers"],
    glyph: "drip",
  },
  {
    slug: "milestone-pot",
    name: "Milestone Pot",
    line: "Every Nth qualifying buy wins the pot.",
    summary: "A small share of each qualifying buy fills a pot. A public counter decides the winner: the Nth qualifying buy takes it. No randomness and no operator. Planned: not in the first on-chain release, because a router-based swap cannot prove who the buyer is without trusting tx.origin.",
    status: "planned",
    callbacks: ["afterSwap", "afterSwapReturnDelta"],
    dynamicFee: false,
    gas: "~170k per swap (est.)",
    touches: ["buy"],
    params: [
      { key: "everyN", label: "Winning slot", unit: "buys", min: 10, max: 5000, step: 10, def: 100, help: "The pot pays on every Nth qualifying buy." },
      { key: "potPct", label: "Pot share", unit: "%", min: 0.1, max: 3, step: 0.1, def: 1, help: "Share of each qualifying buy added to the pot." },
      { key: "minBuyEth", label: "Minimum buy", unit: "ETH", min: 0.001, max: 1, step: 0.001, def: 0.01, help: "Smallest buy that counts toward the counter." },
    ],
    how: [
      "afterSwap checks the buy against the minimum and advances the counter once per block at most.",
      "The pot share is held by the hook through afterSwapReturnDelta.",
      "When the counter hits a multiple of N, the pot is credited to that buyer to claim.",
    ],
    tradeoffs: ["Predictable by design: anyone can see which slot is next. That is the point, but it invites slot racing late in a cycle."],
    for: ["Launchers", "Traders"],
    glyph: "bell",
  },
  {
    slug: "lp-timelock",
    name: "Liquidity Timelock",
    line: "Founding liquidity cannot leave before the unlock date.",
    summary: "The position that opens the pool is locked until a fixed date. Other LPs come and go freely. Traders can read the unlock time before they buy.",
    status: "core",
    callbacks: [],
    dynamicFee: false,
    gas: "none on swaps",
    touches: ["lp"],
    params: [{ key: "lockDays", label: "Lock length", unit: "days", min: 1, max: 365, step: 1, def: 30, help: "How long the founding position stays locked." }],
    how: [
      "The launcher itself owns the founding position, so no hook callback is needed.",
      "Withdrawing it reverts until the unlock time; only the creator can withdraw, and only to themselves.",
      "Fees earned by the founding position can be collected by the creator at any time. No swap path is touched.",
    ],
    tradeoffs: ["The founder cannot rescue liquidity early, even for a good reason. That is the guarantee."],
    for: ["Traders", "Launchers"],
    glyph: "lock",
  },
  {
    slug: "arb-recapture",
    name: "Arb Recapture",
    line: "Keeps part of arbitrage value inside the pool.",
    summary:
      "When the pool's price drifts from other venues, the next swap that closes the gap pays part of that value back to the pool's LPs instead of all of it leaving with an outside bot. Design stage; not part of the first release.",
    status: "planned",
    callbacks: ["beforeSwap", "afterSwap", "beforeSwapReturnDelta"],
    dynamicFee: true,
    gas: "~190k per swap (design target)",
    touches: ["buy", "sell", "lp"],
    params: [{ key: "recapturePct", label: "Recaptured share", unit: "%", min: 10, max: 90, step: 5, def: 50, help: "Share of the measured price gap returned to LPs." }],
    how: [
      "beforeSwap compares the pool price with a reference price and measures the gap the swap closes.",
      "A share of that gap is charged as extra fee and donated to in-range LPs after the swap.",
      "Needs a manipulation-resistant reference price; that is the open design question.",
    ],
    tradeoffs: ["Depends on a reference price the pool does not control. It ships only after that source is settled and reviewed."],
    for: ["LPs", "Analysts"],
    glyph: "loop",
  },
];

export const MODULE_BY_SLUG = Object.fromEntries(MODULES.map((m) => [m.slug, m])) as Record<string, RuleModule>;

export type ParamValues = Record<string, Record<string, number>>;

export function defaultParams(slugs: string[]): ParamValues {
  const out: ParamValues = {};
  for (const s of slugs) {
    const m = MODULE_BY_SLUG[s];
    if (!m) continue;
    out[s] = Object.fromEntries(m.params.map((p) => [p.key, p.def]));
  }
  return out;
}

export const BASE_FEES = [
  { pct: 0.05, label: "0.05%", note: "Pegged or very stable pairs" },
  { pct: 0.3, label: "0.30%", note: "Most pairs" },
  { pct: 1, label: "1.00%", note: "Thin or volatile pairs" },
];

/**
 * Design numbers for the fee model. Not deployed; documented as design in the
 * docs and the token page. Change them here and in the docs together.
 */
export const FEE_MODEL = {
  /** Share of add-on revenue (never of the base LP fee) kept by the protocol. */
  protocolSharePct: 10,
  protocolShareCapPct: 30,
  /** Range a blueprint author may set as royalty, as a share of add-on revenue. */
  royaltyMinPct: 0,
  royaltyMaxPct: 25,
  /** Combined take from one trade the composer refuses outright. */
  hardCeilingPct: 50,
  /** Steady-state take that earns a warning. */
  steadyWarnPct: 10,
};
