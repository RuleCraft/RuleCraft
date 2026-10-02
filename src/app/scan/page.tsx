import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { shortAddress } from "@/config/brand";
import { readPoolIndex } from "@/lib/chain-server";
import { scoreUnknownHook } from "@/lib/compose";
import { ZERO_ADDRESS } from "@/lib/hooks";
import { PageHead } from "@/components/ui/Page";
import { ScanForm } from "@/components/pools/ScanForm";
import { GradeChip, ago } from "@/components/pools/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hook scanner",
  description: "Decode any Uniswap v4 hook on Robinhood Chain: its 14 permission bits, what each callback allows, and a permission-based risk read.",
};

async function RecentHooks() {
  const index = await readPoolIndex();
  if (!index.ok || index.toBlock === null) return <p className="text-[14px] text-ink-3">Recent hooks could not be read from the chain right now. The scanner above still works for any address.</p>;
  const by = new Map<string, { hook: string; pools: number; last: number; flags: (typeof index.pools)[number]["flags"]; dynamic: boolean }>();
  for (const p of index.pools) {
    if (p.hooks === ZERO_ADDRESS) continue;
    const k = p.hooks.toLowerCase();
    const cur = by.get(k);
    if (cur) {
      cur.pools++;
      cur.last = Math.max(cur.last, p.block);
    } else by.set(k, { hook: p.hooks, pools: 1, last: p.block, flags: p.flags, dynamic: p.dynamic });
  }
  const rows = [...by.values()].sort((a, b) => b.pools - a.pools).slice(0, 25);
  if (!rows.length) return <p className="text-[14px] text-ink-3">No hooked pools opened in the indexed window.</p>;
  return (
    <div className="overflow-x-auto border border-line bg-card">
      <table className="w-full min-w-[640px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-ink">
            {["Hook", "New pools", "Callbacks", "Grade", "Latest", ""].map((h) => (
              <th key={h} className="label px-3 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.hook} className="border-b border-line hover:bg-paper" data-hook-row>
              <td className="px-3 py-2.5 font-mono text-[12.5px]">
                <Link href={`/scan/${r.hook}`} className="text-ink hover:text-signal">
                  {shortAddress(r.hook, 8, 6)}
                </Link>
              </td>
              <td className="num px-3 py-2.5">{r.pools}</td>
              <td className="num px-3 py-2.5">{r.flags.length}</td>
              <td className="px-3 py-2.5">
                <GradeChip grade={scoreUnknownHook(r.flags, r.dynamic, null).grade} />
              </td>
              <td className="num px-3 py-2.5 text-ink-2">{ago(index.toBlock! - r.last)} ago</td>
              <td className="px-3 py-2.5 text-right">
                <Link href={`/scan/${r.hook}`} className="text-[12.5px] text-blue underline underline-offset-4">
                  Read
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScanPage() {
  return (
    <>
      <PageHead
        eyebrow="Scanner"
        title={
          <>
            Read any v4 hook <span className="italic text-signal">before</span> you trade.
          </>
        }
        lead="A v4 hook's address is its permission list. Paste one and see which of the 14 callbacks it can run, which of them can change your amounts, and what to check next. Automated screening from chain data, never an audit."
      >
        <div className="max-w-[640px]">
          <ScanForm />
        </div>
      </PageHead>
      <section className="wrap py-12">
        <h2 className="h-display text-[30px]">Hooks behind new pools</h2>
        <p className="mt-2 max-w-[640px] text-[15px] text-ink-2">Third-party hooks seen in pools opened in roughly the last eight hours, most used first.</p>
        <div className="mt-6">
          <Suspense fallback={<p className="font-mono text-[13px] text-ink-3">Reading PoolManager events…</p>}>
            <RecentHooks />
          </Suspense>
        </div>
      </section>
    </>
  );
}
