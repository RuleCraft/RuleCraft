type P = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const ArrowRight = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <path d="M3.5 8h9M8.5 4l4 4-4 4" />
  </svg>
);
export const ArrowUpRight = ({ className = "size-3.5" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <path d="M5 11l6-6M6 5h5v5" />
  </svg>
);
export const CheckIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);
export const ChevronDownIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);
export const ChevronLeftIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <path d="M10 4L6 8l4 4" />
  </svg>
);
export const CloseIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
export const CopyIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5v-.5a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h.5" />
  </svg>
);
export const LogOutIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <path d="M6 13.5H3.5a1 1 0 01-1-1v-9a1 1 0 011-1H6M10.5 11l3-3-3-3M13.5 8H6" />
  </svg>
);
export const WalletIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <rect x="2" y="4" width="12" height="9" rx="1.8" />
    <path d="M2 6.5h12M10.5 9.5h1.5" />
  </svg>
);
export const AlertIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3.5M8 11h.01" />
  </svg>
);
export const MenuIcon = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <path d="M3 6.5h14M3 13.5h14" />
  </svg>
);
export const InfoIcon = ({ className = "size-3.5" }: P) => (
  <svg viewBox="0 0 16 16" className={className} {...base}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M8 7.2v3.6M8 5.2h.01" />
  </svg>
);
export const XIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
export const GithubIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 007.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 015.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

/* App sidebar glyphs */
export const NotesGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <rect x="3" y="3" width="14" height="14" rx="3" />
    <path d="M6 12.5l2.6-3 2 1.8 3.4-4M5 14.5h10" />
  </svg>
);
export const PortfolioGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <path d="M4 16V9M8 16V5M12 16v-6M16 16V7" />
  </svg>
);
export const BackstopGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <path d="M3.5 6.5h13v9a1 1 0 01-1 1h-11a1 1 0 01-1-1zM2.5 3.5h15v3h-15zM8 10h4" />
  </svg>
);
export const StakeGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <ellipse cx="10" cy="5" rx="6" ry="2.2" />
    <path d="M4 5v5c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5M4 10v5c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-5" />
  </svg>
);
export const BondGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
    <path d="M6 8.5h5M6 11.5h8" />
  </svg>
);
export const BuybackGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <path d="M3 4c0 6 4 10 11 11M14 15l-2.5-2.5M14 15l-2.5 2.5" />
  </svg>
);
export const GovernanceGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <path d="M10 3v14M5 17h10M3 6h14M5 6l-2.5 5a2.5 2.5 0 005 0zM15 6l-2.5 5a2.5 2.5 0 005 0z" />
  </svg>
);
export const DocGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <path d="M5 2.5h6.5l3.5 3.5v11.5H5zM11.5 2.5V6H15M7.5 10h5M7.5 13h5" />
  </svg>
);
export const ShieldGlyph = ({ className = "size-[18px]" }: P) => (
  <svg viewBox="0 0 20 20" className={className} {...base}>
    <path d="M10 2.5l6 2.5v4.5c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V5zM7.5 10l2 2 3.5-4" />
  </svg>
);
export const SunIcon = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
