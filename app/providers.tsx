"use client";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { defineChain } from "viem";
import { WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

const megaChainId = Number(process.env.NEXT_PUBLIC_MEGA_CHAIN_ID ?? "0x18c7");
const megaRpcUrl =
  process.env.NEXT_PUBLIC_MEGA_RPC_URL ?? "https://carrot.megaeth.com/rpc";

const megaEthTestnet = defineChain({
  id: megaChainId,
  name: "MegaETH Testnet",
  nativeCurrency: { name: "MEGA", symbol: "MEGA", decimals: 18 },
  rpcUrls: {
    default: { http: [megaRpcUrl] },
    public: { http: [megaRpcUrl] },
  },
});

const walletConnectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "2f93b0d4e8dfea2ea6be0edb2f0d0104";

const config = getDefaultConfig({
  appName: "Bad Bunnz Bridge",
  projectId: walletConnectId,
  chains: [baseSepolia, megaEthTestnet],
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
