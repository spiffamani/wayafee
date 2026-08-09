import { decodeEventLog, type TransactionReceipt } from "viem";
import { assetManagerAbi } from "./abis";
import { ADDRESSES } from "./chain";

export interface AgentOption {
  agentVault: `0x${string}`;
  feeBIPS: bigint;
  freeCollateralLots: bigint;
  status: number;
}

/** Info the minter needs after reserving collateral (from CollateralReserved). */
export interface Reservation {
  collateralReservationId: string;
  agentVault: string;
  /** XRPL address of the agent to pay. */
  paymentAddress: string;
  /** 32-byte payment reference that MUST ride along as the XRPL memo. */
  paymentReference: `0x${string}`;
  /** Amount to mint, in drops. */
  valueUBA: string;
  /** Agent fee, in drops. */
  feeUBA: string;
  /** Payment must land before this XRPL ledger... */
  lastUnderlyingBlock: string;
  /** ...or before this unix time, whichever is later. */
  lastUnderlyingTimestamp: string;
  /** Flare tx that made the reservation. */
  reserveTxHash: `0x${string}`;
}

/** Total drops the user must send: minted value + agent fee. Exact — no more, no less. */
export function totalPaymentDrops(r: Pick<Reservation, "valueUBA" | "feeUBA">): bigint {
  return BigInt(r.valueUBA) + BigInt(r.feeUBA);
}

/** Pick the cheapest live agent that can cover the requested lots. */
export function pickAgent(agents: AgentOption[], lots: bigint): AgentOption | undefined {
  return agents
    .filter((a) => Number(a.status) === 0 && a.freeCollateralLots >= lots)
    .sort((a, b) => (a.feeBIPS < b.feeBIPS ? -1 : 1))[0];
}

/** Parse the CollateralReserved event out of the reserveCollateral receipt. */
export function parseReservation(receipt: TransactionReceipt): Reservation {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ADDRESSES.assetManagerFXRP.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: assetManagerAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "CollateralReserved") {
        const a = decoded.args as Record<string, unknown>;
        return {
          collateralReservationId: String(a.collateralReservationId),
          agentVault: String(a.agentVault),
          paymentAddress: String(a.paymentAddress),
          paymentReference: a.paymentReference as `0x${string}`,
          valueUBA: String(a.valueUBA),
          feeUBA: String(a.feeUBA),
          lastUnderlyingBlock: String(a.lastUnderlyingBlock),
          lastUnderlyingTimestamp: String(a.lastUnderlyingTimestamp),
          reserveTxHash: receipt.transactionHash,
        };
      }
    } catch {
      // not the event we're looking for
    }
  }
  throw new Error(
    "Reservation transaction confirmed but no CollateralReserved event was found — check the tx on the explorer."
  );
}
