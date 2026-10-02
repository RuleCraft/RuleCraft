import { CHAIN } from "@/config/brand";
import { BASE_FEES, FEE_MODEL, MODULE_BY_SLUG } from "@/config/modules";
import { type DocPage, code, h2, note, ol, p, ul } from "./types";

const guard = MODULE_BY_SLUG["snipe-guard"];
const def = (m: typeof guard, k: string) => m.params.find((x) => x.key === k)?.def;

export const GUIDES: DocPage[] = [
  {
    slug: "guides/launch-a-token",
    title: "Launch a token",
    section: "Guides",
    summary: "Five steps from intent to one launch transaction.",
    body: [
      p("The [launch form](/launch) walks through five steps and validates each one before you can continue. Your draft is saved in this browser as you go."),
      ol(
        "Intent: choose a new token. The v1 launcher opens pools for new tokens only.",
        "Rules: start from a blueprint or compose your own. Only on-chain modules can launch: Snipe Guard, Size-Scaled Fee, Buy Burn, LP Stream and Liquidity Timelock.",
        "Details: name (up to 32 characters), symbol (2–10 characters), fixed supply, and optional links.",
        `Price and fees: opening valuation in ETH and a base fee tier (${BASE_FEES.map((f) => f.label).join(", ")}), plus an optional dev buy.`,
        "Review: everything the transaction does, in one place, then one `launch` transaction from your wallet.",
      ),
      h2("What the transaction does"),
      ul(
        "Mints a fixed-supply ERC-20 with no owner, no mint function and no transfer fees.",
        "Registers the rules on RuleCraftHook and opens the Uniswap v4 pool at a tick boundary near your price.",
        "Puts the whole supply in one token-only range below the opening price. Buys move the price into it.",
        "Runs the optional dev buy in the same transaction, paying the same rules as everyone else. Rounding dust is burned.",
      ),
      note("Until the owner deploys the contracts, the launch button says \"Not deployed yet\". The contracts are unaudited.", "warn"),
      h2("Common conflicts"),
      p(`Snipe Guard caps what buyers together may receive per block as a share of supply (default ${def(guard, "maxBuyPct")}%). A dev buy larger than that cap reverts with GuardCapExceeded; the form checks this before you sign.`),
    ],
  },
  {
    slug: "guides/rules-for-an-existing-token",
    title: "Rules for an existing token",
    section: "Guides",
    summary: "Planned: a ruled pool for a token that already trades elsewhere.",
    body: [
      note("Planned. The v1 launcher launches new tokens only; the page below lets you draft and read, not open the pool.", "warn"),
      p("A token you did not create could still get a pool with rules. You cannot change the token, only the pool."),
      ol(
        `Paste the token address on [/existing](/existing). The page reads its name, symbol, decimals and supply from ${CHAIN.name}.`,
        "Pick rules. Modules that only make sense at a token's birth, like Snipe Guard, are flagged.",
        "Choose the base fee tier and see the exact pool key that would be created.",
      ),
      ul(
        "Such a pool would compete with existing pools for the same pair. Routers choose whichever quotes better after rules.",
        "Buy Burn would burn tokens received in the swap, not the issuer's supply.",
      ),
    ],
  },
  {
    slug: "guides/compose-and-publish-a-blueprint",
    title: "Compose and publish a blueprint",
    section: "Guides",
    summary: "From composer to a royalty-bearing blueprint on chain.",
    body: [
      ol(
        "Open the [composer](/builder) and pick modules.",
        "Tune parameters. Sliders stop at each module's hard bounds, which the contracts enforce again.",
        "Watch the issues panel: errors must be zero, warnings are your call.",
        `Set a royalty between ${FEE_MODEL.royaltyMinPct}% and ${FEE_MODEL.royaltyMaxPct}% of add-on revenue.`,
        "Name it and press Publish. Your wallet sends `publish(name, rules, royaltyBps)` to the BlueprintRegistry and the page shows the new blueprint id.",
      ),
      code(`publish(string name, Rules rules, uint16 royaltyBps) -> uint256 id`),
      h2("Spec"),
      p("The composer's JSON spec shows the same rule set in readable form. The on-chain field layout is in [config schema](/docs/reference/config-schema)."),
      note("A published blueprint never changes. Pools that launch with it pay its author; a pool whose rules differ by one number cannot use it (RulesMismatch)."),
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
        "Hook: paste the hook address into the [scanner](/scan). Count the delta flags. A Rule Craft pool points at RuleCraftHook, mask 0x20C4.",
        "Rules: a Rule Craft pool page reads the exact rules back from the hook, including whether the Snipe Guard is still on.",
        "Exits: check whether the founding liquidity is locked and until when.",
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
        "The LP fee is paid to in-range liquidity in full, as on any v4 pool.",
        "LP Stream and the Snipe Guard tax are donated to in-range liquidity on top of fees, after the royalty and protocol share.",
        "Size-Scaled Fee raises the fee on large trades, which is paid to LPs.",
        "Liquidity Timelock binds only the founding position, which the launcher holds for the creator. Other LPs can always withdraw.",
      ),
      p("Other positions are standard v4 positions managed through Uniswap's v4 position tooling. Rule Craft adds no wrapper token for LPs."),
    ],
  },
  {
    slug: "guides/claim-royalties-and-pots",
    title: "Claim royalties and fees",
    section: "Guides",
    summary: "Pull-based claims for blueprint authors and launch creators.",
    body: [
      p("Royalties accrue as balances inside RuleCraftHook, in each pool's token; nothing is sent automatically. Claim from [your portfolio](/portfolio)."),
      code(`// RuleCraftHook
claim(address account, address currency) -> uint256 amount   // anyone may call; pays only the account

// RuleCraftLauncher (launch creator only)
collectFees(uint256 launchId)          // founding position's LP fees, any time
withdrawLiquidity(uint256 launchId)    // after the lock, or any time without one`),
      ul(
        "Blueprint authors see a balance per token and claim each one.",
        "The protocol share accrues to the treasury fixed in the registry; anyone can push it there with the same claim call.",
        "Milestone Pot wins are planned and not part of v1.",
      ),
      note("Nothing can be claimed until the contracts are deployed."),
    ],
  },
  {
    slug: "guides/integrate-as-a-launcher",
    title: "Integrate as a launcher",
    section: "Guides",
    summary: "Use Rule Craft rules from your own launch product.",
    body: [
      p("A launchpad or token tool can open pools with Rule Craft rules from its own interface by calling the RuleCraftLauncher directly."),
      ol(
        "Validate the user's rule set with the same bounds as the composer (they are listed in [module parameters](/docs/reference/module-parameters)); the contracts revert with BadRules(code) otherwise.",
        "Call `launch(LaunchParams)` with name, symbol, supply, the opening sqrt price, the Rules struct, an optional blueprint id and the dev-buy minimum; send the dev buy as value.",
        "Route trades with `swapExactIn(key, buy, amountIn, minOut, to)`, quoting first with Uniswap's v4 Quoter.",
        "Link your users to the pool page so they can read the rules.",
      ),
      code(`launch((string name, string symbol, uint256 supply, uint160 sqrtPriceX96,
        Rules rules, uint64 blueprintId, uint256 devBuyMinOut)) payable
  -> (uint256 launchId, address token, bytes32 poolId)
swapExactIn(PoolKey key, bool buy, uint128 amountIn, uint256 minOut, address to) payable
  -> uint256 amountOut`),
      p("Integration tracks and what each needs are described on [build with us](/integrate). Contract sources and ABIs are in the repository under `contracts/`."),
      note("The contracts are unaudited. Integrate at your own risk until a review is published."),
    ],
  },
];
