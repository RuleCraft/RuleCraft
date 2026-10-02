import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULES, MODULE_BY_SLUG } from "@/config/modules";
import { BLUEPRINTS } from "@/config/blueprints";
import { encodeDraft, sanitize } from "@/lib/draft";
import { ModuleGlyph } from "@/components/glyphs";
import { Badge, PageHead, Stat } from "@/components/ui/Page";
import { CallbackList, PermissionGrid } from "@/components/rules/Readout";
import { ArrowRight } from "@/components/icons";

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = MODULE_BY_SLUG[slug];
  return m ? { title: `${m.name} module`, description: m.summary } : {};
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = MODULE_BY_SLUG[slug];
  if (!m) notFound();
  const href = `/builder?rules=${encodeDraft(sanitize({ name: m.name, modules: [m.slug] }))}`;
  const usedBy = BLUEPRINTS.filter((b) => b.modules.includes(m.slug));
  return (
    <>
      <PageHead
        eyebrow={m.status === "planned" ? "Planned module" : "Core module"}
        title={
          <span className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-[6px] bg-ink text-paper">
              <ModuleGlyph glyph={m.glyph} className="size-7" />
            </span>
            {m.name}
          </span>
        }
        lead={m.summary}
        crumbs={[
          { href: "/rules", label: "Rules" },
          { href: `/rules/${m.slug}`, label: m.name },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="btn btn-signal">
            Compose with {m.name} <ArrowRight />
          </Link>
          {m.status === "planned" ? <Badge tone="warn">Design stage · not launchable yet</Badge> : <Badge tone="blue">Contract published at launch</Badge>}
        </div>
      </PageHead>

      <div className="grid-cols-1 wrap grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
            <Stat label="Callbacks" value={m.callbacks.length} />
            <Stat label="Swap gas" value={m.gas.split(" ")[0]} note="estimate" />
            <Stat label="Touches" value={m.touches.join(" · ")} />
            <Stat label="Pools" value="0" note="opens at launch" />
          </div>

          <h2 className="h-display mt-12 text-[30px]">How it behaves</h2>
          <ol className="grid-cols-1 mt-4 grid gap-3">
            {m.how.map((h, i) => (
              <li key={i} className="grid grid-cols-[32px_1fr] gap-3 text-[15px] leading-[1.6] text-ink-2">
                <span className="num grid size-7 place-items-center rounded-[3px] border border-ink text-[12px] text-ink">{i + 1}</span>
                <span>{h}</span>
              </li>
            ))}
          </ol>

          <h2 className="h-display mt-12 text-[30px]">Parameters</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-ink">
                  {["Parameter", "Min", "Default", "Max", "What it does"].map((h) => (
                    <th key={h} className="label py-2.5 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.params.map((p) => (
                  <tr key={p.key} className="border-b border-line align-top">
                    <td className="py-3 pr-4 text-ink">{p.label}</td>
                    <td className="num py-3 pr-4">
                      {p.min} {p.unit}
                    </td>
                    <td className="num py-3 pr-4 text-signal-deep">
                      {p.def} {p.unit}
                    </td>
                    <td className="num py-3 pr-4">
                      {p.max} {p.unit}
                    </td>
                    <td className="py-3 text-[13.5px] text-ink-2">{p.help}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-ink-3">Bounds are enforced by the module registry. Values are frozen when the pool is created.</p>

          <h2 className="h-display mt-12 text-[30px]">Permission bits</h2>
          <div className="mt-4">
            <PermissionGrid flags={m.callbacks} />
          </div>
          <div className="mt-6">
            <CallbackList flags={m.callbacks} />
          </div>
        </div>

        <aside className="grid grid-cols-1 content-start gap-5">
          <div className="card tick p-5">
            <p className="label">Tradeoffs</p>
            <ul className="grid-cols-1 mt-3 grid gap-3 text-[14px] leading-[1.55] text-ink-2">
              {m.tradeoffs.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            {m.dynamicFee ? <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-3">Needs a pool created with the v4 dynamic-fee flag.</p> : null}
          </div>
          <div className="card p-5">
            <p className="label">Example blueprints using it</p>
            {usedBy.length ? (
              <ul className="grid-cols-1 mt-3 grid gap-2">
                {usedBy.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/blueprints/${b.slug}`} className="flex items-center justify-between gap-2 text-[14.5px] text-ink hover:text-signal">
                      {b.name} <ArrowRight className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-ink-3">None yet.</p>
            )}
          </div>
          <div className="card p-5">
            <p className="label">Other modules</p>
            <ul className="grid-cols-1 mt-3 grid gap-2">
              {MODULES.filter((x) => x.slug !== m.slug).map((x) => (
                <li key={x.slug}>
                  <Link href={`/rules/${x.slug}`} className="flex items-center gap-2 text-[14px] text-ink-2 hover:text-ink">
                    <ModuleGlyph glyph={x.glyph} className="size-4" /> {x.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
