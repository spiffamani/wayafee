# Wayafee

**A guided FXRP on-ramp built for remittance and savings — not generic minting.**

Minting FXRP today requires two separate wallets (an EVM wallet for Flare, an XRPL wallet for the
payment), a cross-chain transfer carrying an easy-to-miss 32-byte payment reference, and a
multi-minute attestation wait — friction that keeps everyday XRP holders out of Flare DeFi.

Wayafee turns that into one guided flow: connect both sides, send XRP with the payment details
generated for you, watch honest real-time status while Flare verifies the payment — and the moment
your FXRP lands, split it across saved contacts in a single atomic transaction. Built for XRP
holders in emerging markets (Nigeria specifically) who want to move value cross-border or protect
savings from currency volatility.

Submission for **Flare Summer Signal — Bounty 1: Interoperable Asset Products**.

---

## What's in the box

```
wayafee/
├── contracts/          Hardhat (TypeScript)
│   ├── contracts/SplitRemit.sol      ← Wayafee's own contract (newly built)
│   ├── test/SplitRemit.test.ts       ← 11 passing unit tests
│   └── scripts/
│       ├── deploy.ts                 ← Coston2 deployment
│       └── probe-fassets.ts          ← live on-chain address/agent probe
├── app/                Next.js 15 + wagmi/viem
│   ├── src/app/mint/                 ← guided 4-step mint wizard
│   ├── src/app/split/                ← contacts + split plans + execution
│   ├── src/app/api/fdc/              ← verifier & DA-layer proxies
│   └── src/lib/                      ← FAssets, FDC, XRPL integration modules
└── scripts/verify-fdc-pipeline.mjs   ← live end-to-end pipeline smoke test
```

## How a mint works (the four real steps, guided)

1. **Reserve** — Wayafee scans live agents on the FAssets `AssetManagerFXRP`, auto-selects the
   cheapest one with free lots, and calls `reserveCollateral`. The `CollateralReserved` event fixes
   the exact XRP due, the agent's XRPL address, and the payment reference.
2. **Pay XRP** — the exact amount and the 32-byte reference (as memo) are **generated, never
   hand-typed** — the two classic ways to lose money in this flow (wrong reference, underpayment)
   are structurally removed. Auto-pay signs with a testnet seed locally in the browser; manual mode
   hard-gates progression behind an exact-amount confirmation.
3. **Attest** — the Flare Data Connector verifies the XRPL payment: verifier `prepareRequest` →
   paid `FdcHub.requestAttestation` → `Relay` voting-round polling → Merkle proof from the data
   availability layer. The UI shows each sub-step with honest "90–180 seconds" messaging, and all
   progress survives page refreshes (localStorage).
4. **Execute** — `executeMinting(proof, reservationId)` mints FXRP 1:1 to your Flare address. The
   success screen leads straight into SplitRemit: *"Split it to your contacts now."*

## SplitRemit — what's newly built

`SplitRemit.sol` (~150 lines, no admin role, holds no funds between transactions):

- **Saved plans** — `createPlan("Family — Lagos", [mum, rent, savings], [5000, 3000, 2000])`
  stores named percentage splits on-chain, reusable for every future mint.
- **Atomic execution** — `executePlan` pulls FXRP from the sender and fans it out in one
  transaction. Rounding dust always goes to the first recipient, so the split sums exactly.
- **Ad hoc splits** — `splitNow` for one-off distributions without saving a plan.
- Anyone can fund any active plan — a relative abroad can pay directly into a family's saved split.

Test suite covers share validation (sum, zero address, zero share, length, max recipients), exact
proportional distribution, dust assignment, `previewSplit` consistency, plan lifecycle, and
third-party funding. Run with `npm test`.

## Verified against live infrastructure (not docs)

Everything the app touches was probed live on Coston2 (`contracts/scripts/probe-fassets.ts`) and
exercised by `scripts/verify-fdc-pipeline.mjs`:

| Item | Result |
|---|---|
| `AssetManagerFXRP` (from on-chain `FlareContractRegistry`) | `0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA` |
| FTestXRP (FXRP) token | `0x0b6A3645c240605887a5532109323A3E12273dc7` (6 decimals) |
| Lot size / reservation fee | 10 XRP / ~1.69 C2FLR per lot |
| Live agents with free lots | 4 (fees 0.25%) |
| XRPL testnet payment with 32-byte memo | `tesSUCCESS` ([tx](https://testnet.xrpl.org/transactions/4D343056BB7CF9C52EC92279454895850090CF81CB976F72EDAE8A5186C8670E)) |
| FDC verifier `prepareRequest` for that payment | `VALID` (~10 s after ledger close) |
| `FdcRequestFeeConfigurations.getRequestFee` | prices the encoded request |

ABI structs (including the full `IPayment.Proof` tuple for `executeMinting`) are transcribed from
`@flarenetwork/flare-periphery-contracts` (coston2), the same interfaces the deployed system uses.

## Quickstart

```bash
npm install

# contracts
npm test -w contracts                      # 11 passing
cp contracts/.env.example contracts/.env   # add a funded Coston2 key
npm run deploy:coston2 -w contracts        # prints SplitRemit address

# app
cp app/.env.example app/.env.local         # set NEXT_PUBLIC_SPLITREMIT_ADDRESS
npm run dev -w app                         # http://localhost:3000
```

Day-zero runbook for a live demo:

1. Get C2FLR at [faucet.flare.network/coston2](https://faucet.flare.network/coston2) for
   (a) the deployer key and (b) your MetaMask account. One faucet claim covers many mints —
   a 1-lot mint needs ~1.7 C2FLR reservation fee plus gas.
2. Deploy SplitRemit, set the env var, start the app.
3. On `/mint`: click **New funded test wallet** on the pay step — the XRPL testnet faucet funds it
   automatically (verified working), so the whole demo needs no pre-existing XRP.
4. On `/split`: add contacts, save a plan, and split the freshly minted FXRP.

## Deliberately cut (roadmap, not silently dropped)

- Redemption flow (FXRP → XRP)
- SavingsLock contract
- Multi-asset support (FBTC, FDOGE)
- Backend / multi-device contact sync (contacts are localStorage-only by design)
- Xaman deep-link signing (manual mode covers external wallets; deep links need a Xaman API server)

## Useful links

- [FAssets developer docs](https://dev.flare.network/fassets/overview)
- [FDC attestation types](https://dev.flare.network/fdc/overview)
- [Coston2 explorer](https://coston2-explorer.flare.network) · [Coston2 faucet](https://faucet.flare.network/coston2) · [XRPL testnet explorer](https://testnet.xrpl.org)

Testnet software — do not use real funds.
