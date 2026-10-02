"use client";

import { useCallback, useState } from "react";
import { BaseError, decodeErrorResult, type Abi, type Hex } from "viem";
import { useWallet } from "@/components/wallet/WalletProvider";
import { waitForReceipt, type Receipt } from "@/lib/rpc";
import { ABI } from "@/lib/onchain";

export type TxState = "idle" | "wallet" | "pending" | "done" | "error";

const ALL_ABIS: Abi = [...ABI.launcher, ...ABI.hook, ...ABI.registry, ...ABI.token].filter((x) => x.type === "error");

const WRAPPED: Abi = [
  {
    type: "error",
    name: "WrappedError",
    inputs: [
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "reason", type: "bytes" },
      { name: "details", type: "bytes" },
    ],
  },
];

const FRIENDLY: Record<string, string> = {
  GuardCapExceeded: "Snipe Guard: this block's buy cap is full. Try a smaller buy or wait a block.",
  ExactInputOnly: "Rule Craft pools only accept exact-input swaps.",
  Slippage: "The price moved past your minimum. Quote again.",
  StillLocked: "The founding liquidity is still locked.",
  RulesMismatch: "These rules do not match the blueprint's published rules.",
  NotCreator: "Only the launch creator can do this.",
  HookAlreadySet: "The launcher already has its hook.",
  NotDeployer: "Only the wallet that deployed the launcher can wire the hook.",
  BadRules: "A rule parameter is outside its allowed bounds.",
  BadShare: "Royalty or protocol share is out of bounds.",
  BadName: "Name or ticker length is not allowed.",
};

/** Pulls revert data out of a wallet/RPC error and names the custom error when it is ours. */
export function explainError(e: unknown): string {
  const seen = new Set<unknown>();
  const dig = (x: unknown): string | null => {
    if (!x || typeof x !== "object" || seen.has(x)) return null;
    seen.add(x);
    const o = x as Record<string, unknown>;
    for (const k of ["data", "cause", "error", "originalError"]) {
      const v = o[k];
      if (typeof v === "string" && /^0x[0-9a-f]{8}/i.test(v)) return v;
      const deeper = dig(v);
      if (deeper) return deeper;
    }
    return null;
  };
  let data = dig(e);
  // The PoolManager wraps hook reverts: WrappedError(address,bytes4,bytes reason,bytes details).
  if (data && data.slice(0, 10).toLowerCase() === "0x90bfb865") {
    try {
      const w = decodeErrorResult({ abi: WRAPPED, data: data as Hex });
      data = (w.args as readonly unknown[])[2] as string;
    } catch {
      // Leave it as is.
    }
  }
  if (data) {
    try {
      const r = decodeErrorResult({ abi: ALL_ABIS, data: data as Hex });
      return FRIENDLY[r.errorName] ?? `Reverted: ${r.errorName}`;
    } catch {
      // Not one of ours.
    }
  }
  const msg = e instanceof BaseError ? e.shortMessage : e instanceof Error ? e.message : String(e);
  for (const name of Object.keys(FRIENDLY)) if (msg.includes(name)) return FRIENDLY[name];
  return msg.length > 220 ? msg.slice(0, 220) + "…" : msg;
}

/** Sends one transaction through the connected wallet and waits for its receipt. */
export function useTx() {
  const { sendTransaction } = useWallet();
  const [state, setState] = useState<TxState>("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (tx: { to?: string; data?: string; value?: bigint }): Promise<Receipt | null> => {
      setError(null);
      setHash(null);
      setState("wallet");
      try {
        const h = await sendTransaction(tx);
        setHash(h);
        setState("pending");
        const r = await waitForReceipt(h);
        if (!r.ok) throw new Error("The transaction reverted on chain.");
        setState("done");
        return r;
      } catch (e) {
        setError(explainError(e));
        setState("error");
        return null;
      }
    },
    [sendTransaction],
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setHash(null);
  }, []);

  return { send, state, hash, error, reset, busy: state === "wallet" || state === "pending" };
}
