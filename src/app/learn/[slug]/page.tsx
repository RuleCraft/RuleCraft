import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEARN, learnBySlug } from "@/content/learn";
import { Blocks } from "@/components/docs/Blocks";
import { PageHead } from "@/components/ui/Page";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LEARN.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = learnBySlug((await params).slug);
  return a ? { title: a.title, description: a.summary } : { title: "Learn" };
}

export default async function LearnArticlePage({ params }: Props) {
  const a = learnBySlug((await params).slug);
  if (!a) notFound();
  const i = LEARN.indexOf(a);
  const next = LEARN[(i + 1) % LEARN.length];
  return (
    <>
      <PageHead eyebrow={`Learn · ${a.minutes} min read`} title={a.title} lead={a.summary} crumbs={[{ href: "/learn", label: "Learn" }]} />
      <section className="grid-cols-1 wrap grid gap-10 py-12 lg:grid-cols-[minmax(0,720px)_1fr]">
        <article className="min-w-0">
          <Blocks body={a.body} />
        </article>
        <aside className="min-w-0">
          <div className="card p-5 lg:sticky lg:top-[88px]">
            <p className="label">Next up</p>
            <Link href={`/learn/${next.slug}`} className="mt-2 block font-display text-[21px] leading-[1.2] hover:text-signal">
              {next.title}
            </Link>
            <p className="mt-2 text-[14px] text-ink-2">{next.summary}</p>
            <div className="mt-5 border-t border-line pt-4 text-[14px]">
              <Link href="/builder" className="text-blue underline underline-offset-2">
                Try it in the composer
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
