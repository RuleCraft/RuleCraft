"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeEventLog, encodeFunctionData, type Hex } from "viem";
import { CHAIN } from "@/config/brand";
import type { Draft } from "@/lib/compose";
import { ABI, draftToRules, normRules, parseUnits18, read, sqrtPriceFor, type OnchainRules } from "@/lib/onchain";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConnectButton } from "@/components/wallet/WalletButton";
import { useDeployment } from "@/components/onchain/useDeployment";
import { useTx } from "@/components/onchain/useTx";
import { NotDeployed, TxStatus } from "@/components/onchain/TxStatus";

type Props = { ready: boolean; draft: Draft; name: string; symbol: string; supply: number; devBuyEth: number; blueprintId: number };

const same = (a: OnchainRules, b: OnchainRules) => (Object.keys(a) as (keyof OnchainRules)[]).every((k) => a[k] === b[k]);

/** The real launch button: one transaction to the launcher once the contracts exist. */
export function OnchainLaunch({ ready, draft, name, symbol, supply, devBuyEth, blueprintId }: Props) {
  const { address, onRobinhoodChain } = useWallet();
  const dep = useDeployment();
  const tx = useTx();
  const [result, setResult] = useState<{ poolId: string; token: string } | null>(null);
  const [bpRules, setBpRules] = useState<OnchainRules | null>(null);
  const { rules, problems } = draftToRules(draft);

  useEffect(() => {
    if (!dep.deployed || !blueprintId) return;
    read<{ rules: Record<string, unknown> }>(dep.registry, ABI.registry, "get", [BigInt(blueprintId)])
      .then((b) => setBpRules(normRules(b.rules)))
      .catch(() => setBpRules(null));
  }, [dep.deployed, dep.registry, blueprintId]);

  const useBp = Boolean(blueprintId && rules && bpRules && same(rules, bpRules));

  if (!dep.deployed) return <NotDeployed what="Launching" />;

  async function go() {
    if (!rules || !dep.deployed) return;
    const supplyWei = BigInt(supply) * 10n ** 18n;
    const valuationWei = parseUnits18(draft.valuationEth);
    const data = encodeFunctionData({
      abi: ABI.launcher,
      functionName: "launch",
      args: [
        {
          name,
          symbol,
          supply: supplyWei,
          sqrtPriceX96: sqrtPriceFor(supplyWei, valuationWei),
          rules,
          blueprintId: BigInt(useBp ? blueprintId : 0),
          devBuyMinOut: 0n,
        },
      ],
    });
    const r = await tx.send({ to: dep.launcher, data, value: parseUnits18(devBuyEth) });
    if (!r) return;
    for (const log of r.logs) {
      if (log.address.toLowerCase() !== dep.launcher.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: ABI.launcher, data: log.data as Hex, topics: log.topics as [Hex, ...Hex[]] });
        if (ev.eventName === "Launched") {
          const a = ev.args as unknown as { token: string; poolId: string };
          setResult({ poolId: a.poolId, token: a.token });
        }
      } catch {
        // Other events in the same receipt.
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2" data-onchain-launch>
      {problems.length ? (
        <ul className="grid grid-cols-1 gap-1 text-[13px] text-danger">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {blueprintId ? (
        <p className="text-[13px] text-ink-2">
          {useBp ? `Launching with on-chain blueprint #${blueprintId}; its author earns the royalty.` : bpRules ? `These rules differ from blueprint #${blueprintId}, so it launches without a blueprint (no royalty).` : `Reading blueprint #${blueprintId}…`}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!address ? <ConnectButton className="btn btn-line" /> : null}
        <button
          type="button"
          className="btn btn-signal"
          disabled={!ready || !rules || !address || !onRobinhoodChain || tx.busy || Boolean(result)}
          onClick={go}
          data-deploy
        >
          {result ? "Launched" : `Launch on ${CHAIN.name}`}
        </button>
      </div>
      <TxStatus state={tx.state} hash={tx.hash} error={tx.error} doneText="Launched." />
      {result ? (
        <p className="text-[14px] text-ink" data-launched>
          Your pool is live.{" "}
          <Link href={`/pool/${result.poolId}`} className="text-blue underline underline-offset-4">
            Open the pool
          </Link>{" "}
          <span className="break-all font-mono text-[12px] text-ink-3">token {result.token}</span>
        </p>
      ) : null}
      <p className="text-[12px] text-ink-3">Unaudited contracts. Gas only; no platform fee on launch.</p>
    </div>
  );
}
