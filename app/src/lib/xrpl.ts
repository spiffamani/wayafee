/**
 * XRPL testnet helpers for the payment leg of an FXRP mint.
 *
 * Two ways to pay:
 *  - Auto-pay: a testnet seed signs in the browser (seed never leaves the page).
 *    Deterministic — the memo and exact drops are set programmatically, which
 *    removes the two classic ways people lose money (wrong reference, underpay).
 *  - Manual: copyable payment details + QR for an external wallet (e.g. Xaman
 *    in testnet mode). The UI hard-gates progression behind an exact-amount
 *    confirmation.
 */
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XRPL_WSS } from "./chain";

export interface XrplPaymentParams {
  /** Agent's XRPL address from CollateralReserved. */
  destination: string;
  /** Exact amount in drops (valueUBA + feeUBA). */
  drops: bigint;
  /** 32-byte payment reference (0x-prefixed) — becomes the XRPL memo. */
  paymentReference: `0x${string}`;
}

export function memoHex(paymentReference: `0x${string}`): string {
  return paymentReference.slice(2).toUpperCase();
}

export function dropsToXrpString(drops: bigint): string {
  const whole = drops / 1_000_000n;
  const frac = (drops % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Create and fund a brand-new XRPL testnet wallet from the public faucet. */
export async function fundTestnetWallet(): Promise<{ address: string; seed: string; balanceXrp: string }> {
  const client = new Client(XRPL_WSS);
  await client.connect();
  try {
    const { wallet, balance } = await client.fundWallet();
    return { address: wallet.address, seed: wallet.seed!, balanceXrp: String(balance) };
  } finally {
    await client.disconnect();
  }
}

export async function getXrpBalance(address: string): Promise<string | null> {
  const client = new Client(XRPL_WSS);
  await client.connect();
  try {
    return await client.getXrpBalance(address).then(String);
  } catch {
    return null;
  } finally {
    await client.disconnect();
  }
}

export interface XrplPaymentResult {
  txHash: string;
  validated: boolean;
  resultCode: string;
}

/**
 * Sign and submit the mint payment from a testnet seed, with the payment
 * reference attached as a memo and the amount set to the exact drops required.
 */
export async function sendMintPayment(
  seed: string,
  params: XrplPaymentParams
): Promise<XrplPaymentResult> {
  const client = new Client(XRPL_WSS);
  await client.connect();
  try {
    const wallet = Wallet.fromSeed(seed.trim());
    const prepared = await client.autofill({
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: params.destination,
      Amount: params.drops.toString(),
      Memos: [{ Memo: { MemoData: memoHex(params.paymentReference) } }],
    });
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    const meta = result.result.meta;
    const resultCode =
      typeof meta === "object" && meta !== null && "TransactionResult" in meta
        ? String(meta.TransactionResult)
        : "unknown";
    return {
      txHash: signed.hash,
      validated: Boolean(result.result.validated),
      resultCode,
    };
  } finally {
    await client.disconnect();
  }
}

export { xrpToDrops };
