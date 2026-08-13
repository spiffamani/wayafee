"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/mint",
    label: "Mint",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/split",
    label: "Split",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="6.5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8.7v3.2L7.8 15.2M12 11.9l4.2 3.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav md:hidden" aria-label="Primary">
      {items.map((item) => {
        const on = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} data-on={on}>
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
