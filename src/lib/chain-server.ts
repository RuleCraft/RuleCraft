import "server-only";
import { CHAIN, HIDDEN_TOKENS, UNISWAP_V4, serverRpc } from "@/config/brand";
import { DYNAMIC_FEE_FLAG, ZERO_ADDRESS, flagsFromAddress, type FlagKey } from "@/lib/hooks";

/* Server-side chain reads. One JSON-RPC batch per request, configured
   endpoint first (ROBINHOOD_RPC_URL), public endpoints after. No key needed. */

type RpcCall = { method: string; params: unknown[] };

// An endpoint that just failed sits out for a minute, so every read does not
// pay its timeout again. Some networks intercept the primary host's DNS.
const benched = new Map<string, number>();
const BENCH_MS = 60_000;

function endpoints() {
  const all = [serverRpc(), CHAIN.publicRpc, CHAIN.fallbackRpc].filter((url, i, list) => list.indexOf(url) === i);
  const now = Date.now();
  const ready = all.filter((url) => (benched.get(url) ?? 0) < now);
  return ready.length ? ready : all;
}

/** Whether a private endpoint is configured (the value itself is never exposed). */
export const hasPrivateRpc = () => Boolean(process.env.ROBINHOOD_RPC_URL);

export async function batch(calls: RpcCall[], timeoutMs = 8000): Promise<(unknown | null)[]> {
  if (calls.length === 0) return [];
  let lastError: unknown;
  for (const url of endpoints()) {
    try {
      const out: (unknown | null)[] = new Array(calls.length).fill(null);
      // Chunked: public endpoints reject large batches with an HTML error page.
      // A few chunks run at once so a long token list does not crawl.
      const starts: number[] = [];
      for (let start = 0; start < calls.length; start += 20) starts.push(start);
      const runChunk = async (start: number) => {
        const chunk = calls.slice(start, start + 20);
        const send = () =>
          fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(chunk.map((c, i) => ({ jsonrpc: "2.0", id: start + i, method: c.method, params: c.params }))),
            cache: "no-store",
            signal: AbortSignal.timeout(timeoutMs),
          });
        // A connection-level failure (reset, intercepted TLS) gets two more tries
        // before the endpoint is benched; HTTP and JSON-RPC errors do not.
        let res: Response | null = null;
        for (let attempt = 0; attempt < 3 && !res; attempt++) {
          try {
            res = await send();
          } catch (error) {
            if (attempt === 2 || (error instanceof Error && error.name === "TimeoutError")) throw error;
          }
        }
        if (!res) throw new Error("rpc unreachable");
        if (!res.ok) throw new Error(`rpc ${res.status}`);
        const body = (await res.json()) as { id: number; result?: unknown; error?: { message?: string } }[];
        if (!Array.isArray(body)) throw new Error("rpc batch unsupported");
        // An endpoint that refuses a method (archive limits on logs) is no good for this request.
        const refused = body.find((item) => item.error && /archive|personal token|block range|too many/i.test(item.error.message ?? ""));
        if (refused) throw new Error(refused.error?.message ?? "refused");
        for (const item of body) out[item.id] = item.result ?? null;
      };
      for (let i = 0; i < starts.length; i += 6) await Promise.all(starts.slice(i, i + 6).map(runChunk));
      return out;
    } catch (error) {
      benched.set(url, Date.now() + BENCH_MS);
      lastError = error;
    }
  }
  throw lastError;
}

export const ethCall = (to: string, data: string): RpcCall => ({ method: "eth_call", params: [{ to, data }, "latest"] });

export type ChainFacts = {
  ok: boolean;
  chainId: number | null;
  block: number | null;
  gasPriceGwei: number | null;
  poolManagerLive: boolean | null;
  readAt: string;
  latencyMs: number | null;
};

/** Live chain facts: chain id, latest block, gas price, and whether the v4 PoolManager has code. */
export async function readChainFacts(): Promise<ChainFacts> {
  const readAt = new Date().toISOString();
  const started = Date.now();
  try {
    const [idHex, latestHex, gasHex, code] = (await batch([
      { method: "eth_chainId", params: [] },
      { method: "eth_blockNumber", params: [] },
      { method: "eth_gasPrice", params: [] },
      { method: "eth_getCode", params: [UNISWAP_V4.poolManager, "latest"] },
    ])) as (string | null)[];
    return {
      ok: latestHex !== null,
      chainId: idHex ? Number(BigInt(idHex)) : null,
      block: latestHex ? Number(BigInt(latestHex)) : null,
      gasPriceGwei: gasHex ? Number(BigInt(gasHex)) / 1e9 : null,
      poolManagerLive: code ? code.length > 2 : null,
      readAt,
      latencyMs: Date.now() - started,
    };
  } catch {
    return { ok: false, chainId: null, block: null, gasPriceGwei: null, poolManagerLive: null, readAt, latencyMs: null };
  }
}

