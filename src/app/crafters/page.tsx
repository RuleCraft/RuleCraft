import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Badge, PageHead, SectionTitle } from "@/components/ui/Page";
import { CrafterCard } from "@/components/info/CrafterCard";
import { AddressJump } from "@/components/info/AddressJump";
import { IS_DEPLOYED } from "@/config/deployment";

export const metadata: Metadata = {
  title: "Crafters",
  description: `People and agents who compose pool rules on ${BRAND.name}, publish blueprints and earn royalties when others reuse them.`,
};

const WHAT = [
  { k: "Launches", v: "Pools a wallet opened with a rule set, read from the RuleCraftLauncher." },
  { k: "Blueprints", v: "Rule sets the wallet published for others to reuse, with its royalty terms." },
  { k: "Reuses", v: "How many pools other people opened with those blueprints." },
  { k: "Royalties", v: "Claimable and claimed add-on revenue, per blueprint." },
];

export default function CraftersPage() {
  return (
    <>
      <PageHead
        eyebrow="Crafters"
        title={
          <>
            The people who <span className="italic text-signal">write the rules</span>
          </>
        }
        lead="A crafter is anyone, person or agent, who composes rules for a pool and publishes them as a blueprint. Every profile is a wallet; every number on it comes from the chain."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/builder" className="btn btn-signal">
            Compose a rule set
          </Link>
          <Link href="/docs" className="btn btn-line">
            How profiles work
          </Link>
        </div>
      </PageHead>

      <section className="grid-cols-1 wrap grid gap-8 py-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionTitle eyebrow="Directory" title="Published profiles" />
          <div className="mt-6 border border-dashed border-line-2 bg-card p-8 text-center" data-empty-directory>
            <p className="num text-[40px] leading-none text-ink">0</p>
            <p className="mt-2 font-display text-[22px]">published profiles</p>
            <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] text-ink-2">
              Public profiles are planned. Launches and blueprints are already on chain: open any wallet below to see its counts, and your own launches and royalties are on the portfolio page.
            </p>
            <div className="mt-4 flex justify-center">
              <Badge tone="warn">{IS_DEPLOYED ? "Profiles planned" : "Not deployed yet"}</Badge>
            </div>
          </div>
          <div className="mt-8">
            <p className="label">Look up any wallet</p>
            <div className="mt-3">
              <AddressJump base="/crafters" placeholder="0x… wallet address" cta="Open profile" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 content-start gap-6">
          <CrafterCard />
          <div className="card p-6">
            <p className="label">What a profile shows</p>
            <dl className="grid-cols-1 mt-3 grid gap-3">
              {WHAT.map((w) => (
                <div key={w.k} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <dt className="font-medium">{w.k}</dt>
                  <dd className="text-[14px] text-ink-2">{w.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
