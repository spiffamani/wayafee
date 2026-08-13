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

function asMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const extra = err as Error & { shortMessage?: string; details?: string; cause?: unknown };
    const fromCause = extra.cause != null && extra.cause !== err ? asMessage(extra.cause) : "";
    return extra.shortMessage || extra.message || fromCause || extra.details || "";
  }
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.shortMessage === "string" && o.shortMessage) return o.shortMessage;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.details === "string" && o.details) return o.details;
    if (o.cause != null) return asMessage(o.cause);
  }
  return "";
}

function friendlyError(err: unknown) {
  const raw = asMessage(err);
  if (!raw || raw === "[object Object]") {
    return "Couldn’t finish connecting. Open MetaMask (fox icon) and approve, or try again.";
  }
  const m = raw.toLowerCase();
  if (m.includes("already pending") || m.includes("request of type")) {
    return "You already clicked Connect. Check your wallet (fox icon in Chrome) and approve — don’t click Connect again.";
  }
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
  const [alreadyClicked, setAlreadyClicked] = useState(false);
  const [copied, setCopied] = useState(false);
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

  useEffect(() => {
    if (!isConnected) return;
    setOpen(false);
    setLocalError(null);
    setBusyName(null);
    setAlreadyClicked(false);
    reset();
  }, [isConnected, reset]);

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

  const shownError = busyName
    ? null
    : localError ?? (error ? friendlyError(error) : null) ??
      (switchError ? friendlyError(switchError) : null);
  const alreadyWaiting =
    alreadyClicked ||
    (shownError?.toLowerCase().includes("already clicked") ?? false);

  async function connectNamed(name: string, connector: Connector | undefined) {
    if (alreadyWaiting || busyName) {
      setAlreadyClicked(true);
      setLocalError(
        "You already clicked Connect. Check your wallet (fox icon in Chrome) and approve — don’t click Connect again."
      );
      setOpen(true);
      return;
    }
    setLocalError(null);
    reset();
    const target =
      connector ??
      (name === "MetaMask" ? findConnector(connectors, ["metamask"]) : undefined) ??
      connectors.find((c) => c.id === "injected");
    if (!target) {
      setLocalError("Install that wallet, refresh this page, then search for it again.");
      return;
    }
    setAlreadyClicked(true);
    setBusyName(name);
    try {
      await connectAsync({ connector: target, chainId: coston2.id });
      setOpen(false);
    } catch (e) {
      const msg = friendlyError(e);
      setLocalError(msg);
      if (msg.toLowerCase().includes("cancelled")) setAlreadyClicked(false);
    } finally {
      setBusyName(null);
    }
  }

  const wide = size === "lg";
  const waiting = isPending || busyName !== null;

  if (isConnected && chainId !== coston2.id) {
    const switchMsg = switchError ? friendlyError(switchError) : null;
    return (
      <div className={wide ? "w-full" : ""}>
        <button
          type="button"
          className={`btn-primary bg-amber ${wide ? "w-full" : "min-h-9 px-3 text-xs sm:min-h-10 sm:px-4 sm:text-sm"}`}
          disabled={switching}
          onClick={() => switchChain({ chainId: coston2.id })}
        >
          {switching ? "Switching…" : "Coston2"}
        </button>
        {switchMsg && !switchMsg.toLowerCase().includes("already clicked") && (
          <p className="msg-error mt-2 text-left">{switchMsg}</p>
        )}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${wide ? "w-full flex-col sm:flex-row" : ""}`}>
        <button
          type="button"
          className={`btn-ghost mono min-h-9 px-2.5 text-xs sm:min-h-10 sm:px-3 sm:text-sm ${wide ? "w-full sm:flex-1" : ""}`}
          onClick={async () => {
            if (!address) return;
            await navigator.clipboard.writeText(address);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
          title="Copy full address"
        >
          {copied ? "Copied" : shortAddr(address!, 4)}
        </button>
        <button
          type="button"
          className="shrink-0 text-[11px] font-bold text-muted underline sm:text-xs"
          onClick={() => disconnect()}
        >
          Out
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${wide ? "w-full" : ""}`}>
      <button
        type="button"
        className={`btn-primary ${wide ? "w-full" : "min-h-9 px-3 text-xs sm:min-h-10 sm:px-4 sm:text-sm"}`}
        onClick={() => {
          if (alreadyWaiting || waiting) {
            setOpen(true);
            setLocalError(
              "You already clicked Connect. Check your wallet (fox icon in Chrome) and approve — don’t click Connect again."
            );
            return;
          }
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

          {(busyName || alreadyWaiting) && (
            <p className="msg-warn mb-2">
              {alreadyWaiting && !busyName
                ? "You already clicked Connect. Check your wallet and approve — don’t click Connect again."
                : `Check ${busyName}. Approve in the wallet popup. Don’t click Connect again.`}
            </p>
          )}

          <div className="wallet-list">
            {rows.map((w) => (
              <button
                key={w.name}
                type="button"
                className="wallet-row"
                disabled={waiting || alreadyWaiting}
                onClick={() => void connectNamed(w.name, w.connector)}
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

          {shownError && <p className="msg-warn mt-3">{shownError}</p>}
        </div>
      )}

      {!open && shownError && wide && <p className="msg-warn mt-3">{shownError}</p>}
    </div>
  );
}
