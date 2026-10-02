import Link from "next/link";
import { DOCS, DOC_SECTIONS, docHref } from "@/content/docs";

function List({ current }: { current: string }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {DOC_SECTIONS.map((section) => (
        <div key={section}>
          <p className="label">{section}</p>
          <ul className="grid-cols-1 mt-2 grid gap-0.5 border-l border-line">
            {DOCS.filter((d) => d.section === section).map((d) => {
              const on = d.slug === current;
              return (
                <li key={d.slug}>
                  <Link
                    href={docHref(d.slug)}
                    aria-current={on ? "page" : undefined}
                    className={`-ml-px block border-l-2 py-1 pl-3 text-[14px] leading-[1.4] ${on ? "border-signal font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
                  >
                    {d.slug === "" ? "Introduction" : d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Sidebar on large screens, a collapsible menu on small ones. */
export function DocsNav({ current }: { current: string }) {
  const page = DOCS.find((d) => d.slug === current);
  return (
    <>
      <details className="card mb-6 lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[14.5px]">
          <span className="min-w-0 truncate">
            <span className="label mr-2">Docs</span>
            {page ? (page.slug === "" ? "Introduction" : page.title) : "Menu"}
          </span>
          <span className="font-mono text-[12px] text-ink-3">Menu</span>
        </summary>
        <div className="border-t border-line px-4 py-4">
          <List current={current} />
        </div>
      </details>
      <aside className="sticky top-[88px] hidden max-h-[calc(100vh-110px)] overflow-y-auto pr-2 lg:block">
        <List current={current} />
      </aside>
    </>
  );
}
