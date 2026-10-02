"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LivePool } from "@/lib/chain-server";
import { scoreUnknownHook } from "@/lib/compose";
import { FLAG_BY_KEY, ZERO_ADDRESS, feeLabel } from "@/lib/hooks";
import { shortAddress } from "@/config/brand";
import { GradeChip, ago } from "@/components/pools/format";

export function PoolExplorer({ pools, toBlock }: { pools: LivePool[]; toBlock: number }) {
  const [mode, setMode] = useState<"hooked" | "all">("hooked");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return pools
      .filter((p) => (mode === "hooked" ? p.hooks !== ZERO_ADDRESS : true))
      .filter((p) =>
        term
          ? [p.currency0.symbol, p.currency1.symbol, p.hooks, p.id, p.currency0.address, p.currency1.address].some((v) => v.toLowerCase().includes(term))
          : true,
      )
      .slice(0, 150);
  }, [pools, mode, q]);
  const hooked = pools.filter((p) => p.hooks !== ZERO_ADDRESS).length;

  return (
    <div data-pool-explorer>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1" role="tablist">
          {(
            [
              ["hooked", `With a hook · ${hooked}`],
              ["all", `All pools · ${pools.length}`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={mode === k}
              onClick={() => setMode(k)}
              className={`rounded-[3px] border px-3 py-1.5 font-mono text-[12px] ${mode === k ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by symbol, hook or address" aria-label="Filter pools" className="field !h-9 md:!w-[320px]" />
      </div>

      <div className="mt-4 overflow-x-auto border border-line bg-card">
        <table className="w-full min-w-[860px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-ink">
              {["Pair", "Fee", "Hook", "Callbacks", "Grade", "Opened", ""].map((h) => (
                <th key={h} className="label px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const risk = scoreUnknownHook(p.flags, p.dynamic, null);
              const deltas = p.flags.filter((f) => FLAG_BY_KEY[f].group === "delta");
              return (
                <tr key={p.id} className="border-b border-line align-middle hover:bg-paper" data-pool-row>
                  <td className="px-3 py-2.5">
                    <Link href={`/pool/${p.id}`} className="font-medium text-ink hover:text-signal">
                      {p.currency0.symbol} / {p.currency1.symbol}
                    </Link>
                    <span className="ml-2 font-mono text-[11px] text-ink-3">{shortAddress(p.id, 6, 4)}</span>
                  </td>
                  <td className="num px-3 py-2.5">{feeLabel(p.fee)}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px]">
                    {p.hooks === ZERO_ADDRESS ? (
                      <span className="text-ink-3">none</span>
                    ) : (
                      <Link href={`/scan/${p.hooks}`} className="text-blue hover:underline">
                        {shortAddress(p.hooks)}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {p.flags.length ? (
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="num text-ink">{p.flags.length}</span>
                        {deltas.length ? <span className="chip !border-signal/40 !text-signal-deep">{deltas.length} Δ</span> : null}
                        {p.flags.includes("beforeRemoveLiquidity") ? <span className="chip">exit gate</span> : null}
                      </span>
                    ) : (
                      <span className="text-ink-3">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <GradeChip grade={risk.grade} />
                  </td>
                  <td className="num px-3 py-2.5 text-ink-2">{ago(toBlock - p.block)} ago</td>
                  <td className="px-3 py-2.5 text-right">
                    <Link href={`/pool/${p.id}`} className="text-[12.5px] text-blue underline underline-offset-4">
                      Read rules
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink-3">
                  No pools match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Showing up to 150 rows. Grades come from permission bits and fee type only; open a pool to see the full read.</p>
    </div>
  );
}