/* ------------------------------------------------------------------ */
/* Uniswap v4 pools, read from PoolManager Initialize events.           */
/* ------------------------------------------------------------------ */

export type TokenMeta = { address: string; symbol: string; decimals: number | null };

export type LivePool = {
  id: string;
  currency0: TokenMeta;
  currency1: TokenMeta;
  fee: number;
  dynamic: boolean;
  tickSpacing: number;
  hooks: string;
  flags: FlagKey[];
  tick: number;
  block: number;
  tx: string;
};

export type PoolIndex = { ok: boolean; pools: LivePool[]; fromBlock: number | null; toBlock: number | null; readAt: string; error?: string };

const SPAN = 100_000; // ~2.8 hours of blocks at ~0.1 s
const WINDOWS = 3;
const KEEP = 300;
const TTL_MS = 120_000;

let poolCache: { at: number; data: PoolIndex } | null = null;
let inflight: Promise<PoolIndex> | null = null;

const word = (data: string, i: number) => data.slice(2 + i * 64, 2 + (i + 1) * 64);
const toInt24 = (w: string) => {
  const v = Number(BigInt("0x" + w) & 0xffffffn);
  return v >= 0x800000 ? v - 0x1000000 : v;
};
const topicAddress = (t: string) => "0x" + t.slice(26);

function decodeString(hex: string | null): string | null {
  if (!hex || hex === "0x") return null;
  try {
    const body = hex.slice(2);
    if (body.length >= 128) {
      const len = Number(BigInt("0x" + body.slice(64, 128)));
      if (len > 0 && len < 64) {
        const bytes = body.slice(128, 128 + len * 2);
        return Buffer.from(bytes, "hex").toString("utf8").replace(/[^\x20-\x7e]/g, "").trim() || null;
      }
    }
    // bytes32 symbols
    return Buffer.from(body.slice(0, 64), "hex").toString("utf8").replace(/\0/g, "").replace(/[^\x20-\x7e]/g, "").trim() || null;
  } catch {
    return null;
  }
}

async function tokenMeta(addresses: string[]): Promise<Map<string, TokenMeta>> {
  const map = new Map<string, TokenMeta>();
  map.set(ZERO_ADDRESS, { address: ZERO_ADDRESS, symbol: "ETH", decimals: 18 });
  const list = addresses.filter((a) => a !== ZERO_ADDRESS);
  if (!list.length) return map;
  const calls = list.flatMap((a) => [ethCall(a, "0x95d89b41"), ethCall(a, "0x313ce567")]);
  const res = (await batch(calls).catch(() => calls.map(() => null))) as (string | null)[];
  list.forEach((a, i) => {
    const symbol = decodeString(res[i * 2]) ?? a.slice(0, 6) + "…" + a.slice(-4);
    const dec = res[i * 2 + 1];
    map.set(a, { address: a, symbol: symbol.slice(0, 16), decimals: dec && dec !== "0x" ? Number(BigInt(dec)) : null });
  });
  return map;
}

