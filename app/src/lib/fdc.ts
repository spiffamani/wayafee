/**
 * Client-side orchestration of the Flare Data Connector "Payment" attestation:
 *
 *   1. prepareRequest  — verifier server ABI-encodes the attestation request
 *                        (proxied through /api/fdc/prepare to keep keys server-side)
 *   2. requestAttestation — paid on-chain call to FdcHub (done by the caller via wagmi)
 *   3. wait for the voting round to finalize (Relay.isFinalized)
 *   4. fetch the merkle proof from the Data Availability layer
 *                        (proxied through /api/fdc/proof)
 *
 * The proof is then handed to AssetManager.executeMinting.
 */

const toUtf8Hex32 = (s: string) =>
  ("0x" +
    Array.from(new TextEncoder().encode(s))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .padEnd(64, "0")) as `0x${string}`;

export const ATTESTATION_TYPE_PAYMENT = toUtf8Hex32("Payment");
export const SOURCE_ID_TESTXRP = toUtf8Hex32("testXRP");

export interface PreparedRequest {
  abiEncodedRequest: `0x${string}`;
}

export async function prepareGuarded(xrplTxHash: string): Promise<PreparedRequest> {
  const res = await fetch("/api/fdc/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionId: xrplTxHash }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Verifier error (${res.status})`);
  }
  return body as PreparedRequest;
}

export interface FdcProofResponse {
  proof: `0x${string}`[];
  response: {
    attestationType: `0x${string}`;
    sourceId: `0x${string}`;
    votingRound: string;
    lowestUsedTimestamp: string;
    requestBody: { transactionId: `0x${string}`; inUtxo: string; utxo: string };
    responseBody: {
      blockNumber: string;
      blockTimestamp: string;
      sourceAddressHash: `0x${string}`;
      sourceAddressesRoot: `0x${string}`;
      receivingAddressHash: `0x${string}`;
      intendedReceivingAddressHash: `0x${string}`;
      spentAmount: string;
      intendedSpentAmount: string;
      receivedAmount: string;
      intendedReceivedAmount: string;
      standardPaymentReference: `0x${string}`;
      oneToOne: boolean;
      status: string;
    };
  };
}

/** Fetch the proof from the DA layer; returns null while it's not published yet. */
export async function fetchProof(
  votingRoundId: number,
  requestBytes: `0x${string}`
): Promise<FdcProofResponse | null> {
  const res = await fetch("/api/fdc/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ votingRoundId, requestBytes }),
  });
  if (res.status === 404 || res.status === 204) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `DA layer error (${res.status})`);
  if (!body?.response || !body?.proof) return null;
  return body as FdcProofResponse;
}

/** Shape the DA-layer JSON into the executeMinting Payment.Proof tuple for viem. */
export function proofToContractArg(p: FdcProofResponse) {
  const r = p.response;
  const b = r.responseBody;
  return {
    merkleProof: p.proof,
    data: {
      attestationType: r.attestationType,
      sourceId: r.sourceId,
      votingRound: BigInt(r.votingRound),
      lowestUsedTimestamp: BigInt(r.lowestUsedTimestamp),
      requestBody: {
        transactionId: r.requestBody.transactionId,
        inUtxo: BigInt(r.requestBody.inUtxo),
        utxo: BigInt(r.requestBody.utxo),
      },
      responseBody: {
        blockNumber: BigInt(b.blockNumber),
        blockTimestamp: BigInt(b.blockTimestamp),
        sourceAddressHash: b.sourceAddressHash,
        sourceAddressesRoot: b.sourceAddressesRoot,
        receivingAddressHash: b.receivingAddressHash,
        intendedReceivingAddressHash: b.intendedReceivingAddressHash,
        spentAmount: BigInt(b.spentAmount),
        intendedSpentAmount: BigInt(b.intendedSpentAmount),
        receivedAmount: BigInt(b.receivedAmount),
        intendedReceivedAmount: BigInt(b.intendedReceivedAmount),
        standardPaymentReference: b.standardPaymentReference,
        oneToOne: b.oneToOne,
        status: Number(b.status),
      },
    },
  } as const;
}
