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
  onRestart,
}: {
  reservation: Reservation;
  onPaid: (xrplTxHash: string) => void;
  onRestart: () => void;
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

  const [manualTx, setManualTx] = useState("");
  const [confirmedExact, setConfirmedExact] = useState(false);

  const [deadline, setDeadline] = useState<string>("");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const ts = Number(reservation.lastUnderlyingTimestamp);
    if (!Number.isFinite(ts) || ts === 0) return;
    const update = () => {
      const secondsLeft = Math.floor(ts - Date.now() / 1000);
      if (secondsLeft > 0) {
        setExpired(false);
        setDeadline(
          `Pay now — ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s left. This is a deadline, not a wait.`
        );
      } else {
        setExpired(true);
        setDeadline("");
      }
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
    <div className="card space-y-6 p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-extrabold">Send this exact amount</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Reservation{" "}
          <span className="mono font-semibold text-ink">#{reservation.collateralReservationId}</span>{" "}
          is locked. Send the amount below on XRPL testnet with the memo attached — both are
          generated, not typed.
        </p>
        {deadline && !expired && <p className="msg-warn mt-3">{deadline}</p>}
        {expired && (
          <div className="msg-warn mt-3 space-y-3">
            <p>
              Time ran out. That countdown was how long you had to send the XRP — you pay while it
              ticks, you don’t wait for zero. This reservation can default now.
            </p>
            <button type="button" className="btn-primary" onClick={onRestart}>
              Start a new mint
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-surface-2 px-4 py-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Amount due</p>
        <p className="amount mt-2 text-4xl sm:text-5xl">{xrpAmount}</p>
        <p className="mt-1 text-sm font-semibold text-muted">XRP</p>
      </div>

      <div className="grid items-start gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <CopyField label="Destination (agent XRPL address)" value={reservation.paymentAddress} />
          <CopyField
            label={`Amount — exactly ${xrpAmount} XRP`}
            value={xrpAmount}
            warn="underpaying forfeits the reservation"
          />
          <CopyField
            label="Payment reference — attach as memo (hex)"
            value={memo}
            warn="wrong or missing memo = failed mint"
          />
        </div>
        <div className="mx-auto rounded-2xl bg-white p-3">
          <QRCode value={reservation.paymentAddress} size={132} />
          <p className="mt-2 max-w-[132px] text-center text-[10px] leading-snug text-muted">
            Address only. Amount and memo still have to match.
          </p>
        </div>
      </div>

      <div className="seg">
        <button type="button" data-on={mode === "auto"} onClick={() => setMode("auto")}>
          Auto-pay (test seed)
        </button>
        <button type="button" data-on={mode === "manual"} onClick={() => setMode("manual")}>
          I paid myself
        </button>
      </div>

      {mode === "auto" ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            Paste an XRPL <strong className="text-ink">testnet</strong> seed. It signs in this
            browser and never leaves the machine. Payment goes out with the exact amount and memo
            above.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input mono"
              type="password"
              placeholder="sEd… (testnet seed)"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
            <button
              className="btn-ghost whitespace-nowrap"
              onClick={fund}
              disabled={funding}
            >
              {funding ? "Funding…" : "New funded test wallet"}
            </button>
          </div>
          {fundedInfo && <p className="msg-ok">{fundedInfo}</p>}
          {error && <p className="msg-error">{error}</p>}
          <button
            className="btn-primary w-full"
            disabled={expired || !seed.trim() || busy !== null}
            onClick={autoPay}
          >
            {busy ?? `Send exactly ${xrpAmount} XRP`}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            Paid from Xaman (testnet) or another XRPL wallet? Paste the transaction hash. Flare
            checks amount and reference on-chain — nothing is taken on trust.
          </p>
          <input
            className="input mono"
            placeholder="XRPL transaction hash (64 hex chars)"
            value={manualTx}
            onChange={(e) => setManualTx(e.target.value.trim())}
          />
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--color-flare)]"
              checked={confirmedExact}
              onChange={(e) => setConfirmedExact(e.target.checked)}
            />
            <span>
              I sent <strong>exactly {xrpAmount} XRP</strong> to the address above with the memo
              attached — not less, not more.
            </span>
          </label>
          {error && <p className="msg-error">{error}</p>}
          <button
            className="btn-primary w-full"
            disabled={expired || !/^[0-9a-fA-F]{64}$/.test(manualTx) || !confirmedExact}
            onClick={() => onPaid(manualTx)}
          >
            Continue to verification
          </button>
          {manualTx && /^[0-9a-fA-F]{64}$/.test(manualTx) && (
            <a
              className="inline-block text-xs font-semibold text-flare underline"
              href={`${XRPL_EXPLORER}/transactions/${manualTx}`}
              target="_blank"
              rel="noreferrer"
            >
              View on XRPL testnet explorer
            </a>
          )}
        </div>
      )}
    </div>
  );
}
