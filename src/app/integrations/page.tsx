import type { Metadata } from "next";
import Link from "next/link";
import { CHAIN, UNISWAP_V4, explorerAddress } from "@/config/brand";
import { batch } from "@/lib/chain-server";
import { Badge, PageHead, SectionTitle } from "@/components/ui/Page";
import { AddressJump } from "@/components/info/AddressJump";
import { ArrowUpRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Integrations",
  description: "What Rule Craft is built on today and the kinds of integrations planned after launch.",
};

const PLANNED = [
  { title: "Wallet routers", body: "Swap routers and aggregators that quote through hooked pools, so the rules apply wherever a trade starts." },
  { title: "Launchpads", body: "Launch front-ends that hand their pool to a Rule Craft blueprint instead of shipping their own hook." },
  { title: "Analytics", body: "Dashboards and indexers that read rule sets, royalties and pot history from the registries." },
  { title: "Arbitrage research", body: "Teams studying how much price-gap value a pool can keep for its LPs; feeds the planned Arb Recapture module." },
];

async function poolManagerCode() {
  try {
    const [code] = (await batch([{ method: "eth_getCode", params: [UNISWAP_V4.poolManager, "latest"] }])) as (string | null)[];
    return code ? (code.length - 2) / 2 : null;
  } catch {
    return null;
  }
}

export default async function IntegrationsPage() {
  const size = await poolManagerCode();
  return (
    <>
      <PageHead
        eyebrow="Integrations"
        title={
          <>
            Built for <span className="italic text-signal">Uniswap v4</span>
          </>
        }
        lead={`Rule Craft does not run its own exchange. Every pool it opens lives in the Uniswap v4 PoolManager on ${CHAIN.name}; Rule Craft supplies the hook and the rules.`}
      />

      <section className="wrap py-12">
        <SectionTitle eyebrow="Live today" title="What we read from" />
        <div className="grid-cols-1 mt-8 grid gap-4 md:grid-cols-2">
          <div className="tick border border-line bg-card p-6" data-integration="v4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-[24px]">Uniswap v4 PoolManager</h3>
              <Badge tone={size ? "pass" : "danger"}>{size ? "Verified on chain" : "Read failed"}</Badge>
            </div>
            <p className="mt-3 text-[15px] text-ink-2">The singleton that holds every v4 pool on the chain. The pool list and the hook scanner read its Initialize events.</p>
            <a href={explorerAddress(UNISWAP_V4.poolManager)} target="_blank" rel="noreferrer" className="num mt-4 flex items-center gap-1 break-all text-[13px] text-blue">
              {UNISWAP_V4.poolManager} <ArrowUpRight className="size-3 shrink-0" />
            </a>
            <p className="mt-2 font-mono text-[12px] text-ink-3">{size ? `eth_getCode: ${size.toLocaleString("en-US")} bytes, read just now` : "eth_getCode could not be read right now"}</p>
          </div>
          <div className="tick border border-line bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-[24px]">{CHAIN.name}</h3>
              <Badge tone="pass">Live</Badge>
            </div>
            <p className="mt-3 text-[15px] text-ink-2">Chain {CHAIN.id}. Reads go through this site&apos;s read-only relay; transactions are always sent by your own wallet.</p>
            <Link href="/status" className="btn btn-sm btn-line mt-4">
              Live chain status
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-card">
        <div className="wrap py-12">
          <SectionTitle eyebrow="Planned" title="Kinds of integrations we are designing for" lead="No partner is named here because none is signed. When one goes live it will be listed with its contract address and the date it was checked." />
          <div className="grid-cols-1 mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANNED.map((p) => (
              <div key={p.title} className="border border-line bg-paper p-5">
                <Badge>Planned</Badge>
                <h3 className="mt-3 text-[17px] font-semibold">{p.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-ink-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-12" id="submit">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionTitle eyebrow="Submit a hook" title="Have a hook of your own?" lead="Paste its address. The scanner decodes its permissions and shows where it is used. Listing it in the marketplace needs a review, and the review queue opens at launch." />
          </div>
          <div className="card p-6">
            <AddressJump base="/scan" placeholder="0x… hook address" cta="Scan hook" />
            <button type="button" disabled className="btn btn-signal mt-4 w-full">
              Request review · Opens at launch
            </button>
            <p className="mt-3 text-[13px] text-ink-3">
              Building something bigger? See the{" "}
              <Link href="/integrate" className="text-blue underline underline-offset-2">
                partner tracks
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
