import { defineChain } from "viem";

/**
 * Flare Coston2 testnet.
 * All FAssets/FDC addresses below were resolved live from the on-chain
 * FlareContractRegistry (0xaD67...6019) — see contracts/scripts/probe-fassets.ts.
 */
export const coston2 = defineChain({
  id: 114,
  name: "Flare Testnet Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
});

export const ADDRESSES = {
  /** Same address on every Flare network. */
  flareContractRegistry: "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019",
  /** FAssets asset manager for FXRP (registry name: AssetManagerFXRP). */
  assetManagerFXRP: "0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA",
  /** The FXRP token itself (FTestXRP on Coston2, 6 decimals). */
  fxrp: "0x0b6A3645c240605887a5532109323A3E12273dc7",
  fdcHub: "0x48aC463d7975828989331F4De43341627b9c5f1D",
  fdcRequestFeeConfigurations: "0x191a1282Ac700edE65c5B0AaF313BAcC3eA7fC7e",
  relay: "0xa10B672D1c62e5457b17af63d4302add6A99d7dE",
  /** Wayafee's own contract — set after `npm run deploy:coston2 -w contracts`. */
  splitRemit: (process.env.NEXT_PUBLIC_SPLITREMIT_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

export const FXRP_DECIMALS = 6;

/** FDC protocol id (fixed across Flare networks). */
export const FDC_PROTOCOL_ID = 200;

/** XRPL testnet — the underlying chain for FTestXRP on Coston2. */
export const XRPL_WSS =
  process.env.NEXT_PUBLIC_XRPL_WSS ?? "wss://s.altnet.rippletest.net:51233";
export const XRPL_EXPLORER = "https://testnet.xrpl.org";

export const EXPLORER = "https://coston2-explorer.flare.network";
