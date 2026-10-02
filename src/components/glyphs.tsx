import type { RuleModule } from "@/config/modules";

/* Line glyphs for rule modules. One stroke weight, 24 grid. */
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export function ModuleGlyph({ glyph, className = "size-5" }: { glyph: RuleModule["glyph"]; className?: string }) {
  switch (glyph) {
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={className} {...base}>
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
          <path d="M9 12h6" />
        </svg>
      );
    case "gauge":
      return (
        <svg viewBox="0 0 24 24" className={className} {...base}>
          <path d="M4 17a8 8 0 1 1 16 0" />
          <path d="M12 17l4-6" />
          <path d="M4 17h2M18 17h2M12 9V7" />
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 24 24" className={className} {...base}>
          <path d="M12 21c-3.5 0-6-2.3-6-5.6 0-3.4 3-5.4 3.6-9.4 2.6 1.6 3.4 3.6 3.4 5.4 1-.6 1.7-1.7 2-2.9 1.8 1.6 3 3.8 3 6.4 0 3.6-2.6 6.1-6 6.1z" />
        </svg>
      );
    case "drip":
      return (
        <svg viewBox="0 0 24 24" className={className} {...base}>
          <path d="M12 3s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z" />
          <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" className={className} {...base}>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24" className={className} {...base}>
          <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
        </svg>
      );
    case "loop":
      return (
        <svg viewBox="0 0 24 24" className={className} {...base}>
          <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
          <path d="M20 4v5h-5" />
          <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
          <path d="M4 20v-5h5" />
        </svg>
      );
  }
}
