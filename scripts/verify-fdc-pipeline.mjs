/**
 * Live smoke test of the off-chain half of Wayafee's mint pipeline, with no
 * C2FLR required:
 *
 *   1. create + fund two XRPL testnet wallets from the public faucet
 *   2. send a payment with a 32-byte payment-reference memo (exactly what a
 *      real FAssets mint payment looks like)
 *   3. ask the FDC verifier to prepare a Payment attestation request for it
 *   4. confirm FdcRequestFeeConfigurations on Coston2 prices the request
 *
 * If all four pass, the only untested pieces are the two wallet-signed
 * Flare transactions (reserveCollateral / requestAttestation / executeMinting),
 * which use ABIs transcribed directly from flare-periphery-contracts.
 *
 * Run from repo root: node scripts/verify-fdc-pipeline.mjs
 */
import { Client } from "xrpl";
import { createPublicClient, http, parseAbi } from "viem";

const XRPL_WSS = "wss://s.altnet.rippletest.net:51233";
const VERIFIER = "https://fdc-verifiers-testnet.flare.network";
const API_KEY = process.env.FDC_VERIFIER_API_KEY ?? "00000000-0000-0000-0000-000000000000";
const COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc";
const FDC_FEE_CONFIG = "0x191a1282Ac700edE65c5B0AaF313BAcC3eA7fC7e";

const pad32 = (s) =>
  "0x" + [...s].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("").padEnd(64, "0");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("1) funding two XRPL testnet wallets from the faucet…");
  const client = new Client(XRPL_WSS);
  await client.connect();
  const { wallet: sender } = await client.fundWallet();
  const { wallet: receiver } = await client.fundWallet();
  console.log(`   sender   ${sender.address}`);
  console.log(`   receiver ${receiver.address}`);

  // fake but well-formed FAssets payment reference (0x4642505266... prefix is
  // what real ones look like; any 32 bytes works for the pipeline test)
  const paymentReference = "4642505266410001" + "ab".repeat(24);
  console.log("2) sending 12.5 XRP with a 32-byte memo (payment reference)…");
  const prepared = await client.autofill({
    TransactionType: "Payment",
    Account: sender.address,
    Destination: receiver.address,
    Amount: "12500000",
    Memos: [{ Memo: { MemoData: paymentReference.toUpperCase() } }],
  });
  const signed = sender.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  const code = result.result.meta?.TransactionResult;
  console.log(`   tx ${signed.hash} → ${code}`);
  if (code !== "tesSUCCESS") throw new Error("XRPL payment failed");
  await client.disconnect();

  console.log("3) asking the FDC verifier to prepare the Payment attestation request…");
  let abiEncodedRequest;
  for (let attempt = 1; attempt <= 30; attempt++) {
    const res = await fetch(`${VERIFIER}/verifier/xrp/Payment/prepareRequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
      body: JSON.stringify({
        attestationType: pad32("Payment"),
        sourceId: pad32("testXRP"),
        requestBody: { transactionId: `0x${signed.hash}`, inUtxo: "0", utxo: "0" },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.status === "VALID" && body.abiEncodedRequest) {
      abiEncodedRequest = body.abiEncodedRequest;
      console.log(`   VALID on attempt ${attempt} — request is ${abiEncodedRequest.length / 2 - 1} bytes`);
      break;
    }
    console.log(`   attempt ${attempt}: ${res.status} ${body.status ?? JSON.stringify(body).slice(0, 120)} — waiting 10s`);
    await sleep(10_000);
  }
  if (!abiEncodedRequest) throw new Error("verifier never returned VALID");

  console.log("4) pricing the request via FdcRequestFeeConfigurations on Coston2…");
  const coston2Client = createPublicClient({ transport: http(COSTON2_RPC) });
  const feeWei = await coston2Client.readContract({
    address: FDC_FEE_CONFIG,
    abi: parseAbi(["function getRequestFee(bytes _data) view returns (uint256)"]),
    functionName: "getRequestFee",
    args: [abiEncodedRequest],
  });
  console.log(`   fee: ${feeWei} wei (${Number(feeWei) / 1e18} C2FLR)`);

  console.log("\nPIPELINE VERIFIED ✓");
  console.log(`   XRPL tx:        https://testnet.xrpl.org/transactions/${signed.hash}`);
  console.log("   Verifier:       prepareRequest → VALID");
  console.log("   Fee config:     accepts the encoded request");
}

main().catch((e) => {
  console.error("\nPIPELINE FAILED ✗");
  console.error(e);
  process.exit(1);
});
