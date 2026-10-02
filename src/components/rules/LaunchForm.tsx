"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BLUEPRINTS } from "@/config/blueprints";
import { BASE_FEES, MODULE_BY_SLUG } from "@/config/modules";
import { BRAND, CHAIN, shortAddress } from "@/config/brand";
import { compose, spacingFor, type Draft } from "@/lib/compose";
import { EMPTY_DRAFT, decodeDraft, draftFromBlueprint, encodeDraft, sanitize } from "@/lib/draft";
import { feeLabel } from "@/lib/hooks";
import { ModuleGlyph } from "@/components/glyphs";
import { Badge } from "@/components/ui/Page";
import { IssueList, PermissionGrid, RiskCard, TakeRow } from "@/components/rules/Readout";
import { useWallet } from "@/components/wallet/WalletProvider";
import { OnchainLaunch } from "@/components/onchain/OnchainLaunch";
import { ArrowRight, CheckIcon } from "@/components/icons";

type Details = { name: string; symbol: string; supply: number; about: string; site: string; x: string };
type Form = { step: number; rules: Draft; details: Details; devBuyEth: number };

const STORE = "rulecraft.launch";
const SUPPLIES = [1_000_000, 100_000_000, 1_000_000_000, 10_000_000_000];
const STEPS = ["Intent", "Rules", "Token", "Price & fees", "Review"];

const EMPTY: Form = { step: 0, rules: EMPTY_DRAFT, details: { name: "", symbol: "", supply: 1_000_000_000, about: "", site: "", x: "" }, devBuyEth: 0 };

