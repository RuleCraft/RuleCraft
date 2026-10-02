"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shortAddress } from "@/config/brand";
import { feeLabel } from "@/lib/hooks";
import { useDeployment } from "@/components/onchain/useDeployment";
import { readRecentLaunches, type LaunchInfo } from "@/components/onchain/launches";
import { NotDeployed } from "@/components/onchain/TxStatus";

/** Pools opened through the Rule Craft launcher, newest first, read from the contract. */
export function RuleCraftPools() {
  const dep = useDeployment();
  const [rows, setRows] = useState<LaunchInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!dep.deployed) return;
    let live = true;
    readRecentLaunches(dep.launcher)
      .then((r) => live && setRows(r))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [dep.deployed, dep.launcher]);

  if (!dep.deployed) return <NotDeployed what="The Rule Craft pool list" />;
  if (failed) return <p className="text-[14px] text-ink-3">The launcher could not be read right now.</p>;
  if (!rows) return <p className="font-mono text-[13px] text-ink-3">Reading the launcher…</p>;
  if (!rows.length)
    return (
      <p className="text-[14px] text-ink-2" data-rc-pools="0">
        No pools launched yet.{" "}
        <Link href="/launch" className="text-blue underline underline-offset-4">
          Launch the first one
        </Link>
        .
      </p>
    );
  return (
    <div className="overflow-x-auto border border-line bg-card" data-rc-pools={rows.length}>
      <table className="w-full min-w-[620px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-ink">
            {["#", "Token", "Fee", "Creator", "Liquidity", ""].map((h) => (
              <th key={h} className="label px-3 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} className="border-b border-line hover:bg-paper" data-rc-pool-row>
              <td className="num px-3 py-2.5 text-ink-3">{l.id}</td>
              <td className="px-3 py-2.5">
                <Link href={`/pool/${l.poolId}`} className="font-medium text-ink hover:text-signal">
                  {l.symbol}
                </Link>
                <span className="ml-2 text-[12.5px] text-ink-3">{l.name}</span>
              </td>
              <td className="num px-3 py-2.5">{feeLabel(l.key.fee)}</td>
              <td className="px-3 py-2.5 font-mono text-[12px]">{shortAddress(l.creator)}</td>
              <td className="px-3 py-2.5 text-ink-2">{l.withdrawn ? "withdrawn" : Date.now() / 1000 < l.unlockAt ? "locked" : "unlocked"}</td>
              <td className="px-3 py-2.5 text-right">
                <Link href={`/pool/${l.poolId}`} className="text-[12.5px] text-blue underline underline-offset-4">
                  Trade
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
