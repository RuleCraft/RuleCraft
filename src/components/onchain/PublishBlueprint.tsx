"use client";

import Link from "next/link";
import { useState } from "react";
import { decodeEventLog, encodeFunctionData, type Hex } from "viem";
import type { Draft } from "@/lib/compose";
import { encodeDraft } from "@/lib/draft";
import { ABI, draftToRules } from "@/lib/onchain";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConnectButton } from "@/components/wallet/WalletButton";
import { useDeployment } from "@/components/onchain/useDeployment";
import { useTx } from "@/components/onchain/useTx";
import { NotDeployed, TxStatus } from "@/components/onchain/TxStatus";

/** Publishes the composer's rule set to the on-chain BlueprintRegistry. */
export function PublishBlueprint({ draft }: { draft: Draft }) {
  const { address, onRobinhoodChain } = useWallet();
  const dep = useDeployment();
  const tx = useTx();
  const [id, setId] = useState<number | null>(null);
  const { rules, problems } = draftToRules(draft);
  const name = draft.name.trim();

  if (!dep.deployed) return <NotDeployed what="Publishing" />;

  async function publish() {
    if (!rules) return;
    const data = encodeFunctionData({ abi: ABI.registry, functionName: "publish", args: [name, rules, Math.round(draft.royaltyPct * 100)] });
    const r = await tx.send({ to: dep.registry, data });
    if (!r) return;
    for (const log of r.logs) {
      try {
        const ev = decodeEventLog({ abi: ABI.registry, data: log.data as Hex, topics: log.topics as [Hex, ...Hex[]] });
        if (ev.eventName === "BlueprintPublished") setId(Number((ev.args as unknown as { id: bigint }).id));
      } catch {
        // Not ours.
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2" data-publish>
      {!name ? <p className="text-[12.5px] text-ink-3">Name the rule set above to publish it.</p> : null}
      {problems.length ? <p className="text-[12.5px] text-danger">{problems[0]}</p> : null}
      {!address ? (
        <ConnectButton className="btn btn-line w-full" />
      ) : (
        <button type="button" className="btn btn-line w-full" disabled={!rules || !name || !onRobinhoodChain || tx.busy || id !== null} onClick={publish} data-publish-action>
          {id !== null ? `Published as #${id}` : `Publish as blueprint · ${draft.royaltyPct}% royalty`}
        </button>
      )}
      <TxStatus state={tx.state} hash={tx.hash} error={tx.error} doneText="Published." />
      {id !== null ? (
        <Link href={`/launch?rules=${encodeDraft(draft)}&bp=${id}`} className="text-[13px] text-blue underline underline-offset-4" data-published-id={id}>
          Launch with blueprint #{id}
        </Link>
      ) : null}
    </div>
  );
}
