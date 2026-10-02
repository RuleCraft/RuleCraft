import type { ParamValues } from "@/config/modules";

/*
 * Example blueprints. Written by the Rule Craft team to show what a
 * published rule set looks like. None of them is deployed, none has an
 * on-chain author, and none has pools or royalties yet. Every page that shows
 * them labels them "Example".
 */

export type Blueprint = {
  slug: string;
  name: string;
  pitch: string;
  story: string;
  modules: string[];
  params: ParamValues;
  baseFeePct: number;
  royaltyPct: number;
  persona: "Launchers" | "LPs" | "Traders" | "Hook Builders";
  tags: string[];
};

export const BLUEPRINTS: Blueprint[] = [
  {
    slug: "quiet-open",
    name: "Quiet Open",
    pitch: "A launch that bots find expensive and humans find fair.",
    story:
      "A short, sharp guard window keeps the first blocks calm, then the pool settles into a flat fee. Founding liquidity is locked for a month so nobody worries about the floor vanishing.",
    modules: ["snipe-guard", "lp-timelock"],
    params: { "snipe-guard": { guardBlocks: 40, maxBuyPct: 0.4, guardTaxPct: 20 }, "lp-timelock": { lockDays: 30 } },
    baseFeePct: 1,
    royaltyPct: 5,
    persona: "Launchers",
    tags: ["launch", "anti-bot", "locked"],
  },
  {
    slug: "deep-water",
    name: "Deep Water",
    pitch: "Fees that charge size, not people.",
    story: "Built for pairs that already trade. Small swaps pay a low floor; whales pay for the depth they consume. No taxes, no burns, nothing hidden: just a fee curve.",
    modules: ["size-fee"],
    params: { "size-fee": { minFeePct: 0.25, maxFeePct: 1.2, depthPct: 2 } },
    baseFeePct: 0.3,
    royaltyPct: 8,
    persona: "LPs",
    tags: ["existing pair", "dynamic fee"],
  },
  {
    slug: "slow-burn",
    name: "Slow Burn",
    pitch: "Supply shrinks a little with every buy.",
    story: "One percent of each buy's tokens is burned in the swap, and a light LP stream rewards the people keeping the book deep. Sells pay only the base fee.",
    modules: ["buy-burn", "lp-stream"],
    params: { "buy-burn": { burnPct: 1 }, "lp-stream": { sharePct: 0.5 } },
    baseFeePct: 1,
    royaltyPct: 10,
    persona: "Launchers",
    tags: ["deflationary", "LP rewards"],
  },
  {
    slug: "bell-ringer",
    name: "Bell Ringer",
    pitch: "Every 250th buy takes the pot.",
    story: "A visible counter turns buying into a small game with no randomness to trust. Guard window first, with a per-block cap large enough that qualifying buys still fit.",
    modules: ["snipe-guard", "milestone-pot"],
    params: { "snipe-guard": { guardBlocks: 30, maxBuyPct: 1, guardTaxPct: 15 }, "milestone-pot": { everyN: 250, potPct: 1, minBuyEth: 0.01 } },
    baseFeePct: 1,
    royaltyPct: 12,
    persona: "Traders",
    tags: ["game", "pot", "anti-bot"],
  },
  {
    slug: "lp-harvest",
    name: "LP Harvest",
    pitch: "Pays liquidity first, from both directions.",
    story: "Size-scaled fees plus a stream from buys. Everything extra goes to in-range LPs, so depth tends to follow volume.",
    modules: ["size-fee", "lp-stream"],
    params: { "size-fee": { minFeePct: 0.3, maxFeePct: 1, depthPct: 3 }, "lp-stream": { sharePct: 1 } },
    baseFeePct: 0.3,
    royaltyPct: 15,
    persona: "LPs",
    tags: ["LP rewards", "dynamic fee"],
  },
  {
    slug: "full-kit",
    name: "Full Kit",
    pitch: "Every core rule at modest settings.",
    story: "A reference rule set that switches on all six core modules at conservative values. Useful to read, heavy to trade: check the risk grade before you copy it.",
    modules: ["snipe-guard", "size-fee", "buy-burn", "lp-stream", "milestone-pot", "lp-timelock"],
    params: {
      "snipe-guard": { guardBlocks: 60, maxBuyPct: 1, guardTaxPct: 20 },
      "size-fee": { minFeePct: 0.3, maxFeePct: 1.5, depthPct: 2 },
      "buy-burn": { burnPct: 0.5 },
      "lp-stream": { sharePct: 0.5 },
      "milestone-pot": { everyN: 500, potPct: 0.5, minBuyEth: 0.02 },
      "lp-timelock": { lockDays: 90 },
    },
    baseFeePct: 0.3,
    royaltyPct: 20,
    persona: "Hook Builders",
    tags: ["reference", "all modules"],
  },
];

export const BLUEPRINT_BY_SLUG = Object.fromEntries(BLUEPRINTS.map((b) => [b.slug, b])) as Record<string, Blueprint>;
