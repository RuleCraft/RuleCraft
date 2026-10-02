"use client";

import Link from "next/link";
import { CHAIN, explorerAddress } from "@/config/brand";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConnectButton } from "@/components/wallet/WalletButton";
import { Badge, Stat } from "@/components/ui/Page";
import { ArrowUpRight } from "@/components/icons";
import { Earnings } from "@/components/onchain/Earnings";


export function PortfolioView() {
  const { address, balance, usdg, chainId, onRobinhoodChain, switchNetwork, switching } = useWallet();

  if (!address) {
    return (
      <section className="wrap py-14">
        <div className="tick mx-auto max-w-[560px] border border-line bg-card p-8 text-center">
          <p className="font-display text-[26px]">Connect to see your portfolio</p>
          <p className="mt-2 text-[15px] text-ink-2">Connecting shares your address only. Nothing moves without a signature in your wallet.</p>
          <div className="mt-6 flex justify-center">
            <ConnectButton className="btn btn-signal" />
          </div>
        </div>
      </section>
    );
  }

  const wrong = chainId !== null && !onRobinhoodChain;
  return (
    <section className="wrap py-12" data-portfolio>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="num break-all text-[14px] text-ink-2">{address}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={wrong ? "danger" : "pass"}>{chainId === null ? "Reading network" : wrong ? `On chain ${chainId}` : CHAIN.name}</Badge>
          {wrong ? (
            <button type="button" onClick={switchNetwork} disabled={switching} className="btn btn-sm btn-signal">
              {switching ? "Confirm in wallet…" : `Switch to ${CHAIN.name}`}
            </button>
          ) : null}
          <a href={explorerAddress(address)} target="_blank" rel="noreferrer" className="chip hover:text-ink">
            Explorer <ArrowUpRight className="size-3" />
          </a>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-6">
        <Stat label={CHAIN.nativeSymbol} value={balance ?? "…"} note="Live" />
        <Stat label="USDG" value={usdg ?? "…"} note="Live" />
      </div>
      <div className="mt-12">
        <Earnings />
      </div>
      <p className="mt-8 text-[14px] text-ink-3">
        Want royalties here?{" "}
        <Link href="/builder" className="text-blue underline underline-offset-2">
          Compose a rule set
        </Link>{" "}
        and publish it as a blueprint.
      </p>
    </section>
  );
}
