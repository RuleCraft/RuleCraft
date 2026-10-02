import Link from "next/link";
import { BRAND, CHAIN, UNISWAP_V4, explorerAddress, shortAddress } from "@/config/brand";
import { NAV_LEGAL, NAV_MORE } from "@/config/nav";
import { CaBlock } from "@/components/CopyCa";

export function SiteFooter() {
  return (
    <footer className="graph-night mt-24 bg-night text-white">
      <div className="grid-cols-1 wrap grid gap-12 py-14 lg:grid-cols-[1.1fr_2fr]">
        <div>
          <p className="font-display text-[34px] leading-[1.05] tracking-[-0.02em]">
            {BRAND.slogan.split(". ")[0]}.
            <br />
            <span className="italic text-signal">{BRAND.slogan.split(". ")[1]}</span>
          </p>
          <p className="mt-3 max-w-[380px] text-[14.5px] text-white/65">{BRAND.tagline} Running on {CHAIN.name}.</p>
          <div className="mt-8">
            <CaBlock />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {NAV_MORE.map((g) => (
            <div key={g.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">{g.title}</p>
              <ul className="grid-cols-1 mt-3 grid gap-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[14.5px] text-white/75 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-3 py-5 font-mono text-[11.5px] text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            {CHAIN.name} · chain {CHAIN.id} · v4 PoolManager{" "}
            <a href={explorerAddress(UNISWAP_V4.poolManager)} target="_blank" rel="noreferrer" className="text-white/70 underline-offset-2 hover:underline">
              {shortAddress(UNISWAP_V4.poolManager)}
            </a>
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {NAV_LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>© 2026 {BRAND.name}</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
