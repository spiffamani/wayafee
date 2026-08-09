import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies the FDC verifier's prepareRequest for the Payment attestation type.
 * The verifier checks the XRPL tx and returns the ABI-encoded attestation
 * request that must be submitted (with a fee) to FdcHub.
 *
 * Env (all optional — defaults are the public Flare testnet endpoints):
 *   FDC_VERIFIER_BASE, FDC_VERIFIER_API_KEY
 */
const VERIFIER_BASE =
  process.env.FDC_VERIFIER_BASE ?? "https://fdc-verifiers-testnet.flare.network";
const API_KEY = process.env.FDC_VERIFIER_API_KEY ?? "00000000-0000-0000-0000-000000000000";

const pad32 = (s: string) =>
  "0x" +
  Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0");

export async function POST(req: NextRequest) {
  const { transactionId } = await req.json();
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(String(transactionId ?? ""))) {
    return NextResponse.json({ error: "transactionId must be a 32-byte hash" }, { status: 400 });
  }
  const txId = String(transactionId).startsWith("0x")
    ? String(transactionId)
    : `0x${transactionId}`;

  const upstream = await fetch(`${VERIFIER_BASE}/verifier/xrp/Payment/prepareRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    },
    body: JSON.stringify({
      attestationType: pad32("Payment"),
      sourceId: pad32("testXRP"),
      requestBody: { transactionId: txId, inUtxo: "0", utxo: "0" },
    }),
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `Verifier responded ${upstream.status}: ${text.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const body = await upstream.json();
  if (body.status !== "VALID" || !body.abiEncodedRequest) {
    // Usually means the XRPL tx doesn't have enough confirmations yet — retryable.
    return NextResponse.json(
      { error: `Verifier status: ${body.status ?? "unknown"}`, retryable: true },
      { status: 409 }
    );
  }

  return NextResponse.json({ abiEncodedRequest: body.abiEncodedRequest });
}
