import Link from "next/link";

export function PageHead({
  eyebrow,
  title,
  lead,
  children,
  crumbs,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <section className="graph border-b border-line">
      <div className="wrap pb-10 pt-10 sm:pb-14 sm:pt-14">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 font-mono text-[12px] text-ink-3">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1.5">
                {i > 0 ? <span>/</span> : null}
                <Link href={c.href} className="hover:text-ink">
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>
        ) : null}
        <p className="label !text-signal">{eyebrow}</p>
        <h1 className="h-display mt-3 max-w-[900px] text-[clamp(36px,6vw,64px)]">{title}</h1>
        {lead ? <p className="mt-4 max-w-[720px] text-[17px] leading-[1.6] text-ink-2">{lead}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}

export function Badge({ tone = "ink", children }: { tone?: "ink" | "signal" | "pass" | "warn" | "danger" | "blue"; children: React.ReactNode }) {
  const map = {
    ink: "border-line-2 text-ink-2 bg-card",
    signal: "border-signal/40 text-signal-deep bg-signal-soft",
    pass: "border-pass/30 text-pass bg-pass-soft",
    warn: "border-warn/30 text-warn bg-warn-soft",
    danger: "border-danger/30 text-danger bg-danger-soft",
    blue: "border-blue/30 text-blue bg-blue-soft",
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-[1px] font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${map[tone]}`}>{children}</span>;
}

export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="min-w-0 border-l-2 border-ink pl-3">
      <p className="label">{label}</p>
      <p className="num mt-1 text-[22px] leading-tight text-ink [overflow-wrap:anywhere]">{value}</p>
      {note ? <p className="mt-0.5 text-[12.5px] text-ink-3">{note}</p> : null}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, lead, right }: { eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[720px]">
        <p className="label !text-signal">{eyebrow}</p>
        <h2 className="h-display mt-2 text-[clamp(30px,4.4vw,46px)]">{title}</h2>
        {lead ? <p className="mt-3 text-[16.5px] leading-[1.6] text-ink-2">{lead}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
