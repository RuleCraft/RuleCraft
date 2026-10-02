"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BLUEPRINTS } from "@/config/blueprints";
import { BASE_FEES } from "@/config/modules";
import { CHAIN, USDG, explorerToken, isAddress } from "@/config/brand";
import { compose, spacingFor } from "@/lib/compose";
import { EMPTY_DRAFT, draftFromBlueprint, encodeDraft } from "@/lib/draft";
import { feeLabel } from "@/lib/hooks";
import { Badge } from "@/components/ui/Page";
import { IssueList, PermissionGrid, RiskCard } from "@/components/rules/Readout";
import { ArrowRight } from "@/components/icons";

type Meta = { ok: boolean; hasCode: boolean; name: string | null; symbol: string | null; decimals: number | null; totalSupply: string | null };

const RULE_SAFE = new Set(["size-fee", "lp-stream", "lp-timelock", "buy-burn"]);

export function ExistingForm() {
  const [address, setAddress] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<"ETH" | "USDG">("ETH");
  const [bp, setBp] = useState<string>("deep-water");
  const [fee, setFee] = useState(0.3);

  const rules = useMemo(() => {
    const d = bp === "none" ? { ...EMPTY_DRAFT } : (draftFromBlueprint(bp) ?? EMPTY_DRAFT);
    return { ...d, baseFeePct: fee };
  }, [bp, fee]);
  const c = useMemo(() => compose(rules), [rules]);
  const launchOnly = c.modules.filter((m) => !RULE_SAFE.has(m.slug));

  const look = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMeta(null);
    const a = address.trim();
    if (!isAddress(a)) {
      setError("Expected 0x followed by 40 hex characters.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/token?address=${a}`, { cache: "no-store" });
      const body = (await r.json()) as Meta & { error?: string };
      if (!r.ok) setError(body.error ?? "The chain could not be read. Try again.");
      else setMeta(body);
    } catch {
      setError("The chain could not be read. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const tokenOk = Boolean(meta?.hasCode && meta.symbol && meta.decimals !== null);
  const quoteAddr = quote === "ETH" ? "0x0000000000000000000000000000000000000000" : USDG.address;
  const [c0, c1] = tokenOk ? (BigInt(quoteAddr) < BigInt(address.trim()) ? [quote, meta!.symbol!] : [meta!.symbol!, quote]) : ["", ""];
  const supply = meta?.totalSupply && meta.decimals !== null ? Number(BigInt(meta.totalSupply) / 10n ** BigInt(Math.max(0, meta.decimals - 2))) / 100 : null;

  return (
    <div className="grid-cols-1 wrap grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]" data-existing-form>
      <div className="grid grid-cols-1 min-w-0 content-start gap-6">
        <form onSubmit={look} className="card p-5 sm:p-6">
          <p className="label">1 · Token on {CHAIN.name}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… ERC-20 address" spellCheck={false} aria-label="Token address" className="field font-mono" data-field="token" />
            <button type="submit" className="btn btn-ink shrink-0" disabled={loading}>
              {loading ? "Reading…" : "Read token"}
            </button>
          </div>
          {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}
          {meta ? (
            meta.hasCode && meta.symbol ? (
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4" data-token-meta>
                {[
                  ["Name", meta.name ?? "--"],
                  ["Symbol", meta.symbol],
                  ["Decimals", meta.decimals ?? "--"],
                  ["Total supply", supply !== null ? supply.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "--"],
                ].map(([k, v]) => (
                  <div key={k as string} className="min-w-0 border-l-2 border-ink pl-3">
                    <dt className="label">{k}</dt>
                    <dd className="num mt-1 text-[15px] leading-snug text-ink [overflow-wrap:anywhere]">{v}</dd>
                  </div>
                ))}
                <a href={explorerToken(address.trim())} target="_blank" rel="noreferrer" className="col-span-2 text-[13px] text-blue underline underline-offset-4 sm:col-span-4">
                  Verify on the explorer
                </a>
              </dl>
            ) : (
              <p className="mt-3 text-[14px] text-danger" data-token-invalid>
                {meta.hasCode ? "This contract does not answer like an ERC-20 (no symbol or decimals)." : "No contract at this address on Robinhood Chain."}
              </p>
            )
          ) : null}
        </form>

        <div className={`card p-5 sm:p-6 ${tokenOk ? "" : "opacity-60"}`}>
          <p className="label">2 · Pair and fee</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["ETH", "USDG"] as const).map((q) => (
              <button key={q} type="button" onClick={() => setQuote(q)} className={`rounded-[3px] border px-3 py-2 text-[14px] ${quote === q ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}>
                Quote in {q}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:max-w-[420px]">
            {BASE_FEES.map((f) => (
              <button
                key={f.pct}
                type="button"
                disabled={c.dynamicFee}
                onClick={() => setFee(f.pct)}
                className={`num rounded-[3px] border px-2 py-2 text-[13px] disabled:opacity-40 ${fee === f.pct ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`card p-5 sm:p-6 ${tokenOk ? "" : "opacity-60"}`}>
          <p className="label">3 · Rules</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setBp("none")} className={`chip ${bp === "none" ? "!border-ink !bg-ink !text-paper" : ""}`}>
              Plain pool
            </button>
            {BLUEPRINTS.map((b) => (
              <button key={b.slug} type="button" onClick={() => setBp(b.slug)} className={`chip ${bp === b.slug ? "!border-ink !bg-ink !text-paper" : ""}`}>
                {b.name}
              </button>
            ))}
          </div>
          {launchOnly.length ? (
            <p className="mt-3 text-[13px] text-warn">
              {launchOnly.map((m) => m.name).join(" and ")} {launchOnly.length > 1 ? "are" : "is"} meant for new launches; on a token that already trades elsewhere, an opening guard or pot gives little and confuses traders.
            </p>
          ) : null}
          <div className="mt-4">
            <PermissionGrid flags={c.callbacks} dense />
          </div>
          <div className="mt-4">
            <IssueList issues={c.issues.filter((i) => i.level !== "info")} />
          </div>
          <Link href={`/builder?rules=${encodeDraft(rules)}`} className="mt-3 inline-flex items-center gap-1 text-[13.5px] text-blue underline underline-offset-4">
            Fine-tune in composer <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <aside className="grid grid-cols-1 content-start gap-4">
        <div className="card tick p-5" data-existing-review>
          <p className="label">Would be created</p>
          {tokenOk ? (
            <p className="mt-3 break-all font-mono text-[12.5px] leading-[1.7] text-ink">
              PoolKey(
              <br />
              &nbsp;currency0 {c0},
              <br />
              &nbsp;currency1 {c1},
              <br />
              &nbsp;fee {c.dynamicFee ? "0x800000" : `${c.poolFee} (${feeLabel(c.poolFee)})`},
              <br />
              &nbsp;tickSpacing {c.dynamicFee ? 60 : spacingFor(fee)},
              <br />
              &nbsp;hooks RuleHook {c.mask.hex}
              <br />)
            </p>
          ) : (
            <p className="mt-3 text-[14px] text-ink-3">Read a token first.</p>
          )}
          <button type="button" disabled className="btn btn-signal mt-5 w-full" data-open-pool>
            Open pool · Opens at launch
          </button>
          <p className="mt-2 text-[12px] text-ink-3">You bring your own liquidity for an existing token. Nothing is minted.</p>
        </div>
        <RiskCard risk={c.risk} />
        <Badge tone="blue">Read live from {CHAIN.name}</Badge>
      </aside>
    </div>
  );
}
