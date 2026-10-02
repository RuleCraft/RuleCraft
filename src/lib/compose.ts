import { FEE_MODEL, MODULE_BY_SLUG, type ParamValues, type RuleModule } from "@/config/modules";
import { DYNAMIC_FEE_FLAG, FLAGS, FLAG_BY_KEY, flagProblems, maskFor, type FlagKey } from "@/lib/hooks";

/*
 * Pure functions that turn a chosen set of rule modules into what a pool
 * would actually carry: the hook permission bits, the v4 fee value, the
 * worst-case take from one trade, the conflicts, and a risk read. Shared by
 * the composer, the launch form and the blueprint pages, so all three always
 * agree.
 */

export type Draft = {
  name: string;
  modules: string[];
  params: ParamValues;
  /** Base LP fee in percent, used as the fee floor when a module sets fees. */
  baseFeePct: number;
  /** Opening valuation of a new token in ETH; used to turn supply caps into ETH. */
  valuationEth: number;
  /** Blueprint royalty as a share of add-on revenue. */
  royaltyPct: number;
};

export type Issue = { level: "error" | "warn" | "info"; text: string };
export type Factor = { label: string; points: number; max: number; note: string };
export type Risk = { score: number; grade: "A" | "B" | "C" | "D" | "E"; label: string; factors: Factor[] };

export type Composition = {
  modules: RuleModule[];
  callbacks: FlagKey[];
  mask: ReturnType<typeof maskFor>;
  dynamicFee: boolean;
  /** v4 PoolKey.fee: hundredths of a basis point, or the dynamic flag. */
  poolFee: number;
  take: { buySteady: number; sellSteady: number; buyGuard: number; maxFee: number };
  issues: Issue[];
  risk: Risk;
  spec: string;
  lines: string[];
};

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const p = (draft: Draft, slug: string, key: string) => draft.params[slug]?.[key] ?? MODULE_BY_SLUG[slug]?.params.find((x) => x.key === key)?.def ?? 0;

export function gradeFor(score: number): Pick<Risk, "grade" | "label"> {
  if (score <= 20) return { grade: "A", label: "Light rules" };
  if (score <= 40) return { grade: "B", label: "Moderate rules" };
  if (score <= 60) return { grade: "C", label: "Active rules" };
  if (score <= 80) return { grade: "D", label: "Heavy rules" };
  return { grade: "E", label: "Extreme rules" };
}

const MAX_WEIGHT = FLAGS.reduce((s, f) => s + f.weight, 0);

/** How much power a set of callbacks hands the hook, 0..1. */
export function permissionPower(flags: FlagKey[]) {
  return flags.reduce((s, k) => s + FLAG_BY_KEY[k].weight, 0) / MAX_WEIGHT;
}

