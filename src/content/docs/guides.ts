import { CHAIN } from "@/config/brand";
import { BASE_FEES, FEE_MODEL, MODULE_BY_SLUG } from "@/config/modules";
import { type DocPage, code, h2, note, ol, p, ul } from "./types";

const guard = MODULE_BY_SLUG["snipe-guard"];
const pot = MODULE_BY_SLUG["milestone-pot"];
const def = (m: typeof guard, k: string) => m.params.find((x) => x.key === k)?.def;

export const GUIDES: DocPage[] = [
  {
    slug: "guides/launch-a-token",
    title: "Launch a token",
    section: "Guides",
    summary: "Five steps from intent to a reviewed, deployable launch.",
    body: [
      p("The [launch form](/launch) walks through five steps and validates each one before you can continue. Your draft is saved in this browser as you go."),
      ol(
        "Intent: choose a new token. For a token that already trades, use [/existing](/existing) instead.",
        "Rules: start from a blueprint or compose your own. The composer shows the resulting permission bits, the worst-case take and any conflicts.",
        "Details: name, symbol (2–10 characters), fixed supply, and optional links.",
        `Price and fees: opening valuation in ETH and a base fee tier (${BASE_FEES.map((f) => f.label).join(", ")}).`,
        "Review: everything the transaction would deploy, in one place.",
      ),
      note("The deploy button stays disabled until the Rule Craft contracts are live. It reads \"Opens at launch\".", "warn"),
      h2("Common conflicts"),
      p(`Snipe Guard caps buys per block as a share of supply (default ${def(guard, "maxBuyPct")}%). If the Milestone Pot's minimum buy (default ${def(pot, "minBuyEth")} ETH) is larger than that cap at your opening valuation, no buy could qualify for the pot during the guard window. The form refuses this combination and tells you which number to move.`),
    ],
  },
  {
    slug: "guides/rules-for-an-existing-token",
    title: "Rules for an existing token",
    section: "Guides",
    summary: "Open a ruled pool for a token that already trades elsewhere.",
    body: [
      p("A token you did not create can still get a pool with rules. You cannot change the token, only the pool."),
      ol(
        `Paste the token address on [/existing](/existing). The page reads its name, symbol, decimals and supply from ${CHAIN.name}.`,
        "Pick rules. Modules that only make sense at a token's birth, like Snipe Guard, are allowed but flagged.",
        "Choose the base fee tier and how much liquidity you will add on each side.",
        "Review and, at launch, create the pool.",
      ),
      ul(
        "The new pool competes with existing pools for the same pair. Routers will choose whichever quotes better after rules.",
        "Buy Burn burns tokens you received in the swap, not the issuer's supply.",
      ),
    ],
  },
  {
    slug: "guides/compose-and-publish-a-blueprint",
    title: "Compose and publish a blueprint",
    section: "Guides",
    summary: "From composer to a royalty-bearing blueprint.",
    body: [
      ol(
        "Open the [composer](/builder) and pick modules.",
        "Tune parameters. Sliders stop at each module's hard bounds.",
        "Watch the issues panel: errors must be zero, warnings are your call.",
        `Set a royalty between ${FEE_MODEL.royaltyMinPct}% and ${FEE_MODEL.royaltyMaxPct}% of add-on revenue.`,
        "Name it and copy the spec. At launch, Publish writes it to the BlueprintRegistry from your wallet.",
      ),
      h2("Spec"),
      p("The spec is the exact JSON the composer would submit. See [config schema](/docs/reference/config-schema)."),
      note("Publishing opens at launch. Until then the composer works fully but cannot write to chain."),
    ],
  },
  {
    slug: "guides/read-a-pool-before-trading",
    title: "Read a pool before trading",
    section: "Guides",
    summary: "Four checks that take under a minute.",
    body: [
      ol(
        "Identity: a token is its address plus its chain. Ignore tickers.",
        "Hook: paste the hook address into the [scanner](/scan). Count the delta flags.",
        "Take: for Rule Craft pools, the pool page shows the worst-case take on a buy and a sell, during and after any guard window.",
        "Exits: check whether liquidity can leave and when.",
      ),
      p("If a pool's hook has `beforeSwapReturnDelta` or `afterSwapReturnDelta` set and you cannot read what it does, assume it can take a large share of your trade."),
    ],
  },
  {
    slug: "guides/provide-liquidity",
    title: "Provide liquidity",
    section: "Guides",
    summary: "What changes for LPs in a pool with rules.",
    body: [
      ul(
        "The base fee is paid to in-range liquidity in full, as on any v4 pool.",
        "LP Stream and the Snipe Guard tax are donated to in-range liquidity on top of fees.",
        "Size-Scaled Fee raises the fee on large trades, which is paid to LPs.",
        "Liquidity Timelock binds only the founding position. Other LPs can always withdraw.",
      ),
      p("Positions are standard v4 positions managed through the v4 position tooling. Rule Craft adds no wrapper token for LPs."),
    ],
  },
  {
    slug: "guides/claim-royalties-and-pots",
    title: "Claim royalties and pots",
    section: "Guides",
    summary: "Pull-based claims for authors and pot winners.",
    body: [
      p("Royalties and pot wins accrue as balances in contracts; nothing is sent automatically. Claim from [your portfolio](/portfolio) once claims open."),
      ul(
        "Authors see a balance per blueprint and can claim all at once.",
        "A pot winner is the buyer of the Nth qualifying slot. The win is credited to that address and stays claimable without a deadline.",
      ),
      code(`claim(address account) -> uint256 amount   // design, published at launch`),
      note("Claims open at launch. Today every balance on the portfolio page reads 0."),
    ],
  },
  {
    slug: "guides/integrate-as-a-launcher",
    title: "Integrate as a launcher",
    section: "Guides",
    summary: "Use Rule Craft rules from your own launch product.",
    body: [
      p("A launchpad or token tool can open pools with Rule Craft rules from its own interface. The PoolLauncher takes a rule set or a blueprint id and does the rest in one transaction."),
      ol(
        "Read approved modules and bounds from the ModuleRegistry.",
        "Validate the user's rule set with the same checks as the composer.",
        "Call the launcher with token parameters, pool parameters and the rule set.",
        "Link your users to the pool page so they can read the rules.",
      ),
      p("Integration tracks and what each needs are described on [build with us](/integrate)."),
      note("Contracts and ABIs are published at launch."),
    ],
  },
];
