export type NavLink = { href: string; label: string; note?: string };

/** Top navigation. Grouped menus open from the header; the same lists feed the footer. */
export const NAV_MAIN: NavLink[] = [
  { href: "/builder", label: "Composer" },
  { href: "/rules", label: "Rules" },
  { href: "/app", label: "Pools" },
  { href: "/scan", label: "Scan" },
  { href: "/launch", label: "Launch" },
];

export const NAV_MORE: { title: string; links: NavLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/builder", label: "Composer", note: "Pick rules, see the hook it needs" },
      { href: "/rules", label: "Rules & blueprints", note: "Modules and example rule sets" },
      { href: "/launch", label: "Launch a token", note: "Five steps, validated before deploy" },
      { href: "/existing", label: "Existing token", note: "Rules for a token that already trades" },
      { href: "/app", label: "Live v4 pools", note: "Read from the PoolManager" },
      { href: "/scan", label: "Hook scanner", note: "Decode any hook address" },
      { href: "/portfolio", label: "Portfolio", note: "Your wallet and claims" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/crafters", label: "Crafters", note: "People who publish rules" },
      { href: "/token", label: "$RULECRAFT", note: "Token and fee flow" },
      { href: "/integrations", label: "Integrations", note: "What it connects to" },
      { href: "/integrate", label: "Build with us", note: "Tracks for hook authors" },
      { href: "/agents", label: "For agents", note: "Machine-readable entry points" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/docs", label: "Docs", note: "Concepts, guides, reference" },
      { href: "/learn", label: "Learn", note: "Plain-language explainers" },
      { href: "/updates", label: "Updates", note: "What shipped and what is next" },
      { href: "/methodology", label: "Methodology", note: "Where every number comes from" },
    ],
  },
];

export const NAV_LEGAL: NavLink[] = [
  { href: "/security", label: "Security" },
  { href: "/status", label: "Status" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
