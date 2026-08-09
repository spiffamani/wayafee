"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
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

function StepDone({ executed, onRestart }: { executed: { txHash: string; mintedUBA: string }; onRestart: () => void }) {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: ADDRESSES.fxrp,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return (
    <div className="card p-8 text-center space-y-6">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-2xl font-bold">
          {formatFxrp(BigInt(executed.mintedUBA))} FXRP is in your wallet
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          Two chains, one payment, one proof — done.{" "}
          <a
            className="text-flare underline"
            href={`${EXPLORER}/tx/${executed.txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View the mint transaction ↗
          </a>
        </p>
        {balance !== undefined && (
          <p className="text-xs text-gray-500 mt-1">
            Total FXRP balance: {formatFxrp(balance)}
          </p>
        )}
      </div>
      <div className="flex justify-center gap-4">
        <Link href="/split" className="btn-primary">
          Split it to your contacts now →
        </Link>
        <button className="btn-ghost" onClick={onRestart}>
          Mint again
        </button>
      </div>
      <p className="text-xs text-gray-500 max-w-md mx-auto">
        This is the remittance moment: one more transaction fans this FXRP out to your saved
        contacts by percentage — rent, family, savings — atomically.
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
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Guided FXRP mint</h1>
          <p className="text-sm text-gray-400">
            Four real steps, tracked honestly. Progress survives page refreshes.
          </p>
        </div>
        {state.step > 1 && state.step < 5 && (
          <button
            className="text-xs text-gray-500 underline hover:text-red-400"
            onClick={() => {
              if (window.confirm("Abandon this mint? Your reservation fee is not refundable.")) restart();
            }}
          >
            abandon mint
          </button>
        )}
      </div>

      <StepIndicator current={state.step} />

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

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-300">
          What&apos;s actually happening under the hood?
        </summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>
            1. <strong>Reserve</strong> — `reserveCollateral` on Flare&apos;s audited FAssets
            AssetManager locks an agent&apos;s collateral for your mint and fixes the exact XRP due.
          </p>
          <p>
            2. <strong>Pay</strong> — you send that exact amount on XRPL with a 32-byte payment
            reference in the memo. Wayafee generates both; the two historic failure modes (wrong
            reference, underpayment) are structurally removed.
          </p>
          <p>
            3. <strong>Attest</strong> — the Flare Data Connector&apos;s decentralized verifiers
            confirm the payment and a Merkle proof is published after the voting round finalizes.
          </p>
          <p>
            4. <strong>Execute</strong> — `executeMinting` verifies the proof on-chain and mints
            FXRP 1:1 to your address. From there, SplitRemit (Wayafee&apos;s own contract) can fan
            it out to saved contacts atomically.
          </p>
        </div>
      </details>
    </div>
  );
}
