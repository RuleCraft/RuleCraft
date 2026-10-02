"use client";

import { explorerTx, shortAddress } from "@/config/brand";
import type { TxState } from "@/components/onchain/useTx";

export function TxStatus({ state, hash, error, doneText = "Confirmed." }: { state: TxState; hash: string | null; error: string | null; doneText?: string }) {
  if (state === "idle") return null;
  const tone = state === "error" ? "border-danger/30 bg-danger-soft text-danger" : state === "done" ? "border-pass/30 bg-pass-soft text-pass" : "border-blue/25 bg-blue-soft text-blue";
  const text = state === "wallet" ? "Confirm in your wallet…" : state === "pending" ? "Waiting for the block…" : state === "done" ? doneText : error;
  return (
    <p className={`mt-3 rounded-[4px] border px-3 py-2 text-[13.5px] leading-[1.45] [overflow-wrap:anywhere] ${tone}`} data-tx-state={state}>
      {text}
      {hash ? (
        <>
          {" "}
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2">
            {shortAddress(hash, 8, 6)}
          </a>
        </>
      ) : null}
    </p>
  );
}

/** Calm notice shown wherever an on-chain action would be, before the contracts exist. */
export function NotDeployed({ what = "This action" }: { what?: string }) {
  return (
    <p className="rounded-[4px] border border-line-2 bg-paper px-3 py-2.5 text-[13.5px] text-ink-2" data-not-deployed>
      {what} runs on the Rule Craft contracts, which are <strong className="font-medium text-ink">not deployed yet</strong>. Everything else on this page works without them.
    </p>
  );
}
