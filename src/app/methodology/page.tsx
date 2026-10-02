import type { Metadata } from "next";
import Link from "next/link";
import { CHAIN, UNISWAP_V4 } from "@/config/brand";
import { FEE_MODEL } from "@/config/modules";
import { Badge, PageHead } from "@/components/ui/Page";
import { Prose, Updated } from "@/components/info/Prose";

export const metadata: Metadata = {
  title: "Methodology",
  description: "Where every number on Rule Craft comes from, what is live, what is design, and how the risk grade is computed.",
};

const KINDS = [
  { tone: "pass" as const, label: "Live", body: "Read from the chain at request time: blocks, gas, balances, v4 pools, hook bytecode." },
  { tone: "blue" as const, label: "Design", body: "Parameters the contracts are being written against: fee shares, caps, module bounds, gas estimates." },
  { tone: "ink" as const, label: "Example", body: "Blueprints the team wrote to illustrate rule sets. No pools, no authors on chain." },
  { tone: "warn" as const, label: "Opens at launch", body: "Anything that needs our contracts: launches, royalties, pots, token supply." },
];

const FACTORS = [
  ["Hook permissions", "35", "Sum of callback weights the rule set enables, against the sum of all 14. Delta and remove-liquidity callbacks weigh most."],
  ["Steady take per buy", "25", `Worst-case share of a buy taken by fees and rules after any opening window, above the plain fee, scaled to ${FEE_MODEL.steadyWarnPct}%.`],
  ["Opening window", "15", "Guard tax during the Snipe Guard window, scaled to 50%."],
  ["Fee movement", "10", "Distance between the dynamic fee floor and ceiling, scaled to 3 points."],
  ["LP exits", "10", "Whether any liquidity is time-locked."],
  ["Unreleased code", "5", "Whether a planned module is part of the set."],
];

export default function MethodologyPage() {
  return (
    <>
      <PageHead eyebrow="Methodology" title="Where the numbers come from" lead="Every figure on this site is one of four kinds, and each page says which. When a read fails, the page says so instead of showing a stale or guessed value.">
        <Updated date="2 October 2026" />
      </PageHead>
      <section className="wrap pt-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KINDS.map((k) => (
            <div key={k.label} className="card p-5">
              <Badge tone={k.tone}>{k.label}</Badge>
              <p className="mt-3 text-[14.5px] leading-[1.55] text-ink-2">{k.body}</p>
            </div>
          ))}
        </div>
      </section>
      <Prose>
        <h2>Chain reads</h2>
        <p>
          The server reads {CHAIN.name} (chain {CHAIN.id}) over JSON-RPC: a private endpoint when the operator configures one, otherwise the public RPC, then a second public endpoint. An endpoint that fails sits out for a minute. The browser never talks to the RPC directly; it goes through a read-only relay on this site that only accepts read methods.
        </p>
        <h2>The pool list</h2>
        <p>
          Pools come from <code>Initialize</code> events of the Uniswap v4 PoolManager at <code>{UNISWAP_V4.poolManager}</code>, over roughly the last 300,000 blocks. Each event gives the two currencies, the fee, the tick spacing and the hook address. Token symbols are read with <code>symbol()</code>; a token that does not answer is shown by its address. Successful reads are kept for two minutes; failed reads are never cached.
        </p>
        <h2>Hook permissions</h2>
        <p>
          A v4 hook&apos;s permissions are the lowest 14 bits of its address. The scanner reads those bits; it does not need the source and cannot be fooled by a name. What the bits cannot tell you is how the callbacks behave, whether parameters can change, or who controls upgrades. The scanner says so on every report.
        </p>
        <h2>The risk grade</h2>
        <p>
          The grade measures how far a rule set can move a trade or an LP away from a plain v4 pool. It is not a judgement of intent and not an audit. For a composed rule set it adds up six factors (the code lives in <code>src/lib/compose.ts</code>):
        </p>
        <table>
          <thead>
            <tr>
              <th>Factor</th>
              <th>Max</th>
              <th>How</th>
            </tr>
          </thead>
          <tbody>
            {FACTORS.map(([a, b, c]) => (
              <tr key={a}>
                <td>{a}</td>
                <td>{b}</td>
                <td>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Scores map to grades: 0–20 A (light), 21–40 B, 41–60 C, 61–80 D, above 80 E (extreme). For a hook we did not compose, only its bits and the pool fee are known, so the scanner weighs permissions, delta rights, withdrawal access, dynamic fees and the fact that the code is unknown.
        </p>
        <h2>Fail-closed displays</h2>
        <ul>
          <li>A failed chain read shows &ldquo;Read failed&rdquo; or &ldquo;--&rdquo;, never zero dressed as data.</li>
          <li>APIs return HTTP 503 rather than an empty list when the chain cannot be reached.</li>
          <li>Buttons that would write to contracts we have not deployed are disabled and say &ldquo;Opens at launch&rdquo;.</li>
        </ul>
        <p>
          Questions about a number? Read the <Link href="/docs">docs</Link> or ask on X.
        </p>
      </Prose>
    </>
  );
}
