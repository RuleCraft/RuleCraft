import "server-only";
import { decodeFunctionResult, encodeFunctionData, type Abi, type Hex } from "viem";
import artifacts from "@/contracts/artifacts.json";
import { DEPLOYMENT, IS_DEPLOYED } from "@/config/deployment";
import { batch, ethCall } from "@/lib/chain-server";

/* Server-side reads of the Rule Craft contracts, through the same RPC fallback chain. */

const LAUNCHER = artifacts.RuleCraftLauncher.abi as Abi;
const REGISTRY = artifacts.BlueprintRegistry.abi as Abi;
const MAX_SCAN = 300;

async function calls<T>(to: string, abi: Abi, fn: string, argsList: readonly unknown[][]): Promise<(T | null)[]> {
  const res = (await batch(argsList.map((args) => ethCall(to, encodeFunctionData({ abi, functionName: fn, args }))))) as (Hex | null)[];
  return res.map((r) => {
    if (!r || r === "0x") return null;
    try {
      return decodeFunctionResult({ abi, functionName: fn, data: r }) as T;
    } catch {
      return null;
    }
  });
}

export type CrafterStats = { ok: boolean; launches: number | null; blueprints: number | null; totalLaunches: number | null; totalBlueprints: number | null };

/** How many launches and blueprints an address has on the Rule Craft contracts (newest 300 of each scanned). */
export async function readCrafterStats(address: string): Promise<CrafterStats> {
  if (!IS_DEPLOYED) return { ok: false, launches: null, blueprints: null, totalLaunches: null, totalBlueprints: null };
  try {
    const [lc, bc] = await Promise.all([calls<bigint>(DEPLOYMENT.launcher, LAUNCHER, "launchCount", [[]]), calls<bigint>(DEPLOYMENT.registry, REGISTRY, "count", [[]])]);
    const nL = Number(lc[0] ?? 0n);
    const nB = Number(bc[0] ?? 0n);
    const lIds = Array.from({ length: Math.min(nL, MAX_SCAN) }, (_, i) => [BigInt(nL - i)]);
    const bIds = Array.from({ length: Math.min(nB, MAX_SCAN) }, (_, i) => [BigInt(nB - i)]);
    const [ls, bs] = await Promise.all([
      lIds.length ? calls<{ creator: string }>(DEPLOYMENT.launcher, LAUNCHER, "getLaunch", lIds) : Promise.resolve([]),
      bIds.length ? calls<{ author: string }>(DEPLOYMENT.registry, REGISTRY, "get", bIds) : Promise.resolve([]),
    ]);
    const me = address.toLowerCase();
    return {
      ok: true,
      launches: ls.filter((l) => l?.creator?.toLowerCase() === me).length,
      blueprints: bs.filter((b) => b?.author?.toLowerCase() === me).length,
      totalLaunches: nL,
      totalBlueprints: nB,
    };
  } catch {
    return { ok: false, launches: null, blueprints: null, totalLaunches: null, totalBlueprints: null };
  }
}
