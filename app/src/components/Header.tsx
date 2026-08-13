"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/Brand";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WalletBalances } from "@/components/WalletBalances";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/mint", label: "Mint" },
  { href: "/split", label: "Split" },
];

function linkClass(on: boolean, home: boolean, block = false) {
  const base = block
    ? "block rounded-xl px-4 py-3 text-sm font-bold"
    : "rounded-full px-3.5 py-2 text-sm font-bold";
  if (on) return `${base} bg-flare text-white`;
  if (home) return `${base} text-cream/80 hover:bg-white/10 hover:text-cream`;
  return `${base} text-muted hover:bg-surface hover:text-ink`;
}

export function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-md ${
        home ? "header-home" : "border-line bg-bg/90"
      }`}
    >
      <div ref={menuRef} className="page-inner">
        <div className="flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-3">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-1.5 font-display text-base font-extrabold tracking-tight sm:gap-2 sm:text-xl"
          >
            <BrandMark className="h-5 w-6 sm:h-[22px] sm:w-7" />
            <span>
              waya<span className="text-flare">fee</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((n) => {
              const on = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={linkClass(on, home)}>
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            <WalletBalances dark={home} />
            <ConnectWallet />
            <button
              type="button"
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full md:hidden ${
                home ? "text-cream hover:bg-white/10" : "text-ink hover:bg-surface"
              }`}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" className="flex flex-col gap-1 pb-3 md:hidden" aria-label="Mobile">
            {NAV.map((n) => {
              const on = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={linkClass(on, home, true)}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