function validUrl(v: string) {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function detailProblems(d: Details): Record<string, string> {
  const out: Record<string, string> = {};
  if (d.name.trim().length < 2) out.name = "At least 2 characters.";
  else if (d.name.length > 32) out.name = "At most 32 characters.";
  if (!/^[A-Z0-9]{2,10}$/.test(d.symbol)) out.symbol = "2–10 capital letters or digits.";
  else if (d.symbol === BRAND.ticker) out.symbol = `${BRAND.ticker} is the protocol's own ticker.`;
  if (d.about.length > 280) out.about = "At most 280 characters.";
  if (!validUrl(d.site)) out.site = "Use a full https:// link.";
  if (d.x && !/^https:\/\/(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?$/.test(d.x)) out.x = "Use https://x.com/<handle>.";
  return out;
}

export function LaunchForm({ initial, blueprintId = 0 }: { initial?: string | null; blueprintId?: number }) {
  const { address, onRobinhoodChain } = useWallet();
  const [form, setForm] = useState<Form>(() => {
    const d = decodeDraft(initial);
    return d ? { ...EMPTY, rules: d, step: 1 } : EMPTY;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!initial) {
      try {
        const raw = window.localStorage.getItem(STORE);
        if (raw) {
          const saved = JSON.parse(raw) as Form;
          setForm({ ...EMPTY, ...saved, rules: sanitize(saved.rules ?? {}), details: { ...EMPTY.details, ...saved.details } });
        }
      } catch {
        // Storage blocked or a bad saved form: start clean.
      }
    }
    setReady(true);
  }, [initial]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORE, JSON.stringify(form));
    } catch {
      // Storage blocked: the form lives only in this tab.
    }
  }, [form, ready]);

  const c = useMemo(() => compose(form.rules), [form.rules]);
  const dp = detailProblems(form.details);
  const guardCapEth = form.rules.modules.includes("snipe-guard") ? ((form.rules.params["snipe-guard"]?.maxBuyPct ?? 0) / 100) * form.rules.valuationEth : null;
  const devBuyProblem =
    form.devBuyEth < 0 ? "Cannot be negative." : guardCapEth !== null && form.devBuyEth > guardCapEth ? `Snipe Guard caps the first block at ${guardCapEth.toFixed(4)} ETH. A larger dev buy would revert.` : form.devBuyEth > form.rules.valuationEth * 0.1 ? "A dev buy above 10% of the valuation is refused." : null;
  const ruleErrors = c.issues.filter((i) => i.level === "error").length;
  const planned = c.modules.some((m) => m.status === "planned");

  const stepOk = [true, ruleErrors === 0 && !planned, Object.keys(dp).length === 0, devBuyProblem === null, false];
  const firstBlocked = stepOk.slice(0, 4).findIndex((ok) => !ok);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const setD = (patch: Partial<Details>) => setForm((f) => ({ ...f, details: { ...f.details, ...patch } }));
  const setRules = (patch: Partial<Draft>) => setForm((f) => ({ ...f, rules: { ...f.rules, ...patch } }));

  const tokensOut = form.devBuyEth > 0 ? (form.devBuyEth / form.rules.valuationEth) * form.details.supply * (1 - c.take.buyGuard / 100) : 0;

  const step = form.step;
  const nav = (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
      <button type="button" disabled={step === 0} onClick={() => set({ step: step - 1 })} className="btn btn-line">
        Back
      </button>
      {step < 4 ? (
        <button type="button" disabled={!stepOk[step]} onClick={() => set({ step: step + 1 })} className="btn btn-ink" data-next>
          Continue <ArrowRight />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="grid-cols-1 wrap grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]" data-launch-form>
      <div className="min-w-0">
        <ol className="grid grid-cols-5 gap-1" aria-label="Steps">
          {STEPS.map((s, i) => {
            const done = i < step && stepOk[i];
            const reachable = i <= step || firstBlocked === -1 || i <= firstBlocked;
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => set({ step: i })}
                  className={`w-full border-t-[3px] pt-2 text-left disabled:opacity-40 ${i === step ? "border-signal" : done ? "border-ink" : "border-line-2"}`}
                >
                  <span className="num block text-[11px] text-ink-3">0{i + 1}</span>
                  <span className={`block text-[13px] leading-tight sm:text-[14px] ${i === step ? "font-medium text-ink" : "text-ink-2"}`}>{s}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="card mt-6 p-5 sm:p-7">
          {step === 0 ? (
            <div>
              <h2 className="h-display text-[30px]">What are you opening?</h2>
              <div className="grid-cols-1 mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => set({ step: 1 })} className="tick border border-ink bg-paper p-5 text-left" data-intent="new">
                  <p className="text-[17px] font-medium text-ink">A new token</p>
                  <p className="mt-1 text-[14px] text-ink-2">Fixed supply, minted in the same transaction that opens its pool with your rules. No team allocation: every token starts in the pool.</p>
                  <p className="mt-4 flex items-center gap-1 text-[14px] text-signal">
                    Start <ArrowRight className="size-3.5" />
                  </p>
                </button>
                <Link href="/existing" className="border border-line bg-card p-5 text-left hover:border-ink">
                  <p className="text-[17px] font-medium text-ink">A token that already trades</p>
                  <p className="mt-1 text-[14px] text-ink-2">Open a second pool with rules for an existing ERC-20 on {CHAIN.name}.</p>
                  <p className="mt-4 flex items-center gap-1 text-[14px] text-blue">
                    Go to existing token <ArrowRight className="size-3.5" />
                  </p>
                </Link>
              </div>
              {nav}
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <h2 className="h-display text-[30px]">Pick the rules</h2>
              <p className="mt-2 text-[14.5px] text-ink-2">Start from an example blueprint or bring a draft from the composer. Rules are frozen when the pool opens.</p>
              <div className="grid-cols-1 mt-5 grid gap-2 sm:grid-cols-2">
                {BLUEPRINTS.map((b) => {
                  const active = form.rules.name === b.name;
                  return (
                    <button
                      key={b.slug}
                      type="button"
                      onClick={() => set({ rules: { ...draftFromBlueprint(b.slug)!, valuationEth: form.rules.valuationEth } })}
                      className={`border p-3 text-left transition-colors ${active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
                      data-blueprint={b.slug}
                    >
                      <span className="flex items-center gap-2 text-[14.5px] font-medium">
                        {b.name} <Badge>Example</Badge>
                      </span>
                      <span className={`mt-1 block text-[12.5px] ${active ? "text-paper/70" : "text-ink-3"}`}>{b.pitch}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="label">Current rule set · {form.rules.name || "untitled"}</p>
                  <Link href={`/builder?rules=${encodeDraft(form.rules)}`} className="text-[13.5px] text-blue underline underline-offset-4">
                    Edit in composer
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.modules.length ? (
                    c.modules.map((m) => (
                      <span key={m.slug} className="chip !text-ink">
                        <ModuleGlyph glyph={m.glyph} className="size-3.5" /> {m.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[14px] text-ink-3">No modules: a plain pool with a {form.rules.baseFeePct}% fee.</span>
                  )}
                </div>
                <div className="mt-4">
                  <IssueList issues={c.issues.filter((i) => i.level !== "info")} />
                </div>
                {planned ? <p className="mt-3 text-[13px] text-danger">{c.modules.filter((m) => m.status === "planned").map((m) => m.name).join(" and ")} {c.modules.filter((m) => m.status === "planned").length > 1 ? "are" : "is"} not in the on-chain release. Remove it in the composer to continue.</p> : null}
              </div>
              {nav}
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h2 className="h-display text-[30px]">Name the token</h2>
              <div className="grid-cols-1 mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Name" error={form.details.name ? dp.name : undefined}>
                  <input className="field" value={form.details.name} onChange={(e) => setD({ name: e.target.value })} placeholder="e.g. Quiet Harbor" data-field="name" />
                </Field>
                <Field label="Ticker" error={form.details.symbol ? dp.symbol : undefined}>
                  <input className="field num uppercase" value={form.details.symbol} onChange={(e) => setD({ symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="HARBOR" data-field="symbol" />
                </Field>
                <Field label="Supply (fixed, all into the pool)" group>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {SUPPLIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setD({ supply: s })}
                        className={`num rounded-[3px] border px-2 py-2 text-[13px] ${form.details.supply === s ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
                      >
                        {s >= 1e9 ? `${s / 1e9}B` : `${s / 1e6}M`}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Website (optional)" error={dp.site}>
                  <input className="field" value={form.details.site} onChange={(e) => setD({ site: e.target.value.trim() })} placeholder="https://" />
                </Field>
                <Field label="X profile (optional)" error={dp.x}>
                  <input className="field" value={form.details.x} onChange={(e) => setD({ x: e.target.value.trim() })} placeholder="https://x.com/handle" />
                </Field>
                <Field label={`About (${form.details.about.length}/280)`} error={dp.about}>
                  <textarea className="field !h-[84px] py-2" value={form.details.about} onChange={(e) => setD({ about: e.target.value })} />
                </Field>
              </div>
              {nav}
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h2 className="h-display text-[30px]">Price and fees</h2>
              <div className="grid-cols-1 mt-6 grid gap-6 sm:grid-cols-2">
                <Field label="Opening valuation (ETH)">
                  <input type="number" min={0.5} max={100} step={0.5} className="field num" value={form.rules.valuationEth} onChange={(e) => setRules({ valuationEth: Math.min(100, Math.max(0.5, Number(e.target.value) || 0.5)) })} data-field="valuation" />
                  <span className="mt-1 block text-[12px] text-ink-3">
                    Opening price: {(form.rules.valuationEth / form.details.supply).toExponential(3)} ETH per token
                  </span>
                </Field>
                <Field label="Quote token" group>
                  <div className="field flex items-center justify-between">
                    <span>ETH (native)</span>
                    <Badge>fixed</Badge>
                  </div>
                </Field>
                <Field label="Base LP fee" group>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BASE_FEES.map((f) => (
                      <button
                        key={f.pct}
                        type="button"
                        disabled={c.dynamicFee}
                        onClick={() => setRules({ baseFeePct: f.pct })}
                        className={`num rounded-[3px] border px-2 py-2 text-[13px] disabled:opacity-40 ${form.rules.baseFeePct === f.pct ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {c.dynamicFee ? <span className="mt-1 block text-[12px] text-ink-3">Dynamic: set per swap by Size-Scaled Fee.</span> : null}
                </Field>
                <Field label="Dev buy in the same transaction (ETH, optional)" error={devBuyProblem ?? undefined}>
                  <input type="number" min={0} step={0.001} className="field num" value={form.devBuyEth} onChange={(e) => set({ devBuyEth: Number(e.target.value) || 0 })} data-field="devbuy" />
                  {form.devBuyEth > 0 && !devBuyProblem ? (
                    <span className="mt-1 block text-[12px] text-ink-3">
                      ≈ {Math.round(tokensOut).toLocaleString("en-US")} {form.details.symbol || "tokens"} after opening rules, before price impact
                    </span>
                  ) : null}
                </Field>
              </div>
              {nav}
            </div>
          ) : null}

          {step === 4 ? (
            <div data-review>
              <h2 className="h-display text-[30px]">What would be deployed</h2>
              {firstBlocked !== -1 ? (
                <p className="mt-3 rounded-[4px] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[14px] text-danger">
                  Step {firstBlocked + 1} ({STEPS[firstBlocked]}) still needs attention.
                </p>
              ) : (
                <p className="mt-3 flex items-center gap-2 rounded-[4px] border border-pass/30 bg-pass-soft px-3 py-2.5 text-[14px] text-pass" data-review-ok>
                  <CheckIcon className="size-4" /> Every check passes. This is exactly what the launcher would be asked to do.
                </p>
              )}
              <ol className="grid-cols-1 mt-6 grid gap-4">
                <ReviewItem n={1} title="Deploy the token">
                  {form.details.name || "—"} ({form.details.symbol || "—"}), {form.details.supply.toLocaleString("en-US")} fixed supply, 18 decimals, no mint function, no owner.
                </ReviewItem>
                <ReviewItem n={2} title="Initialize the v4 pool">
                  <span className="block break-all font-mono text-[12.5px]">
                    currency0 ETH · currency1 {form.details.symbol || "TOKEN"} · fee {c.dynamicFee ? "0x800000 (dynamic)" : `${c.poolFee} (${feeLabel(c.poolFee)})`} · tickSpacing {c.dynamicFee ? 60 : spacingFor(form.rules.baseFeePct)} · hooks RuleCraftHook ({c.mask.hex})
                  </span>
                </ReviewItem>
                <ReviewItem n={3} title="Freeze the rule set">
                  {c.modules.length ? c.modules.map((m) => `${m.name} (${Object.entries(form.rules.params[m.slug] ?? {}).map(([k, v]) => `${k} ${v}`).join(", ")})`).join("; ") : "No modules."}
                </ReviewItem>
                <ReviewItem n={4} title="Seed the founding position">
                  All {form.details.supply.toLocaleString("en-US")} tokens in one token-only range above the opening price. No ETH needed from you.
                  {form.rules.modules.includes("lp-timelock") ? ` Locked for ${form.rules.params["lp-timelock"]?.lockDays} days.` : ""}
                </ReviewItem>
                <ReviewItem n={5} title="Optional dev buy">
                  {form.devBuyEth > 0 ? `${form.devBuyEth} ETH through the pool, paying the same rules as everyone.` : "None."}
                </ReviewItem>
              </ol>
              <div className="mt-6">
                <p className="label mb-2">Permission bits</p>
                <PermissionGrid flags={c.callbacks} />
              </div>
              <div className="mt-8 grid grid-cols-1 gap-3 border-t border-line pt-5">
                <p className="text-[13.5px] text-ink-2">
                  {address ? (
                    <>
                      Deployer <span className="font-mono">{shortAddress(address)}</span> · {onRobinhoodChain ? `on ${CHAIN.name}` : `switch to ${CHAIN.name} first`}
                    </>
                  ) : (
                    "Connect a wallet to see who would sign."
                  )}
                </p>
                <OnchainLaunch
                  ready={firstBlocked === -1}
                  draft={form.rules}
                  name={form.details.name.trim()}
                  symbol={form.details.symbol}
                  supply={form.details.supply}
                  devBuyEth={form.devBuyEth}
                  blueprintId={blueprintId}
                />
              </div>
              {nav}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setForm(EMPTY)}
          className="mt-3 font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-3 hover:text-danger"
        >
          Discard draft
        </button>
      </div>

      <aside className="grid grid-cols-1 content-start gap-4">
        <div className="card p-5">
          <p className="label">Draft</p>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-2 text-[13.5px]">
            <dt className="text-ink-3">Token</dt>
            <dd className="min-w-0 break-words text-ink">{form.details.symbol ? `${form.details.name} · ${form.details.symbol}` : "not named"}</dd>
            <dt className="text-ink-3">Rules</dt>
            <dd className="text-ink">{form.rules.name || `${c.modules.length} modules`}</dd>
            <dt className="text-ink-3">Valuation</dt>
            <dd className="num text-ink">{form.rules.valuationEth} ETH</dd>
            <dt className="text-ink-3">Fee</dt>
            <dd className="num text-ink">{c.dynamicFee ? "dynamic" : `${form.rules.baseFeePct}%`}</dd>
            <dt className="text-ink-3">Saved</dt>
            <dd className="text-ink">in this browser</dd>
          </dl>
          <div className="mt-4 border-t border-line pt-4">
            <TakeRow take={c.take} />
          </div>
        </div>
        <RiskCard risk={c.risk} />
        <div className="grid grid-cols-1 gap-1 text-[12.5px] text-ink-3">
          {c.modules.map((m) => (
            <Link key={m.slug} href={`/rules/${m.slug}`} className="hover:text-ink">
              {MODULE_BY_SLUG[m.slug].name}: {m.line}
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, error, group, children }: { label: string; error?: string; group?: boolean; children: React.ReactNode }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block min-w-0">
      <span className="mb-1.5 block text-[13.5px] text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12.5px] text-danger" data-error>{error}</span> : null}
    </Tag>
  );
}

function ReviewItem({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[32px_1fr] gap-3">
      <span className="num grid size-7 place-items-center rounded-[3px] bg-ink text-[12px] text-paper">{n}</span>
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        <div className="mt-0.5 text-[14px] text-ink-2">{children}</div>
      </div>
    </li>
  );
}
