import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCS, docBySlug, docHref } from "@/content/docs";
import { Blocks } from "@/components/docs/Blocks";
import { DocsNav } from "@/components/docs/DocsNav";

type Props = { params: Promise<{ slug?: string[] }> };

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug ? d.slug.split("/") : [] }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = docBySlug((slug ?? []).join("/"));
  if (!page) return { title: "Docs" };
  return { title: page.slug ? `${page.title} · Docs` : "Docs", description: page.summary };
}

export default async function DocPageRoute({ params }: Props) {
  const { slug } = await params;
  const key = (slug ?? []).join("/");
  const page = docBySlug(key);
  if (!page) notFound();
  const i = DOCS.indexOf(page);
  const prev = i > 0 ? DOCS[i - 1] : null;
  const next = i < DOCS.length - 1 ? DOCS[i + 1] : null;

  return (
    <div className="grid-cols-1 wrap grid gap-8 py-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12 lg:py-14">
      <DocsNav current={key} />
      <article className="card min-w-0 px-5 py-7 sm:px-10 sm:py-10">
        <p className="label !text-signal">{page.section}</p>
        <h1 className="h-display mt-2 text-[clamp(32px,5vw,48px)]">{page.title}</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-ink-2">{page.summary}</p>
        <div className="mt-6 border-t border-line pt-2">
          <Blocks body={page.body} />
        </div>
        <nav className="grid-cols-1 mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label="Pagination">
          {prev ? (
            <Link href={docHref(prev.slug)} className="block border border-line px-4 py-3 hover:border-ink">
              <span className="label">Previous</span>
              <span className="mt-1 block text-[15px]">{prev.slug ? prev.title : "Introduction"}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={docHref(next.slug)} className="block border border-line px-4 py-3 text-right hover:border-ink">
              <span className="label">Next</span>
              <span className="mt-1 block text-[15px]">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </article>
    </div>
  );
}
