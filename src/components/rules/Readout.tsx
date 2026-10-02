import { FLAGS, FLAG_BY_KEY, maskFor, type FlagKey } from "@/lib/hooks";
import type { Issue, Risk } from "@/lib/compose";
import type { RuleModule } from "@/config/modules";
import { ModuleGlyph } from "@/components/glyphs";
import { AlertIcon, CheckIcon, InfoIcon } from "@/components/icons";

/* Read-outs shared by the composer, blueprint pages, the launch form and the
   live pool viewer, so a rule set looks the same wherever it is read. */

const GROUP_LABEL: Record<string, string> = { lifecycle: "Init", liquidity: "Liquidity", swap: "Swap", donate: "Donate", delta: "Delta" };

/** The 14 permission bits, highest first, as they sit in the hook address. */
export function PermissionGrid({ flags, dense = false }: { flags: FlagKey[]; dense?: boolean }) {
  const on = new Set(flags);
  const mask = maskFor(flags);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 sm:grid-cols-14" data-permission-grid>
        {FLAGS.map((f) => {
          const active = on.has(f.key);
          return (
            <div
              key={f.key}
              title={`${f.label} (bit ${f.bit}): ${f.meaning}`}
              className={`flex min-w-0 flex-col items-center justify-between rounded-[3px] border px-0.5 py-1.5 text-center ${active ? (f.group === "delta" ? "border-signal bg-signal text-white" : "border-ink bg-ink text-paper") : "border-line bg-card text-ink-3"}`}
            >
              <span className="num text-[10px] opacity-80">{f.bit}</span>
              <span className={`mt-0.5 whitespace-nowrap font-mono font-medium ${dense ? "text-[10px]" : "text-[11px]"} leading-none`}>{shortFlag(f.key)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[11px] leading-[1.5] text-ink-3">
        {flags.length ? flags.map((k) => `${shortFlag(k)} ${FLAG_BY_KEY[k].label}`).join(" · ") : "B = before, A = after · I init, A add, R remove, S swap, D donate · Δ returns a delta"}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-ink-2">
        <span>
          mask <span className="text-ink">{mask.hex}</span>
        </span>
        <span className="break-all">
          bits <span className="text-ink">{mask.binary}</span>
        </span>
        <span>{flags.length}/14 on</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px] bg-signal" /> can change amounts
        </span>
      </div>
    </div>
  );
}

function shortFlag(k: FlagKey) {
  const map: Record<FlagKey, string> = {
    beforeInitialize: "BI",
    afterInitialize: "AI",
    beforeAddLiquidity: "BA",
    afterAddLiquidity: "AA",
    beforeRemoveLiquidity: "BR",
    afterRemoveLiquidity: "AR",
    beforeSwap: "BS",
    afterSwap: "AS",
    beforeDonate: "BD",
    afterDonate: "AD",
    beforeSwapReturnDelta: "BSΔ",
    afterSwapReturnDelta: "ASΔ",
    afterAddLiquidityReturnDelta: "AAΔ",
    afterRemoveLiquidityReturnDelta: "ARΔ",
  };
  return map[k];
}

/** Callback list in words: what each enabled callback lets the hook do. */
export function CallbackList({ flags }: { flags: FlagKey[] }) {
  if (!flags.length) return <p className="text-[14px] text-ink-3">No callbacks. The pool behaves like a plain Uniswap v4 pool.</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {flags.map((k) => {
        const f = FLAG_BY_KEY[k];
        return (
          <li key={k} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[220px_1fr] sm:gap-4">
            <span className="flex items-center gap-2 font-mono text-[12.5px] text-ink">
              <span className={`size-2 shrink-0 rounded-[1px] ${f.group === "delta" ? "bg-signal" : "bg-ink"}`} />
              {f.label}
              <span className="text-ink-3">· {GROUP_LABEL[f.group]}</span>
            </span>
            <span className="text-[13.5px] text-ink-2">
              {f.meaning} <span className="text-ink-3">{f.watch}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const STAGES: { key: string; label: string; flags: FlagKey[] }[] = [
  { key: "init", label: "Pool opens", flags: ["beforeInitialize", "afterInitialize"] },
  { key: "add", label: "Liquidity in", flags: ["beforeAddLiquidity", "afterAddLiquidity", "afterAddLiquidityReturnDelta"] },
  { key: "before", label: "Before swap", flags: ["beforeSwap", "beforeSwapReturnDelta"] },
  { key: "math", label: "v4 swap math", flags: [] },
  { key: "after", label: "After swap", flags: ["afterSwap", "afterSwapReturnDelta"] },
  { key: "rem", label: "Liquidity out", flags: ["beforeRemoveLiquidity", "afterRemoveLiquidity", "afterRemoveLiquidityReturnDelta"] },
];

/** The pool's life as a vertical track, each module pinned where it runs. */
export function LifecycleTrack({ modules }: { modules: RuleModule[] }) {
  return (
    <ol className="grid-cols-1 relative grid gap-2" data-lifecycle>
      <span aria-hidden className="absolute bottom-4 left-[15px] top-4 w-px bg-ink/30" />
      {STAGES.map((s) => {
        const here = modules.filter((m) => m.callbacks.some((c) => s.flags.includes(c)));
        const math = s.key === "math";
        return (
          <li key={s.key} className="relative grid grid-cols-[32px_1fr] items-start gap-3">
            <span className={`relative z-10 mt-1 grid size-[31px] place-items-center rounded-full border text-[11px] ${math ? "border-blue bg-blue text-white" : here.length ? "border-ink bg-ink text-paper" : "border-line-2 bg-paper text-ink-3"}`}>
              {math ? "v4" : here.length || "·"}
            </span>
            <div className="min-w-0 pb-1">
              <p className={`text-[13.5px] font-medium ${here.length || math ? "text-ink" : "text-ink-3"}`}>{s.label}</p>
              {math ? (
                <p className="text-[12.5px] text-ink-3">Concentrated-liquidity math in the PoolManager. No rule runs inside it.</p>
              ) : here.length ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {here.map((m) => (
                    <span key={m.slug} className="chip !text-ink">
                      <ModuleGlyph glyph={m.glyph} className="size-3.5" />
                      {m.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-3">Untouched.</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const GRADE_TONE: Record<Risk["grade"], string> = {
  A: "bg-pass text-white",
  B: "bg-[#5f8a2d] text-white",
  C: "bg-warn text-white",
  D: "bg-signal text-white",
  E: "bg-danger text-white",
};

export function RiskCard({ risk, title = "Risk read" }: { risk: Risk; title?: string }) {
  return (
    <div className="card p-4 sm:p-5" data-risk-score={risk.score}>
      <div className="flex items-center gap-4">
        <span className={`grid size-14 shrink-0 place-items-center rounded-[4px] font-display text-[30px] font-semibold ${GRADE_TONE[risk.grade]}`}>{risk.grade}</span>
        <div className="min-w-0">
          <p className="label">{title}</p>
          <p className="mt-0.5 text-[17px] font-medium text-ink">{risk.label}</p>
          <p className="num text-[12.5px] text-ink-3">score {risk.score} / 100 · higher means the rules can move a trade further from a plain pool</p>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-[2px] bg-paper-2">
        <div className="h-full bg-ink" style={{ width: `${risk.score}%` }} />
      </div>
      <ul className="grid-cols-1 mt-4 grid gap-2.5">
        {risk.factors.map((f) => (
          <li key={f.label} className="grid grid-cols-[1fr_auto] gap-x-3 text-[13px]">
            <span className="text-ink">{f.label}</span>
            <span className="num text-ink-2">
              {f.points}/{f.max}
            </span>
            <span className="col-span-2 text-[12.5px] text-ink-3">{f.note}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">A heuristic read of permissions and settings. It is not an audit and does not check the code itself.</p>
    </div>
  );
}

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length)
    return (
      <p className="flex items-center gap-2 rounded-[4px] border border-pass/30 bg-pass-soft px-3 py-2.5 text-[13.5px] text-pass" data-issues="0">
        <CheckIcon className="size-4" /> No conflicts. Every rule fits with the others at these settings.
      </p>
    );
  const tone = { error: "border-danger/30 bg-danger-soft text-danger", warn: "border-warn/30 bg-warn-soft text-warn", info: "border-blue/25 bg-blue-soft text-blue" } as const;
  return (
    <ul className="grid grid-cols-1 gap-2" data-issues={issues.filter((i) => i.level === "error").length}>
      {issues.map((i, n) => (
        <li key={n} className={`flex items-start gap-2 rounded-[4px] border px-3 py-2.5 text-[13.5px] leading-[1.45] ${tone[i.level]}`} data-issue={i.level}>
          {i.level === "info" ? <InfoIcon className="mt-0.5 size-4 shrink-0" /> : <AlertIcon className="mt-0.5 size-4 shrink-0" />}
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function TakeRow({ take }: { take: { buySteady: number; sellSteady: number; buyGuard: number } }) {
  const cell = "min-w-0 border-l-2 border-ink pl-3";
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className={cell}>
        <p className="label">Buy</p>
        <p className="num text-[20px] text-ink">{take.buySteady}%</p>
      </div>
      <div className={cell}>
        <p className="label">Sell</p>
        <p className="num text-[20px] text-ink">{take.sellSteady}%</p>
      </div>
      <div className={cell}>
        <p className="label">Buy, opening</p>
        <p className="num text-[20px] text-ink">{take.buyGuard}%</p>
      </div>
    </div>
  );
}
