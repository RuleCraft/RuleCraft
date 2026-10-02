import { BRAND } from "@/config/brand";

/*
 * The owner's mark: an orange pixel "R" (#d75732), trimmed to its artwork.
 * Source files live outside the repo in ../referensi/_assets/ (owner_logo.png,
 * owner_logo.jpg, owner_banner.jpg). To swap it, replace public/brand/mark-trim.webp
 * (UI), public/brand/mark.webp (square), public/brand/logo-tile.webp and regenerate
 * src/app/{favicon.ico,icon.png,apple-icon.png,opengraph-image.jpg,twitter-image.jpg}.
 */
const RATIO = 377 / 482; // width / height of the trimmed artwork

export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/mark-trim.webp"
      alt=""
      aria-hidden="true"
      width={Math.round(size * RATIO)}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ width: Math.round(size * RATIO), height: size }}
    />
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark size={Math.round(size * 0.86)} />
      <span className="font-display text-[21px] font-semibold tracking-[-0.02em] text-ink">{BRAND.name}</span>
    </span>
  );
}
