"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { fdcHubAbi, fdcRequestFeeConfigurationsAbi, relayAbi } from "@/lib/abis";
import { ADDRESSES, FDC_PROTOCOL_ID, XRPL_EXPLORER } from "@/lib/chain";
import {
  fetchProof,
  prepareGuarded,
  type FdcProofResponse,
} from "@/lib/fdc";

export interface AttestProgress {
  abiEncodedRequest?: `0x${string}`;
  attestationRequestTx?: `0x${string}`;
  votingRoundId?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type SubStep = "verify" | "request" | "round" | "proof";
const SUBSTEPS: { id: SubStep; label: string; note: string }[] = [
  {
    id: "verify",
    label: "XRPL payment picked up by Flare's verifiers",
    note: "usually well under a minute after the ledger closes",
  },
  {
    id: "request",
    label: "Attestation requested on Flare (small fee, one wallet confirmation)",
    note: "paid to FdcHub — this is what makes the proof verifiable on-chain",
  },
  {
    id: "round",
    label: "Voting round finalizing",
    note: "honest expectation: 90–180 seconds — this page keeps polling, no need to refresh",
  },
  {
    id: "proof",
    label: "Merkle proof published",
    note: "fetched from Flare's data availability layer",
  },
];

export function StepAttest({
  xrplTxHash,
  progress,
  onProgress,
  onProof,
}: {
  xrplTxHash: string;
  progress: AttestProgress;
  onProgress: (p: AttestProgress) => void;
  onProof: (proof: FdcProofResponse) => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [active, setActive] = useState<SubStep | null>(null);
  const [doneSteps, setDoneSteps] = useState<Set<SubStep>>(new Set());
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const run = useCallback(async () => {
    if (runningRef.current || !publicClient) return;
    runningRef.current = true;
    setError(null);
    const done = new Set<SubStep>();
    const markDone = (s: SubStep) => {
      done.add(s);
      setDoneSteps(new Set(done));
    };

    try {
      // 1. verifier prepareRequest (retry while the tx gains confirmations)
      let abiEncodedRequest = progress.abiEncodedRequest;
      setActive("verify");
      if (!abiEncodedRequest) {
        for (let attempt = 1; ; attempt++) {
          try {
            setDetail(attempt === 1 ? "Contacting verifier…" : `Waiting for confirmations (attempt ${attempt})…`);
            const prepared = await prepareGuarded(xrplTxHash);
            abiEncodedRequest = prepared.abiEncodedRequest;
            break;
          } catch (e) {
            if (attempt >= 30) throw e;
            await sleep(10_000);
          }
        }
        onProgress({ ...progress, abiEncodedRequest });
      }
      markDone("verify");

      // 2. requestAttestation on FdcHub
      let requestTx = progress.attestationRequestTx;
      setActive("request");
      if (!requestTx) {
        setDetail("Reading request fee…");
        const fee = await publicClient.readContract({
          address: ADDRESSES.fdcRequestFeeConfigurations,
          abi: fdcRequestFeeConfigurationsAbi,
          functionName: "getRequestFee",
          args: [abiEncodedRequest!],
        });
        setDetail("Confirm the attestation request in your wallet…");
        requestTx = await writeContractAsync({
          address: ADDRESSES.fdcHub,
          abi: fdcHubAbi,
          functionName: "requestAttestation",
          args: [abiEncodedRequest!],
          value: fee,
        });
        setDetail("Waiting for the request to confirm on Flare…");
        const receipt = await publicClient.waitForTransactionReceipt({ hash: requestTx });
        if (receipt.status !== "success") throw new Error("Attestation request reverted");
        onProgress({ ...progress, abiEncodedRequest, attestationRequestTx: requestTx });
      }
      markDone("request");

      // 3. voting round id from the request tx block timestamp
      let votingRoundId = progress.votingRoundId;
      setActive("round");
      if (votingRoundId === undefined) {
        const receipt = await publicClient.getTransactionReceipt({ hash: requestTx! });
        const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
        const round = await publicClient.readContract({
          address: ADDRESSES.relay,
          abi: relayAbi,
          functionName: "getVotingRoundId",
          args: [block.timestamp],
        });
        votingRoundId = Number(round);
        onProgress({
          ...progress,
          abiEncodedRequest,
          attestationRequestTx: requestTx,
          votingRoundId,
        });
      }

      const startedAt = Date.now();
      for (;;) {
        const finalized = await publicClient.readContract({
          address: ADDRESSES.relay,
          abi: relayAbi,
          functionName: "isFinalized",
          args: [BigInt(FDC_PROTOCOL_ID), BigInt(votingRoundId)],
        });
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setDetail(`Round ${votingRoundId} · ${elapsed}s elapsed — typical wait is 90–180s`);
        if (finalized) break;
        await sleep(10_000);
      }
      markDone("round");

      // 4. proof from DA layer
      setActive("proof");
      for (let attempt = 1; ; attempt++) {
        setDetail(attempt === 1 ? "Fetching proof…" : `Proof not published yet (attempt ${attempt})…`);
        const proof = await fetchProof(votingRoundId, abiEncodedRequest!);
        if (proof) {
          markDone("proof");
          setActive(null);
          onProof(proof);
          return;
        }
        if (attempt >= 60) throw new Error("Proof still unavailable after 10 minutes — retry below.");
        await sleep(10_000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setActive(null);
    } finally {
      runningRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, xrplTxHash, progress, onProgress, onProof, writeContractAsync]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Flare is verifying your XRP payment</h2>
        <p className="text-sm text-gray-400 mt-1">
          The Flare Data Connector independently checks your{" "}
          <a
            className="text-flare underline"
            href={`${XRPL_EXPLORER}/transactions/${xrplTxHash}`}
            target="_blank"
            rel="noreferrer"
          >
            XRPL transaction
          </a>{" "}
          — amount, destination and reference — and produces a proof the mint contract can trust.
          This takes minutes, not seconds. That&apos;s normal; we show you exactly where it is.
        </p>
      </div>

      <ol className="space-y-4">
        {SUBSTEPS.map((s) => {
          const isDone = doneSteps.has(s.id);
          const isActive = active === s.id;
          return (
            <li key={s.id} className="flex gap-3">
              <span
                className={`mt-0.5 w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${
                  isDone
                    ? "bg-mint/15 border-mint/50 text-mint"
                    : isActive
                      ? "border-flare text-flare pulse-soft"
                      : "border-line text-gray-600"
                }`}
              >
                {isDone ? "✓" : isActive ? "●" : "○"}
              </span>
              <div>
                <p className={isDone || isActive ? "text-white" : "text-gray-500"}>{s.label}</p>
                <p className="text-xs text-gray-500">{isActive && detail ? detail : s.note}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="space-y-3">
          <p className="text-sm text-red-400 break-all">{error}</p>
          <button className="btn-primary" onClick={() => void run()}>
            Retry from where it stopped
          </button>
        </div>
      )}
    </div>
  );
}
