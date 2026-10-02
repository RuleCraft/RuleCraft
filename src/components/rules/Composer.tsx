"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BASE_FEES, FEE_MODEL, MODULES, MODULE_BY_SLUG, defaultParams, type Param } from "@/config/modules";
import { BLUEPRINTS } from "@/config/blueprints";
import { compose, type Draft } from "@/lib/compose";
import { EMPTY_DRAFT, decodeDraft, draftFromBlueprint, encodeDraft } from "@/lib/draft";
import { ModuleGlyph } from "@/components/glyphs";
import { Badge } from "@/components/ui/Page";
import { CallbackList, IssueList, LifecycleTrack, PermissionGrid, RiskCard, TakeRow } from "@/components/rules/Readout";
import { ArrowRight, CheckIcon, CopyIcon } from "@/components/icons";
import { PublishBlueprint } from "@/components/onchain/PublishBlueprint";

const STORE = "rulecraft.draft";

function readStored(): Draft | null {
  try {
    const raw = window.localStorage.getItem(STORE);
    return raw ? decodeDraft(raw) : null;
  } catch {
    return null;
  }
}

export function ParamSlider({ param, value, onChange, id }: { param: Param; value: number; onChange: (v: number) => void; id: string }) {
  const decimals = param.step < 0.01 ? 3 : param.step < 1 ? 2 : 0;
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13.5px] text-ink">
          {param.label}
        </label>
        <span className="flex items-center gap-1">
          <input
            type="number"
            aria-label={`${param.label} value`}
            value={Number(value.toFixed(decimals))}
            min={param.min}
            max={param.max}
            step={param.step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChange(Math.min(param.max, Math.max(param.min, v)));
            }}
            className="num h-7 w-[76px] rounded-[3px] border border-line-2 bg-card px-1.5 text-right text-[13px] text-ink outline-none focus:border-ink"
          />
          <span className="w-10 font-mono text-[11px] text-ink-3">{param.unit}</span>
        </span>
      </div>
      <input id={id} type="range" className="range" min={param.min} max={param.max} step={param.step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <p className="text-[12px] text-ink-3">
        {param.help} <span className="num">({param.min}–{param.max})</span>
      </p>
    </div>
  );
}

