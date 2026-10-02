import { BLUEPRINT_BY_SLUG } from "@/config/blueprints";
import { MODULE_BY_SLUG, defaultParams } from "@/config/modules";
import type { Draft } from "@/lib/compose";

/* Drafts travel between the composer, blueprint pages and the launch form as
   a compact base64url string in the query (?rules=…). Nothing is stored on a
   server; the browser may also keep the last draft locally. */

export const EMPTY_DRAFT: Draft = { name: "", modules: [], params: {}, baseFeePct: 1, valuationEth: 5, royaltyPct: 5 };

export function encodeDraft(d: Draft): string {
  const json = JSON.stringify(d);
  const b64 = typeof window === "undefined" ? Buffer.from(json, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Parses and sanitises a draft: unknown modules dropped, every number clamped to its bounds. */
export function decodeDraft(s: string | null | undefined): Draft | null {
  if (!s) return null;
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof window === "undefined" ? Buffer.from(b64, "base64").toString("utf8") : decodeURIComponent(escape(atob(b64)));
    const raw = JSON.parse(json) as Partial<Draft>;
    return sanitize(raw);
  } catch {
    return null;
  }
}

export function sanitize(raw: Partial<Draft>): Draft {
  const modules = Array.isArray(raw.modules) ? [...new Set(raw.modules.filter((m) => typeof m === "string" && MODULE_BY_SLUG[m]))] : [];
  const params = defaultParams(modules);
  for (const slug of modules) {
    for (const p of MODULE_BY_SLUG[slug].params) {
      const v = Number(raw.params?.[slug]?.[p.key]);
      if (Number.isFinite(v)) params[slug][p.key] = clamp(v, p.min, p.max);
    }
  }
  const num = (v: unknown, d: number, lo: number, hi: number) => (Number.isFinite(Number(v)) ? clamp(Number(v), lo, hi) : d);
  return {
    name: typeof raw.name === "string" ? raw.name.slice(0, 40) : "",
    modules,
    params,
    baseFeePct: num(raw.baseFeePct, 1, 0.01, 10),
    valuationEth: num(raw.valuationEth, 5, 0.1, 10_000),
    royaltyPct: num(raw.royaltyPct, 5, 0, 25),
  };
}

export function draftFromBlueprint(slug: string): Draft | null {
  const b = BLUEPRINT_BY_SLUG[slug];
  if (!b) return null;
  return sanitize({ name: b.name, modules: b.modules, params: b.params, baseFeePct: b.baseFeePct, valuationEth: 5, royaltyPct: b.royaltyPct });
}
