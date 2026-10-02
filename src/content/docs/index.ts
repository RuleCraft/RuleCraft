import { CONCEPTS } from "./concepts";
import { GUIDES } from "./guides";
import { OVERVIEW } from "./overview";
import { REFERENCE } from "./reference";
import { SECURITY } from "./security";
import type { DocPage, DocSection } from "./types";

export type { Block, DocPage, DocSection } from "./types";

export const DOC_SECTIONS: DocSection[] = ["Overview", "Concepts", "Guides", "Reference", "Security"];

/** Every docs page in reading order. slug "" is the docs home. */
export const DOCS: DocPage[] = [...OVERVIEW, ...CONCEPTS, ...GUIDES, ...REFERENCE, ...SECURITY];

export function docBySlug(slug: string) {
  return DOCS.find((d) => d.slug === slug) ?? null;
}

export const docHref = (slug: string) => (slug ? `/docs/${slug}` : "/docs");
