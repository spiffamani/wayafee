"use client";

import { http, WagmiProvider, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { coston2 } from "@/lib/chain";

export const wagmiConfig = createConfig({
  chains: [coston2],
  connectors: [
    injected({
      shimDisconnect: true,
      unstable_shimAsyncInject: 3_000,
    }),
  ],
  transports: {
    [coston2.id]: http(),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
