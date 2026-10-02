import { BRAND } from "@/config/brand";

/*
 * The mark: a hook with ruler ticks. Placeholder artwork until the owner's
 * logo arrives. To swap it, replace this SVG (or render <img src="/brand/mark.webp">)
 * and regenerate src/app/{favicon.ico,icon.png,apple-icon.png} and the OG images.
 */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#191b22" />
      <g stroke="#f2eee4" strokeWidth="2.4" strokeLinecap="round">
        <path d="M11 19h7M13 26h5M11 33h7M13 40h5" />
      </g>
      <circle cx="27" cy="12.5" r="4" fill="none" stroke="#df4f1c" strokeWidth="3.5" />
      <path d="M27 17v22a10.5 10.5 0 0 0 21 0v-9" fill="none" stroke="#df4f1c" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 28.5l-6 6.5" fill="none" stroke="#df4f1c" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark size={size} />
      <span className="font-display text-[21px] font-semibold tracking-[-0.02em] text-ink">{BRAND.name}</span>
    </span>
  );
}
