import { NextResponse } from "next/server";
import { isAddress } from "@/config/brand";
import { readErc20 } from "@/lib/chain-server";

export const dynamic = "force-dynamic";

/** ERC-20 metadata for the existing-token form: /api/token?address=0x… */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) return NextResponse.json({ error: "Expected 0x followed by 40 hex characters." }, { status: 400 });
  const meta = await readErc20(address);
  return NextResponse.json(meta, { status: meta.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
