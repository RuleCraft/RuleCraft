import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { explorerAddress, isAddress, shortAddress } from "@/config/brand";
import { readHook } from "@/lib/chain-server";
import { feeLabel } from "@/lib/hooks";
import { PageHead, Stat } from "@/components/ui/Page";
import { HookPanel } from "@/components/pools/HookPanel";
import { ScanForm } from "@/components/pools/ScanForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  return { title: `${shortAddress(address)} hook report`, robots: { index: false } };
}

async function Report({ address }: { address: string }) {
  const r = await readHook(address);
  const hasCode = r.codeSize === null ? null : r.codeSize > 0;
  const dynamic = r.pools.some((p) => p.dynamic);
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
        <Stat label="Callbacks" value={`${r.flags.length} / 14`} />
        <Stat label="Bytecode" value={r.codeSize === null ? "--" : `${r.codeSize.toLocaleString("en-US")} B`} note={r.readOk ? (hasCode ? "contract" : "no code") : "read failed"} />
        <Stat label="Recent pools" value={r.pools.length} note="last ~8 hours" />
        <Stat label="Explorer" value={<a href={explorerAddress(address)} target="_blank" rel="noreferrer" className="text-[16px] text-blue underline underline-offset-4">Source & txs</a>} />
      </div>
      {r.pools.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {r.pools.slice(0, 12).map((p) => (
            <Link key={p.id} href={`/pool/${p.id}`} className="chip hover:border-ink">
              {p.currency0.symbol}/{p.currency1.symbol} · {feeLabel(p.fee)}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="mt-10">
        <HookPanel flags={r.flags} dynamic={dynamic} hasCode={hasCode} />
      </div>
    </>
  );
}

export default async function HookScanPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  return (
    <>
      <PageHead
        eyebrow="Hook report"
        title={<span className="break-all font-mono text-[clamp(20px,3vw,30px)] tracking-normal">{address}</span>}
        crumbs={[
          { href: "/scan", label: "Scanner" },
          { href: `/scan/${address}`, label: shortAddress(address) },
        ]}
      >
        <div className="max-w-[640px]">
          <ScanForm initial={address} />
        </div>
      </PageHead>
      <section className="wrap py-10">
        <Suspense fallback={<p className="font-mono text-[13px] text-ink-3">Reading the hook…</p>}>
          <Report address={address} />
        </Suspense>
      </section>
    </>
  );
}
