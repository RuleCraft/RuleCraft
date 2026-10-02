/* Content blocks shared by docs, learn and updates. Rendered by components/docs/Blocks.tsx. */

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "code"; text: string; lang?: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "note"; tone?: "info" | "warn"; text: string };

export type DocSection = "Overview" | "Concepts" | "Guides" | "Reference" | "Security";

export type DocPage = {
  slug: string;
  title: string;
  section: DocSection;
  summary: string;
  body: Block[];
};

export const p = (text: string): Block => ({ t: "p", text });
export const h2 = (text: string): Block => ({ t: "h2", text });
export const h3 = (text: string): Block => ({ t: "h3", text });
export const ul = (...items: string[]): Block => ({ t: "ul", items });
export const ol = (...items: string[]): Block => ({ t: "ol", items });
export const code = (text: string, lang?: string): Block => ({ t: "code", text, lang });
export const table = (head: string[], rows: string[][]): Block => ({ t: "table", head, rows });
export const note = (text: string, tone: "info" | "warn" = "info"): Block => ({ t: "note", tone, text });
