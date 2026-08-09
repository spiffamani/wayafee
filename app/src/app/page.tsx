import Link from "next/link";

const steps = [
  {
    n: "1",
    title: "Reserve",
    body: "Pick lots; Wayafee auto-selects the cheapest live agent and reserves collateral on Flare in one click.",
  },
  {
    n: "2",
    title: "Pay XRP",
    body: "Exact amount and payment reference are generated for you — never hand-typed, so the two classic ways to lose money are gone.",
  },
  {
    n: "3",
    title: "Attest",
    body: "Flare's Data Connector verifies your XRPL payment. We show honest minutes-scale progress, not a silent spinner.",
  },
  {
    n: "4",
    title: "Mint & split",
    body: "Execute the mint, then fan the FXRP out to saved contacts in one atomic transaction with SplitRemit.",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="pt-8 text-center space-y-6">
        <p className="text-sm uppercase tracking-[0.2em] text-flare font-semibold">
          FXRP on-ramp · built on Flare FAssets
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl mx-auto">
          Send XRP home.
          <br />
          It lands as <span className="text-flare">split, spendable FXRP</span>.
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Minting FXRP normally means two wallets, a cross-chain payment with an easy-to-miss
          reference, and a silent multi-minute wait. Wayafee turns it into one guided flow — and
          the moment your FXRP lands, it can split across your saved contacts automatically. Built
          for XRP holders sending money home or saving outside a volatile local currency.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/mint" className="btn-primary">
            Start a guided mint
          </Link>
          <Link href="/split" className="btn-ghost">
            Set up a split plan
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s) => (
          <div key={s.n} className="card p-5 space-y-2">
            <div className="w-8 h-8 rounded-full bg-flare/15 text-flare flex items-center justify-center font-bold">
              {s.n}
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-sm text-gray-400">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="card p-8 grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-semibold mb-2 text-flare">Why people bounce off FXRP</h3>
          <p className="text-sm text-gray-400">
            You need an EVM wallet on Flare <em>and</em> an XRPL wallet, and the payment must carry
            an exact 32-byte reference with an exact amount. Get either wrong and the mint fails —
            or worse, the reservation defaults.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-flare">What Wayafee does about it</h3>
          <p className="text-sm text-gray-400">
            One screen tracks all four real steps. The reference and amount are generated, never
            typed. Underpayment is hard-blocked. The attestation wait shows real round status from
            Flare&apos;s Relay contract.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-flare">What&apos;s newly built</h3>
          <p className="text-sm text-gray-400">
            SplitRemit — a small, tested contract that atomically splits incoming FXRP across saved
            contacts by percentage. Your first mint already does what a remittance actually needs.
          </p>
        </div>
      </section>
    </div>
  );
}
