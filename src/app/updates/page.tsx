import type { Metadata } from "next";
import Link from "next/link";
import { UPDATES, type UpdateStatus } from "@/content/updates";
import { Badge, PageHead } from "@/components/ui/Page";

export const metadata: Metadata = {
  title: "Updates",
  description: "What has shipped, what is in progress and what is planned for Rule Craft.",
};

const statusTone = (s: UpdateStatus) => (s === "Shipped" ? "pass" : s === "In progress" ? "warn" : "ink") as "pass" | "warn" | "ink";

export default function UpdatesPage() {
  return (
    <>
      <PageHead eyebrow="Updates" title="What shipped, what is next" lead="Every item carries its status. Planned means planned: nothing here is deployed until it says Shipped." />
      <section className="wrap py-12">
        <ol className="relative border-l-2 border-ink pl-6 sm:pl-8">
          {UPDATES.map((u) => (
            <li key={u.slug} className="relative pb-10 last:pb-0">
              <span aria-hidden="true" className={`absolute -left-[33px] top-1.5 size-3 border-2 border-ink sm:-left-[41px] ${u.status === "Shipped" ? "bg-signal" : "bg-paper"}`} />
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                <time className="font-mono text-[12px] text-ink-3" dateTime={u.date}>
                  Logged {u.date}
                </time>
              </div>
              <Link href={`/updates/${u.slug}`} className="mt-2 block font-display text-[26px] leading-[1.15] tracking-[-0.01em] hover:text-signal">
                {u.title}
              </Link>
              <p className="mt-1.5 max-w-[680px] text-[15px] text-ink-2">{u.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
