import type { Metadata } from "next";
import Link from "next/link";
import { LEARN } from "@/content/learn";
import { PageHead } from "@/components/ui/Page";
import { ArrowRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Learn",
  description: "Plain-language explainers on AMMs, liquidity, Uniswap v4 hooks and reading a pool before you trade.",
};

export default function LearnIndex() {
  return (
    <>
      <PageHead eyebrow="Learn" title="The ideas under every pool" lead="Short explainers in plain language. No prior DeFi knowledge needed; each one takes a few minutes." />
      <section className="wrap py-12">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEARN.map((a, i) => (
            <li key={a.slug}>
              <Link href={`/learn/${a.slug}`} className="card tick group flex h-full flex-col p-5 transition-colors hover:border-ink">
                <span className="flex items-center justify-between font-mono text-[11px] text-ink-3">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span>{a.minutes} min read</span>
                </span>
                <span className="mt-4 font-display text-[23px] leading-[1.15] tracking-[-0.01em]">{a.title}</span>
                <span className="mt-2 flex-1 text-[14.5px] text-ink-2">{a.summary}</span>
                <span className="mt-5 flex items-center gap-1.5 text-[14px] text-signal">
                  Read <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
