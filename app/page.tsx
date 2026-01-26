"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Shield,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { createPublicClient, defineChain, http } from "viem";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { badBunnzAbi } from "../lib/abi/badBunnz";
import { bridgeAbi } from "../lib/abi/bridge";
import { fetchOwnedNfts, type NftItem } from "../lib/fetchNfts";

type ChainKey = "base" | "mega";

type ChainConfig = {
  chainId: number;
  rpcUrl: string;
  nftAddress: Address | null;
  bridgeAddress: Address | null;
  label: string;
  subLabel: string;
  icon: string;
};

const statusHighlights = [
  { label: "Verification", value: "Automated", icon: Shield },
  { label: "Throughput", value: "500 bunnz/min", icon: Sparkles },
  { label: "Bridge Time", value: "~10-15 sec", icon: Timer },
];

const shortenHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;

const getReadableError = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const err = error as { shortMessage?: string; message?: string };
    if (err.shortMessage) return err.shortMessage;
    if (err.message) return err.message;
  }
  if (typeof error === "string") return error;
  return "Unexpected error. Please try again.";
};


const baseChainId = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? "0x14a34");
const megaChainId = Number(process.env.NEXT_PUBLIC_MEGA_CHAIN_ID ?? "0x18c7");

const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://base-sepolia.drpc.org";
const megaRpcUrl = process.env.NEXT_PUBLIC_MEGA_RPC_URL ?? "https://carrot.megaeth.com/rpc";

// Add fallback addresses from your Railway config
const baseNftAddress = (process.env.NEXT_PUBLIC_BAD_BUNNZ_BASE as Address) ?? ("0xcCc5D02de05A490D949A19be3685F371CB0F8543" as Address);
const megaNftAddress = (process.env.NEXT_PUBLIC_BAD_BUNNZ_MEGA as Address) ?? ("0xefE87bdC8A9eEBA823d530c6328E2A2E318fb41b" as Address);
const baseBridgeAddress = (process.env.NEXT_PUBLIC_ETH_BRIDGE as Address) ?? ("0x713E2060eF942C3681225abf5e176fc1E5AFE31F" as Address);
const megaBridgeAddress = (process.env.NEXT_PUBLIC_MEGA_BRIDGE as Address) ?? ("0x849F736Dfe0385E7c0EC429Cf89e23c316b48f51" as Address);

const baseChain = defineChain({
  id: baseChainId,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [baseRpcUrl] },
    public: { http: [baseRpcUrl] },
  },
});

const megaChain = defineChain({
  id: megaChainId,
  name: "MegaETH Testnet",
  nativeCurrency: { name: "MEGA", symbol: "MEGA", decimals: 18 },
  rpcUrls: {
    default: { http: [megaRpcUrl] },
    public: { http: [megaRpcUrl] },
  },
});

const getBaseClient = () => {
  return createPublicClient({
    chain: baseChain,
    transport: http(baseRpcUrl),
  });
};

const getMegaClient = () => {
  return createPublicClient({
    chain: megaChain,
    transport: http(megaRpcUrl),
  });
};

const CHAIN_CONFIG: Record<ChainKey, ChainConfig> = {
  base: {
    chainId: baseChainId,
    rpcUrl: baseRpcUrl,
    nftAddress: baseNftAddress,
    bridgeAddress: baseBridgeAddress,
    label: "Base Sepolia",
    subLabel: "Base testnet",
    icon: "Ξ",
  },
  mega: {
    chainId: megaChainId,
    rpcUrl: megaRpcUrl,
    nftAddress: megaNftAddress,
    bridgeAddress: megaBridgeAddress,
    label: "MegaETH",
    subLabel: "Permissioned",
    icon: "MΞ",
  },
};

