import { BRAND, CHAIN, CONTRACTS, TOKEN, UNISWAP_V4 } from "@/config/brand";
import { MODULES } from "@/config/modules";

export const dynamic = "force-static";

export function GET() {
  const ca = TOKEN.isLive ? BRAND.ca : "not published yet (placeholder in this build)";
  const body = `# ${BRAND.name}

> ${BRAND.tagline} ${BRAND.slogan}
> ${BRAND.description}

Network: ${CHAIN.name}, chain id ${CHAIN.id}. Explorer: ${CHAIN.explorer}
Uniswap v4 PoolManager (read, not owned): ${UNISWAP_V4.poolManager}
${BRAND.symbol} contract: ${ca}
Official site: ${BRAND.url} · X: ${BRAND.x}

## Status
- Live: composer, rule pages, example blueprints, v4 pool list, hook scanner, launch form validation, wallet connect, chain reads.
- Contracts (unaudited, no owner, no upgrades): ${CONTRACTS.map((c) => `${c.name} ${c.address || "(not deployed yet)"}`).join("; ")}.
- Swaps on Rule Craft pools: RuleCraftLauncher.swapExactIn (exact input only); quotes from the Uniswap v4 Quoter ${UNISWAP_V4.quoter}.
- Contract-backed figures read 0 or "--" until the contracts are deployed.
- Example blueprints are written by the team to illustrate rule sets; they have no pools and no royalties.

## Rule modules
${MODULES.map((m) => `- ${m.name} (${m.status}): ${m.line} Callbacks: ${m.callbacks.join(", ")}.`).join("\n")}

## Pages
- ${BRAND.url}/builder: compose rules, see hook permissions, fee value and risk grade
- ${BRAND.url}/rules: modules and example blueprints
- ${BRAND.url}/app: recent Uniswap v4 pools on ${CHAIN.name}
- ${BRAND.url}/scan: decode any hook address
- ${BRAND.url}/launch: launch form (one launch transaction once deployed)
- ${BRAND.url}/pool/<poolId>: a pool's rules read from the hook, plus a swap box for Rule Craft pools
- ${BRAND.url}/existing: rules for a token that already trades (draft only; planned, v1 launches new tokens only)
- ${BRAND.url}/docs: concepts, guides, reference
- ${BRAND.url}/token, /security, /status, /methodology

## Open JSON endpoints (no key)
- GET /api/chain: chain id, block, gas, PoolManager bytecode check
- GET /api/pools: recent v4 pools with decoded hook flags
- GET /api/token?address=0x...: ERC-20 metadata
- POST /api/rpc: read-only JSON-RPC relay (eth_call, eth_getCode, eth_getBalance, eth_getLogs <= 20000 blocks, eth_blockNumber, eth_chainId, eth_getTransactionReceipt, eth_estimateGas, eth_gasPrice)
Failed reads return HTTP 503, never invented data.

## Safety
- Identify tokens by address plus chain, never by ticker.
- Read a pool's hook flags before quoting; delta flags can change amounts.
- Never request seed phrases or private keys.
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
