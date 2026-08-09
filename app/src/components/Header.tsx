"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { coston2 } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        className="btn-primary text-sm"
        disabled={isPending}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== coston2.id) {
    return (
      <button
        className="btn-primary text-sm bg-amber-600"
        disabled={switching}
        onClick={() => switchChain({ chainId: coston2.id })}
      >
        {switching ? "Switching…" : "Switch to Coston2"}
      </button>
    );
  }

  return (
    <button className="btn-ghost text-sm mono" onClick={() => disconnect()} title="Disconnect">
      {shortAddr(address!)}
    </button>
  );
}

export function Header() {
  const pathname = usePathname();
  const nav = [
    { href: "/", label: "Home" },
    { href: "/mint", label: "Mint FXRP" },
    { href: "/split", label: "SplitRemit" },
  ];
  return (
    <header className="border-b border-line/80 sticky top-0 z-20 backdrop-blur bg-ink/80">
      <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-lg tracking-tight">
            waya<span className="text-flare">fee</span>
          </Link>
          <nav className="flex gap-1 text-sm">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === n.href
                    ? "bg-panel-2 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs px-2 py-1 rounded-full border border-line text-gray-400">
            Coston2 testnet
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
