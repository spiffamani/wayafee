import Link from "next/link";
import { PageShell } from "@/components/Brand";

const steps = [
  {
    n: "01",
    title: "Reserve",
    body: "We pick a live Flare agent with free lots and lock collateral. One click.",
  },
  {
    n: "02",
    title: "Pay XRP",
    body: "Exact amount and payment reference are generated. You never type either by hand.",
  },
  {
    n: "03",
    title: "Attest",
    body: "Flare’s Data Connector checks the XRPL payment. You see the round, not a spinner.",
  },
  {
    n: "04",
    title: "Mint & split",
    body: "FXRP lands in your wallet, then fans out to saved contacts in one transaction.",
  },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 8.2L7 10.2L11 5.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WireBackdrop() {
  return (
    <svg className="hero-wire" viewBox="0 0 1200 700" fill="none" aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
      <path
        d="M-20 420 C 180 420, 220 180, 420 180 S 680 520, 900 320 S 1180 80, 1280 80"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="7 10"
      />
      <circle cx="420" cy="180" r="7" fill="#e4265b" />
      <circle cx="900" cy="320" r="7" fill="#1aa36a" />
    </svg>
  );
}

export default function Home() {
  return (
    <div>
      <section className="hero-night min-h-[calc(100dvh-7.25rem)]">
        <WireBackdrop />
        <div className="page-inner relative grid min-h-[calc(100dvh-7.25rem)] items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16 lg:py-6">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <p className="eyebrow text-cream/55">FXRP on-ramp · Flare FAssets</p>
            <h1 className="display-serif text-[clamp(2.85rem,6.4vw+0.6rem,6.75rem)] leading-[0.95] font-semibold">
              Send it home.
              <span className="mt-2 block text-flare">Already split.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-cream/72 sm:text-lg">
              Two wallets, a 32-byte memo you can mistype, a wait nobody explains. Wayafee walks
              the mint — then splits the FXRP to the people you actually send money to.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/mint" className="btn-primary w-full sm:w-auto">
                Mint FXRP
              </Link>
              <Link
                href="/split"
                className="btn-ghost w-full border-cream/40 text-cream hover:bg-cream hover:text-night sm:w-auto"
              >
                Set up a split
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 pt-1 text-cream/70 sm:flex-row sm:flex-wrap sm:gap-x-7">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckIcon /> Flare’s audited FAssets
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckIcon /> Every mint is on-chain
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckIcon /> Coston2 · no real funds
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:max-w-none">
            <div className="receipt text-ink">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ledger">Transfer complete</p>
                  <p className="amount mt-3 text-5xl sm:text-6xl">120.00</p>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    XRP sent · 119.40 FXRP received
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ledger-dim text-ledger">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3.5 8.2L6.4 11.1L12.5 4.8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <dl className="mt-6">
                <div className="ledger-row">
                  <dt>To</dt>
                  <dd>Mum · rent · savings</dd>
                </div>
                <div className="ledger-row">
                  <dt>Route</dt>
                  <dd>XRPL → Coston2</dd>
                </div>
                <div className="ledger-row">
                  <dt>Reference</dt>
                  <dd className="mono text-sm">0x4f2a…9c31</dd>
                </div>
                <div className="ledger-row">
                  <dt>Network</dt>
                  <dd>Coston2 testnet</dd>
                </div>
              </dl>
            </div>
            <p className="mt-3 text-center text-xs text-cream/50">
              A real mint looks like this. You can open it on the explorer.
            </p>
          </div>
        </div>
      </section>

      <PageShell className="space-y-12 py-14 sm:space-y-16 sm:py-20">
        <section>
          <p className="eyebrow mb-6">How the money moves</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="card flex min-w-0 gap-4 p-5 sm:flex-col sm:gap-3 sm:p-6">
                <p className="font-display text-sm font-extrabold text-flare">{s.n}</p>
                <div>
                  <h3 className="text-lg font-extrabold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card grid gap-8 p-6 sm:p-8 md:grid-cols-3 md:gap-10 md:p-10">
          <div>
            <p className="eyebrow text-flare mb-2">The snag</p>
            <p className="text-sm leading-relaxed text-muted">
              Two wallets, an exact amount, and a 32-byte memo. Miss either and the mint fails —
              that’s why most XRP holders never touch Flare.
            </p>
          </div>
          <div>
            <p className="eyebrow text-flare mb-2">What we changed</p>
            <p className="text-sm leading-relaxed text-muted">
              One screen, four honest steps. Amount and reference are generated. Underpayment is
              blocked before you can send.
            </p>
          </div>
          <div>
            <p className="eyebrow text-flare mb-2">What we built</p>
            <p className="text-sm leading-relaxed text-muted">
              SplitRemit — a small contract that splits incoming FXRP across saved contacts by
              percentage, atomically. That’s the remittance part.
            </p>
          </div>
        </section>

        <p className="pb-4 text-xs text-muted">
          Wayafee · Flare Summer Signal. Minting runs on Flare’s audited FAssets AssetManager.
          SplitRemit is ours. Testnet only.
        </p>
      </PageShell>
    </div>
  );
}