export const dynamic = 'force-dynamic';

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([]);
  const [fromChain, setFromChain] = useState<ChainKey>("base");
  const toChain = fromChain === "base" ? "mega" : "base";
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<`0x${string}` | null>(null);
  const [isSubmittingBridge, setIsSubmittingBridge] = useState(false);
  const activeChainConfig = CHAIN_CONFIG[fromChain];
  const isOnRequiredChain =
    !chainId || chainId === activeChainConfig.chainId || !isConnected;
  const bridgeConfigured = Boolean(
    activeChainConfig.bridgeAddress && activeChainConfig.nftAddress,
  );

  const queryEnabled = Boolean(address) && Boolean(CHAIN_CONFIG[fromChain].nftAddress);

  const {
    data: ownedNfts = [],
    isPending,
    error: nftError,
    refetch,
  } = useQuery<NftItem[]>({
    queryKey: ["nfts", address, fromChain],
    enabled: queryEnabled,
    queryFn: async () => {
      if (!address) return [];
      try {
        const client = fromChain === "base" ? getBaseClient() : getMegaClient();
        const nftAddress = CHAIN_CONFIG[fromChain].nftAddress;
        if (!nftAddress) return [];

        return await fetchOwnedNfts({
          client,
          nftAddress,
          owner: address as Address,
        });
      } catch (error) {
        throw error;
      }
    },
    retry: 2,
  });


  useEffect(() => {
    setSelectedNFTs((current) =>
      current.filter((tokenId) =>
        ownedNfts.some((nft) => nft.tokenId === tokenId),
      ),
    );
  }, [ownedNfts]);

  const toggleNFT = useCallback((tokenId: number) => {
    setSelectedNFTs((current) =>
      current.includes(tokenId)
        ? current.filter((id) => id !== tokenId)
        : [...current, tokenId],
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedNFTs((current) =>
      current.length === ownedNfts.length
        ? []
        : ownedNfts.map((nft) => nft.tokenId),
    );
  }, [ownedNfts]);

  const handleBridge = useCallback(async () => {
    if (!address) {
      setBridgeError("Connect your wallet to bridge.");
      return;
    }
    if (selectedNFTs.length === 0) {
      setBridgeError("Select at least one NFT to bridge.");
      return;
    }

    const chainConfig = CHAIN_CONFIG[fromChain];
    const bridgeAddress = chainConfig.bridgeAddress;
    const nftAddress = chainConfig.nftAddress;

    if (!bridgeAddress || !nftAddress) {
      setBridgeError("Contract addresses missing for this route.");
      return;
    }

    try {
      setIsSubmittingBridge(true);
      setBridgeError(null);
      setBridgeTxHash(null);
      setBridgeStatus("Preparing transaction…");

      if (chainConfig.chainId && chainId !== chainConfig.chainId) {
        if (switchChainAsync) {
          setBridgeStatus(`Switching to ${chainConfig.label}…`);
          await switchChainAsync({ chainId: chainConfig.chainId });
        } else {
          throw new Error(`Please switch to ${chainConfig.label} to continue.`);
        }
      }

      const client = fromChain === "base" ? getBaseClient() : getMegaClient();

      // Check if bridge is paused
      setBridgeStatus("Checking bridge status…");
      const isPaused = (await client.readContract({
        abi: bridgeAbi,
        address: bridgeAddress,
        functionName: "paused",
        args: [],
      })) as boolean;

      if (isPaused) {
        throw new Error("Bridge is currently paused. Please try again later.");
      }

      // Check approval status using bridge helper function (more reliable)
      setBridgeStatus("Checking approval…");
      let approved = false;
      try {
        approved = (await client.readContract({
          abi: bridgeAbi,
          address: bridgeAddress,
          functionName: "isApprovedForAll",
          args: [address as Address],
        })) as boolean;
      } catch {
        // Fallback to NFT contract check if bridge function not available
        approved = (await client.readContract({
          abi: badBunnzAbi,
          address: nftAddress,
          functionName: "isApprovedForAll",
          args: [address as Address, bridgeAddress],
        })) as boolean;
      }

      if (!approved) {
        setBridgeStatus("Approving bridge contract…");
        const approvalHash = await writeContractAsync({
          abi: badBunnzAbi,
          address: nftAddress,
          functionName: "setApprovalForAll",
          args: [bridgeAddress, true],
        });
        await client.waitForTransactionReceipt({ hash: approvalHash });
        setBridgeStatus("Approval confirmed ✓");
      }

      const multiple = selectedNFTs.length > 1;
      const functionName =
        fromChain === "base"
          ? multiple
            ? "batchLockNFT"
            : "lockNFT"
          : multiple
            ? "batchLockNFTForEthereum"
            : "lockNFTForEthereum";

      const args: readonly [bigint, Address] | readonly [bigint[], Address] = multiple
        ? [selectedNFTs.map((tokenId) => BigInt(tokenId)) as bigint[], address as Address]
        : [BigInt(selectedNFTs[0]), address as Address];

      setBridgeStatus("Submitting bridge transaction…");
      const bridgeHash = await writeContractAsync({
        abi: bridgeAbi,
        address: bridgeAddress,
        functionName,
        args,
      });

      setBridgeTxHash(bridgeHash);
      setBridgeStatus("Waiting for confirmation…");
      await client.waitForTransactionReceipt({ hash: bridgeHash });

      setBridgeStatus("Bridge complete ✅");
      setSelectedNFTs([]);
      await refetch();
      setTimeout(() => setBridgeStatus(null), 5000);
    } catch (error) {
      setBridgeError(getReadableError(error));
      setBridgeStatus(null);
    } finally {
      setIsSubmittingBridge(false);
    }
  }, [
    address,
    chainId,
    fromChain,
    refetch,
    selectedNFTs,
    switchChainAsync,
    writeContractAsync,
  ]);

  const bridgeButtonLabel = useMemo(() => {
    if (!isConnected) return "Connect wallet";
    if (!bridgeConfigured) return "Contracts not configured";
    if (selectedNFTs.length === 0) return "Select NFTs to bridge";
    if (!isOnRequiredChain) {
      return `Switch to ${activeChainConfig.label}`;
    }
    if (bridgeStatus) return bridgeStatus;
    return `Bridge ${selectedNFTs.length} selected`;
  }, [
    activeChainConfig.label,
    bridgeConfigured,
    bridgeStatus,
    isConnected,
    isOnRequiredChain,
    selectedNFTs.length,
  ]);

  const disableBridgeButton =
    !isConnected ||
    selectedNFTs.length === 0 ||
    isSubmittingBridge ||
    !bridgeConfigured;

  const gallery = useMemo(() => {
    if (!isConnected) {
      return (
        <div className="grid-surface text-center">
          <Wallet className="mx-auto mb-4 h-10 w-10 text-slate-500" />
          <p>Connect your wallet to surface your Bad Bunnz inventory.</p>
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="grid-surface text-center">
          <p>Fetching inventory on {CHAIN_CONFIG[fromChain].label}…</p>
        </div>
      );
    }

    if (nftError) {
      return (
        <div className="grid-surface text-center">
          <p className="text-red-500">
            Error loading NFTs: {getReadableError(nftError)}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      );
    }

    if (ownedNfts.length === 0) {
      return (
        <div className="grid-surface text-center">
          <p>No Bad Bunnz on {CHAIN_CONFIG[fromChain].label}.</p>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="pill">Inventory</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Your Bad Bunnz
            </h2>
          </div>
          <button
            type="button"
            onClick={selectAll}
            className="btn btn-ghost text-sm uppercase tracking-[0.2em]"
          >
            {selectedNFTs.length === ownedNfts.length
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>
        <div className="nft-grid">
          {ownedNfts.map((nft) => {
            const isSelected = selectedNFTs.includes(nft.tokenId);
            return (
              <button
                key={nft.tokenId}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Toggle ${nft.name}`}
                onClick={() => toggleNFT(nft.tokenId)}
                className={`nft-card ${isSelected ? "selected" : ""}`}
              >
                <div className="relative aspect-square overflow-hidden">
                  {nft.image ? (
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      loading="lazy"
                      className="object-cover"
                      fill
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      Preview unavailable
                    </div>
                  )}
                </div>
                <footer>
                  <span>{nft.name}</span>
                </footer>
                {isSelected && (
                  <span className="absolute right-3 top-3 rounded-full bg-black/80 p-1 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  }, [
    fromChain,
    isConnected,
    isPending,
    ownedNfts,
    selectedNFTs,
    selectAll,
    toggleNFT,
  ]);

  return (
    <div className="app-shell">
      {/* Sticky bunny in bottom right */}
      <div className="fixed bottom-0 right-0 z-50 pointer-events-none">
        <Image
          src="/bunn1.png"
          alt=""
          width={600}
          height={600}
          className="opacity-90 hover:opacity-100 transition-opacity"
        />
      </div>
      
      <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="pill">WORLD</span>
            <span className="pill">BUNNZIFICATION</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 fade-in relative">
        {/* Decorative bunny images */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-5">
          <Image
            src="/bunn1.png"
            alt=""
            width={200}
            height={200}
            className="absolute -left-20 top-20 rotate-12"
            style={{ filter: 'grayscale(100%)' }}
          />
          <Image
            src="/bunn2.png"
            alt=""
            width={200}
            height={200}
            className="absolute -right-20 bottom-20 -rotate-12"
            style={{ filter: 'grayscale(100%)' }}
          />
        </div>
        <section className="grid gap-10 lg:grid-cols-[0.9fr,1.1fr]" id="bridge">
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="badge">Bridge</span>
              <h1 className="hero-title text-4xl leading-tight">
                Bridge your Bad Bunnz instantly
              </h1>
              <p className="hero-subtitle text-base">
                Transfer your NFTs between Base Sepolia and MegaETH testnets
                securely with automated verification.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {statusHighlights.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-black/10 bg-white/90 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <div className="mt-2 text-xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bridge-panel space-y-6">
              <div className="flex items-center justify-between">
                <h3>Bridge setup</h3>
                <button
                  type="button"
                  className="pill btn-ghost"
                  onClick={() =>
                    setFromChain((prev) => (prev === "base" ? "mega" : "base"))
                  }
                >
                  Swap direction
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 rounded-2xl border border-black/10 bg-white/80 p-4">
                    <div className="text-xs uppercase tracking-[0.4em] text-slate-500">
                      From
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                        {CHAIN_CONFIG[fromChain].icon}
                      </span>
                      <div>
                        <p className="font-semibold">
                          {CHAIN_CONFIG[fromChain].label}
                        </p>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          {CHAIN_CONFIG[fromChain].subLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white/80 p-3">
                    <ArrowRight className="h-5 w-5 text-black" />
                  </span>
                  <div className="flex-1 rounded-2xl border border-black/10 bg-white/80 p-4">
                    <div className="text-xs uppercase tracking-[0.4em] text-slate-500">
                      To
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="rounded-full bg-slate-600 px-3 py-1 text-sm font-semibold text-white">
                        {CHAIN_CONFIG[toChain].icon}
                      </span>
                      <div>
                        <p className="font-semibold">
                          {CHAIN_CONFIG[toChain].label}
                        </p>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          {CHAIN_CONFIG[toChain].subLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Selected
                      </p>
                      <p
                        className="text-3xl font-semibold"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {selectedNFTs.length}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        ETA
                      </p>
                      <p className="text-lg font-semibold">~10-15 sec</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={disableBridgeButton}
                    aria-busy={isSubmittingBridge}
                    onClick={handleBridge}
                    className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {bridgeButtonLabel}
                  </button>
                  {bridgeError && (
                    <p className="text-sm text-red-500" role="alert">
                      {bridgeError}
                    </p>
                  )}
                  {bridgeTxHash && (
                    <p className="text-xs font-mono text-slate-500">
                      Tx hash: {shortenHash(bridgeTxHash)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">{gallery}</div>
        </section>
      </main>
    </div>
  );
}
