import { concat, decodeFunctionResult, encodeFunctionData, getAddress, keccak256, type Abi, type Hex } from "viem";
import artifacts from "@/contracts/artifacts.json";
import { UNISWAP_V4 } from "@/config/brand";
import { CREATE2_DEPLOYER, HOOK_FLAGS } from "@/config/deployment";
import type { Draft } from "@/lib/compose";
import { rpc } from "@/lib/rpc";

/*
 * Everything the browser needs to talk to the Rule Craft contracts: ABIs,
 * the mapping from a composer draft to the on-chain Rules struct, read calls
 * through the site's RPC relay, price math and hook salt mining.
 */

export const ABI = {
  registry: artifacts.BlueprintRegistry.abi as Abi,
  launcher: artifacts.RuleCraftLauncher.abi as Abi,
  hook: artifacts.RuleCraftHook.abi as Abi,
  token: artifacts.RuleCraftToken.abi as Abi,
};
export const BYTECODE = {
  registry: artifacts.BlueprintRegistry.bytecode as Hex,
  launcher: artifacts.RuleCraftLauncher.bytecode as Hex,
  hook: artifacts.RuleCraftHook.bytecode as Hex,
};

export const QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const satisfies Abi;

export const MOD = { GUARD: 1, SIZE_FEE: 2, BURN: 4, STREAM: 8, LOCK: 16 } as const;

export type OnchainRules = {
  modules: number;
  baseFee: number;
  guardBlocks: number;
  maxBuyBps: number;
  guardTaxBps: number;
  minFee: number;
  maxFee: number;
  depthBps: number;
  burnBps: number;
  streamBps: number;
  lockDays: number;
};

export type PoolKeyTuple = { currency0: string; currency1: string; fee: number; tickSpacing: number; hooks: string };

const bps = (pct: number) => Math.round(pct * 100);
const pips = (pct: number) => Math.round(pct * 10_000);

/** Modules that exist in the composer but are not part of the on-chain v1 hook. */
export const NOT_ONCHAIN = new Set(["milestone-pot", "arb-recapture"]);

/** Turns a composer draft into the Rules struct the contracts accept, or says why it cannot. */
export function draftToRules(d: Draft): { rules: OnchainRules | null; problems: string[] } {
  const problems: string[] = [];
  const has = (s: string) => d.modules.includes(s);
  const v = (s: string, k: string) => d.params[s]?.[k] ?? 0;
  for (const s of d.modules) if (NOT_ONCHAIN.has(s)) problems.push(`${s === "milestone-pot" ? "Milestone Pot" : "Arb Recapture"} is not in the on-chain release. Remove it to launch.`);
  if (d.modules.length === 0) problems.push("Pick at least one rule module.");
  const r: OnchainRules = { modules: 0, baseFee: 0, guardBlocks: 0, maxBuyBps: 0, guardTaxBps: 0, minFee: 0, maxFee: 0, depthBps: 0, burnBps: 0, streamBps: 0, lockDays: 0 };
  if (has("snipe-guard")) {
    r.modules |= MOD.GUARD;
    r.guardBlocks = Math.round(v("snipe-guard", "guardBlocks"));
    r.maxBuyBps = bps(v("snipe-guard", "maxBuyPct"));
    r.guardTaxBps = bps(v("snipe-guard", "guardTaxPct"));
  }
  if (has("size-fee")) {
    r.modules |= MOD.SIZE_FEE;
    r.minFee = pips(v("size-fee", "minFeePct"));
    r.maxFee = pips(v("size-fee", "maxFeePct"));
    r.depthBps = bps(v("size-fee", "depthPct"));
  } else {
    r.baseFee = pips(d.baseFeePct);
    if (![500, 3000, 10_000].includes(r.baseFee)) problems.push("Base fee must be 0.05%, 0.30% or 1.00%.");
  }
  if (has("buy-burn")) {
    r.modules |= MOD.BURN;
    r.burnBps = bps(v("buy-burn", "burnPct"));
  }
  if (has("lp-stream")) {
    r.modules |= MOD.STREAM;
    r.streamBps = bps(v("lp-stream", "sharePct"));
  }
  if (has("lp-timelock")) {
    r.modules |= MOD.LOCK;
    r.lockDays = Math.round(v("lp-timelock", "lockDays"));
  }
  if (r.modules === 0 && !problems.length) problems.push("Pick at least one module that runs on-chain.");
  if (r.guardTaxBps + r.burnBps + r.streamBps > 5000) problems.push("Guard tax, burn and stream together exceed 50%.");
  if (r.maxFee && r.maxFee < r.minFee) problems.push("Fee ceiling is below the floor.");
  return { rules: problems.length ? null : r, problems };
}

/** Composer draft from on-chain Rules, for "use this blueprint". */
export function rulesToDraftParts(r: OnchainRules) {
  const modules: string[] = [];
  const params: Draft["params"] = {};
  if (r.modules & MOD.GUARD) {
    modules.push("snipe-guard");
    params["snipe-guard"] = { guardBlocks: r.guardBlocks, maxBuyPct: r.maxBuyBps / 100, guardTaxPct: r.guardTaxBps / 100 };
  }
  if (r.modules & MOD.SIZE_FEE) {
    modules.push("size-fee");
    params["size-fee"] = { minFeePct: r.minFee / 10_000, maxFeePct: r.maxFee / 10_000, depthPct: r.depthBps / 100 };
  }
  if (r.modules & MOD.BURN) {
    modules.push("buy-burn");
    params["buy-burn"] = { burnPct: r.burnBps / 100 };
  }
  if (r.modules & MOD.STREAM) {
    modules.push("lp-stream");
    params["lp-stream"] = { sharePct: r.streamBps / 100 };
  }
  if (r.modules & MOD.LOCK) {
    modules.push("lp-timelock");
    params["lp-timelock"] = { lockDays: r.lockDays };
  }
  return { modules, params, baseFeePct: r.baseFee ? r.baseFee / 10_000 : 0.3 };
}

