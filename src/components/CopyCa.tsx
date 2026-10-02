"use client";

import { useState } from "react";
import { BRAND, CHAIN, TOKEN, explorerToken, shortAddress } from "@/config/brand";
import { CheckIcon, CopyIcon, GithubIcon, XIcon } from "@/components/icons";

function useCopyCa() {
  const [copied, setCopied] = useState(false);
  const live = TOKEN.isLive;
  const copy = async () => {
    if (!live) return;
    try {
      await navigator.clipboard.writeText(BRAND.ca);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the address stays visible to select by hand.
    }
  };
  return { live, copied, copy };
}

/** Compact navbar pill: ticker plus a copy icon. Calm until the CA is published. */
export function NavCaPill() {
  const { live, copied, copy } = useCopyCa();
  return (
    <button
      type="button"
      onClick={copy}
      data-copy-ca="nav"
      title={live ? `Copy ${BRAND.symbol} contract address` : `${BRAND.symbol} contract is published at launch`}
      aria-label={live ? `Copy ${BRAND.symbol} contract address` : `${BRAND.symbol} contract address, published at launch`}
      className={`flex h-9 shrink-0 items-center gap-2 rounded-[4px] border border-line-2 bg-card px-2.5 text-ink transition-colors hover:border-ink ${live ? "" : "cursor-default"}`}
    >
      <span className="font-mono text-[11px] font-semibold tracking-[0.04em] text-signal">CA</span>
      <span className="hidden font-mono text-[11px] text-ink-2 xl:inline">{live ? shortAddress(BRAND.ca, 4, 4) : "at launch"}</span>
      {copied ? <CheckIcon className="size-3.5 text-pass" /> : <CopyIcon className={`size-3.5 ${live ? "text-ink-2" : "text-ink-3 opacity-60"}`} />}
      {copied ? <span className="font-mono text-[11px] text-pass">Copied</span> : null}
    </button>
  );
}

/** Full address with a copy button, for hero strips and the token page. */
export function CaStrip({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const { live, copied, copy } = useCopyCa();
  const night = tone === "night";
  return (
    <div className={`flex max-w-full items-center gap-3 rounded-[4px] border px-3 py-2.5 ${night ? "border-white/15 bg-white/[0.04]" : "border-line-2 bg-card"}`}>
      <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-signal">{BRAND.symbol}</span>
      <span className={`min-w-0 flex-1 break-all font-mono text-[12.5px] leading-snug ${night ? "text-white/85" : "text-ink"}`} data-ca-text>
        {live ? BRAND.ca : "Contract published at launch"}
      </span>
      <button
        type="button"
        onClick={copy}
        disabled={!live}
        data-copy-ca="strip"
        className={`shrink-0 rounded-[3px] border px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors disabled:opacity-40 ${night ? "border-white/20 text-white/80 hover:text-white" : "border-line-2 text-ink-2 hover:text-ink"}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** Token contract block for the footer (dark ground). Always visible, also on phones. */
export function CaBlock() {
  const { live, copied, copy } = useCopyCa();
  return (
    <div className="w-full max-w-[420px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/55">
        {BRAND.symbol} contract · {CHAIN.name}
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-[4px] border border-white/15 bg-white/[0.04] p-1.5 pl-3.5">
        <span className="min-w-0 flex-1 break-all font-mono text-[12.5px] leading-snug text-white/90" data-ca-text>
          {live ? BRAND.ca : "Published at launch"}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={!live}
          data-copy-ca="footer"
          aria-label="Copy contract address"
          className="flex h-9 items-center gap-1.5 rounded-[3px] bg-signal px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-deep disabled:bg-white/10 disabled:text-white/50"
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copied ? "Copied" : "Copy CA"}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-5 text-[14px] text-white/70">
        {live && (
          <a href={explorerToken(BRAND.ca)} target="_blank" rel="noreferrer" className="hover:text-white">
            Explorer
          </a>
        )}
        <a href={BRAND.x} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white">
          <XIcon className="size-4" /> {BRAND.xHandle}
        </a>
        {BRAND.github && (
          <a href={BRAND.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white">
            <GithubIcon className="size-4" /> GitHub
          </a>
        )}
      </div>
    </div>
  );
}
