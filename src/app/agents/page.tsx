import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, CHAIN } from "@/config/brand";
import { Badge, PageHead, SectionTitle } from "@/components/ui/Page";

export const metadata: Metadata = {
  title: "For agents",
  description: `How an autonomous agent reads ${BRAND.name}: open JSON endpoints, a plain-text summary and the safety rules to follow.`,
};

const ENDPOINTS = [
  { method: "GET", path: "/api/chain", live: true, body: "Chain id, latest block, gas price, and whether the v4 PoolManager has bytecode. HTTP 503 when the chain cannot be read." },
  { method: "GET", path: "/api/pools", live: true, body: "Recent Uniswap v4 pools from PoolManager Initialize events: currencies, fee, tick spacing, hook address and decoded permission flags. Cached two minutes; failures are not cached." },
  { method: "GET", path: "/api/token?address=0x…", live: true, body: "ERC-20 name, symbol, decimals and total supply for any address, plus whether it has code." },
  { method: "POST", path: "/api/rpc", live: true, body: "Read-only JSON-RPC relay: eth_call, eth_getCode, eth_getBalance, eth_getLogs (≤ 20,000 blocks), eth_blockNumber, eth_chainId, eth_getTransactionReceipt. Up to 20 calls per batch." },
  { method: "GET", path: "/llms.txt", live: true, body: "Plain-text summary of the product, routes, endpoints and contract status." },
  { method: "GET", path: "Signed manifest", live: false, body: "Contract addresses, ABIs and call encodings for quoting, launching and claiming. Published with the contracts." },
];

const RULES = [
  `Identify ${BRAND.symbol} by contract address on chain ${CHAIN.id}, never by ticker. The address is "${BRAND.ca}" in this build, which is a placeholder: no token is published yet.`,
  "Read a pool's rules before quoting. A hook with delta flags can change what the trader pays or receives; the scanner shows which.",
  "Treat example blueprints as examples. They have no pools, no authors on chain and no royalties.",
  "Never ask a user for a seed phrase or private key. Every write goes through the user's own wallet.",
  "If an endpoint returns 503, stop and report it. Do not fill the gap with guesses.",
];

const sample = `curl -s https://${BRAND.domain}/api/pools | jq '.pools[0] | {id, hooks, flags, fee}'

curl -s -X POST https://${BRAND.domain}/api/rpc \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'`;

export default function AgentsPage() {
  return (
    <>
      <PageHead
        eyebrow="For agents"
        title={
          <>
            Readable by <span className="italic text-signal">machines</span>, too
          </>
        }
        lead="Agents should not scrape pages. Everything the site shows from the chain is available as plain JSON, with no key and no account."
      >
        <div className="flex flex-wrap gap-2">
          <a href="/llms.txt" className="btn btn-ink">
            Open llms.txt
          </a>
          <Link href="/integrate" className="btn btn-line">
            Partner tracks
          </Link>
        </div>
      </PageHead>
      <section className="wrap py-12">
        <SectionTitle eyebrow="Endpoints" title="What an agent can call" />
        <div className="grid-cols-1 mt-8 grid gap-3">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="grid grid-cols-1 gap-3 border border-line bg-card p-5 md:grid-cols-[260px_1fr_auto] md:items-start">
              <p className="num break-all text-[14px]">
                <span className="mr-2 text-signal">{e.method}</span>
                {e.path}
              </p>
              <p className="text-[14.5px] leading-[1.55] text-ink-2">{e.body}</p>
              <div>{e.live ? <Badge tone="pass">Live</Badge> : <Badge tone="warn">Opens at launch</Badge>}</div>
            </div>
          ))}
        </div>
        <div className="prose-rc mt-10 max-w-[760px]">
          <h2>Try it</h2>
          <pre>
            <code>{sample}</code>
          </pre>
        </div>
      </section>
      <section className="border-t border-line bg-card">
        <div className="wrap py-12">
          <SectionTitle eyebrow="Safety" title="Rules for agents acting for people" />
          <ol className="grid-cols-1 mt-8 grid gap-3 md:grid-cols-2">
            {RULES.map((r, i) => (
              <li key={i} className="flex gap-4 border border-line bg-paper p-5">
                <span className="num text-[13px] text-signal">{String(i + 1).padStart(2, "0")}</span>
                <span className="break-words text-[14.5px] leading-[1.55] text-ink-2">{r}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
