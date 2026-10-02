"use client";

import Link from "next/link";
import { CHAIN, explorerAddress } from "@/config/brand";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConnectButton } from "@/components/wallet/WalletButton";
import { Badge, Stat } from "@/components/ui/Page";
import { ArrowUpRight } from "@/components/icons";

const TABLES = [
  { title: "Pool positions", cols: ["Pool", "Range", "Liquidity", "Fees earned"], empty: "No Rule Craft pools exist yet. Positions you add appear here." },
  { title: "Claimable pots", cols: ["Pool", "Slot", "Amount", "Status"], empty: "Milestone Pot wins are credited here to claim." },
  { title: "Blueprint royalties", cols: ["Blueprint", "Pools", "Accrued", "Claimed"], empty: "Royalties from blueprints you publish accrue here." },
];

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
      <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label={CHAIN.nativeSymbol} value={balance ?? "…"} note="Live" />
        <Stat label="USDG" value={usdg ?? "…"} note="Live" />
        <Stat label="Claimable" value="--" note="Opens at launch" />
        <Stat label="Royalties" value="--" note="Opens at launch" />
      </div>
      <div className="grid-cols-1 mt-12 grid gap-8">
        {TABLES.map((t) => (
          <div key={t.title}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[24px]">{t.title}</h2>
              <Badge tone="warn">Opens at launch</Badge>
            </div>
            <div className="mt-3 overflow-x-auto border border-line bg-card">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line">
                    {t.cols.map((c) => (
                      <th key={c} className="label px-4 py-3 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={t.cols.length} className="px-4 py-8 text-center text-ink-3">
                      {t.empty}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-[14px] text-ink-3">
        Want something to show here?{" "}
        <Link href="/builder" className="text-blue underline underline-offset-2">
          Compose a rule set
        </Link>{" "}
        and publish it when the registry opens.
      </p>
    </section>
  );
}
