import { BRAND, CHAIN } from "@/config/brand";
import { MODULES } from "@/config/modules";
import { type DocPage, h2, note, p, table, ul } from "./types";

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
      note("Pre-launch. The composer, scanner and pool reader on this site work today. The Rule Craft contracts are not deployed yet; every contract address is published at launch."),
      h2("The short version"),
      ul(
        "A pool is a normal Uniswap v4 pool whose `hooks` address points at one Rule Craft root hook.",
        `The root hook runs the modules the pool chose at creation: ${core.map((m) => m.name).join(", ")}.`,
        "Module parameters are frozen when the pool is created. Nobody, including the creator, can change them later.",
        "The base LP fee always goes to liquidity providers in full. The protocol and blueprint authors only share in add-on revenue.",
        "Every rule is readable before the first swap, on this site and directly from chain.",
      ),
      h2("Who it is for"),
      table(
        ["Role", "What they do here"],
        [
          ["Launchers", "Create a token with its own rules: opening guard, dynamic fees, burns, LP rewards, pots, locks."],
          ["Hook builders", "Compose modules, publish the result as a blueprint, earn a royalty on each reuse."],
          ["LPs", "Provide liquidity to pools whose rules pay them more for depth and volume."],
          ["Traders", "Read every rule and the worst-case take before buying or selling."],
          ["Analysts", "Decode any v4 hook's permissions and get a risk read, for Rule Craft pools and others."],
        ],
      ),
      h2("Where to go next"),
      ul(
        "[What you can do](/docs/overview/what-you-can-do) lists every action with the page that performs it.",
        "[Architecture](/docs/concepts/architecture) explains the root hook and the registries.",
        "[Launch a token](/docs/guides/launch-a-token) walks through the launch form step by step.",
        "[Hook permissions](/docs/reference/hook-permissions) is the full table of v4 callbacks.",
      ),
    ],
  },
  {
    slug: "overview/what-you-can-do",
    title: "What you can do",
    section: "Overview",
    summary: "Every action on Rule Craft today and at launch, with the route that does it.",
    body: [
      p("Some actions are live now because they only read the chain or run in your browser. Others need the Rule Craft contracts and open at launch."),
      table(
        ["Action", "Where", "Status"],
        [
          ["Compose a rule set and see its permission bits", "[/builder](/builder)", "Live"],
          ["Browse modules and example blueprints", "[/rules](/rules)", "Live"],
          ["Read recent Uniswap v4 pools on Robinhood Chain", "[/app](/app)", "Live, read from the PoolManager"],
          ["Decode any hook address and get a risk read", "[/scan](/scan)", "Live"],
          ["Draft a token launch and validate it", "[/launch](/launch)", "Live draft; deploy opens at launch"],
          ["Draft rules for a token that already trades", "[/existing](/existing)", "Live draft; deploy opens at launch"],
          ["Publish a blueprint and earn royalties", "[/builder](/builder)", "Opens at launch"],
          ["Claim royalties and pot wins", "[/portfolio](/portfolio)", "Opens at launch"],
        ],
      ),
      h2("What never happens"),
      ul(
        "The site never holds your keys. Every transaction is signed in your own wallet.",
        "Connecting a wallet only shares your address. It is not an approval.",
        "No number on the site is invented. Where a figure depends on contracts that are not live, it shows 0, a dash or \"Opens at launch\".",
      ),
    ],
  },
];
