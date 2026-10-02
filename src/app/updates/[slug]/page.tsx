import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UPDATES, updateBySlug } from "@/content/updates";
import { Blocks } from "@/components/docs/Blocks";
import { Badge, PageHead } from "@/components/ui/Page";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return UPDATES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = updateBySlug((await params).slug);
  return u ? { title: u.title, description: u.summary } : { title: "Updates" };
}

export default async function UpdatePage({ params }: Props) {
  const u = updateBySlug((await params).slug);
  if (!u) notFound();
  const tone = u.status === "Shipped" ? "pass" : u.status === "In progress" ? "warn" : "ink";
  return (
    <>
      <PageHead eyebrow={`Update · ${u.date}`} title={u.title} lead={u.summary} crumbs={[{ href: "/updates", label: "Updates" }]}>
        <Badge tone={tone}>{u.status}</Badge>
      </PageHead>
      <section className="wrap py-12">
        <article className="max-w-[720px]">
          <Blocks body={u.body} />
          <p className="mt-10 border-t border-line pt-5 text-[14px]">
            <Link href="/updates" className="text-blue underline underline-offset-2">
              All updates
            </Link>
          </p>
        </article>
      </section>
    </>
  );
}
