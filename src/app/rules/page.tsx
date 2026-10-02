import type { Metadata } from "next";
import Link from "next/link";
import { MODULES } from "@/config/modules";
import { BLUEPRINTS } from "@/config/blueprints";
import { compose } from "@/lib/compose";
import { draftFromBlueprint } from "@/lib/draft";
import { ModuleGlyph } from "@/components/glyphs";
import { Badge, PageHead, SectionTitle } from "@/components/ui/Page";
import { ArrowRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Rules & blueprints",
  description: "The rule modules a Rule Craft pool can carry, and example blueprints that combine them.",
};

export default function RulesPage() {
  return (
    <>
      <PageHead
        eyebrow="Marketplace"
        title="Rules and blueprints"
        lead="Modules are single rules with hard bounds. Blueprints are named combinations of modules with their settings, published by an author who earns a royalty each time a pool reuses them."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/builder" className="btn btn-signal">
            Compose your own <ArrowRight />
          </Link>
          <button type="button" disabled className="btn btn-line">
            List a blueprint · Opens at launch
          </button>
        </div>
      </PageHead>

      <section className="wrap py-14">
        <SectionTitle eyebrow="Modules" title="Seven rules, one hook" lead="Six core modules make up the first release. Arb Recapture is planned and can be drafted, not launched." />
        <div className="grid-cols-1 mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Link key={m.slug} href={`/rules/${m.slug}`} className="card group flex flex-col p-5 transition-colors hover:border-ink">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-[4px] bg-ink text-paper group-hover:bg-signal">
                  <ModuleGlyph glyph={m.glyph} />
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-medium text-ink">{m.name}</p>
                  <p className="font-mono text-[11px] text-ink-3">{m.callbacks.length} callbacks · {m.gas}</p>
                </div>
                {m.status === "planned" ? (
                  <span className="ml-auto">
                    <Badge tone="warn">Planned</Badge>
                  </span>
                ) : null}
              </div>
              <p className="mt-4 flex-1 text-[14px] leading-[1.55] text-ink-2">{m.line}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {m.for.map((f) => (
                  <span key={f} className="chip">
                    {f}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper-2/50">
        <div className="wrap py-14">
          <SectionTitle
            eyebrow="Blueprints"
            title="Example rule sets"
            lead="Written by the Rule Craft team to show the format. They are not deployed, have no on-chain author and no pools yet. Published blueprints from crafters appear here once the registry opens."
          />
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-ink">
                  {["Blueprint", "Modules", "Buy take", "Grade", "Royalty", "Pools", ""].map((h) => (
                    <th key={h} className="label py-3 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BLUEPRINTS.map((b) => {
                  const c = compose(draftFromBlueprint(b.slug)!);
                  return (
                    <tr key={b.slug} className="border-b border-line align-top">
                      <td className="py-4 pr-4">
                        <Link href={`/blueprints/${b.slug}`} className="font-medium text-ink hover:text-signal">
                          {b.name}
                        </Link>
                        <span className="ml-2">
                          <Badge>Example</Badge>
                        </span>
                        <p className="mt-1 max-w-[320px] text-[13px] text-ink-3">{b.pitch}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {c.modules.map((m) => (
                            <span key={m.slug} className="chip">
                              <ModuleGlyph glyph={m.glyph} className="size-3" />
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="num py-4 pr-4">{c.take.buySteady}%</td>
                      <td className="num py-4 pr-4">
                        {c.risk.grade} · {c.risk.score}
                      </td>
                      <td className="num py-4 pr-4">{b.royaltyPct}%</td>
                      <td className="num py-4 pr-4 text-ink-3">0</td>
                      <td className="py-4">
                        <Link href={`/blueprints/${b.slug}`} className="text-[13px] text-blue underline underline-offset-4">
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
