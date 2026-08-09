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
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Proof ready — execute your mint</h2>
        <p className="text-sm text-gray-400 mt-1">
          Flare has verified your XRP payment. One final transaction hands the proof to the
          AssetManager and your FXRP is minted to your Flare address.
        </p>
      </div>

      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Reservation</span>
          <span className="mono">#{reservation.collateralReservationId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Verified in voting round</span>
          <span className="mono">{proof.response.votingRound}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 break-all">{error}</p>}

      <button className="btn-primary w-full" disabled={busy !== null} onClick={execute}>
        {busy ?? "Execute mint"}
      </button>
    </div>
  );
}
