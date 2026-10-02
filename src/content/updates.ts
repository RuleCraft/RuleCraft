import { type Block, h2, note, p, ul } from "./docs/types";
import { DEPLOYMENT, IS_DEPLOYED } from "@/config/deployment";

const EXPLORER = "https://robinhoodchain.blockscout.com/address/";

export type UpdateStatus = "Shipped" | "In progress" | "Planned";
export type Update = { slug: string; title: string; date: string; status: UpdateStatus; summary: string; body: Block[] };

const deployed: Update[] = IS_DEPLOYED
  ? [
      {
        slug: "contracts-live",
        title: "Contracts live on Robinhood Chain",
        date: "2026-10-02",
        status: "Shipped",
        summary: "The hook, launcher and blueprint registry are deployed on mainnet. Launch, publish, trade and claim are live. Unaudited.",
        body: [
          p(`The project owner deployed the three Rule Craft contracts from the /deploy console with their own wallet, starting at block ${DEPLOYMENT.deployBlock.toLocaleString("en-US")}. The site now reads and writes to them.`),
          h2("Addresses"),
          ul(
            `RuleCraftHook: [${DEPLOYMENT.hook}](${EXPLORER}${DEPLOYMENT.hook}) (address ends in the permission bits 0x20C4)`,
            `RuleCraftLauncher: [${DEPLOYMENT.launcher}](${EXPLORER}${DEPLOYMENT.launcher})`,
            `BlueprintRegistry: [${DEPLOYMENT.registry}](${EXPLORER}${DEPLOYMENT.registry})`,
          ),
          h2("Checked on chain"),
          ul("Bytecode present at all three addresses.", "The launcher points at the hook and the hook points back at the launcher.", "The hook uses the Uniswap v4 PoolManager.", "Protocol share fixed at 10% of add-on revenue; treasury fixed. Neither can change."),
          h2("Live now"),
          ul("Launch a token from /launch.", "Publish a blueprint from the composer.", "Trade Rule Craft pools on their pool page.", "Claim royalties and collect founding-position fees from /portfolio."),
          note("The contracts are unaudited. Start small. The $RULECRAFT token is a separate contract and is still published at launch.", "warn"),
        ],
      },
    ]
  : [];

export const UPDATES: Update[] = [
  ...deployed,
  {
    slug: "introducing-rule-craft",
    title: "Introducing Rule Craft",
    date: "2026-10-02",
    status: "Shipped",
    summary: "The site, the composer, the scanner and the live pool reader went up first; the contracts followed the same day.",
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
      h2("Still to come"),
      ul("The $RULECRAFT token contract address (published at launch)."),
    ],
  },
  {
    slug: "on-chain-v1",
    title: "On-chain v1: hook, launcher, blueprint registry",
    date: "2026-10-02",
    status: "Shipped",
    summary: "Three contracts written and tested (unit, fuzz, mainnet fork). Unaudited.",
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
