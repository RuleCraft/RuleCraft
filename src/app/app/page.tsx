import type { Metadata } from "next";
import { Suspense } from "react";
import { CHAIN, UNISWAP_V4, explorerAddress, shortAddress } from "@/config/brand";
import { readPoolIndex } from "@/lib/chain-server";
import { ZERO_ADDRESS } from "@/lib/hooks";
import { PageHead, Stat } from "@/components/ui/Page";
import { PoolExplorer } from "@/components/pools/PoolExplorer";
import { RuleCraftPools } from "@/components/onchain/RuleCraftPools";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live v4 pools",
  description: "Recent Uniswap v4 pools on Robinhood Chain, read from the PoolManager, with every hook's permission bits decoded.",
};

async function Index() {
  const index = await readPoolIndex();
  if (!index.ok || index.toBlock === null) {
    return (
      <div className="card p-8 text-center" data-pools-unavailable>
        <p className="font-display text-[24px] text-ink">The pool index could not be read right now.</p>
        <p className="mx-auto mt-2 max-w-[520px] text-[14.5px] text-ink-2">
          The site reads PoolManager events straight from {CHAIN.name}. When the RPC does not answer, it shows nothing rather than stale or invented rows. Try again in a minute.
        </p>
      </div>
    );
  }
  const hooked = index.pools.filter((p) => p.hooks !== ZERO_ADDRESS);
  const hooks = new Set(hooked.map((p) => p.hooks.toLowerCase()));
  const dyn = index.pools.filter((p) => p.dynamic).length;
  return (
    <>
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
        <Stat label="Pools opened" value={index.pools.length} note={`blocks ${index.fromBlock?.toLocaleString("en-US")}–${index.toBlock.toLocaleString("en-US")}`} />
        <Stat label="With a hook" value={hooked.length} note={`${index.pools.length ? Math.round((hooked.length / index.pools.length) * 100) : 0}% of new pools`} />
        <Stat label="Distinct hooks" value={hooks.size} />
        <Stat label="Dynamic fee" value={dyn} note="hook sets the fee per swap" />
      </div>
      <PoolExplorer pools={index.pools} toBlock={index.toBlock} />
      <p className="mt-4 font-mono text-[11.5px] text-ink-3">Read {new Date(index.readAt).toUTCString()} · refreshed at most every two minutes</p>
    </>
  );
}

export default function PoolsPage() {
  return (
    <>
      <PageHead
        eyebrow={`Live · ${CHAIN.name}`}
        title="Every new v4 pool, rules first"
        lead={
          <>
            Read straight from the Uniswap v4 PoolManager at{" "}
            <a href={explorerAddress(UNISWAP_V4.poolManager)} target="_blank" rel="noreferrer" className="font-mono text-[15px] text-blue underline underline-offset-4">
              {shortAddress(UNISWAP_V4.poolManager)}
            </a>
            . Each row is a pool opened in roughly the last eight hours, with its hook decoded from the address bits. Rule Craft pools are listed first.
          </>
        }
      />
      <section className="wrap pt-10">
        <h2 className="h-display text-[30px]">Rule Craft pools</h2>
        <p className="mt-2 max-w-[640px] text-[15px] text-ink-2">Launched through the Rule Craft launcher; read straight from the contract. Unaudited.</p>
        <div className="mt-5">
          <RuleCraftPools />
        </div>
        <h2 className="h-display mt-12 text-[30px]">All new v4 pools</h2>
      </section>
      <section className="wrap py-6">
        <Suspense
          fallback={
            <div className="card grid place-items-center p-12" data-pools-loading>
              <p className="font-mono text-[13px] text-ink-3">
                <span className="mr-2 inline-block size-2 animate-blink bg-signal" />
                Reading PoolManager events…
              </p>
            </div>
          }
        >
          <Index />
        </Suspense>
      </section>
    </>
  );
}
