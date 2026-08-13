"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/abis";
import { ADDRESSES, coston2 } from "@/lib/chain";
import { formatFxrp, formatUnitsFixed } from "@/lib/format";

const HIDE_KEY = "wayafee.hideBalances";

function Eye({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4M9.9 5.1A11 11 0 0 1 12 5c5 0 9.3 3.1 11 7.5a11.8 11.8 0 0 1-4.2 5.1M6.1 6.1A11.8 11.8 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.4 0 2.7-.3 3.9-.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function WalletBalances({ dark = false }: { dark?: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(window.localStorage.getItem(HIDE_KEY) === "1");
  }, []);

  const onCoston = chainId === coston2.id;
  const { data: gas } = useBalance({
    address,
    chainId: coston2.id,
    query: { enabled: isConnected && onCoston },
  });
  const { data: fxrp } = useReadContract({
    address: ADDRESSES.fxrp,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && onCoston },
  });

  if (!isConnected || !onCoston) return null;

  const c2 = gas ? formatUnitsFixed(gas.value, 18, 2) : "—";
  const fx = fxrp !== undefined ? formatFxrp(fxrp) : "—";

  function toggle() {
    const next = !hidden;
    setHidden(next);
    window.localStorage.setItem(HIDE_KEY, next ? "1" : "0");
  }

  return (
    <div
      className={`hidden items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold sm:flex ${
        dark ? "bg-white/10 text-cream" : "bg-surface text-ink"
      }`}
    >
      <span className="tabular-nums">
        {hidden ? "••••" : c2} <span className={dark ? "text-cream/55" : "text-muted"}>C2FLR</span>
      </span>
      <span className={dark ? "text-cream/25" : "text-line"}>|</span>
      <span className="tabular-nums">
        {hidden ? "••••" : fx} <span className={dark ? "text-cream/55" : "text-muted"}>FXRP</span>
      </span>
      <button
        type="button"
        className={`ml-0.5 rounded-full p-1 ${dark ? "text-cream/70 hover:text-cream" : "text-muted hover:text-ink"}`}
        onClick={toggle}
        title={hidden ? "Show balances" : "Hide balances"}
        aria-label={hidden ? "Show balances" : "Hide balances"}
      >
        <Eye off={hidden} />
      </button>
    </div>
  );
}
