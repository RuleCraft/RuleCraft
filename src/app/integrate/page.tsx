import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHead } from "@/components/ui/Page";

export const metadata: Metadata = {
  title: "Build with Rule Craft",
  description: "Tracks for hook authors, launchpads and tool builders, with the evidence each one asks for.",
};

type Track = { id: string; title: string; who: string; live: boolean; body: string; evidence: string[]; link?: { href: string; label: string } };

const TRACKS: Track[] = [
  {
    id: "module",
    title: "Publish a module",
    who: "Hook authors",
    live: false,
    body: "Add a new rule type that any pool can compose. Modules run inside the root hook, so they must declare their callbacks and keep their own state per pool.",
    evidence: ["Source with a permissive licence and a pinned compiler version", "The callbacks it needs and why each one", "Parameter bounds and the worst-case take per trade", "Tests covering every bound and the interaction with each core module", "An independent review before it can be selected for launch"],
  },
  {
    id: "blueprint",
    title: "Publish a blueprint",
    who: "Crafters",
    live: false,
    body: "Package existing modules with tuned parameters and a royalty. No code: the composer produces the spec and the registry stores it.",
    evidence: ["A name and a one-line purpose", "The spec exported from the composer", "Royalty within the published range", "A wallet that will receive royalties"],
    link: { href: "/builder", label: "Open the composer" },
  },
  {
    id: "launchpad",
    title: "Embed launches",
    who: "Launchpads and front-ends",
    live: false,
    body: "Let your users open a token with a Rule Craft rule set from your own interface, with the rules shown before they sign.",
    evidence: ["Which blueprints or modules you expose", "How your interface shows the rule summary and risk grade", "The address that receives any front-end fee"],
  },
  {
    id: "read",
    title: "Read-only API",
    who: "Analysts and indexers",
    live: true,
    body: "Pool and chain reads that need no key. Responses fail with HTTP 503 rather than returning made-up or empty data.",
    evidence: ["Nothing; these endpoints are open"],
    link: { href: "/agents", label: "See the endpoints" },
  },
  {
    id: "scan",
    title: "Hook scanner",
    who: "Anyone",
    live: true,
    body: "Decode any v4 hook address into its permissions and a risk read, and see which recent pools use it.",
    evidence: ["A hook address on Robinhood Chain"],
    link: { href: "/scan", label: "Open the scanner" },
  },
  {
    id: "agents",
    title: "Agent access",
    who: "Autonomous agents",
    live: false,
    body: "A signed manifest of contract addresses and call encodings so an agent can quote, launch and claim without scraping pages. Published with the contracts.",
    evidence: ["Deployed addresses (none yet)", "A versioned manifest with a checksum"],
    link: { href: "/agents", label: "What is live for agents" },
  },
];

export default function IntegratePage() {
  return (
    <>
      <PageHead
        eyebrow="Build with us"
        title={
          <>
            Pick a track, <span className="italic text-signal">bring the evidence</span>
          </>
        }
        lead="Every track says up front what it needs. Read-only tools are open today; anything that writes to the chain opens with the contracts."
      />
      <section className="wrap py-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {TRACKS.map((t) => (
            <article key={t.id} id={t.id} className="tick flex flex-col border border-line bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="label">{t.who}</p>
                {t.live ? <Badge tone="pass">Live</Badge> : <Badge tone="warn">Opens at launch</Badge>}
              </div>
              <h2 className="mt-2 font-display text-[26px] leading-tight">{t.title}</h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">{t.body}</p>
              <p className="label mt-5">Evidence</p>
              <ul className="grid-cols-1 mt-2 grid gap-1.5 text-[14px] text-ink-2">
                {t.evidence.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span className="mt-[9px] size-1.5 shrink-0 bg-signal" />
                    {e}
                  </li>
                ))}
              </ul>
              {t.link ? (
                <Link href={t.link.href} className="btn btn-sm btn-line mt-6 self-start">
                  {t.link.label}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