export function compose(draft: Draft): Composition {
  const modules = draft.modules.map((s) => MODULE_BY_SLUG[s]).filter(Boolean);
  const has = (slug: string) => draft.modules.includes(slug);

  const set = new Set<FlagKey>();
  for (const m of modules) for (const c of m.callbacks) set.add(c);
  const callbacks = FLAGS.map((f) => f.key).filter((k) => set.has(k));
  const mask = maskFor(callbacks);
  const dynamicFee = modules.some((m) => m.dynamicFee);
  const poolFee = dynamicFee ? DYNAMIC_FEE_FLAG : Math.round(draft.baseFeePct * 10_000);

  // Worst-case take from one trade at these settings, in percent.
  const maxFee = has("size-fee") ? Math.max(p(draft, "size-fee", "maxFeePct"), p(draft, "size-fee", "minFeePct")) : draft.baseFeePct;
  const floorFee = has("size-fee") ? p(draft, "size-fee", "minFeePct") : draft.baseFeePct;
  const burn = has("buy-burn") ? p(draft, "buy-burn", "burnPct") : 0;
  const stream = has("lp-stream") ? p(draft, "lp-stream", "sharePct") : 0;
  const pot = has("milestone-pot") ? p(draft, "milestone-pot", "potPct") : 0;
  const recapture = has("arb-recapture") ? 0.5 : 0; // design bound per swap
  const guardTax = has("snipe-guard") ? p(draft, "snipe-guard", "guardTaxPct") : 0;
  const buySteady = round(maxFee + burn + stream + pot + recapture);
  const sellSteady = round(maxFee + recapture);
  const buyGuard = round(buySteady + guardTax);

  const issues: Issue[] = [];
  if (modules.length === 0) issues.push({ level: "info", text: `No rules yet. This pool would be a plain v4 pool paying a ${draft.baseFeePct}% fee to LPs.` });
  for (const problem of flagProblems(callbacks)) issues.push({ level: "error", text: problem });
  if (has("size-fee")) {
    const lo = p(draft, "size-fee", "minFeePct");
    const hi = p(draft, "size-fee", "maxFeePct");
    if (hi < lo) issues.push({ level: "error", text: `Size-Scaled Fee: the ceiling (${hi}%) is below the floor (${lo}%).` });
    issues.push({ level: "info", text: "Size-Scaled Fee replaces the static base fee: the pool is created with the dynamic-fee flag and the floor becomes the base." });
  }
  if (buyGuard > FEE_MODEL.hardCeilingPct)
    issues.push({ level: "error", text: `A buy during the guard window could lose ${buyGuard}% to rules. The ceiling is ${FEE_MODEL.hardCeilingPct}%.` });
  else if (guardTax > 0 && buyGuard > 30) issues.push({ level: "warn", text: `Buys in the guard window give up to ${buyGuard}%. Honest early buyers pay that too.` });
  if (buySteady > FEE_MODEL.steadyWarnPct)
    issues.push({ level: "warn", text: `After any guard window, a buy still gives up to ${buySteady}%. Above ${FEE_MODEL.steadyWarnPct}% most traders walk away.` });
  if (has("snipe-guard") && has("milestone-pot")) {
    const capEth = (p(draft, "snipe-guard", "maxBuyPct") / 100) * draft.valuationEth;
    const minBuy = p(draft, "milestone-pot", "minBuyEth");
    if (minBuy > capEth)
      issues.push({
        level: "error",
        text: `Milestone Pot needs buys of ${minBuy} ETH, but Snipe Guard lets only ${round(capEth, 4)} ETH in per block during the window. No buy could qualify for the pot until the guard ends.`,
      });
  }
  if (has("lp-timelock") && p(draft, "lp-timelock", "lockDays") < 7)
    issues.push({ level: "warn", text: "A lock under 7 days protects traders very little." });
  if (has("arb-recapture")) {
    issues.push({ level: "warn", text: "Arb Recapture is a planned module. A pool can be drafted with it but cannot launch with it yet." });
    if (has("size-fee")) issues.push({ level: "info", text: "Size-Scaled Fee and Arb Recapture both set the fee in beforeSwap; the size fee is computed first and the recapture charge is added on top." });
  }
  if (draft.royaltyPct > FEE_MODEL.royaltyMaxPct) issues.push({ level: "error", text: `Royalty is capped at ${FEE_MODEL.royaltyMaxPct}% of add-on revenue.` });

  // Risk read: how far the rules can move a trade or an LP away from a plain pool.
  const power = permissionPower(callbacks);
  const factors: Factor[] = [
    { label: "Hook permissions", max: 35, points: Math.round(power * 35), note: `${callbacks.length} of 14 callbacks enabled.` },
    {
      label: "Steady take per buy",
      max: 25,
      points: Math.round(Math.min(Math.max(buySteady - floorFee, 0) / FEE_MODEL.steadyWarnPct, 1) * 25),
      note: `Up to ${buySteady}% of a buy goes to fees and rules (${floorFee}% is the plain LP fee).`,
    },
    { label: "Opening window", max: 15, points: Math.round(Math.min(guardTax / 50, 1) * 15), note: guardTax ? `Guard tax of ${guardTax}% for ${p(draft, "snipe-guard", "guardBlocks")} blocks.` : "No extra charge at opening." },
    {
      label: "Fee movement",
      max: 10,
      points: has("size-fee") ? Math.round(Math.min((maxFee - floorFee) / 3, 1) * 10) : 0,
      note: has("size-fee") ? `Fee moves between ${floorFee}% and ${maxFee}% by trade size.` : "Fee is fixed for the life of the pool.",
    },
    {
      label: "LP exits",
      max: 10,
      points: has("lp-timelock") ? 3 : 0,
      note: has("lp-timelock") ? `Founding liquidity locked ${p(draft, "lp-timelock", "lockDays")} days; other LPs exit freely.` : "Every LP can leave at any time.",
    },
    { label: "Unreleased code", max: 5, points: has("arb-recapture") ? 5 : 0, note: has("arb-recapture") ? "Includes a planned module." : "Only core modules." },
  ];
  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const risk: Risk = { score, ...gradeFor(score), factors };

  const lines: string[] = [];
  if (dynamicFee) lines.push(`LP fee set per swap, floor ${floorFee}%, ceiling ${maxFee}%.`);
  else lines.push(`${draft.baseFeePct}% LP fee on every swap, all of it to liquidity in range.`);
  for (const m of modules) {
    const v = (k: string) => p(draft, m.slug, k);
    switch (m.slug) {
      case "snipe-guard":
        lines.push(`First ${v("guardBlocks")} blocks: at most ${v("maxBuyPct")}% of supply per block, plus a ${v("guardTaxPct")}% guard tax to LPs.`);
        break;
      case "buy-burn":
        lines.push(`${v("burnPct")}% of every buy's tokens is burned.`);
        break;
      case "lp-stream":
        lines.push(`${v("sharePct")}% of every buy's ETH is donated to in-range LPs.`);
        break;
      case "milestone-pot":
        lines.push(`${v("potPct")}% of qualifying buys (≥ ${v("minBuyEth")} ETH) fills a pot; every ${v("everyN")}th qualifying buy wins it.`);
        break;
      case "lp-timelock":
        lines.push(`Founding liquidity locked for ${v("lockDays")} days.`);
        break;
      case "arb-recapture":
        lines.push(`Planned: ${v("recapturePct")}% of measured arbitrage gaps returned to LPs.`);
        break;
    }
  }

  const spec = JSON.stringify(
    {
      name: draft.name || "Untitled rule set",
      chainId: 4663,
      poolKey: { currency0: "ETH (address(0))", currency1: "<token>", fee: dynamicFee ? "0x800000 (dynamic)" : poolFee, tickSpacing: dynamicFee ? 60 : spacingFor(draft.baseFeePct), hooks: `<RuleHook address ending in mask ${mask.hex}>` },
      permissions: Object.fromEntries(FLAGS.map((f) => [f.key, set.has(f.key)])),
      modules: modules.map((m) => ({ module: m.slug, status: m.status, params: draft.params[m.slug] ?? {} })),
      royaltyPctOfAddOns: draft.royaltyPct,
      protocolSharePctOfAddOns: FEE_MODEL.protocolSharePct,
      maxTakePct: { buy: buySteady, sell: sellSteady, buyDuringGuard: buyGuard },
      frozenAtCreation: true,
    },
    null,
    2,
  );

  return { modules, callbacks, mask, dynamicFee, poolFee, take: { buySteady, sellSteady, buyGuard, maxFee }, issues, risk, spec, lines };
}

