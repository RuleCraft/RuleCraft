"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shortAddress } from "@/config/brand";
import { compose } from "@/lib/compose";
import { encodeDraft, sanitize } from "@/lib/draft";
import { ABI, describeRules, normRules, read, rulesToDraftParts, type OnchainRules } from "@/lib/onchain";
import { useDeployment } from "@/components/onchain/useDeployment";
import { NotDeployed } from "@/components/onchain/TxStatus";

type Row = { id: number; name: string; author: string; royaltyBps: number; publishedAt: number; rules: OnchainRules };

/** Blueprints published on chain, newest first (reads the registry directly, no indexer). */
export function OnchainBlueprints() {
  const dep = useDeployment();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!dep.deployed) return;
    let live = true;
    (async () => {
      try {
        const n = Number(await read<bigint>(dep.registry, ABI.registry, "count"));
        const ids = Array.from({ length: Math.min(n, 30) }, (_, i) => n - i);
        const list = await Promise.all(
          ids.map(async (id) => {
            const b = await read<{ author: string; royaltyBps: number; publishedAt: bigint; name: string; rules: Record<string, unknown> }>(dep.registry, ABI.registry, "get", [BigInt(id)]);
            return { id, name: b.name, author: b.author, royaltyBps: Number(b.royaltyBps), publishedAt: Number(b.publishedAt), rules: normRules(b.rules) };
          }),
        );
        if (live) setRows(list);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [dep.deployed, dep.registry]);

  if (!dep.deployed) return <NotDeployed what="The on-chain blueprint list" />;
  if (failed) return <p className="text-[14px] text-ink-3">The registry could not be read right now.</p>;
  if (!rows) return <p className="font-mono text-[13px] text-ink-3">Reading the registry…</p>;
  if (!rows.length) return <p className="text-[14px] text-ink-2" data-onchain-blueprints="0">No blueprints published yet. Compose one and publish it from the composer.</p>;
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" data-onchain-blueprints={rows.length}>
      {rows.map((r) => {
        const parts = rulesToDraftParts(r.rules);
        const draft = sanitize({ name: r.name, ...parts, royaltyPct: r.royaltyBps / 100 });
        const c = compose(draft);
        return (
          <li key={r.id} className="card flex min-w-0 flex-col p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-[22px] text-ink [overflow-wrap:anywhere]">
                #{r.id} {r.name}
              </p>
              <span className="num text-[12px] text-ink-3">
                grade {c.risk.grade} · royalty {r.royaltyBps / 100}%
              </span>
            </div>
            <p className="mt-1 font-mono text-[12px] text-ink-3">by {shortAddress(r.author)}</p>
            <ul className="mt-3 grid grid-cols-1 gap-1 text-[13.5px] text-ink-2">
              {describeRules(r.rules).slice(0, -1).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3 text-[13.5px]">
              <Link href={`/launch?rules=${encodeDraft(draft)}&bp=${r.id}`} className="text-blue underline underline-offset-4">
                Launch with it
              </Link>
              <Link href={`/builder?rules=${encodeDraft(draft)}`} className="text-ink-2 underline underline-offset-4">
                Remix
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
