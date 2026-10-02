import { type DocPage, h2, note, p, ul } from "./types";

export const SECURITY: DocPage[] = [
  {
    slug: "security/known-limitations",
    title: "Known limitations",
    section: "Security",
    summary: "What Rule Craft does not protect against.",
    body: [
      ul(
        "No independent audit has been completed. Do not treat any score on this site as one.",
        "The risk score reads permissions and parameters. It cannot find bugs in code.",
        "The scanner only sees what an address encodes. A hook with few permissions can still be badly written.",
        "Quoters that ignore hooks will over-promise output on pools with burns, streams or pots.",
        "Milestone Pot is predictable by design, which invites slot racing near the winning slot.",
        "Arb Recapture depends on a reference price that is not settled; it is not part of the first release.",
      ),
      note("Pre-launch: none of the Rule Craft contracts is deployed.", "warn"),
    ],
  },
  {
    slug: "security/threat-model",
    title: "Threat model",
    section: "Security",
    summary: "Who might attack a pool with rules, and what stops them.",
    body: [
      h2("Snipers at open"),
      p("Bots buying in the first block. Mitigated by Snipe Guard's per-block cap and guard tax."),
      h2("A creator changing rules later"),
      p("Mitigated by freezing every parameter at creation. The root hook has no function that edits a live pool."),
      h2("A creator pulling liquidity"),
      p("Mitigated by Liquidity Timelock on the founding position, readable before buying."),
      h2("Look-alike hooks"),
      p("Anyone can deploy a hook and call it anything. Check the hook address against the published RuleHook address; the scanner shows both."),
      h2("Front-end compromise"),
      p("Your wallet shows what you sign. Contract addresses are listed in the docs, the footer and on chain; compare before signing."),
    ],
  },
];
