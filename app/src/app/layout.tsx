import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Wayafee — guided FXRP on-ramp for remittance & savings",
  description:
    "Mint FXRP on Flare through one guided flow — both wallets, exact payment details, live attestation status — then split it to saved contacts the moment it lands.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <Header />
          <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 py-10 text-xs text-gray-500 border-t border-line/60">
            Wayafee — built for Flare Summer Signal. FAssets minting runs on Flare&apos;s audited
            AssetManager; SplitRemit is Wayafee&apos;s own contract. Testnet software — do not use
            real funds.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
