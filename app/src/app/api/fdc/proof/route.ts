import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies the Data Availability layer proof lookup for an attestation request.
 * Returns 404 while the proof is not yet published (the round finalizes in
 * ~90–180s), which the client treats as "keep waiting".
 *
 * Env (optional): FDC_DA_LAYER_BASE, FDC_DA_LAYER_API_KEY
 */
const DA_BASE =
  process.env.FDC_DA_LAYER_BASE ?? "https://ctn2-data-availability.flare.network";
const API_KEY = process.env.FDC_DA_LAYER_API_KEY ?? "00000000-0000-0000-0000-000000000000";

export async function POST(req: NextRequest) {
  const { votingRoundId, requestBytes } = await req.json();
  if (typeof votingRoundId !== "number" || !/^0x[0-9a-fA-F]+$/.test(String(requestBytes ?? ""))) {
    return NextResponse.json(
      { error: "votingRoundId (number) and requestBytes (hex) are required" },
      { status: 400 }
    );
  }

  const upstream = await fetch(`${DA_BASE}/api/v1/fdc/proof-by-request-round`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    },
    body: JSON.stringify({ votingRoundId, requestBytes }),
    cache: "no-store",
  });

  if (upstream.status === 404 || upstream.status === 400) {
    // DA layer answers 400/404 while the proof isn't available yet.
    return NextResponse.json({ pending: true }, { status: 404 });
  }
  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `DA layer responded ${upstream.status}: ${text.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const body = await upstream.json();
  const proof = body.proof ?? body.merkleProof;
  const response = body.response ?? body.data;
  if (!proof || !response) {
    return NextResponse.json({ pending: true }, { status: 404 });
  }
  return NextResponse.json({ proof, response });
}
