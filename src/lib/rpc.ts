/**
 * Browser-side chain reads, relayed through this app's server (/api/rpc).
 * Transactions never pass here: the wallet sends those itself.
 */
export async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const body = (await response.json()) as { result?: T; error?: string };
  if (!response.ok || body.error) throw new Error(body.error ?? `RPC ${response.status}`);
  return body.result as T;
}

/** Formats a hex wei amount as ETH with a few significant decimals. */
export function formatEth(hexWei: string, digits = 4) {
  const wei = BigInt(hexWei);
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, digits);
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

/** Polls for a receipt; resolves true on success, false on revert. */
export async function waitForReceipt(hash: string, timeoutMs = 120_000): Promise<{ ok: boolean; block: number }> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const receipt = await rpc<{ status: string; blockNumber: string } | null>("eth_getTransactionReceipt", [hash]).catch(() => null);
    if (receipt) return { ok: receipt.status === "0x1", block: Number(BigInt(receipt.blockNumber)) };
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("The transaction is taking longer than expected. Check it in the explorer.");
}

/** Formats a raw integer amount with the token's decimals. */
export function formatUnits(raw: bigint, decimals: number, digits = 2) {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").slice(0, digits);
  const trimmed = fraction.replace(/0+$/, "");
  const wholeText = whole.toLocaleString("en-US");
  return trimmed ? `${wholeText}.${trimmed}` : wholeText;
}

/** ERC-20 balance of `owner`, read through the relay. */
export async function erc20Balance(token: string, owner: string): Promise<bigint> {
  const data = "0x70a08231" + owner.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const hex = await rpc<string>("eth_call", [{ to: token, data }, "latest"]);
  return hex && hex !== "0x" ? BigInt(hex) : 0n;
}
