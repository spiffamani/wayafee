"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { CopyField } from "@/components/CopyField";
import { totalPaymentDrops, type Reservation } from "@/lib/fassets";
import {
  dropsToXrpString,
  fundTestnetWallet,
  memoHex,
  sendMintPayment,
} from "@/lib/xrpl";
import { XRPL_EXPLORER } from "@/lib/chain";

type Mode = "auto" | "manual";

export function StepPay({
  reservation,
  onPaid,
}: {
  reservation: Reservation;
  onPaid: (xrplTxHash: string) => void;
}) {
  const drops = totalPaymentDrops(reservation);
  const xrpAmount = dropsToXrpString(drops);
  const memo = memoHex(reservation.paymentReference);

  const [mode, setMode] = useState<Mode>("auto");
  const [seed, setSeed] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundedInfo, setFundedInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual mode
  const [manualTx, setManualTx] = useState("");
  const [confirmedExact, setConfirmedExact] = useState(false);

  const [deadline, setDeadline] = useState<string>("");
  useEffect(() => {
    const ts = Number(reservation.lastUnderlyingTimestamp);
    if (!Number.isFinite(ts) || ts === 0) return;
    const update = () => {
      const secondsLeft = Math.floor(ts - Date.now() / 1000);
      setDeadline(
        secondsLeft > 0
          ? `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s left to pay`
          : "Payment window may have expired — the reservation can default"
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [reservation.lastUnderlyingTimestamp]);

  async function autoPay() {
    setError(null);
    try {
      setBusy("Connecting to XRPL testnet…");
      const result = await sendMintPayment(seed, {
        destination: reservation.paymentAddress,
        drops,
        paymentReference: reservation.paymentReference,
      });
      if (result.resultCode !== "tesSUCCESS") {
        throw new Error(`XRPL payment failed with ${result.resultCode}`);
      }
      onPaid(result.txHash);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function fund() {
    setError(null);
    setFunding(true);
    try {
      const w = await fundTestnetWallet();
      setSeed(w.seed);
      setFundedInfo(`Created ${w.address} with ${w.balanceXrp} test XRP (seed filled in below).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFunding(false);
    }
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Pay the exact XRP amount</h2>
        <p className="text-sm text-gray-400 mt-1">
          Your reservation is locked on Flare (
          <span className="mono">id {reservation.collateralReservationId}</span>). Now send{" "}
          <span className="text-white font-semibold">{xrpAmount} XRP</span> on the XRPL testnet
          with the payment reference attached. Both are generated — never typed by hand.
        </p>
        {deadline && <p className="text-xs text-amber mt-2">{deadline}</p>}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-3">
          <CopyField label="Destination (agent's XRPL address)" value={reservation.paymentAddress} />
          <CopyField
            label={`Amount — exactly ${xrpAmount} XRP (${drops.toString()} drops)`}
            value={xrpAmount}
            warn="underpaying forfeits the reservation"
          />
          <CopyField
            label="Payment reference — attach as memo (hex)"
            value={memo}
            warn="wrong/missing memo = failed mint"
          />
        </div>
        <div className="bg-white p-3 rounded-xl mx-auto">
          <QRCode value={reservation.paymentAddress} size={140} />
          <p className="text-[10px] text-gray-600 text-center mt-1 max-w-[140px]">
            destination address only — amount &amp; memo must match exactly
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-line">
        {(
          [
            ["auto", "Auto-pay (testnet seed)"],
            ["manual", "I paid with my own wallet"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              mode === m
                ? "border-flare text-white"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "auto" ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Paste an XRPL <strong>testnet</strong> seed. It signs locally in your browser and is
            never sent anywhere. The payment goes out with the exact amount and memo above — no way
            to get either wrong.
          </p>
          <div className="flex gap-3">
            <input
              className="input mono"
              type="password"
              placeholder="sEd… (testnet seed)"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
            <button className="btn-ghost whitespace-nowrap" onClick={fund} disabled={funding}>
              {funding ? "Funding…" : "New funded test wallet"}
            </button>
          </div>
          {fundedInfo && <p className="text-xs text-mint">{fundedInfo}</p>}
          {error && <p className="text-sm text-red-400 break-all">{error}</p>}
          <button
            className="btn-primary w-full"
            disabled={!seed.trim() || busy !== null}
            onClick={autoPay}
          >
            {busy ?? `Send exactly ${xrpAmount} XRP`}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Sent it from Xaman (testnet mode) or another XRPL wallet? Paste the transaction hash.
            The Flare Data Connector will verify the amount and reference on-chain — nothing is
            taken on trust.
          </p>
          <input
            className="input mono"
            placeholder="XRPL transaction hash (64 hex chars)"
            value={manualTx}
            onChange={(e) => setManualTx(e.target.value.trim())}
          />
          <label className="flex items-start gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmedExact}
              onChange={(e) => setConfirmedExact(e.target.checked)}
            />
            I sent <strong>exactly {xrpAmount} XRP</strong> to the address above with the memo
            attached — not less, not more.
          </label>
          {error && <p className="text-sm text-red-400 break-all">{error}</p>}
          <button
            className="btn-primary w-full"
            disabled={!/^[0-9a-fA-F]{64}$/.test(manualTx) || !confirmedExact}
            onClick={() => onPaid(manualTx)}
          >
            Continue to verification
          </button>
          {manualTx && /^[0-9a-fA-F]{64}$/.test(manualTx) && (
            <a
              className="text-xs text-flare underline"
              href={`${XRPL_EXPLORER}/transactions/${manualTx}`}
              target="_blank"
              rel="noreferrer"
            >
              view on XRPL testnet explorer ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
