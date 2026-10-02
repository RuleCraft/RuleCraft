"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_MAIN, NAV_MORE } from "@/config/nav";
import { Wordmark } from "@/components/Logo";
import { NavCaPill } from "@/components/CopyCa";
import { NavWallet } from "@/components/wallet/WalletButton";
import { ChevronDownIcon, CloseIcon, MenuIcon } from "@/components/icons";

export function SiteHeader() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenu(false);
    setMore(false);
  }, [pathname]);

  useEffect(() => {
    if (!more) return;
    const onDown = (e: PointerEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMore(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [more]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <header className="sticky top-0 z-50 border-b border-ink bg-paper">
      <div className="wrap flex h-16 items-center gap-3">
        <Link href="/" aria-label="Rule Craft home" className="shrink-0">
          <Wordmark size={30} />
        </Link>

        <nav className="ml-4 hidden items-center lg:flex" aria-label="Main">
          {NAV_MAIN.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-3 py-2 text-[14.5px] transition-colors ${active(l.href) ? "text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              {l.label}
              {active(l.href) ? <span className="absolute inset-x-3 -bottom-[13px] h-[3px] bg-signal" /> : null}
            </Link>
          ))}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              aria-expanded={more}
              onClick={() => setMore((v) => !v)}
              className="flex items-center gap-1 px-3 py-2 text-[14.5px] text-ink-2 hover:text-ink"
            >
              More <ChevronDownIcon className={`size-3.5 transition-transform ${more ? "rotate-180" : ""}`} />
            </button>
            {more ? (
              <div className="absolute left-0 top-[calc(100%+12px)] z-50 grid w-[720px] animate-pop grid-cols-3 gap-6 border border-ink bg-card p-6 shadow-[6px_6px_0_rgba(25,27,34,0.9)]">
                {NAV_MORE.map((g) => (
                  <div key={g.title}>
                    <p className="label">{g.title}</p>
                    <ul className="grid-cols-1 mt-3 grid gap-1">
                      {g.links.map((l) => (
                        <li key={l.href}>
                          <Link href={l.href} className="block rounded-[3px] px-2 py-1.5 -mx-2 hover:bg-paper">
                            <span className="block text-[14.5px] text-ink">{l.label}</span>
                            {l.note ? <span className="block text-[12.5px] text-ink-3">{l.note}</span> : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <span className="hidden sm:block">
            <NavCaPill />
          </span>
          <NavWallet compact />
          <button
            type="button"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
            className="grid size-9 shrink-0 place-items-center rounded-[4px] border border-line-2 text-ink lg:hidden"
          >
            {menu ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menu ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-ink bg-paper lg:hidden" data-mobile-menu>
          <div className="wrap py-6">
            <ul className="grid grid-cols-1 gap-1">
              {NAV_MAIN.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex items-center justify-between border-b border-line py-3 font-display text-[24px]">
                    {l.label}
                    {active(l.href) ? <span className="size-2 bg-signal" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="grid-cols-1 mt-8 grid gap-8 sm:grid-cols-3">
              {NAV_MORE.map((g) => (
                <div key={g.title}>
                  <p className="label">{g.title}</p>
                  <ul className="grid-cols-1 mt-2 grid gap-0.5">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="block py-1.5 text-[15.5px] text-ink-2 hover:text-ink">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