async function buildIndex(): Promise<PoolIndex> {
  const readAt = new Date().toISOString();
  try {
    const [latestHex] = (await batch([{ method: "eth_blockNumber", params: [] }])) as (string | null)[];
    if (!latestHex) throw new Error("no block");
    const latest = Number(BigInt(latestHex));
    const ranges = Array.from({ length: WINDOWS }, (_, i) => {
      const to = latest - i * SPAN;
      return { from: Math.max(0, to - SPAN + 1), to };
    });
    type Log = { topics: string[]; data: string; blockNumber: string; transactionHash: string };
    const logsPerRange = await Promise.all(
      ranges.map(async (r) => {
        const [logs] = (await batch(
          [
            {
              method: "eth_getLogs",
              params: [{ address: UNISWAP_V4.poolManager, fromBlock: "0x" + r.from.toString(16), toBlock: "0x" + r.to.toString(16), topics: [UNISWAP_V4.initializeTopic] }],
            },
          ],
          15_000,
        ).catch(() => [null])) as (Log[] | null)[];
        return logs;
      }),
    );
    if (logsPerRange.every((l) => l === null)) throw new Error("logs unavailable");
    const logs = logsPerRange.flatMap((l) => l ?? []);
    logs.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)));
    const visible = logs.filter((l) => !HIDDEN_TOKENS.has(topicAddress(l.topics[2]).toLowerCase()) && !HIDDEN_TOKENS.has(topicAddress(l.topics[3]).toLowerCase()));
    const kept = visible.slice(0, KEEP);
    const raw = kept.map((l) => {
      const hooks = "0x" + word(l.data, 2).slice(24);
      const fee = Number(BigInt("0x" + word(l.data, 0)));
      return {
        id: l.topics[1],
        c0: topicAddress(l.topics[2]),
        c1: topicAddress(l.topics[3]),
        fee,
        tickSpacing: toInt24(word(l.data, 1)),
        hooks,
        tick: toInt24(word(l.data, 4)),
        block: Number(BigInt(l.blockNumber)),
        tx: l.transactionHash,
      };
    });
    const unique = [...new Set(raw.flatMap((r) => [r.c0, r.c1]))].slice(0, 400);
    const meta = await tokenMeta(unique);
    const pools: LivePool[] = raw.map((r) => ({
      id: r.id,
      currency0: meta.get(r.c0) ?? { address: r.c0, symbol: r.c0.slice(0, 6) + "…", decimals: null },
      currency1: meta.get(r.c1) ?? { address: r.c1, symbol: r.c1.slice(0, 6) + "…", decimals: null },
      fee: r.fee,
      dynamic: r.fee === DYNAMIC_FEE_FLAG,
      tickSpacing: r.tickSpacing,
      hooks: r.hooks,
      flags: r.hooks === ZERO_ADDRESS ? [] : flagsFromAddress(r.hooks),
      tick: r.tick,
      block: r.block,
      tx: r.tx,
    }));
    return { ok: true, pools, fromBlock: ranges[ranges.length - 1].from, toBlock: latest, readAt };
  } catch (error) {
    return { ok: false, pools: [], fromBlock: null, toBlock: null, readAt, error: error instanceof Error ? error.message : "read failed" };
  }
}

/** Recent v4 pools, newest first. Successful reads are kept for two minutes; failures are never cached. */
export async function readPoolIndex(): Promise<PoolIndex> {
  if (poolCache && Date.now() - poolCache.at < TTL_MS) return poolCache.data;
  if (!inflight) {
    // One retry with every endpoint back in play: a single timeout on the
    // primary RPC should not leave the index to an endpoint that refuses logs.
    inflight = buildIndex()
      .then((first) => {
        if (first.ok) return first;
        benched.clear();
        return buildIndex();
      })
      .finally(() => {
      inflight = null;
    });
  }
  const data = await inflight;
  if (data.ok) poolCache = { at: Date.now(), data };
  return data;
}

export type HookScan = {
  address: string;
  flags: FlagKey[];
  codeSize: number | null;
  pools: LivePool[];
  readOk: boolean;
};

/** Bytecode size of a hook address plus the recent pools that point at it. */
export async function readHook(address: string): Promise<HookScan> {
  const flags = flagsFromAddress(address);
  let codeSize: number | null = null;
  let readOk = true;
  try {
    const [code] = (await batch([{ method: "eth_getCode", params: [address, "latest"] }])) as (string | null)[];
    codeSize = code ? Math.max(0, (code.length - 2) / 2) : null;
  } catch {
    readOk = false;
  }
  const index = await readPoolIndex();
  const pools = index.pools.filter((p) => p.hooks.toLowerCase() === address.toLowerCase());
  return { address, flags, codeSize, pools, readOk };
}

/** ERC-20 name, symbol, decimals and total supply for the existing-token form. */
export async function readErc20(address: string) {
  try {
    const [code, name, symbol, decimals, supply] = (await batch([
      { method: "eth_getCode", params: [address, "latest"] },
      ethCall(address, "0x06fdde03"),
      ethCall(address, "0x95d89b41"),
      ethCall(address, "0x313ce567"),
      ethCall(address, "0x18160ddd"),
    ])) as (string | null)[];
    const hasCode = Boolean(code && code.length > 2);
    const dec = decimals && decimals !== "0x" ? Number(BigInt(decimals)) : null;
    return {
      ok: true,
      hasCode,
      name: decodeString(name),
      symbol: decodeString(symbol),
      decimals: dec,
      totalSupply: supply && supply !== "0x" ? BigInt(supply).toString() : null,
    };
  } catch {
    return { ok: false, hasCode: false, name: null, symbol: null, decimals: null, totalSupply: null };
  }
}
