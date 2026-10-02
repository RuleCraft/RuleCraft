import Link from "next/link";
import type { FlagKey } from "@/lib/hooks";
import { flagProblems } from "@/lib/hooks";
import { scoreUnknownHook } from "@/lib/compose";
import { CallbackList, PermissionGrid, RiskCard } from "@/components/rules/Readout";

/** Everything a hook address alone gives away, laid out for a trader. */
export function HookPanel({ flags, dynamic, hasCode }: { flags: FlagKey[]; dynamic: boolean; hasCode: boolean | null }) {
  const risk = scoreUnknownHook(flags, dynamic, hasCode);
  const problems = flagProblems(flags);
  const checks: string[] = [];
  if (flags.includes("beforeSwapReturnDelta") || flags.includes("afterSwapReturnDelta")) checks.push("Quote a small trade first and compare what you receive with a hook-free quote.");
  if (flags.includes("beforeRemoveLiquidity")) checks.push("If you provide liquidity, find out under which conditions the hook lets you withdraw.");
  if (dynamic) checks.push("The fee is set per swap. Ask for the fee bounds, or check them in verified source.");
  if (flags.includes("beforeAddLiquidity")) checks.push("Adding liquidity may be restricted to certain addresses or ranges.");
  if (hasCode === false) checks.push("There is no bytecode at this address. Do not trade on a pool that points here.");
  if (!checks.length && flags.length) checks.push("Read the verified source on the explorer before trusting any rule claimed for this hook.");
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <p className="label mb-2">Permission bits</p>
        <PermissionGrid flags={flags} />
        {problems.length ? <p className="mt-3 text-[13px] text-danger">{problems.join(" ")} The PoolManager would reject this address for a pool.</p> : null}
        <p className="label mb-3 mt-8">Callbacks, in words</p>
        <CallbackList flags={flags} />
        {checks.length ? (
          <div className="card tick mt-8 p-5">
            <p className="label">Before you trust it</p>
            <ul className="grid-cols-1 mt-3 grid gap-2 text-[14px] text-ink-2">
              {checks.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="mt-[9px] size-1.5 shrink-0 bg-signal" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <aside className="grid grid-cols-1 content-start gap-4">
        <RiskCard risk={risk} title="Permission read" />
        <p className="text-[12.5px] text-ink-3">
          Bits show what a hook <em>may</em> do, not what it does. A Rule Craft pool also publishes its module settings, so its read is exact. See{" "}
          <Link href="/methodology" className="text-blue underline underline-offset-4">
            methodology
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}