export function spacingFor(feePct: number) {
  if (feePct <= 0.05) return 10;
  if (feePct <= 0.3) return 60;
  return 200;
}

/** Risk read for a hook we did not compose: only its address bits and the pool fee are known. */
export function scoreUnknownHook(flags: FlagKey[], dynamic: boolean, hasCode: boolean | null): Risk {
  const deltas = flags.filter((k) => FLAG_BY_KEY[k].group === "delta").length;
  const factors: Factor[] = [
    { label: "Hook permissions", max: 40, points: Math.round(permissionPower(flags) * 40), note: `${flags.length} of 14 callbacks enabled.` },
    { label: "Delta rights", max: 25, points: Math.min(25, deltas * 9), note: deltas ? `${deltas} callback${deltas > 1 ? "s" : ""} can change the amounts you pay or receive.` : "The hook cannot change swap or LP amounts." },
    {
      label: "LP exits",
      max: 10,
      points: flags.includes("beforeRemoveLiquidity") ? 10 : 0,
      note: flags.includes("beforeRemoveLiquidity") ? "The hook runs before every withdrawal and could block it." : "The hook does not see withdrawals before they happen.",
    },
    { label: "Fee movement", max: 10, points: dynamic ? 10 : 0, note: dynamic ? "Dynamic fee: the hook sets the fee per swap, with no bound visible from outside." : "Fixed fee." },
    {
      label: "Unknown code",
      max: 15,
      points: flags.length === 0 ? 0 : hasCode === false ? 15 : 10,
      note: flags.length === 0 ? "No hook." : hasCode === false ? "No bytecode at this address: the pool cannot work as described." : "Rule parameters and upgrade rights are not visible from bits alone.",
    },
  ];
  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  return { score, ...gradeFor(score), factors };
}
