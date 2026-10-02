import { NextResponse } from "next/server";
import { readChainFacts } from "@/lib/chain-server";

export const dynamic = "force-dynamic";

/** Live chain facts for the status strip. Never cached: a failed read says so. */
export async function GET() {
  const facts = await readChainFacts();
  return NextResponse.json(facts, { status: facts.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
