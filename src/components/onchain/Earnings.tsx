"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData } from "viem";
import { ABI, formatUnits18, read } from "@/lib/onchain";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useDeployment } from "@/components/onchain/useDeployment";
import { useTx } from "@/components/onchain/useTx";
import { NotDeployed, TxStatus } from "@/components/onchain/TxStatus";
import { readRecentLaunches, type LaunchInfo } from "@/components/onchain/launches";

type Owed = { token: string; symbol: string; amount: bigint };

/** Royalties owed to the connected wallet, and its own launches. */
export function Earnings() {
  const { address } = useWallet();
  const dep = useDeployment();
  const tx = useTx();
  const [owed, setOwed] = useState<Owed[] | null>(null);
  const [mine, setMine] = useState<LaunchInfo[]>([]);

  const load = useCallback(async () => {
    if (!dep.deployed || !address) return;
    try {
      const launches = await readRecentLaunches(dep.launcher, 100);
      setMine(launches.filter((l) => l.creator.toLowerCase() === address.toLowerCase()));
      const list = await Promise.all(
        launches.map(async (l) => ({ token: l.token, symbol: l.symbol, amount: await read<bigint>(dep.hook, ABI.hook, "owed", [address, l.token]) })),
      );
      setOwed(list.filter((o) => o.amount > 0n));
    } catch {
      setOwed([]);
    }
  }, [dep.deployed, dep.launcher, dep.hook, address]);

  useEffect(() => {
    load();
  }, [load]);

  if (!dep.deployed) return <NotDeployed what="Royalties and launches" />;
  if (!address) return null;

  async function claim(token: string) {
    if (!address) return;
    const r = await tx.send({ to: dep.hook, data: encodeFunctionData({ abi: ABI.hook, functionName: "claim", args: [address, token] }) });
    if (r) load();
  }

  return (
    <div className="grid grid-cols-1 gap-8" data-earnings>
      <div>
        <h2 className="font-display text-[24px]">Royalties you can claim</h2>
        {owed === null ? (
          <p className="mt-3 font-mono text-[13px] text-ink-3">Reading the hook…</p>
        ) : owed.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-2" data-owed="0">
            Nothing owed to this wallet yet. Publish a blueprint and royalties accrue when pools launch with it.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2" data-owed={owed.length}>
            {owed.map((o) => (
              <li key={o.token} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="num min-w-0 text-[15px] text-ink [overflow-wrap:anywhere]">
                  {formatUnits18(o.amount, 4)} {o.symbol}
                </span>
                <button type="button" className="btn btn-sm btn-signal" disabled={tx.busy} onClick={() => claim(o.token)} data-claim>
                  Claim
                </button>
              </li>
            ))}
          </ul>
        )}
        <TxStatus state={tx.state} hash={tx.hash} error={tx.error} doneText="Claimed." />
      </div>
      <div>
        <h2 className="font-display text-[24px]">Your launches</h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-2">No launches from this wallet.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2">
            {mine.map((l) => (
              <li key={l.id} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-[15px] text-ink">
                  #{l.id} {l.symbol} <span className="text-ink-3">· {l.withdrawn ? "withdrawn" : Date.now() / 1000 < l.unlockAt ? "locked" : "unlocked"}</span>
                </span>
                <Link href={`/pool/${l.poolId}`} className="text-[13.5px] text-blue underline underline-offset-4">
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
