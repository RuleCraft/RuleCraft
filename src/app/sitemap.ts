import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";
import { MODULES } from "@/config/modules";
import { BLUEPRINTS } from "@/config/blueprints";
import { DOCS } from "@/content/docs";
import { LEARN } from "@/content/learn";
import { UPDATES } from "@/content/updates";

const STATIC = [
  "/",
  "/builder",
  "/rules",
  "/app",
  "/scan",
  "/launch",
  "/existing",
  "/token",
  "/crafters",
  "/integrations",
  "/integrate",
  "/agents",
  "/learn",
  "/updates",
  "/methodology",
  "/security",
  "/status",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    ...STATIC,
    ...DOCS.map((d) => (d.slug ? `/docs/${d.slug}` : "/docs")),
    ...LEARN.map((l) => `/learn/${l.slug}`),
    ...UPDATES.map((u) => `/updates/${u.slug}`),
    ...MODULES.map((m) => `/rules/${m.slug}`),
    ...BLUEPRINTS.map((b) => `/blueprints/${b.slug}`),
  ];
  return [...new Set(paths)].map((p) => ({ url: `${BRAND.url}${p === "/" ? "" : p}`, lastModified: now }));
}
