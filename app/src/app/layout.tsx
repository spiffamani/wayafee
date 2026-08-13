import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["500", "600", "700", "800"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Wayafee — send XRP home as FXRP",
  description:
    "Guided FXRP on-ramp for remittance and savings. Mint on Flare in four steps, then split to saved contacts in one transaction.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#161014",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers>
          <div className="bg-amber-dim text-amber z-40 border-b border-line px-4 py-2 text-center text-[11px] font-semibold sm:text-xs">
            Coston2 testnet · this is play money. Do not send real XRP.
          </div>
          <Header />
          <main className="min-w-0 flex-1 pb-[5.75rem] md:pb-0">{children}</main>
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
