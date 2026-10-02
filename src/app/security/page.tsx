import type { Metadata } from "next";
import { BRAND, CHAIN, TOKEN } from "@/config/brand";
import { Badge, PageHead } from "@/components/ui/Page";
import { Prose, Updated } from "@/components/info/Prose";
import { CaStrip } from "@/components/CopyCa";

export const metadata: Metadata = {
  title: "Security",
  description: `Official ${BRAND.name} domain, account, chain and token identity, and how to report a problem.`,
};

const IDENTITY = [
  ["Website", BRAND.domain],
  ["X", BRAND.xHandle],
  ["Chain", `${CHAIN.name} · ${CHAIN.id}`],
  ["Token", TOKEN.isLive ? BRAND.ca : "Not published yet"],
];

export default function SecurityPage() {
  return (
    <>
      <PageHead eyebrow="Security" title="How to know it is really us" lead="Scammers copy names, logos and tickers. They cannot copy a domain, an account or a contract address. Check those three.">
        <Updated date="2 October 2026" />
      </PageHead>
      <section className="wrap pt-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="tick border border-line bg-card p-6">
            <p className="label">Official identity</p>
            <dl className="grid-cols-1 mt-4 grid gap-2 text-[14.5px]">
              {IDENTITY.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[90px_1fr] gap-3 border-b border-line pb-2 last:border-0">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="num break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5">
              <CaStrip />
            </div>
          </div>
          <div className="border-2 border-danger bg-danger-soft p-6">
            <Badge tone="danger">Warning</Badge>
            <p className="mt-3 font-display text-[22px] leading-tight text-ink">There is no {BRAND.symbol} contract yet.</p>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-ink-2">
              Any token using the name before the address appears on this page and on {BRAND.xHandle} is not ours. We never announce an address in a DM, a reply or a group chat first.
            </p>
          </div>
        </div>
      </section>
      <Prose>
        <h2>Verify before you sign</h2>
        <ol>
          <li>Check the address bar reads exactly {BRAND.domain}.</li>
          <li>Check your wallet shows chain {CHAIN.id} and the contract you expect.</li>
          <li>Read the pool&apos;s rules on its pool page or in the scanner before trading.</li>
          <li>We will never ask for a seed phrase, a private key or a &ldquo;validation&rdquo; transaction.</li>
        </ol>
        <h2>What this site can and cannot do</h2>
        <p>
          Connecting a wallet shares your address and nothing else. The site cannot move funds; every transaction is built in the page and signed by you in your wallet, where you see it before it is sent. Chain reads go through a relay that only accepts read methods.
        </p>
        <h2>Contracts</h2>
        <p>
          No Rule Craft contract is deployed. Before launch, the contracts will be published with source on {CHAIN.explorerName}. No independent audit has been completed; when one is, the report will be linked here with its scope and date. Until then, treat every module as unreviewed.
        </p>
        <h2>Reporting a problem</h2>
        <p>
          Found a bug, an impersonator or a vulnerability? Send a direct message to <a href={BRAND.x}>{BRAND.xHandle}</a> with a short description, and do not post exploit details publicly. We reply to every report and credit reporters who want it.
        </p>
      </Prose>
    </>
  );
}
