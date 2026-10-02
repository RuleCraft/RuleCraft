import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAIN, explorerAddress, isAddress, shortAddress } from "@/config/brand";
import { batch } from "@/lib/chain-server";
import { formatEth } from "@/lib/rpc";
import { Badge, PageHead, Stat } from "@/components/ui/Page";
import { ArrowUpRight } from "@/components/icons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return { title: isAddress(address) ? `Crafter ${shortAddress(address)}` : "Crafter", robots: { index: false } };
}

async function read(address: string) {
  try {
    const [bal, code] = (await batch([
      { method: "eth_getBalance", params: [address, "latest"] },
      { method: "eth_getCode", params: [address, "latest"] },
    ])) as (string | null)[];
    return { ok: true, balance: bal ? formatEth(bal) : null, isContract: code ? code.length > 2 : null };
  } catch {
    return { ok: false, balance: null, isContract: null };
  }
}

export default async function CrafterPage({ params }: Props) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  const chain = await read(address);
  const kind = chain.isContract === null ? "Unknown" : chain.isContract ? "Contract" : "Wallet (EOA)";

  return (
    <>
      <PageHead eyebrow="Crafter profile" title={shortAddress(address, 8, 6)} crumbs={[{ href: "/crafters", label: "Crafters" }, { href: `/crafters/${address}`, label: shortAddress(address) }]}>
        <p className="num break-all text-[14px] text-ink-2">{address}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={chain.ok ? "pass" : "danger"}>{chain.ok ? "Read live" : "Chain read failed"}</Badge>
          <Badge>{kind}</Badge>
          <a href={explorerAddress(address)} target="_blank" rel="noreferrer" className="chip hover:text-ink">
            {CHAIN.explorerName} <ArrowUpRight className="size-3" />
          </a>
        </div>
      </PageHead>
      <section className="wrap py-12">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          <Stat label={`${CHAIN.nativeSymbol} balance`} value={chain.balance ?? "--"} note={chain.ok ? "Live" : "Unavailable"} />
          <Stat label="Launches" value="0" note="Opens at launch" />
          <Stat label="Blueprints" value="0" note="Opens at launch" />
          <Stat label="Reuses" value="0" note="Opens at launch" />
          <Stat label="Royalties" value="--" note="Opens at launch" />
        </div>
        <div className="mt-10 border border-dashed border-line-2 bg-card p-8">
          <p className="font-display text-[22px]">No published rules yet</p>
          <p className="mt-2 max-w-[560px] text-[14.5px] text-ink-2">
            The blueprint and launch registries are not deployed, so no wallet has a history here yet. When they are, this page lists every pool this address opened and every blueprint it published, straight from the chain.
          </p>
          <Link href="/builder" className="btn btn-sm btn-line mt-5">
            Draft a rule set
          </Link>
        </div>
      </section>
    </>
  );
}
