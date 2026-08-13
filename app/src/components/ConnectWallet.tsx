"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import type { Connector } from "wagmi";
import { coston2 } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

const CATALOG: {
  name: string;
  install: string;
  keys: string[];
}[] = [
  { name: "MetaMask", install: "https://metamask.io/download/", keys: ["metamask"] },
  { name: "SafePal", install: "https://www.safepal.com/download", keys: ["safepal"] },
  { name: "Rabby", install: "https://rabby.io", keys: ["rabby"] },
  { name: "Coinbase Wallet", install: "https://www.coinbase.com/wallet", keys: ["coinbase"] },
  { name: "Trust Wallet", install: "https://trustwallet.com/download", keys: ["trust"] },
  { name: "OKX Wallet", install: "https://www.okx.com/web3", keys: ["okx", "okex"] },
  { name: "Bitget Wallet", install: "https://web3.bitget.com", keys: ["bitget", "bitkeep"] },
  { name: "TokenPocket", install: "https://www.tokenpocket.pro", keys: ["tokenpocket"] },
  { name: "Rainbow", install: "https://rainbow.me/download", keys: ["rainbow"] },
  { name: "Phantom", install: "https://phantom.com/download", keys: ["phantom"] },
  { name: "Brave Wallet", install: "https://brave.com/wallet", keys: ["brave"] },
  { name: "Zerion", install: "https://zerion.io/extension", keys: ["zerion"] },
];

function friendlyError(raw: string) {
  const m = raw.toLowerCase();
  if (m.includes("provider not found")) {
    return "That wallet isn’t available here. Install it, refresh, then connect.";
  }
  if (m.includes("rejected") || m.includes("denied") || m.includes("user rejected")) {
    return "Cancelled in the wallet. Open it and try again.";
  }
  if (m.includes("must has") || m.includes("at least one account")) {
    return "Unlock the wallet and make sure it has an account, then connect.";
  }
  return raw.split("Version:")[0].trim().replace(/\s+/g, " ");
}

function blob(c: Connector) {
  return `${c.id} ${c.name}`.toLowerCase();
}

function matchCatalog(c: Connector) {
  const b = blob(c);
  return CATALOG.find((w) => w.keys.some((k) => b.includes(k)));
}

function pickInstalled(connectors: readonly Connector[], ethereumPresent: boolean) {
  const named = connectors.filter((c) => c.id !== "injected");
  if (named.length > 0) return named;
  if (ethereumPresent) {
    const injected = connectors.find((c) => c.id === "injected");
    return injected ? [injected] : [];
  }
  return [];
}

export function ConnectWallet({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [ethereumPresent, setEthereumPresent] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => {
      setEthereumPresent(Boolean((window as Window & { ethereum?: unknown }).ethereum));
    };
    read();
    const t1 = window.setTimeout(read, 250);
    const t2 = window.setTimeout(read, 1000);
    const t3 = window.setTimeout(read, 2500);
    window.addEventListener("ethereum#initialized", read);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("ethereum#initialized", read);
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const installed = useMemo(
    () => pickInstalled(connectors, ethereumPresent),
    [connectors, ethereumPresent]
  );

  const q = query.trim().toLowerCase();

  const installedRows = installed.filter((c) => {
    const label = matchCatalog(c)?.name ?? (c.name === "Injected" ? "Browser wallet" : c.name);
    return !q || label.toLowerCase().includes(q) || blob(c).includes(q);
  });

  const catalogRows = CATALOG.filter((w) => {
    const already = installed.some((c) => matchCatalog(c)?.name === w.name);
    if (already) return false;
    return !q || w.name.toLowerCase().includes(q);
  });

  const shownError =
    localError ?? (error ? friendlyError(error.message) : null) ??
    (switchError ? friendlyError(switchError.message) : null);

  async function connectOne(connector: Connector) {
    setLocalError(null);
    reset();
    setBusyId(connector.id);
    setBusyName(matchCatalog(connector)?.name ?? connector.name);
    try {
      await connectAsync({ connector, chainId: coston2.id });
      setOpen(false);
    } catch (e) {
      setLocalError(friendlyError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusyId(null);
      setBusyName(null);
    }
  }

  const wide = size === "lg";

  if (isConnected && chainId !== coston2.id) {
    return (
      <div className={wide ? "w-full" : ""}>
        <button
          type="button"
          className={`btn-primary bg-amber ${wide ? "w-full" : "px-4 min-h-10 sm:min-h-12 text-sm"}`}
          disabled={switching}
          onClick={() => switchChain({ chainId: coston2.id })}
        >
          {switching ? "Switching…" : "Switch to Coston2"}
        </button>
        {shownError && <p className="msg-error mt-2 text-left">{shownError}</p>}
      </div>
    );
  }

  if (isConnected) {
    return (
      <button
        type="button"
        className={`btn-ghost mono ${wide ? "w-full" : "px-3 min-h-10 sm:min-h-12 text-sm"}`}
        onClick={() => disconnect()}
        title="Disconnect"
      >
        {shortAddr(address!)}
      </button>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${wide ? "w-full" : ""}`}>
      <button
        type="button"
        className={`btn-primary ${wide ? "w-full" : "px-4 min-h-10 sm:min-h-12 text-sm"}`}
        disabled={isPending || busyId !== null}
        onClick={() => {
          setLocalError(null);
          reset();
          setOpen((v) => !v);
        }}
      >
        {isPending || busyId ? "Connecting…" : wide ? "Connect wallet" : "Connect"}
      </button>

      {open && (
        <div className="wallet-pop">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            Choose a wallet
          </p>
          <input
            ref={searchRef}
            className="input mt-2 mb-2 min-h-10 text-sm"
            placeholder="Search MetaMask, SafePal, Rabby…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {busyName && (
            <p className="msg-warn mb-2">
              Approve in {busyName} — check the popup, or the fox / wallet icon in the Chrome
              toolbar.
            </p>
          )}

          <div className="wallet-list">
            {installedRows.map((c) => {
              const label = matchCatalog(c)?.name ?? (c.name === "Injected" ? "Browser wallet" : c.name);
              return (
                <button
                  key={c.uid}
                  type="button"
                  className="wallet-row"
                  disabled={busyId !== null}
                  onClick={() => void connectOne(c)}
                >
                  <span>{label}</span>
                  <span className="text-xs font-bold text-ledger">
                    {busyId === c.id ? "Waiting…" : "Installed"}
                  </span>
                </button>
              );
            })}

            {catalogRows.map((w) => (
              <a
                key={w.name}
                className="wallet-row"
                href={w.install}
                target="_blank"
                rel="noreferrer"
              >
                <span>{w.name}</span>
                <span className="text-xs font-bold text-muted">Get</span>
              </a>
            ))}

            {installedRows.length === 0 && catalogRows.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted">No wallet matches “{query}”.</p>
            )}
          </div>

          {shownError && <p className="msg-error mt-3">{shownError}</p>}
        </div>
      )}

      {!open && shownError && wide && <p className="msg-error mt-3">{shownError}</p>}
    </div>
  );
}
