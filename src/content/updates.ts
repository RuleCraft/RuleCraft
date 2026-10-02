import { type Block, h2, note, p, ul } from "./docs/types";

export type UpdateStatus = "Shipped" | "In progress" | "Planned";
export type Update = { slug: string; title: string; date: string; status: UpdateStatus; summary: string; body: Block[] };

export const UPDATES: Update[] = [
  {
    slug: "introducing-rule-craft",
    title: "Introducing Rule Craft",
    date: "2026-10-02",
    status: "Shipped",
    summary: "The site, the composer, the scanner and the live pool reader are up. Contracts are not deployed yet.",
    body: [
      p("Rule Craft is a marketplace for Uniswap v4 hooks on Robinhood Chain. The read side went live first; the contracts followed the same day (see the on-chain v1 update)."),
      h2("Live today"),
      ul(
        "Composer: pick modules, tune parameters, see the permission mask, worst-case take, conflicts and a risk grade.",
        "Rules and blueprints: every module documented, plus example blueprints.",
        "Pools: recent Uniswap v4 pools on Robinhood Chain, read straight from the PoolManager.",
        "Scanner: decode any hook address and get a risk read.",
        "Launch drafts, validated end to end.",
      ),
      h2("Not yet"),
      ul("The $RULECRAFT contract address.", "Deployed Rule Craft contracts (written and tested, awaiting the owner's deployment)."),
      note("Every contract-backed number on the site reads 0, a dash or \"Not deployed yet\" until then."),
    ],
  },
  {
    slug: "on-chain-v1",
    title: "On-chain v1: hook, launcher, blueprint registry",
    date: "2026-10-02",
    status: "In progress",
    summary: "Three contracts written and tested; waiting for the owner to deploy them from /deploy. Unaudited.",
    body: [
      p("The write side is built. Three contracts sit next to the Uniswap v4 PoolManager on Robinhood Chain:"),
      ul(
        "RuleCraftHook: one hook (mask 0x20C4) for every Rule Craft pool, applying each pool's frozen rules. Snipe Guard, Size-Scaled Fee, Buy Burn, LP Stream; royalties and protocol share accrue for claiming.",
        "RuleCraftLauncher: one transaction mints a fixed-supply token, opens its pool with the rules and seeds the whole supply as liquidity. Holds the founding position for its creator (with Liquidity Timelock) and routes exact-input swaps.",
        "BlueprintRegistry: anyone publishes a rule set with a royalty of up to 25%; launches that use it pay its author.",
      ),
      h2("Tested"),
      ul("23 unit and fuzz tests on a local PoolManager.", "A fork test against the real PoolManager and v4 Quoter on Robinhood Chain: quotes match execution.", "A browser run on a mainnet fork: deploy, launch, swap, guard cap, burn, royalty claim."),
      h2("What the site does with them"),
      ul("Publish blueprints from the composer.", "Launch from the launch form.", "Trade on a pool page, with quotes from Uniswap's v4 Quoter.", "Claim royalties and collect LP fees from the portfolio."),
      note("Unaudited. No owner, no upgrade path, no admin function after the one-time wiring. Milestone Pot, Arb Recapture and existing-token pools are not part of v1.", "warn"),
    ],
  },
  {
    slug: "arb-recapture-research",
    title: "Arb Recapture research",
    date: "2026-10-02",
    status: "Planned",
    summary: "Choosing a reference price that cannot be cheaply moved.",
    body: [p("Arb Recapture needs a reference price the pool does not control. We will publish the design and its trade-offs before any code ships.")],
  },
];

export const updateBySlug = (slug: string) => UPDATES.find((u) => u.slug === slug) ?? null;
