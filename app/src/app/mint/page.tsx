"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { PageShell } from "@/components/Brand";
import { StepIndicator } from "@/components/mint/StepIndicator";
import { StepReserve } from "@/components/mint/StepReserve";
import { StepPay } from "@/components/mint/StepPay";
import { StepAttest, type AttestProgress } from "@/components/mint/StepAttest";
import { StepExecute } from "@/components/mint/StepExecute";
import { erc20Abi } from "@/lib/abis";
import { ADDRESSES, EXPLORER } from "@/lib/chain";
import { clearWizardState, loadWizardState, saveWizardState } from "@/lib/contacts";
import type { Reservation } from "@/lib/fassets";
import type { FdcProofResponse } from "@/lib/fdc";
import { formatFxrp } from "@/lib/format";

interface MintState {
  step: 1 | 2 | 3 | 4 | 5;
  reservation?: Reservation;
  xrplTxHash?: string;
  attest: AttestProgress;
  proof?: FdcProofResponse;
  executed?: { txHash: string; mintedUBA: string };
}

const INITIAL: MintState = { step: 1, attest: {} };

function StepDone({
  executed,
  onRestart,
}: {
  executed: { txHash: string; mintedUBA: string };
  onRestart: () => void;
}) {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: ADDRESSES.fxrp,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return (
    <div className="receipt space-y-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ledger-dim text-ledger">
        <svg width="26" height="26" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3.2 8.2L6.3 11.2L12.8 4.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-ledger">Mint complete</p>
        <p className="amount mt-3 text-4xl sm:text-5xl">{formatFxrp(BigInt(executed.mintedUBA))}</p>
        <p className="mt-1 text-sm font-semibold text-muted">FXRP in this wallet</p>
        {balance !== undefined && (
          <p className="mt-2 text-xs text-muted">Total balance {formatFxrp(balance)} FXRP</p>
        )}
      </div>
      <a
        className="inline-block text-sm font-semibold text-flare underline"
        href={`${EXPLORER}/tx/${executed.txHash}`}
        target="_blank"
        rel="noreferrer"
      >
        View the mint on Coston2
      </a>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/split" className="btn-primary w-full sm:w-auto">
          Split it to contacts
        </Link>
        <button className="btn-ghost w-full sm:w-auto" onClick={onRestart}>
          Mint again
        </button>
      </div>
      <p className="mx-auto max-w-md text-xs leading-relaxed text-muted">
        This is the remittance moment: one more transaction fans this FXRP out to Mum, rent,
        savings — whatever you saved — atomically.
      </p>
    </div>
  );
}

export default function MintPage() {
  const [state, setState] = useState<MintState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadWizardState<MintState>();
    if (saved?.step && saved.step > 1) setState(saved);
    setHydrated(true);
  }, []);

  function update(next: MintState) {
    setState(next);
    saveWizardState(next);
  }

  function restart() {
    clearWizardState();
    setState(INITIAL);
  }

  if (!hydrated) return null;

  return (
    <PageShell className="grid gap-6 py-6 sm:py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="lg:sticky lg:top-24">
        <div className="mb-4 flex items-start justify-between gap-4 lg:mb-6 lg:block">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Mint FXRP</h1>
            <p className="mt-1 text-sm text-muted">Four real steps. Progress survives a refresh.</p>
          </div>
          {state.step > 1 && state.step < 5 && (
            <button
              className="shrink-0 text-xs font-semibold text-danger underline lg:mt-4"
              onClick={() => {
                if (window.confirm("Abandon this mint? Your reservation fee is not refundable."))
                  restart();
              }}
            >
              Abandon
            </button>
          )}
        </div>
        <StepIndicator current={state.step} />
      </div>

      <div className="min-w-0 space-y-6 lg:max-w-3xl">
        {state.step === 1 && (
          <StepReserve onReserved={(reservation) => update({ ...state, step: 2, reservation })} />
        )}

        {state.step === 2 && state.reservation && (
          <StepPay
            reservation={state.reservation}
            onPaid={(xrplTxHash) => update({ ...state, step: 3, xrplTxHash })}
          />
        )}

        {state.step === 3 && state.reservation && state.xrplTxHash && (
          <StepAttest
            xrplTxHash={state.xrplTxHash}
            progress={state.attest}
            onProgress={(attest) => update({ ...state, attest })}
            onProof={(proof) => update({ ...state, step: 4, proof })}
          />
        )}

        {state.step === 4 && state.reservation && state.proof && (
          <StepExecute
            reservation={state.reservation}
            proof={state.proof}
            onExecuted={(executed) => update({ ...state, step: 5, executed })}
          />
        )}

        {state.step === 5 && state.executed && (
          <StepDone executed={state.executed} onRestart={restart} />
        )}

        <details className="text-xs text-muted">
          <summary className="cursor-pointer font-semibold hover:text-ink">
            What’s actually happening under the hood?
          </summary>
          <div className="mt-3 space-y-2 leading-relaxed">
            <p>
              1. <strong className="text-ink">Reserve</strong> — <span className="mono">reserveCollateral</span> on
              Flare’s audited FAssets AssetManager locks an agent’s collateral and fixes the exact
              XRP due.
            </p>
            <p>
              2. <strong className="text-ink">Pay</strong> — you send that exact amount on XRPL with a
              32-byte payment reference in the memo. Wayafee generates both.
            </p>
            <p>
              3. <strong className="text-ink">Attest</strong> — the Flare Data Connector confirms the
              payment and a Merkle proof is published after the voting round finalizes.
            </p>
            <p>
              4. <strong className="text-ink">Execute</strong> — <span className="mono">executeMinting</span>{" "}
              verifies the proof and mints FXRP 1:1. SplitRemit can then fan it out.
            </p>
          </div>
        </details>
      </div>
    </PageShell>
  );
}
