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
      p("Rule Craft is a marketplace for Uniswap v4 hooks on Robinhood Chain. Today the read side is live and the write side opens at launch."),
      h2("Live today"),
      ul(
        "Composer: pick modules, tune parameters, see the permission mask, worst-case take, conflicts and a risk grade.",
        "Rules and blueprints: every module documented, plus example blueprints.",
        "Pools: recent Uniswap v4 pools on Robinhood Chain, read straight from the PoolManager.",
        "Scanner: decode any hook address and get a risk read.",
        "Launch drafts for new and existing tokens, validated end to end.",
      ),
      h2("Not yet"),
      ul("Rule Craft contracts and the $RULECRAFT contract address.", "Publishing blueprints and earning royalties.", "Claims."),
      note("Every contract-backed number on the site reads 0, a dash or \"Opens at launch\" until then."),
    ],
  },
  {
    slug: "module-registry",
    title: "Module registry deployment",
    date: "2026-10-02",
    status: "In progress",
    summary: "Root hook and module registry, with the six core modules and their bounds.",
    body: [
      p("The first contracts to ship are the root hook and the ModuleRegistry with the six core modules. Bounds will match what the composer uses today."),
      note("No date is promised. Addresses are published on the contracts page when deployed."),
    ],
  },
  {
    slug: "blueprint-publishing",
    title: "Blueprint publishing",
    date: "2026-10-02",
    status: "Planned",
    summary: "Publish a composed rule set from your wallet and set its royalty.",
    body: [p("The composer gains a Publish button that writes the rule set to the BlueprintRegistry with your address as author.")],
  },
  {
    slug: "royalty-claims",
    title: "Royalty and pot claims",
    date: "2026-10-02",
    status: "Planned",
    summary: "Pull-based claims for authors and pot winners from the portfolio page.",
    body: [p("Authors and winners will see their balances and claim them in one transaction.")],
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