export function Composer({ initial }: { initial?: string | null }) {
  const [draft, setDraft] = useState<Draft>(() => decodeDraft(initial) ?? EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState<"spec" | "link" | null>(null);
  const [buyEth, setBuyEth] = useState(0.5);
  const [inGuard, setInGuard] = useState(false);

  // Restore the last local draft when no draft came in the link.
  useEffect(() => {
    if (!initial) {
      const stored = readStored();
      if (stored) setDraft(stored);
    }
    setHydrated(true);
  }, [initial]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORE, encodeDraft(draft));
    } catch {
      // Storage blocked: the draft lives only in this tab.
    }
  }, [draft, hydrated]);

  const c = useMemo(() => compose(draft), [draft]);
  const errors = c.issues.filter((i) => i.level === "error").length;
  const planned = c.modules.some((m) => m.status === "planned");

  const toggle = (slug: string) =>
    setDraft((d) => {
      const on = d.modules.includes(slug);
      const modules = on ? d.modules.filter((m) => m !== slug) : [...d.modules, slug];
      const params = { ...d.params };
      if (!on && !params[slug]) Object.assign(params, defaultParams([slug]));
      return { ...d, modules: MODULES.map((m) => m.slug).filter((s) => modules.includes(s)), params };
    });

  const setParam = (slug: string, key: string, v: number) => setDraft((d) => ({ ...d, params: { ...d.params, [slug]: { ...d.params[slug], [key]: v } } }));

  const copy = async (what: "spec" | "link") => {
    try {
      const text = what === "spec" ? c.spec : `${window.location.origin}/builder?rules=${encodeDraft(draft)}`;
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard refused; the spec stays selectable on the page.
    }
  };

  const download = () => {
    const blob = new Blob([c.spec], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(draft.name || "rule-set").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // A worked buy: what each rule takes from a buy of `buyEth`, before price impact.
  const sim = useMemo(() => {
    const rows: { label: string; pct: number }[] = [];
    const v = (slug: string, key: string) => draft.params[slug]?.[key] ?? 0;
    const has = (s: string) => draft.modules.includes(s);
    if (has("size-fee")) {
      // Fee at this size assumes the opening liquidity equals the valuation (a rough stand-in).
      const share = Math.min(1, (buyEth / Math.max(draft.valuationEth, 0.0001)) * 100 / Math.max(v("size-fee", "depthPct"), 0.01));
      rows.push({ label: "LP fee (size-scaled)", pct: v("size-fee", "minFeePct") + (v("size-fee", "maxFeePct") - v("size-fee", "minFeePct")) * share });
    } else rows.push({ label: "LP fee", pct: draft.baseFeePct });
    if (has("lp-stream")) rows.push({ label: "LP Stream", pct: v("lp-stream", "sharePct") });
    if (has("milestone-pot") && buyEth >= v("milestone-pot", "minBuyEth")) rows.push({ label: "Milestone Pot", pct: v("milestone-pot", "potPct") });
    if (has("buy-burn")) rows.push({ label: "Buy Burn (tokens)", pct: v("buy-burn", "burnPct") });
    if (has("snipe-guard") && inGuard) rows.push({ label: "Guard tax", pct: v("snipe-guard", "guardTaxPct") });
    if (has("arb-recapture")) rows.push({ label: "Arb Recapture (bound)", pct: 0.5 });
    const total = rows.reduce((s, r) => s + r.pct, 0);
    const capEth = has("snipe-guard") ? (v("snipe-guard", "maxBuyPct") / 100) * draft.valuationEth : Infinity;
    return { rows, total, capped: inGuard && buyEth > capEth, capEth };
  }, [draft, buyEth, inGuard]);

  const launchHref = `/launch?rules=${encodeDraft(draft)}`;

  return (
    <div className="wrap py-8 sm:py-10" data-composer>
      {/* Start from */}
      <div className="flex flex-col gap-3 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="label mr-1">Start from</span>
          <button type="button" onClick={() => setDraft(EMPTY_DRAFT)} className="chip hover:border-ink">
            Blank
          </button>
          {BLUEPRINTS.map((b) => (
            <button key={b.slug} type="button" onClick={() => setDraft(draftFromBlueprint(b.slug) ?? EMPTY_DRAFT)} className="chip hover:border-ink" data-start={b.slug}>
              {b.name}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11.5px] text-ink-3">Draft saved in this browser</span>
      </div>

      <div className="grid-cols-1 mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* Palette */}
        <aside className="grid grid-cols-1 content-start gap-2" aria-label="Rule modules">
          <p className="label">Rule modules</p>
          {MODULES.map((m) => {
            const on = draft.modules.includes(m.slug);
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() => toggle(m.slug)}
                aria-pressed={on}
                data-module={m.slug}
                className={`group flex w-full items-start gap-3 rounded-[4px] border p-3 text-left transition-colors ${on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:border-ink"}`}
              >
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-[3px] ${on ? "bg-signal text-white" : "bg-paper-2 text-ink"}`}>
                  <ModuleGlyph glyph={m.glyph} className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-medium">
                    {m.name}
                    {m.status === "planned" ? <Badge tone="warn">Planned</Badge> : null}
                  </span>
                  <span className={`block text-[12.5px] leading-[1.4] ${on ? "text-paper/70" : "text-ink-3"}`}>{m.line}</span>
                </span>
                <span className={`mt-1 grid size-5 shrink-0 place-items-center rounded-[2px] border ${on ? "border-signal bg-signal text-white" : "border-line-2"}`}>{on ? <CheckIcon className="size-3.5" /> : null}</span>
              </button>
            );
          })}
          <Link href="/rules" className="mt-1 text-[13px] text-blue underline underline-offset-4">
            How each module works
          </Link>
        </aside>

        {/* Center: pool + bits + track */}
        <section className="@container grid grid-cols-1 min-w-0 content-start gap-5">
          <div className="card tick p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="label">Rule set</p>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.slice(0, 40) }))}
                  placeholder="Name your rule set"
                  aria-label="Rule set name"
                  className="mt-1 w-full bg-transparent font-display text-[28px] font-medium tracking-[-0.015em] text-ink outline-none placeholder:text-ink-3/60"
                />
                <p className="font-mono text-[12px] text-ink-3">
                  TOKEN / ETH · Uniswap v4 · {c.dynamicFee ? "dynamic fee" : `${draft.baseFeePct}% fee`} · {c.modules.length} module{c.modules.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => copy("link")} className="btn btn-sm btn-line" data-copy-link>
                  {copied === "link" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                  {copied === "link" ? "Copied" : "Share link"}
                </button>
              </div>
            </div>
            <div className="mt-5">
              <p className="label mb-2">Hook permission bits</p>
              <PermissionGrid flags={c.callbacks} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
            <div className="card p-4 sm:p-5">
              <p className="label mb-3">Where each rule runs</p>
              <LifecycleTrack modules={c.modules} />
            </div>
            <div className="card p-4 sm:p-5">
              <p className="label mb-3">What a trader reads</p>
              <ul className="grid grid-cols-1 gap-2 text-[14px] text-ink">
                {c.lines.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[9px] size-1.5 shrink-0 bg-signal" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-line pt-4">
                <p className="label mb-2">Most a trade can give up</p>
                <TakeRow take={c.take} />
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label">Play a buy</p>
              <label className="flex items-center gap-2 text-[13px] text-ink-2">
                <input type="checkbox" checked={inGuard} onChange={(e) => setInGuard(e.target.checked)} className="size-4 accent-[#d75732]" disabled={!draft.modules.includes("snipe-guard")} />
                inside the guard window
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={0.001}
                step={0.01}
                value={buyEth}
                onChange={(e) => setBuyEth(Math.max(0, Number(e.target.value) || 0))}
                aria-label="Buy size in ETH"
                className="field num !h-10 !w-[130px]"
              />
              <span className="font-mono text-[12px] text-ink-3">ETH in</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] text-[13.5px]">
                <tbody>
                  {sim.rows.map((r) => (
                    <tr key={r.label} className="border-b border-line">
                      <td className="py-1.5 text-ink-2">{r.label}</td>
                      <td className="num py-1.5 text-right text-ink">{r.pct.toFixed(2)}%</td>
                      <td className="num py-1.5 text-right text-ink-3">{((buyEth * r.pct) / 100).toFixed(5)} ETH</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 font-medium text-ink">Rules and fees</td>
                    <td className="num py-2 text-right font-medium text-ink">{sim.total.toFixed(2)}%</td>
                    <td className="num py-2 text-right text-ink">{((buyEth * sim.total) / 100).toFixed(5)} ETH</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {sim.capped ? (
              <p className="mt-2 text-[12.5px] text-danger">This buy is above the guard cap of {sim.capEth.toFixed(4)} ETH per block and would revert during the window.</p>
            ) : null}
            <p className="mt-2 text-[12px] text-ink-3">Before price impact. Size-scaled fees assume opening liquidity equal to the valuation set on the right.</p>
          </div>

          <div className="card p-4 sm:p-5">
            <p className="label mb-3">Callbacks this hook needs</p>
            <CallbackList flags={c.callbacks} />
          </div>
        </section>

        {/* Right: settings + verdict */}
        <aside className="grid grid-cols-1 min-w-0 content-start gap-5 lg:col-span-2 xl:col-span-1">
          <div className="card p-4 sm:p-5">
            <p className="label">Pool settings</p>
            <p className="mt-3 text-[13.5px] text-ink">Base LP fee</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {BASE_FEES.map((f) => (
                <button
                  key={f.pct}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, baseFeePct: f.pct }))}
                  disabled={c.dynamicFee}
                  className={`rounded-[3px] border px-2 py-2 text-left transition-colors disabled:opacity-40 ${draft.baseFeePct === f.pct ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
                >
                  <span className="num block text-[14px]">{f.label}</span>
                  <span className={`block text-[10.5px] leading-[1.3] ${draft.baseFeePct === f.pct ? "text-paper/70" : "text-ink-3"}`}>{f.note}</span>
                </button>
              ))}
            </div>
            {c.dynamicFee ? <p className="mt-2 text-[12px] text-ink-3">Set per swap by Size-Scaled Fee or Arb Recapture.</p> : null}
            <div className="grid-cols-1 mt-5 grid gap-5">
              <ParamSlider
                id="valuation"
                param={{ key: "valuationEth", label: "Opening valuation", unit: "ETH", min: 0.5, max: 100, step: 0.5, def: 5, help: "Whole supply at the opening price; turns supply caps into ETH." }}
                value={draft.valuationEth}
                onChange={(v) => setDraft((d) => ({ ...d, valuationEth: v }))}
              />
              <ParamSlider
                id="royalty"
                param={{ key: "royaltyPct", label: "Blueprint royalty", unit: "%", min: FEE_MODEL.royaltyMinPct, max: FEE_MODEL.royaltyMaxPct, step: 1, def: 5, help: "Your cut of add-on revenue each time this rule set is reused." }}
                value={draft.royaltyPct}
                onChange={(v) => setDraft((d) => ({ ...d, royaltyPct: v }))}
              />
            </div>
          </div>

          {c.modules.map((m) => (
            <div key={m.slug} className="card p-4 sm:p-5" data-params={m.slug}>
              <div className="flex items-center gap-2">
                <ModuleGlyph glyph={m.glyph} className="size-4 text-signal" />
                <p className="text-[14.5px] font-medium text-ink">{m.name}</p>
                <button type="button" onClick={() => toggle(m.slug)} className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-danger">
                  Remove
                </button>
              </div>
              <div className="grid-cols-1 mt-4 grid gap-5">
                {MODULE_BY_SLUG[m.slug].params.map((p) => (
                  <ParamSlider key={p.key} id={`${m.slug}-${p.key}`} param={p} value={draft.params[m.slug]?.[p.key] ?? p.def} onChange={(v) => setParam(m.slug, p.key, v)} />
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      {/* Verdict */}
      <div className="grid-cols-1 mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid grid-cols-1 min-w-0 content-start gap-5">
          <div>
            <p className="label mb-2">Checks</p>
            <IssueList issues={c.issues} />
          </div>
          <div className="card min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label">Generated config</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => copy("spec")} className="btn btn-sm btn-line" data-copy-spec>
                  {copied === "spec" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                  {copied === "spec" ? "Copied" : "Copy JSON"}
                </button>
                <button type="button" onClick={download} className="btn btn-sm btn-line">
                  Download
                </button>
              </div>
            </div>
            <pre className="mt-3 max-h-[420px] overflow-auto rounded-[4px] bg-night p-4 font-mono text-[12px] leading-[1.6] text-[#e9e6dc]" data-spec>
              {c.spec}
            </pre>
          </div>
        </div>
        <div className="grid grid-cols-1 content-start gap-4">
          <RiskCard risk={c.risk} />
          <div className="card p-4 sm:p-5">
            <p className="label">Next</p>
            <div className="grid-cols-1 mt-3 grid gap-2">
              <Link
                href={launchHref}
                aria-disabled={errors > 0}
                className={`btn btn-signal w-full ${errors > 0 ? "pointer-events-none opacity-45" : ""}`}
                data-send-launch
              >
                Launch with these rules <ArrowRight />
              </Link>
              <PublishBlueprint draft={draft} />
            </div>
            <p className="mt-3 text-[12.5px] text-ink-3">
              {errors > 0
                ? `Fix ${errors} blocking check${errors > 1 ? "s" : ""} before launching.`
                : planned
                  ? "Includes a planned module: the launch form will show it but cannot launch it."
                  : "The launch form checks everything again before anything is signed."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
