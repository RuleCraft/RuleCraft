"use client";

import { useEffect, useState } from "react";
import { CHAIN } from "@/config/brand";

type Facts = {
  ok: boolean;
  chainId: number | null;
  block: number | null;
  gasPriceGwei: number | null;
  poolManagerLive: boolean | null;
  readAt: string;
  latencyMs: number | null;
};

/** Polls /api/chain every 15 s. A failed read says so instead of showing stale numbers as live. */
export function ChainStatus({ compact = false }: { compact?: boolean }) {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const res = await fetch("/api/chain", { cache: "no-store" });
        const body = (await res.json()) as Facts;
        if (!alive) return;
        setFacts(body);
        setFailed(!body.ok);
      } catch {
        if (alive) setFailed(true);
      }
    };
    read();
    const t = window.setInterval(read, 15_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const rows: [string, string][] = [
    ["Network", `${CHAIN.name} · ${CHAIN.id}`],
    ["Chain id read", facts?.chainId ? String(facts.chainId) : "--"],
    ["Latest block", facts?.block ? facts.block.toLocaleString("en-US") : "--"],
    ["Gas price", facts?.gasPriceGwei != null ? `${facts.gasPriceGwei.toLocaleString("en-US", { maximumFractionDigits: 4 })} gwei` : "--"],
    ["v4 PoolManager", facts?.poolManagerLive == null ? "--" : facts.poolManagerLive ? "Bytecode present" : "No bytecode"],
    ["Read latency", facts?.latencyMs != null ? `${facts.latencyMs} ms` : "--"],
  ];

  return (
    <div className="card p-5" data-chain-status>
      <div className="flex items-center justify-between gap-3">
        <p className="label">Live chain read</p>
        <span className={`flex items-center gap-1.5 font-mono text-[11px] ${failed ? "text-danger" : facts ? "text-pass" : "text-ink-3"}`}>
          <span className={`size-2 rounded-full ${failed ? "bg-danger" : facts ? "animate-blink bg-pass" : "bg-ink-3"}`} />
          {failed ? "Read failed" : facts ? "Live" : "Reading…"}
        </span>
      </div>
      <dl className={`mt-4 grid gap-x-6 gap-y-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[12.5px] text-ink-3">{k}</dt>
            <dd className="num mt-0.5 truncate text-[15px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {facts?.readAt ? <p className="mt-4 font-mono text-[11px] text-ink-3">Read at {new Date(facts.readAt).toLocaleTimeString("en-US")} · refreshes every 15 s</p> : null}
    </div>
  );
}
