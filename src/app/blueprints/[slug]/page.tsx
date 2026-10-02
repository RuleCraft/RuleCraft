import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLUEPRINTS, BLUEPRINT_BY_SLUG } from "@/config/blueprints";
import { compose } from "@/lib/compose";
import { draftFromBlueprint, encodeDraft } from "@/lib/draft";
import { ModuleGlyph } from "@/components/glyphs";
import { Badge, PageHead, Stat } from "@/components/ui/Page";
import { IssueList, LifecycleTrack, PermissionGrid, RiskCard, TakeRow } from "@/components/rules/Readout";
import { ArrowRight } from "@/components/icons";

export function generateStaticParams() {
  return BLUEPRINTS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = BLUEPRINT_BY_SLUG[slug];
  return b ? { title: `${b.name} blueprint`, description: b.pitch } : {};
}

export default async function BlueprintPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = BLUEPRINT_BY_SLUG[slug];
  if (!b) notFound();
  const draft = draftFromBlueprint(slug)!;
  const c = compose(draft);
  const code = encodeDraft(draft);
  return (
    <>
      <PageHead
        eyebrow="Example blueprint"
        title={b.name}
        lead={b.story}
        crumbs={[
          { href: "/rules", label: "Rules" },
          { href: `/blueprints/${b.slug}`, label: b.name },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/builder?rules=${code}`} className="btn btn-signal">
            Remix in composer <ArrowRight />
          </Link>
          <Link href={`/launch?rules=${code}`} className="btn btn-line">
            Use for a launch
          </Link>
          <Badge>Example · written by the team · not deployed</Badge>
        </div>
      </PageHead>

      <div className="grid-cols-1 wrap grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Modules" value={c.modules.length} />
            <Stat label="Royalty" value={`${b.royaltyPct}%`} note="of add-on revenue" />
            <Stat label="Pools" value="0" note="opens at launch" />
            <Stat label="Built for" value={<span className="text-[16px]">{b.persona}</span>} />
          </div>

          <h2 className="h-display mt-12 text-[30px]">The rules, in plain words</h2>
          <ul className="grid-cols-1 mt-4 grid gap-2.5 text-[15px] text-ink">
            {c.lines.map((l, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[10px] size-1.5 shrink-0 bg-signal" />
                {l}
              </li>
            ))}
          </ul>
          <div className="mt-6 max-w-[520px]">
            <TakeRow take={c.take} />
          </div>

          <h2 className="h-display mt-12 text-[30px]">Permission bits</h2>
          <div className="mt-4">
            <PermissionGrid flags={c.callbacks} />
          </div>

          <div className="grid-cols-1 mt-10 grid gap-6 md:grid-cols-2">
            <div className="card p-5">
              <p className="label mb-3">Where each rule runs</p>
              <LifecycleTrack modules={c.modules} />
            </div>
            <div className="card p-5">
              <p className="label mb-3">Modules</p>
              <ul className="grid grid-cols-1 gap-3">
                {c.modules.map((m) => (
                  <li key={m.slug}>
                    <Link href={`/rules/${m.slug}`} className="flex items-start gap-3 text-ink hover:text-signal">
                      <ModuleGlyph glyph={m.glyph} className="mt-0.5 size-4 shrink-0" />
                      <span>
                        <span className="block text-[14.5px] font-medium">{m.name}</span>
                        <span className="block font-mono text-[11.5px] text-ink-3">
                          {Object.entries(draft.params[m.slug] ?? {})
                            .map(([k, v]) => `${k}=${v}`)
                            .join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <aside className="grid grid-cols-1 content-start gap-5">
          <RiskCard risk={c.risk} />
          <div>
            <p className="label mb-2">Checks</p>
            <IssueList issues={c.issues} />
          </div>
          <div className="flex flex-wrap gap-1">
            {b.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
