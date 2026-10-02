import { BRAND, CHAIN } from "@/config/brand";
import { MODULES } from "@/config/modules";
import { type DocPage, h2, note, p, table, ul } from "./types";
import { DEPLOYED_ON, IS_DEPLOYED } from "@/config/deployment";

const core = MODULES.filter((m) => m.status === "core");

export const OVERVIEW: DocPage[] = [
  {
    slug: "",
    title: "Rule Craft documentation",
    section: "Overview",
    summary: "What a Rule Craft pool is, who it is for, and where each part of the system is described.",
    body: [
      p(
        `${BRAND.name} is a marketplace and settlement layer for Uniswap v4 hooks on ${CHAIN.name} (chain id ${CHAIN.id}). Instead of every launcher writing and shipping a one-off hook, pools are composed from reusable rule modules. A composed rule set can be published as a blueprint, and its author earns a royalty every time another pool opens with it.`,
      ),
      note(IS_DEPLOYED ? `The Rule Craft contracts are live on Robinhood Chain since ${DEPLOYED_ON}; their addresses are on the [contracts page](/docs/reference/contracts). They are unaudited.` : "The composer, scanner and pool reader work today. The Rule Craft contracts are not deployed yet, and they are unaudited; their addresses appear on the contracts page once deployed."),
      h2("The short version"),
      ul(
        "A pool is a normal Uniswap v4 pool whose `hooks` address points at RuleCraftHook.",
        `The hook runs the modules the pool chose at creation: ${core.map((m) => m.name).join(", ")}.`,
        "Module parameters are frozen when the pool is created. Nobody, including the creator, can change them later.",
        "The base LP fee always goes to liquidity providers in full. The protocol and blueprint authors only share in add-on revenue.",
        "Every rule is readable before the first swap, on this site and directly from chain.",
      ),
      h2("Who it is for"),
      table(
        ["Role", "What they do here"],
        [
          ["Launchers", "Create a token with its own rules: opening guard, dynamic fees, burns, LP rewards, locks."],
          ["Hook builders", "Compose modules, publish the result as a blueprint, earn a royalty on each reuse."],
          ["LPs", "Provide liquidity to pools whose rules pay them more for depth and volume."],
          ["Traders", "Read every rule and the worst-case take before buying or selling."],
          ["Analysts", "Decode any v4 hook's permissions and get a risk read, for Rule Craft pools and others."],
        ],
      ),
      h2("Where to go next"),
      ul(
        "[What you can do](/docs/overview/what-you-can-do) lists every action with the page that performs it.",
        "[Architecture](/docs/concepts/architecture) explains the hook, the launcher and the registry.",
        "[Launch a token](/docs/guides/launch-a-token) walks through the launch form step by step.",
        "[Hook permissions](/docs/reference/hook-permissions) is the full table of v4 callbacks.",
      ),
    ],
  },
  {
    slug: "overview/what-you-can-do",
    title: "What you can do",
    section: "Overview",
    summary: "Every action on Rule Craft, with the route that does it and its status.",
    body: [
      p(IS_DEPLOYED ? "Reading actions run in your browser or against the chain; writing actions are transactions you sign against the Rule Craft contracts (unaudited)." : "Some actions are live now because they only read the chain or run in your browser. Others need the Rule Craft contracts and work once the owner deploys them."),
      table(
        ["Action", "Where", "Status"],
        [
          ["Compose a rule set and see its permission bits", "[/builder](/builder)", "Live"],
          ["Browse modules and example blueprints", "[/rules](/rules)", "Live"],
          ["Read recent Uniswap v4 pools on Robinhood Chain", "[/app](/app)", "Live, read from the PoolManager"],
          ["Decode any hook address and get a risk read", "[/scan](/scan)", "Live"],
          ["Draft and launch a token", "[/launch](/launch)", IS_DEPLOYED ? "Live" : "Draft live; launch live once deployed"],
          ["Trade on a Rule Craft pool", "[/app](/app)", IS_DEPLOYED ? "Live" : "Live once deployed"],
          ["Draft rules for a token that already trades", "[/existing](/existing)", "Draft only; planned (v1 launches new tokens only)"],
          ["Publish a blueprint and earn royalties", "[/builder](/builder)", IS_DEPLOYED ? "Live" : "Live once deployed"],
          ["Claim royalties, collect LP fees", "[/portfolio](/portfolio)", IS_DEPLOYED ? "Live" : "Live once deployed"],
          ["Deploy the contracts (owner)", "[/deploy](/deploy)", IS_DEPLOYED ? `Done ${DEPLOYED_ON}` : "Not deployed yet"],
        ],
      ),
      h2("What never happens"),
      ul(
        "The site never holds your keys. Every transaction is signed in your own wallet.",
        "Connecting a wallet only shares your address. It is not an approval.",
        "No number on the site is invented. Contract figures are read from the contracts; where a figure has no source yet (such as the token supply before the token is published), it shows a dash.",
      ),
    ],
  },
];