/** Normalises a Rules value read from chain (numbers may arrive as bigint). */
export function normRules(x: Record<string, unknown>): OnchainRules {
  const n = (k: string) => Number(x[k] as bigint | number);
  return {
    modules: n("modules"),
    baseFee: n("baseFee"),
    guardBlocks: n("guardBlocks"),
    maxBuyBps: n("maxBuyBps"),
    guardTaxBps: n("guardTaxBps"),
    minFee: n("minFee"),
    maxFee: n("maxFee"),
    depthBps: n("depthBps"),
    burnBps: n("burnBps"),
    streamBps: n("streamBps"),
    lockDays: n("lockDays"),
  };
}

/** Plain-language lines for an on-chain rule set. */
export function describeRules(r: OnchainRules): string[] {
  const out: string[] = [];
  if (r.modules & MOD.SIZE_FEE) out.push(`LP fee set per swap: ${r.minFee / 10_000}% for small trades, up to ${r.maxFee / 10_000}% once a trade reaches ${r.depthBps / 100}% of in-range depth.`);
  else out.push(`${r.baseFee / 10_000}% LP fee on every swap, all of it to liquidity in range.`);
  if (r.modules & MOD.GUARD) out.push(`First ${r.guardBlocks} blocks: buyers together may receive at most ${r.maxBuyBps / 100}% of supply per block, and each buy pays a ${r.guardTaxBps / 100}% guard tax.`);
  if (r.modules & MOD.BURN) out.push(`${r.burnBps / 100}% of every buy's tokens is sent to the dead address.`);
  if (r.modules & MOD.STREAM) out.push(`${r.streamBps / 100}% of every buy's tokens is donated to in-range LPs.`);
  if (r.modules & MOD.LOCK) out.push(`Founding liquidity is locked for ${r.lockDays} days; its fees can be collected any time.`);
  out.push("Sells pay only the LP fee. Exact-output swaps are refused.");
  return out;
}

// ---------------------------------------------------------------------------
// Reads through /api/rpc
// ---------------------------------------------------------------------------

export async function read<T>(address: string, abi: Abi, functionName: string, args: readonly unknown[] = []): Promise<T> {
  const data = encodeFunctionData({ abi, functionName, args });
  const result = await rpc<Hex>("eth_call", [{ to: address, data }, "latest"]);
  return decodeFunctionResult({ abi, functionName, data: result }) as T;
}

export async function hasCode(address: string): Promise<boolean> {
  const code = await rpc<string>("eth_getCode", [address, "latest"]);
  return Boolean(code && code !== "0x");
}

export async function quoteExactIn(key: PoolKeyTuple, buy: boolean, amountIn: bigint): Promise<bigint> {
  const [out] = await read<readonly [bigint, bigint]>(UNISWAP_V4.quoter, QUOTER_ABI as unknown as Abi, "quoteExactInputSingle", [
    { poolKey: key, zeroForOne: buy, exactAmount: amountIn, hookData: "0x" },
  ]);
  return out;
}

// ---------------------------------------------------------------------------
// Price math
// ---------------------------------------------------------------------------

export function bigSqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

/** sqrt(tokens per ETH) in Q64.96 for a whole-supply valuation in ETH. Both sides use 18 decimals. */
export function sqrtPriceFor(supplyWei: bigint, valuationWei: bigint): bigint {
  return bigSqrt((supplyWei << 192n) / valuationWei);
}

export function parseUnits18(v: string | number): bigint {
  const s = String(v).trim();
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return 0n;
  const [w, f = ""] = s.split(".");
  return BigInt(w || "0") * 10n ** 18n + BigInt((f + "0".repeat(18)).slice(0, 18) || "0");
}

export function formatUnits18(v: bigint, digits = 4): string {
  const neg = v < 0n;
  const a = neg ? -v : v;
  const whole = a / 10n ** 18n;
  const frac = (a % 10n ** 18n).toString().padStart(18, "0").slice(0, digits).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toLocaleString("en-US")}${frac ? "." + frac : ""}`;
}

// ---------------------------------------------------------------------------
// Hook address mining (CREATE2 through the deterministic deployer)
// ---------------------------------------------------------------------------

export function create2Address(salt: Hex, initCodeHash: Hex): string {
  const h = keccak256(concat(["0xff", CREATE2_DEPLOYER as Hex, salt, initCodeHash]));
  return getAddress(`0x${h.slice(-40)}`);
}

/**
 * Finds a salt whose CREATE2 address ends in the hook permission bits. Works in slices so
 * the page stays responsive; ~16k tries on average.
 */
export async function mineHookSalt(initCodeHash: Hex, onProgress?: (tried: number) => void): Promise<{ salt: Hex; address: string; tried: number }> {
  for (let i = 0; i < 2_000_000; i++) {
    const salt = `0x${i.toString(16).padStart(64, "0")}` as Hex;
    const address = create2Address(salt, initCodeHash);
    if ((Number.parseInt(address.slice(-4), 16) & 0x3fff) === HOOK_FLAGS) return { salt, address, tried: i + 1 };
    if (i % 2000 === 1999) {
      onProgress?.(i + 1);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  throw new Error("No salt found in 2,000,000 tries.");
}
