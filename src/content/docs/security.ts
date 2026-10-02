import { type DocPage, h2, note, p, ul } from "./types";
import { DEPLOYED_ON, IS_DEPLOYED } from "@/config/deployment";

export const SECURITY: DocPage[] = [
  {
    slug: "security/known-limitations",
    title: "Known limitations",
    section: "Security",
    summary: "What Rule Craft does not protect against.",
    body: [
      ul(
        "The Rule Craft contracts are unaudited. They are tested (unit, fuzz and a mainnet-fork test), which is not the same thing.",
        "No score on this site is an audit.",
        "The risk score reads permissions and parameters. It cannot find bugs in code.",
        "The scanner only sees what an address encodes. A hook with few permissions can still be badly written.",
        "Rule Craft pools accept exact-input swaps only. Routers that try exact-output will revert (ExactInputOnly).",
        "Quoters that ignore hooks over-promise output on pools with burns or streams. Uniswap's v4 Quoter runs the hook and quotes correctly.",
        "Snipe Guard counts what buyers receive per block, not who they are. A determined buyer can spread across blocks; the cap only slows the first blocks.",
        "If no liquidity is in range at the moment of a buy, the guard tax and stream are simply not charged on that buy.",
        "Milestone Pot and Arb Recapture are planned and not part of the on-chain v1.",
      ),
      note(IS_DEPLOYED ? `The contracts are live on Robinhood Chain since ${DEPLOYED_ON}. Tested (unit, fuzz, mainnet fork) but not audited.` : "The contracts are tested but not deployed yet.", "warn"),
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
      p("Mitigated by freezing every parameter at creation. RuleCraftHook has no owner and no function that edits a live pool."),
      h2("A creator pulling liquidity"),
      p("Mitigated by Liquidity Timelock on the founding position, which the launcher holds and releases only to the creator after the unlock time. The unlock time is readable on the pool page before buying."),
      h2("An admin taking funds"),
      p("There is none to take them. No contract has an owner; the launcher's one-time setHook only wires the hook, and the treasury and protocol share are fixed in the registry constructor."),
      h2("Look-alike hooks"),
      p("Anyone can deploy a hook and call it anything. Check the hook address against the published RuleCraftHook address on the contracts page."),
      h2("Front-end compromise"),
      p("Your wallet shows what you sign. Contract addresses are listed in the docs, the footer and on chain; compare before signing."),
    ],
  },
];
