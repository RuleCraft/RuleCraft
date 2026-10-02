import { NextResponse } from "next/server";
import { batch } from "@/lib/chain-server";

export const dynamic = "force-dynamic";

/*
 * Read-only JSON-RPC relay for the app. Some networks intercept the chain's
 * public RPC host, so the browser reads through this server instead. Only
 * read methods pass; transactions always go through the user's own wallet.
 */
const ALLOWED = new Set(["eth_call", "eth_getTransactionReceipt", "eth_blockNumber", "eth_getLogs", "eth_getBalance", "eth_chainId", "eth_getCode"]);
const MAX_CALLS = 20;
const MAX_LOG_SPAN = 20_000;

type Call = { jsonrpc?: string; id?: number; method: string; params?: unknown[] };

export async function POST(request: Request) {
  let body: Call | Call[];
  try {
    body = (await request.json()) as Call | Call[];
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > MAX_CALLS) return NextResponse.json({ error: "Too many calls." }, { status: 400 });
  for (const c of calls) {
    if (!ALLOWED.has(c.method)) return NextResponse.json({ error: `Method not allowed: ${c.method}` }, { status: 400 });
    if (c.method === "eth_getLogs") {
      const filter = (c.params?.[0] ?? {}) as { fromBlock?: string; toBlock?: string };
      const from = filter.fromBlock?.startsWith("0x") ? Number(BigInt(filter.fromBlock)) : null;
      const to = filter.toBlock?.startsWith("0x") ? Number(BigInt(filter.toBlock)) : null;
      if (from === null) return NextResponse.json({ error: "eth_getLogs needs a numeric fromBlock." }, { status: 400 });
      if (to !== null && to - from > MAX_LOG_SPAN) return NextResponse.json({ error: "Log range too wide." }, { status: 400 });
    }
  }
  try {
    const results = await batch(calls.map((c) => ({ method: c.method, params: c.params ?? [] })));
    const out = calls.map((c, i) => ({ jsonrpc: "2.0", id: c.id ?? i, result: results[i] }));
    return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The chain could not be reached." }, { status: 502 });
  }
}
