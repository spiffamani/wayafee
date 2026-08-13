"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/Brand";
import { ConnectWallet } from "@/components/ConnectWallet";

export function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const nav = [
    { href: "/", label: "Home" },
    { href: "/mint", label: "Mint" },
    { href: "/split", label: "Split" },
  ];

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-md ${
        home ? "header-home" : "border-line bg-bg/90"
      }`}
    >
      <div className="page-inner flex h-14 items-center justify-between gap-3 sm:h-16">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-display text-lg font-extrabold tracking-tight sm:text-xl"
          >
            <BrandMark />
            waya<span className="text-flare">fee</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
            {nav.map((n) => {
              const on = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-full px-3.5 py-2 transition-colors ${
                    on
                      ? home
                        ? "bg-white/10 text-cream"
                        : "bg-surface text-ink"
                      : home
                        ? "text-cream/70 hover:text-cream"
                        : "text-muted hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <ConnectWallet />
      </div>
    </header>
  );
}
