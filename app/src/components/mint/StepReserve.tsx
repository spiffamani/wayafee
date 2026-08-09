"use client";

import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { assetManagerAbi } from "@/lib/abis";
import { ADDRESSES, EXPLORER } from "@/lib/chain";
import { pickAgent, parseReservation, type AgentOption, type Reservation } from "@/lib/fassets";
import { formatFxrp, formatUnitsFixed, shortAddr } from "@/lib/format";

export function StepReserve({ onReserved }: { onReserved: (r: Reservation) => void }) {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [lots, setLots] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: lotSize } = useReadContract({
    address: ADDRESSES.assetManagerFXRP,
    abi: assetManagerAbi,
    functionName: "lotSize",
  });

  const { data: agentsData, isLoading: agentsLoading } = useReadContract({
    address: ADDRESSES.assetManagerFXRP,
    abi: assetManagerAbi,
    functionName: "getAvailableAgentsDetailedList",
    args: [0n, 50n],
    query: { refetchInterval: 30_000 },
  });

  const { data: crf } = useReadContract({
    address: ADDRESSES.assetManagerFXRP,
    abi: assetManagerAbi,
    functionName: "collateralReservationFee",
    args: [BigInt(lots)],
    query: { enabled: lots > 0 },
  });

  const agents: AgentOption[] = useMemo(
    () =>
      (agentsData?.[0] ?? []).map((a) => ({
        agentVault: a.agentVault,
        feeBIPS: a.feeBIPS,
        freeCollateralLots: a.freeCollateralLots,
        status: Number(a.status),
      })),
    [agentsData]
  );

  const agent = useMemo(() => pickAgent(agents, BigInt(lots)), [agents, lots]);

  const valueUBA = lotSize !== undefined ? BigInt(lots) * lotSize : undefined;
  const estFeeUBA =
    valueUBA !== undefined && agent ? (valueUBA * agent.feeBIPS) / 10_000n : undefined;

  async function reserve() {
    if (!agent || !publicClient) return;
    setError(null);
    try {
      setBusy("Waiting for wallet confirmation…");
      const hash = await writeContractAsync({
        address: ADDRESSES.assetManagerFXRP,
        abi: assetManagerAbi,
        functionName: "reserveCollateral",
        args: [
          agent.agentVault,
          BigInt(lots),
          agent.feeBIPS, // maxMintingFeeBIPS = agent's published fee (front-run guard)
          "0x0000000000000000000000000000000000000000", // self-execute, no executor
        ],
        value: crf,
      });
      setBusy("Reserving collateral on Flare…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error(`Reservation transaction reverted — see ${EXPLORER}/tx/${hash}`);
      }
      onReserved(parseReservation(receipt));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!isConnected) {
    return (
      <div className="card p-6 text-center text-gray-400">
        Connect your Flare (EVM) wallet above to begin. You&apos;ll also need C2FLR for gas and the
        reservation fee —{" "}
        <a
          className="text-flare underline"
          href="https://faucet.flare.network/coston2"
          target="_blank"
          rel="noreferrer"
        >
          get free testnet C2FLR here
        </a>
        .
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Reserve collateral</h2>
        <p className="text-sm text-gray-400 mt-1">
          An agent locks collateral for your mint. FXRP is minted in lots
          {lotSize !== undefined && <> of {formatFxrp(lotSize)} XRP</>}. Wayafee picks the cheapest
          live agent with room for your order.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-gray-500">Lots to mint</label>
          <div className="flex items-center gap-3">
            <button className="btn-ghost px-4" onClick={() => setLots((l) => Math.max(1, l - 1))}>
              −
            </button>
            <span className="text-2xl font-bold w-12 text-center">{lots}</span>
            <button className="btn-ghost px-4" onClick={() => setLots((l) => l + 1)}>
              +
            </button>
          </div>
          {valueUBA !== undefined && (
            <p className="text-sm text-gray-400">
              = <span className="text-white font-medium">{formatFxrp(valueUBA)} FXRP</span> minted
              to your Flare address
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <label className="text-xs uppercase tracking-wide text-gray-500">Selected agent</label>
          {agentsLoading ? (
            <p className="text-gray-400 pulse-soft">Scanning live agents…</p>
          ) : agent ? (
            <div className="space-y-1">
              <p className="mono">{shortAddr(agent.agentVault, 8)}</p>
              <p className="text-gray-400">
                Fee {Number(agent.feeBIPS) / 100}% · {agent.freeCollateralLots.toString()} lots free
              </p>
            </div>
          ) : (
            <p className="text-amber">
              No agent currently has {lots} free lot{lots > 1 ? "s" : ""}. Try fewer lots.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-line pt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">You will pay on XRPL (estimate)</span>
          <span className="font-medium">
            {valueUBA !== undefined && estFeeUBA !== undefined
              ? `${formatFxrp(valueUBA + estFeeUBA)} XRP`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Reservation fee (Flare, non-refundable)</span>
          <span className="font-medium">
            {crf !== undefined ? `${formatUnitsFixed(crf, 18, 4)} C2FLR` : "—"}
          </span>
        </div>
        <p className="text-xs text-gray-500 pt-1">
          The exact XRPL amount is fixed on-chain by the reservation and shown on the next screen —
          you never guess it.
        </p>
      </div>

      {error && <p className="text-sm text-red-400 break-all">{error}</p>}

      <button
        className="btn-primary w-full"
        disabled={!agent || busy !== null || chainId !== 114}
        onClick={reserve}
      >
        {busy ?? `Reserve ${lots} lot${lots > 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
