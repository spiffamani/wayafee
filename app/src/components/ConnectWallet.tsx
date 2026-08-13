"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import type { Connector } from "wagmi";
import { coston2 } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

const CATALOG: { name: string; install: string; keys: string[] }[] = [
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
    return "That wallet isn’t in this browser yet. Install it, refresh, then search again.";
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

function findConnector(connectors: readonly Connector[], keys: string[]) {
  return connectors.find((c) => keys.some((k) => blob(c).includes(k)));
}

export function ConnectWallet({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyName, setBusyName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const fromCatalog = CATALOG.map((w) => ({
      name: w.name,
      install: w.install,
      connector: findConnector(connectors, w.keys),
    }));
    const extras = connectors
      .filter((c) => c.id !== "injected" && !CATALOG.some((w) => findConnector([c], w.keys)))
      .map((c) => ({ name: c.name, install: "", connector: c }));
    return [...fromCatalog, ...extras].filter((w) => !q || w.name.toLowerCase().includes(q));
  }, [connectors, q]);

  const shownError =
    localError ?? (error ? friendlyError(error.message) : null) ??
    (switchError ? friendlyError(switchError.message) : null);

  async function connectNamed(name: string, connector: Connector | undefined, install: string) {
    setLocalError(null);
    reset();
    const target =
      connector ?? connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (!target) {
      if (install) window.open(install, "_blank", "noopener,noreferrer");
      setLocalError("Install that wallet, refresh this page, then search for it again.");
      return;
    }
    setBusyName(name);
    try {
      await connectAsync({ connector: target, chainId: coston2.id });
      setOpen(false);
    } catch (e) {
      const msg = friendlyError(e instanceof Error ? e.message : String(e));
      if (msg.toLowerCase().includes("isn’t in this browser") && install) {
        window.open(install, "_blank", "noopener,noreferrer");
      }
      setLocalError(msg);
    } finally {
      setBusyName(null);
    }
  }

  const wide = size === "lg";
  const waiting = isPending || busyName !== null;

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
        disabled={waiting}
        onClick={() => {
          setLocalError(null);
          reset();
          setOpen((v) => !v);
        }}
      >
        {waiting ? "Connecting…" : wide ? "Connect wallet" : "Connect"}
      </button>

      {open && (
        <div className="wallet-pop">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            Search a wallet
          </p>
          <input
            ref={searchRef}
            className="input mt-2 mb-2 min-h-10 text-sm"
            placeholder="Type MetaMask, SafePal, Rabby…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {busyName && (
            <p className="msg-warn mb-2">
              Approve in {busyName} — check the popup, or the wallet icon in the Chrome toolbar.
            </p>
          )}

          <div className="wallet-list">
            {rows.map((w) => (
              <button
                key={w.name}
                type="button"
                className="wallet-row"
                disabled={waiting}
                onClick={() => void connectNamed(w.name, w.connector, w.install)}
              >
                <span>{w.name}</span>
                <span className="text-xs font-bold text-muted">
                  {busyName === w.name ? "Waiting…" : "Connect"}
                </span>
              </button>
            ))}
            {rows.length === 0 && (
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
