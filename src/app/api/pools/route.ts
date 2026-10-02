import { NextResponse } from "next/server";
import { readPoolIndex } from "@/lib/chain-server";

export const dynamic = "force-dynamic";

/**
 * Recent Uniswap v4 pools on Robinhood Chain, read from PoolManager
 * Initialize events, with each hook's permission bits decoded. Returns 503
 * instead of an empty list when the chain cannot be read.
 */
export async function GET() {
  const index = await readPoolIndex();
  return NextResponse.json(index, { status: index.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
