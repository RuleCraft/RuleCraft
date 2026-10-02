"use client";

import Link from "next/link";
import { CHAIN, shortAddress } from "@/config/brand";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConnectButton } from "@/components/wallet/WalletButton";
import { ArrowRight } from "@/components/icons";

/** The visitor's own crafter card, built from the connected wallet only. */
export function CrafterCard() {
  const { address, balance, onRobinhoodChain, chainId } = useWallet();
  if (!address) {
    return (
      <div className="tick border border-line bg-card p-6">
        <p className="label">Your crafter card</p>
        <p className="mt-3 font-display text-[22px] leading-tight">Connect a wallet to see your card.</p>
        <p className="mt-2 text-[14.5px] text-ink-2">Your address is your profile. No email, no password, nothing signed to look.</p>
        <div className="mt-5">
          <ConnectButton className="btn btn-signal" />
        </div>
      </div>
    );
  }
  return (
    <div className="tick border border-line bg-card p-6" data-crafter-card>
      <div className="flex items-center justify-between gap-3">
        <p className="label">Your crafter card</p>
        <span className={`font-mono text-[11px] ${onRobinhoodChain ? "text-pass" : "text-danger"}`}>
          {chainId === null ? "Reading network…" : onRobinhoodChain ? CHAIN.name : `Chain ${chainId}`}
        </span>
      </div>
      <p className="num mt-3 break-all text-[15px] text-ink">{address}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-[12.5px] text-ink-3">{CHAIN.nativeSymbol} balance</dt>
          <dd className="num mt-0.5 text-[18px]">{balance ?? "…"}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-ink-3">Launches</dt>
          <dd className="num mt-0.5 text-[18px]">0</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-ink-3">Blueprints</dt>
          <dd className="num mt-0.5 text-[18px]">0</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-ink-3">Royalties</dt>
          <dd className="num mt-0.5 text-[18px]">--</dd>
        </div>
      </dl>
      <Link href={`/crafters/${address}`} className="btn btn-sm btn-line mt-5">
        Open {shortAddress(address)} <ArrowRight />
      </Link>
    </div>
  );
}
