"use client";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { defineChain } from "viem";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

const megaChainId = Number(process.env.NEXT_PUBLIC_MEGA_CHAIN_ID ?? "0x18c7");
const megaRpcUrl =
  process.env.NEXT_PUBLIC_MEGA_RPC_URL ?? "https://carrot.megaeth.com/rpc";

const megaEth = defineChain({
  id: megaChainId,
  name: "MegaETH",
  nativeCurrency: { name: "MEGA", symbol: "MEGA", decimals: 18 },
  rpcUrls: {
    default: { http: [megaRpcUrl] },
    public: { http: [megaRpcUrl] },
  },
});

const walletConnectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "8f13f7d27e77938d29a672397521582b";

const config = getDefaultConfig({
  appName: "Bad Bunnz Bridge",
  projectId: walletConnectId,
  chains: [mainnet, megaEth],
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
