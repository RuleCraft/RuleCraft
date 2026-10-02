import type { Metadata } from "next";
import { Badge, PageHead } from "@/components/ui/Page";
import { ChainStatus } from "@/components/info/ChainStatus";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Status",
  description: `What is live on ${BRAND.name} today, what is waiting for deployment, and a live read of the chain.`,
};

type Row = { item: string; state: "live" | "design" | "launch"; note: string };

const ROWS: Row[] = [
  { item: "Website", state: "live", note: `${BRAND.domain} serves every page from one build.` },
  { item: "Composer", state: "live", note: "Rule selection, parameters, permission bits, fee value, conflicts and risk grade run in the browser." },
  { item: "Hook scanner", state: "live", note: "Decodes any address and lists recent pools that use it." },
  { item: "v4 pool list", state: "live", note: "Read from PoolManager Initialize events, refreshed every two minutes." },
  { item: "Wallet connect", state: "live", note: "EIP-6963 wallets and optional WalletConnect; adds Robinhood Chain on connect." },
  { item: "Rule Craft contracts", state: "launch", note: "RuleCraftHook, RuleCraftLauncher and BlueprintRegistry are written and tested (unit, fuzz, mainnet fork). Unaudited. Not deployed yet; the owner deploys them from /deploy." },
  { item: "Launch, publish, trade, claim", state: "launch", note: "Wired to the contracts. The buttons say \"Not deployed yet\" until the addresses are set." },
  { item: `${BRAND.symbol} contract`, state: "launch", note: "Not published. Any token using the name is not ours." },
  { item: "Fee model", state: "design", note: "Protocol share (default 10%) and treasury are fixed when the owner deploys the registry." },
];

const TONE = { live: "pass", design: "blue", launch: "warn" } as const;
const LABEL = { live: "Live", design: "Set at deploy", launch: "Not deployed yet" } as const;

export default function StatusPage() {
  return (
    <>
      <PageHead eyebrow="Status" title="What runs today" lead="A dated, hand-kept list of what is live and what is not, plus an automatic read of the chain. This is not uptime telemetry." />
      <section className="grid-cols-1 wrap grid gap-8 py-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-mono text-[12px] text-ink-3">As of 2 October 2026</p>
          <ul className="mt-4 border-t border-line">
            {ROWS.map((r) => (
              <li key={r.item} className="grid grid-cols-1 gap-2 border-b border-line py-4 sm:grid-cols-[180px_1fr_auto] sm:items-start">
                <span className="font-medium">{r.item}</span>
                <span className="text-[14.5px] text-ink-2">{r.note}</span>
                <span>
                  <Badge tone={TONE[r.state]}>{LABEL[r.state]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <ChainStatus compact />
        </div>
      </section>
    </>
  );
}
