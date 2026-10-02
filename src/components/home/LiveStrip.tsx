"use client";

import { useEffect, useState } from "react";
import { CHAIN } from "@/config/brand";

type Facts = { ok: boolean; block: number | null; gasPriceGwei: number | null; poolManagerLive: boolean | null };

/** One-line chain ticker under the hero. Polls /api/chain; says so when a read fails. */
export function LiveStrip() {
  const [f, setF] = useState<Facts | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const r = await fetch("/api/chain", { cache: "no-store" });
        const b = (await r.json()) as Facts;
        if (alive) {
          setF(b);
          setFailed(!b.ok);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    read();
    const t = window.setInterval(read, 12_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  const item = "flex items-center gap-2 whitespace-nowrap";
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-paper/80" data-live-strip>
      <span className={item}>
        <span className={`size-2 rounded-full ${failed ? "bg-danger" : f ? "animate-blink bg-[#4ed29a]" : "bg-paper/40"}`} />
        {failed ? "chain read failed" : f ? "live" : "reading"}
      </span>
      <span className={item}>
        {CHAIN.name} · {CHAIN.id}
      </span>
      <span className={item} data-block>
        block <span className="text-paper">{f?.block ? f.block.toLocaleString("en-US") : "--"}</span>
      </span>
      <span className={item}>
        gas <span className="text-paper">{f?.gasPriceGwei != null ? f.gasPriceGwei.toLocaleString("en-US", { maximumFractionDigits: 3 }) : "--"} gwei</span>
      </span>
      <span className={item}>
        v4 PoolManager <span className="text-paper">{f?.poolManagerLive == null ? "--" : f.poolManagerLive ? "verified" : "missing"}</span>
      </span>
    </div>
  );
}
