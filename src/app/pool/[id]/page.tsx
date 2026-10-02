import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { explorerAddress, explorerBlock, explorerTx, shortAddress } from "@/config/brand";
import { readHook, readPoolIndex } from "@/lib/chain-server";
import { ZERO_ADDRESS, feeLabel } from "@/lib/hooks";
import { PageHead, Stat } from "@/components/ui/Page";
import { HookPanel } from "@/components/pools/HookPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Pool ${shortAddress(id, 8, 6)}`, robots: { index: false } };
}

async function PoolBody({ id }: { id: string }) {
  const index = await readPoolIndex();
  const pool = index.pools.find((p) => p.id.toLowerCase() === id.toLowerCase());
  if (!pool) {
    return (
      <div className="card p-8" data-pool-missing>
        <p className="font-display text-[24px] text-ink">{index.ok ? "This pool is not in the recent index." : "The chain could not be read right now."}</p>
        <p className="mt-2 max-w-[620px] text-[14.5px] text-ink-2">
          {index.ok
            ? "The index covers pools opened in roughly the last eight hours. For an older pool, paste its hook address into the scanner: the permission read works for any hook."
            : "Nothing is shown rather than a guess. Try again in a minute."}
        </p>
        <Link href="/scan" className="btn btn-line mt-5">
          Open the scanner
        </Link>
      </div>
    );
  }
  const hooked = pool.hooks !== ZERO_ADDRESS;
  const report = hooked ? await readHook(pool.hooks) : null;
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
        <Stat label="Fee" value={feeLabel(pool.fee)} note={pool.dynamic ? "set by the hook" : "fixed"} />
        <Stat label="Tick spacing" value={pool.tickSpacing} />
        <Stat label="Opening tick" value={pool.tick.toLocaleString("en-US")} />
        <Stat
          label="Opened at block"
          value={
            <a href={explorerBlock(pool.block)} target="_blank" rel="noreferrer" className="hover:text-signal">
              {pool.block.toLocaleString("en-US")}
            </a>
          }
        />
        <Stat label="Hook code" value={report ? (report.codeSize === null ? "--" : `${report.codeSize.toLocaleString("en-US")} B`) : "none"} />
      </div>
      <div className="grid-cols-1 mt-8 grid gap-3 font-mono text-[12.5px] text-ink-2 md:grid-cols-2">
        {[
          [`${pool.currency0.symbol} (currency0)`, pool.currency0.address],
          [`${pool.currency1.symbol} (currency1)`, pool.currency1.address],
          ["Hook", pool.hooks],
          ["Pool id", pool.id],
        ].map(([k, v]) => (
          <div key={k} className="card min-w-0 px-3 py-2.5">
            <p className="label">{k}</p>
            {v.length === 42 && v !== ZERO_ADDRESS ? (
              <a href={explorerAddress(v)} target="_blank" rel="noreferrer" className="mt-1 block break-all text-ink hover:text-signal">
                {v}
              </a>
            ) : (
              <p className="mt-1 break-all text-ink">{v === ZERO_ADDRESS ? (k === "Hook" ? "none (plain v4 pool)" : "native ETH") : v}</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[12px] text-ink-3">
        Initialize tx{" "}
        <a href={explorerTx(pool.tx)} target="_blank" rel="noreferrer" className="break-all text-blue hover:underline">
          {shortAddress(pool.tx, 10, 8)}
        </a>
      </p>
      <div className="mt-12">
        {hooked && report ? (
          <HookPanel flags={pool.flags} dynamic={pool.dynamic} hasCode={report.codeSize === null ? null : report.codeSize > 0} />
        ) : (
          <div className="card p-6 text-[15px] text-ink-2">This pool has no hook. It runs plain Uniswap v4 rules: a fixed fee, all of it to LPs in range, and nothing else.</div>
        )}
      </div>
    </>
  );
}

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(id)) notFound();
  return (
    <>
      <PageHead
        eyebrow="Pool rules · live read"
        title={<span className="break-all font-mono text-[clamp(20px,3vw,30px)] tracking-normal">{shortAddress(id, 14, 10)}</span>}
        lead="What this Uniswap v4 pool's hook is allowed to do, decoded from chain data. Third-party pool: Rule Craft did not create it and does not vouch for it."
        crumbs={[
          { href: "/app", label: "Pools" },
          { href: `/pool/${id}`, label: shortAddress(id, 6, 4) },
        ]}
      />
      <section className="wrap py-10">
        <Suspense fallback={<p className="font-mono text-[13px] text-ink-3">Reading the pool…</p>}>
          <PoolBody id={id} />
        </Suspense>
      </section>
    </>
  );
}
