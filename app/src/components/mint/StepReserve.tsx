"use client";

import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { assetManagerAbi } from "@/lib/abis";
import { ADDRESSES, EXPLORER } from "@/lib/chain";
import { ConnectWallet } from "@/components/ConnectWallet";
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
          agent.feeBIPS,
          "0x0000000000000000000000000000000000000000",
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
      <div className="card space-y-5 p-6 sm:p-10">
        <div>
          <h2 className="display-serif text-3xl font-semibold sm:text-4xl">Connect to mint</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Use MetaMask on Coston2. You’ll need a little C2FLR for gas and the reservation fee.{" "}
            <a
              className="font-semibold text-flare underline"
              href="https://faucet.flare.network/coston2"
              target="_blank"
              rel="noreferrer"
            >
              Grab testnet C2FLR here
            </a>
            .
          </p>
        </div>
        <ConnectWallet size="lg" />
      </div>
    );
  }

  return (
    <div className="card space-y-6 p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-extrabold">How much are you minting?</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          FXRP mints in lots
          {lotSize !== undefined && <> of {formatFxrp(lotSize)} XRP</>}. We pick the cheapest live
          agent with room for your order.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted">Lots</label>
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost min-h-12 w-12 px-0 text-xl"
              onClick={() => setLots((l) => Math.max(1, l - 1))}
              aria-label="Fewer lots"
            >
              −
            </button>
            <span className="amount w-16 text-center text-4xl">{lots}</span>
            <button
              className="btn-ghost min-h-12 w-12 px-0 text-xl"
              onClick={() => setLots((l) => l + 1)}
              aria-label="More lots"
            >
              +
            </button>
          </div>
          {valueUBA !== undefined && (
            <p className="text-sm text-muted">
              You’ll mint{" "}
              <span className="font-extrabold text-ink">{formatFxrp(valueUBA)} FXRP</span> to this
              wallet.
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Selected agent
          </label>
          {agentsLoading ? (
            <p className="text-muted pulse-soft">Scanning live agents…</p>
          ) : agent ? (
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="mono text-sm font-semibold">{shortAddr(agent.agentVault, 8)}</p>
              <p className="mt-1 text-muted">
                Fee {Number(agent.feeBIPS) / 100}% · {agent.freeCollateralLots.toString()} lots free
              </p>
            </div>
          ) : (
            <p className="msg-warn">
              No agent currently has {lots} free lot{lots > 1 ? "s" : ""}. Try fewer lots.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1 border-t border-line pt-4 text-sm">
        <div className="ledger-row">
          <dt>You pay on XRPL (est.)</dt>
          <dd>
            {valueUBA !== undefined && estFeeUBA !== undefined
              ? `${formatFxrp(valueUBA + estFeeUBA)} XRP`
              : "—"}
          </dd>
        </div>
        <div className="ledger-row">
          <dt>Reservation fee (Flare, kept)</dt>
          <dd>{crf !== undefined ? `${formatUnitsFixed(crf, 18, 4)} C2FLR` : "—"}</dd>
        </div>
        <p className="pt-2 text-xs text-muted">
          The exact XRPL amount is fixed on-chain by the reservation. Next screen shows it — you
          never guess.
        </p>
      </div>

      {error && <p className="msg-error">{error}</p>}

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
