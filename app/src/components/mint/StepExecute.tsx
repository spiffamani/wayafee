"use client";

import { useState } from "react";
import { decodeEventLog } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { assetManagerAbi } from "@/lib/abis";
import { ADDRESSES, EXPLORER } from "@/lib/chain";
import { proofToContractArg, type FdcProofResponse } from "@/lib/fdc";
import type { Reservation } from "@/lib/fassets";

export function StepExecute({
  reservation,
  proof,
  onExecuted,
}: {
  reservation: Reservation;
  proof: FdcProofResponse;
  onExecuted: (r: { txHash: string; mintedUBA: string }) => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    if (!publicClient) return;
    setError(null);
    try {
      setBusy("Confirm the mint in your wallet…");
      const hash = await writeContractAsync({
        address: ADDRESSES.assetManagerFXRP,
        abi: assetManagerAbi,
        functionName: "executeMinting",
        args: [proofToContractArg(proof), BigInt(reservation.collateralReservationId)],
      });
      setBusy("Minting FXRP on Flare…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error(`executeMinting reverted — see ${EXPLORER}/tx/${hash}`);
      }
      let mintedUBA = reservation.valueUBA;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: assetManagerAbi, data: log.data, topics: log.topics });
          if (decoded.eventName === "MintingExecuted") {
            mintedUBA = String((decoded.args as Record<string, unknown>).mintedAmountUBA);
          }
        } catch {
          /* other contract's log */
        }
      }
      onExecuted({ txHash: hash, mintedUBA });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card space-y-6 p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-extrabold">Proof is ready. Mint it.</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Flare verified the XRP payment. One last transaction hands the proof to the AssetManager
          and FXRP is minted to this wallet.
        </p>
      </div>

      <dl>
        <div className="ledger-row">
          <dt>Reservation</dt>
          <dd className="mono">#{reservation.collateralReservationId}</dd>
        </div>
        <div className="ledger-row">
          <dt>Voting round</dt>
          <dd className="mono">{proof.response.votingRound}</dd>
        </div>
      </dl>

      {error && <p className="msg-error">{error}</p>}

      <button className="btn-primary w-full" disabled={busy !== null} onClick={execute}>
        {busy ?? "Execute mint"}
      </button>
    </div>
  );
}
