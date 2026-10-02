import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, CHAIN, CONTRACTS, TOKEN, explorerToken } from "@/config/brand";
import { FEE_MODEL } from "@/config/modules";
import { CaStrip } from "@/components/CopyCa";
import { Badge, PageHead, SectionTitle, Stat } from "@/components/ui/Page";

export const metadata: Metadata = {
  title: `${BRAND.symbol} token`,
  description: `${BRAND.symbol} on ${CHAIN.name}: contract status, what the token is designed to do, and how to add the network.`,
};

const FLOW = [
  {
    step: "01",
    title: "A pool opts into add-ons",
    body: "Snipe Guard, Size-Scaled Fee, Buy Burn, LP Stream, Milestone Pot. The plain LP fee is never touched: liquidity providers keep all of it.",
  },
  {
    step: "02",
    title: "Add-on revenue is split",
    body: `The blueprint author takes their royalty (${FEE_MODEL.royaltyMinPct}–${FEE_MODEL.royaltyMaxPct}% of add-on revenue, chosen at publish). The protocol keeps ${FEE_MODEL.protocolSharePct}% by default, hard-capped at ${FEE_MODEL.protocolShareCapPct}%. Both numbers are frozen per pool at creation.`,
  },
  {
    step: "03",
    title: `Protocol share buys ${BRAND.symbol}`,
    body: `The protocol's share is swapped for ${BRAND.symbol} on its own pool. Part is sent to the dead address, part is streamed to stakers. The split is a governance parameter set before launch.`,
  },
];

export default function TokenPage() {
  const live = TOKEN.isLive;
  return (
    <>
      <PageHead
        eyebrow="Token"
        title={
          <>
            {BRAND.symbol}, <span className="italic text-signal">paid by rules</span>
          </>
        }
        lead={`The token of ${BRAND.name}. Its job is simple: when pools pay for the rules they run, a share of that revenue comes back to ${BRAND.symbol}. Nothing here is live until the contract is published.`}
      >
        <div className="max-w-[640px]">
          <CaStrip />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {live ? (
            <a href={explorerToken(BRAND.ca)} target="_blank" rel="noreferrer" className="btn btn-sm btn-line">
              View on {CHAIN.explorerName}
            </a>
          ) : (
            <Badge tone="warn">Contract published at launch</Badge>
          )}
          <Badge>{CHAIN.name} · chain {CHAIN.id}</Badge>
        </div>
      </PageHead>

      <section className="wrap py-12">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-6">
          <Stat label="Total supply" value="--" note="Opens at launch" />
          <Stat label="Market" value="--" note="No pool yet" />
          <Stat label="Burned" value="0" note="Opens at launch" />
          <Stat label="Staked" value="0" note="Opens at launch" />
        </div>
        <p className="mt-6 max-w-[720px] text-[14px] text-ink-3">
          These figures will be read from the chain once the token exists. Until then they stay empty on purpose: this site does not show numbers it cannot prove.
        </p>
      </section>

      <section className="border-y border-line bg-card">
        <div className="wrap py-14">
          <SectionTitle
            eyebrow="Value flow"
            title="Where the token's revenue comes from"
            lead="Design, not live. These are the parameters the contracts are being written against; they can change before deployment and the docs will say so."
            right={<Badge tone="blue">Design</Badge>}
          />
          <ol className="grid-cols-1 mt-10 grid gap-4 md:grid-cols-3">
            {FLOW.map((f) => (
              <li key={f.step} className="tick border border-line bg-paper p-6">
                <p className="num text-[13px] text-signal">{f.step}</p>
                <h3 className="mt-2 font-display text-[22px] leading-tight">{f.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">{f.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-[760px] text-[14.5px] text-ink-2">
            A pool that opts into nothing beyond its base fee pays the protocol nothing. The take is bounded per trade by the composer&apos;s {FEE_MODEL.hardCeilingPct}% hard ceiling, and every number is readable before the first swap. See the{" "}
            <Link href="/docs" className="text-blue underline underline-offset-2">
              fee model in the docs
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="wrap py-14">
        <SectionTitle eyebrow="Contracts" title="What gets deployed" lead="Every address below is empty until launch. When one is published it appears here and in the docs at the same time." />
        <div className="mt-8 overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line">
                <th className="label px-4 py-3 font-medium">Contract</th>
                <th className="label px-4 py-3 font-medium">Role</th>
                <th className="label px-4 py-3 font-medium">Address</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="px-4 py-3 font-medium">{BRAND.symbol}</td>
                <td className="px-4 py-3 text-ink-2">ERC-20 token</td>
                <td className="num px-4 py-3 text-ink-3 break-all">{live ? BRAND.ca : "Published at launch"}</td>
              </tr>
              {CONTRACTS.map((c) => (
                <tr key={c.name} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-ink-2">{c.role}</td>
                  <td className="num px-4 py-3 text-ink-3 break-all">{c.address || "Published at launch"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="wrap pb-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="card p-6">
            <p className="label">Add the network</p>
            <h3 className="mt-2 font-display text-[24px]">{CHAIN.name}</h3>
            <dl className="grid-cols-1 mt-4 grid gap-2 text-[14px]">
              {[
                ["Network name", CHAIN.name],
                ["Chain id", `${CHAIN.id} (${CHAIN.hex})`],
                ["Currency", CHAIN.nativeSymbol],
                ["RPC", CHAIN.publicRpc],
                ["Explorer", CHAIN.explorer],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[110px_1fr] gap-3 border-b border-line pb-2 last:border-0">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="num break-all text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13.5px] text-ink-3">Connecting a wallet on this site adds the network for you if it is missing.</p>
          </div>
          <div className="card p-6">
            <p className="label">Before you buy anything</p>
            <h3 className="mt-2 font-display text-[24px]">An address is the identity</h3>
            <ul className="grid-cols-1 mt-4 grid gap-2.5 text-[14.5px] leading-[1.55] text-ink-2">
              <li>A ticker can be copied by anyone. Only the contract address on chain {CHAIN.id} identifies {BRAND.symbol}.</li>
              <li>The address is announced on {BRAND.domain} and {BRAND.xHandle} at the same time, never in a DM.</li>
              <li>
                Until then any token calling itself {BRAND.symbol} is not ours. Read the{" "}
                <Link href="/security" className="text-blue underline underline-offset-2">
                  security page
                </Link>
                .
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
