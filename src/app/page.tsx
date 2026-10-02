import Link from "next/link";
import { Suspense } from "react";
import { BRAND, CHAIN } from "@/config/brand";
import { FEE_MODEL, MODULES } from "@/config/modules";
import { BLUEPRINTS } from "@/config/blueprints";
import { compose } from "@/lib/compose";
import { draftFromBlueprint } from "@/lib/draft";
import { readPoolIndex } from "@/lib/chain-server";
import { ZERO_ADDRESS } from "@/lib/hooks";
import { ModuleGlyph } from "@/components/glyphs";
import { CaStrip } from "@/components/CopyCa";
import { Badge, SectionTitle } from "@/components/ui/Page";
import { PermissionGrid } from "@/components/rules/Readout";
import { LiveStrip } from "@/components/home/LiveStrip";
import { ScanForm } from "@/components/pools/ScanForm";
import { ArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

const GRADE_BG: Record<string, string> = { A: "bg-pass", B: "bg-[#5f8a2d]", C: "bg-warn", D: "bg-signal", E: "bg-danger" };

const PERSONAS = [
  { who: "Launchers", verb: "Open a token with rules", body: "Pick an opening guard, a fee curve, a burn or a pot. The token and its pool are created in one transaction, rules frozen from the first block.", href: "/launch", cta: "Launch form" },
  { who: "Hook builders", verb: "Publish once, earn on reuse", body: "Compose modules into a blueprint, set a royalty, and collect it every time another pool adopts your rule set.", href: "/builder", cta: "Composer" },
  { who: "LPs", verb: "Provide where rules pay you", body: "Size-scaled fees and LP streams send more of each trade to liquidity in range. The base fee is always yours in full.", href: "/rules/lp-stream", cta: "LP Stream" },
  { who: "Traders", verb: "Read before you swap", body: "Every rule, parameter and worst-case take is on the pool page before your first trade. No hidden switches.", href: "/app", cta: "Live pools" },
  { who: "Analysts", verb: "Decode any hook", body: "Paste a hook address and get its permission bits, what each callback can do, and a risk read you can argue with.", href: "/scan", cta: "Scanner" },
];

const FAQ = [
  ["What is a Uniswap v4 hook?", "A contract a v4 pool calls at fixed points: when it opens, when liquidity moves, before and after swaps. The hook's address encodes which of 14 callbacks it may run, so its powers are readable from the address alone."],
  ["What does Rule Craft add on top?", "A library of bounded rule modules behind one hook, a composer that shows exactly what a combination does, a registry of blueprints whose authors earn royalties, and a launcher that opens a new token directly into its ruled pool."],
  ["Is anything live today?", `The composer, the scanner, the live pool index and all docs are live and read ${CHAIN.name} directly. The Rule Craft contracts and the ${BRAND.symbol} token are published at launch; every button that would sign says so.`],
  ["Who earns what?", `LPs keep the base fee in full. Add-on rules (taxes, streams, pots) pay their own recipients; from that add-on revenue only, a blueprint author may take up to ${FEE_MODEL.royaltyMaxPct}% and the protocol takes ${FEE_MODEL.protocolSharePct}% by design. A pool with no add-ons pays the protocol nothing.`],
  ["Can rules change after launch?", "No. Module settings, royalty and protocol share are frozen when the pool is created. The hook keeps no switch to turn a rule back on or raise a number."],
  ["Is the risk grade an audit?", "No. It scores permissions and settings: how far the rules can move a trade or an LP from a plain pool. It never inspects code quality. See the methodology page for every factor."],
];

async function LiveCounts() {
  const index = await readPoolIndex();
  if (!index.ok) return <p className="font-mono text-[13px] text-ink-3">Live counts unavailable right now.</p>;
  const hooked = index.pools.filter((p) => p.hooks !== ZERO_ADDRESS);
  const hooks = new Set(hooked.map((p) => p.hooks.toLowerCase())).size;
  const deltas = hooked.filter((p) => p.flags.some((f) => f.endsWith("ReturnDelta"))).length;
  const cells = [
    ["v4 pools opened", index.pools.length],
    ["with a hook", hooked.length],
    ["distinct hooks", hooks],
    ["hooks that can change amounts", deltas],
  ] as const;
  return (
    <div className="grid grid-cols-2 border-l border-t border-ink md:grid-cols-4" data-live-counts>
      {cells.map(([k, v]) => (
        <div key={k} className="border-b border-r border-ink p-5">
          <p className="num text-[clamp(32px,5vw,52px)] leading-none text-ink">{v}</p>
          <p className="mt-2 text-[13.5px] text-ink-2">{k}</p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const sample = compose(draftFromBlueprint("bell-ringer")!);
  return (
    <>
      {/* Hero */}
      <section className="graph relative overflow-hidden border-b border-ink">
        <div className="grid-cols-1 wrap grid gap-12 pb-14 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:pb-20">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="signal">Built for Uniswap v4</Badge>
              <Badge>{CHAIN.name}</Badge>
            </div>
            <h1 className="h-display mt-6 text-[clamp(48px,8.6vw,104px)]">
              Craft your rules.
              <br />
              <span className="italic text-signal">Earn forever.</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-[18px] leading-[1.6] text-ink-2">
              {BRAND.tagline} Compose pool rules from bounded modules, publish them as blueprints that pay you on every reuse, and launch tokens straight into pools whose rules anyone can read.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/builder" className="btn btn-signal">
                Open the composer <ArrowRight />
              </Link>
              <Link href="/launch" className="btn btn-line">
                Launch a token
              </Link>
            </div>
            <div className="mt-8 max-w-[520px]">
              <CaStrip />
            </div>
          </div>

          {/* Index card: a rule set as a trader would read it */}
          <div className="relative min-w-0">
            <div aria-hidden className="absolute -right-3 -top-3 hidden h-full w-full border border-ink bg-paper-2 sm:block" />
            <div className="relative border border-ink bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="label">Example blueprint</p>
                  <p className="font-display text-[30px] font-medium leading-tight tracking-[-0.015em]">Bell Ringer</p>
                  <p className="font-mono text-[12px] text-ink-3">TOKEN / ETH · 1% fee · 2 modules</p>
                </div>
                <span className={`grid size-12 shrink-0 place-items-center rounded-[4px] font-display text-[26px] font-semibold text-white ${GRADE_BG[sample.risk.grade]}`}>{sample.risk.grade}</span>
              </div>
              <ul className="grid-cols-1 mt-5 grid gap-2 text-[14px] text-ink">
                {sample.lines.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[9px] size-1.5 shrink-0 bg-signal" />
                    {l}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <PermissionGrid flags={sample.callbacks} dense />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="font-mono text-[12px] text-ink-3">royalty 12% of add-ons · frozen at open</span>
                <Link href="/blueprints/bell-ringer" className="text-[13.5px] text-blue underline underline-offset-4">
                  Inspect
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-night py-3">
          <div className="wrap">
            <LiveStrip />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="wrap py-20">
        <SectionTitle eyebrow="How it works" title="From a rule to a market in three moves" />
        <ol className="grid-cols-1 mt-10 grid gap-px border border-ink bg-ink md:grid-cols-3">
          {[
            ["Compose", "Switch modules on, set their numbers. The composer derives the hook permission bits, the callbacks, the v4 fee setting and the worst-case take, and refuses combinations that conflict.", "/builder"],
            ["Publish", "Name the rule set and set a royalty. It becomes a blueprint anyone can inspect, remix or launch with, and its author is paid each time a pool adopts it.", "/rules"],
            ["Launch", "Open a new token directly into a pool that carries the blueprint, or give an existing token a second pool with rules. Everything is frozen at creation.", "/launch"],
          ].map(([t, b, href], i) => (
            <li key={t} className="flex flex-col bg-card p-6 sm:p-8">
              <span className="num text-[13px] text-signal">0{i + 1}</span>
              <h3 className="h-display mt-3 text-[34px]">{t}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-[1.65] text-ink-2">{b}</p>
              <Link href={href} className="mt-6 inline-flex items-center gap-1 text-[14px] text-ink underline underline-offset-4">
                Go <ArrowRight className="size-3.5" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Modules */}
      <section className="border-y border-ink bg-ink text-paper">
        <div className="wrap py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[640px]">
              <p className="label !text-signal">The module shelf</p>
              <h2 className="h-display mt-2 text-[clamp(30px,4.4vw,46px)]">Seven rules, each with hard bounds</h2>
              <p className="mt-3 text-[16px] text-paper/70">Every module declares the callbacks it needs, the parameters it accepts and the most it can take from a trade. Nothing outside those bounds can be deployed.</p>
            </div>
            <Link href="/rules" className="btn btn-signal">
              All rules <ArrowRight />
            </Link>
          </div>
          <div className="grid-cols-1 mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <Link key={m.slug} href={`/rules/${m.slug}`} className="group flex flex-col border border-paper/20 p-5 transition-colors hover:border-signal hover:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <ModuleGlyph glyph={m.glyph} className="size-6 text-signal" />
                  {m.status === "planned" ? <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#f0b65a]">planned</span> : <span className="font-mono text-[10.5px] text-paper/50">{m.callbacks.length} callbacks</span>}
                </div>
                <p className="mt-6 text-[17px] font-medium">{m.name}</p>
                <p className="mt-1 text-[13.5px] leading-[1.5] text-paper/65">{m.line}</p>
              </Link>
            ))}
            <Link href="/builder" className="flex flex-col justify-between border border-dashed border-paper/30 p-5 text-paper/80 hover:border-signal hover:text-paper">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Your combination</span>
              <span className="mt-6 flex items-center gap-1 text-[17px]">
                Compose it <ArrowRight className="size-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Personas */}
      <section className="wrap py-20">
        <SectionTitle eyebrow="Who it is for" title="One hook, five ways in" />
        <div className="grid-cols-1 mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {PERSONAS.map((p) => (
            <Link key={p.who} href={p.href} className="card tick group flex flex-col p-5 hover:border-ink">
              <p className="label">{p.who}</p>
              <p className="mt-3 font-display text-[22px] leading-[1.15] tracking-[-0.01em] text-ink">{p.verb}</p>
              <p className="mt-3 flex-1 text-[14px] leading-[1.6] text-ink-2">{p.body}</p>
              <span className="mt-5 flex items-center gap-1 text-[13.5px] text-signal">
                {p.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Live */}
      <section className="border-y border-line bg-paper-2/60">
        <div className="wrap py-20">
          <SectionTitle
            eyebrow={`Live · ${CHAIN.name}`}
            title="Hooks are already shaping pools here"
            lead="Counted from Uniswap v4 PoolManager events over roughly the last eight hours. Third-party pools, read as they are; Rule Craft pools join them at launch."
            right={
              <Link href="/app" className="btn btn-line">
                Browse live pools
              </Link>
            }
          />
          <div className="mt-10">
            <Suspense fallback={<p className="font-mono text-[13px] text-ink-3">Reading PoolManager events…</p>}>
              <LiveCounts />
            </Suspense>
          </div>
          <div className="grid-cols-1 mt-10 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <h3 className="h-display text-[28px]">Scan a hook before you trust it</h3>
              <p className="mt-2 text-[15px] text-ink-2">Paste any hook address or v4 pool id from {CHAIN.name}. You get its permission bits, what each callback allows, and a permission-based grade.</p>
            </div>
            <ScanForm />
          </div>
        </div>
      </section>

      {/* Why it compounds */}
      <section className="wrap py-20">
        <SectionTitle eyebrow="Why it compounds" title="Rules become assets" />
        <div className="grid-cols-1 mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid grid-cols-1 gap-6">
            {[
              ["Composable, not forked", "Each module is written once and reused by every pool that switches it on. A new rule set is a new combination, not a new contract to trust."],
              ["Royalty-bearing blueprints", "Authors set a royalty on add-on revenue when they publish. Every pool that adopts the blueprint pays it for as long as the pool trades."],
              ["Pool-first launches", "A token is minted straight into its pool with its rules already on. No bonding phase to migrate from, no window where the rules are different."],
              ["Readable before capital moves", "Bits, parameters, take and grade are on the page before the first swap. If it is not readable, it does not launch."],
            ].map(([t, b]) => (
              <div key={t} className="grid grid-cols-[14px_1fr] gap-4">
                <span className="mt-2 size-3 bg-signal" />
                <div>
                  <p className="text-[18px] font-medium text-ink">{t}</p>
                  <p className="mt-1 text-[15px] leading-[1.6] text-ink-2">{b}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="card tick p-6 sm:p-8">
            <p className="label">Where a buy's add-on revenue goes · design</p>
            <p className="mt-4 text-[14.5px] text-ink-2">Take a pool on the Slow Burn blueprint and a 1 ETH buy. The base LP fee goes to LPs in full and is never shared. Only add-ons are split.</p>
            <div className="grid-cols-1 mt-6 grid gap-3">
              {(() => {
                const addOn = 0.5; // LP Stream share in ETH terms (% of 1 ETH)
                const royalty = (addOn * 10) / 100;
                const protocol = (addOn * FEE_MODEL.protocolSharePct) / 100;
                const lps = addOn - royalty - protocol;
                return [
                  ["Base LP fee 1%", "LPs in range", 1.0, "bg-ink"],
                  ["LP Stream, to LPs", "LPs in range", lps, "bg-blue"],
                  ["Blueprint royalty 10%", "Blueprint author", royalty, "bg-signal"],
                  [`Protocol share ${FEE_MODEL.protocolSharePct}%`, `${BRAND.symbol} flywheel`, protocol, "bg-warn"],
                ].map(([k, who, v, tone]) => (
                  <div key={k as string}>
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="text-ink">{k}</span>
                      <span className="num text-ink-2">{(v as number).toFixed(3)}% · {who}</span>
                    </div>
                    <div className="mt-1 h-2 bg-paper-2">
                      <div className={`h-full ${tone}`} style={{ width: `${Math.max(2, (v as number) * 70)}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
            <p className="mt-5 text-[12.5px] text-ink-3">Plus 1% of the tokens bought is burned. Percentages of the 1 ETH input. Design numbers, not deployed.</p>
          </div>
        </div>
      </section>

      {/* Blueprints strip */}
      <section className="border-t border-line">
        <div className="wrap py-20">
          <SectionTitle
            eyebrow="Blueprints"
            title="Start from an example"
            lead="Six rule sets written by the team to show the format. Not deployed; remix any of them."
            right={
              <Link href="/rules" className="btn btn-line">
                All blueprints
              </Link>
            }
          />
          <div className="grid-cols-1 mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BLUEPRINTS.map((b) => {
              const c = compose(draftFromBlueprint(b.slug)!);
              return (
                <Link key={b.slug} href={`/blueprints/${b.slug}`} className="card group flex flex-col p-5 hover:border-ink">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[24px] tracking-[-0.01em] text-ink">{b.name}</p>
                    <span className="num text-[12px] text-ink-3">
                      grade {c.risk.grade} · buy {c.take.buySteady}%
                    </span>
                  </div>
                  <p className="mt-2 flex-1 text-[14px] text-ink-2">{b.pitch}</p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {c.modules.map((m) => (
                      <span key={m.slug} className="chip">
                        <ModuleGlyph glyph={m.glyph} className="size-3" /> {m.name}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-line bg-paper-2/60">
        <div className="grid-cols-1 wrap grid gap-10 py-20 lg:grid-cols-[1fr_1.6fr]">
          <SectionTitle eyebrow="FAQ" title="Plain answers" />
          <div className="border-t border-ink">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-ink py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium text-ink">
                  {q}
                  <span className="num shrink-0 text-[18px] text-signal transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-[1.65] text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
