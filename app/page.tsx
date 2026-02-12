"use client";

import { Header } from "../components/Header";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Loader2,
  Shield,
  Sparkles,
  Timer,
  Wallet,
  X,
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
import { fetchOwnedNfts, fetchOwnedNftsViaAlchemy, getAlchemyApiKeyFromRpc, type NftItem } from "../lib/fetchNfts";

type ChainKey = "base" | "mega";

type ChainConfig = {
  chainId: number;
  rpcUrl: string;
  nftAddress: Address | null;
  bridgeAddress: Address | null;
  label: string;
  subLabel: string;
  icon: string;
  iconPath?: string;
};

/** Max NFTs per bridge tx (gas-safe; contracts have no hard limit). */
const MAX_BRIDGE_BATCH = 20;

const statusHighlights = [
  { label: "Verification", value: "Automated", icon: Shield },
  { label: "Throughput", value: "500 bunnz/min", icon: Sparkles },
  { label: "Bridge Time", value: "~60 sec", icon: Timer },
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


const baseChainId = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID as string);
const megaChainId = Number(process.env.NEXT_PUBLIC_MEGA_CHAIN_ID as string);

const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL as string;
const megaRpcUrl = process.env.NEXT_PUBLIC_MEGA_RPC_URL as string;

const baseNftAddress = (process.env.NEXT_PUBLIC_BAD_BUNNZ_BASE as Address);
const megaNftAddress = (process.env.NEXT_PUBLIC_BAD_BUNNZ_MEGA as Address);
const baseBridgeAddress = (process.env.NEXT_PUBLIC_ETH_BRIDGE as Address);
const megaBridgeAddress = (process.env.NEXT_PUBLIC_MEGA_BRIDGE as Address);

const baseChain = defineChain({
  id: baseChainId,
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [baseRpcUrl] },
    public: { http: [baseRpcUrl] },
  },
});

const megaChain = defineChain({
  id: megaChainId,
  name: "MegaETH",
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
    label: "Ethereum",
    subLabel: "ETH mainnet",
    icon: "Ξ",
    iconPath: "/eth-logo.png",
  },
  mega: {
    chainId: megaChainId,
    rpcUrl: megaRpcUrl,
    nftAddress: megaNftAddress,
    bridgeAddress: megaBridgeAddress,
    label: "MegaETH",
    subLabel: "MegaETH",
    icon: "MΞ",
    iconPath: "/mega-logo.png",
  },
};

/** When set, NFT fetch/display uses this address instead of connected wallet (testing only; bridging still uses real wallet). */
const TEST_OWNER_OVERRIDE = (() => {
  const v = process.env.NEXT_PUBLIC_TEST_OWNER_OVERRIDE;
  if (!v || typeof v !== "string") return null;
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return v as Address;
  return null;
})();

export const dynamic = 'force-dynamic';

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([]);
  const [fromChain, setFromChain] = useState<ChainKey>("base");
  const toChain = fromChain === "base" ? "mega" : "base";
  const [galleryTab, setGalleryTab] = useState<"origin" | "destination">("origin");
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<`0x${string}` | null>(null);
  const [bridgeInitiatedAt, setBridgeInitiatedAt] = useState<number | null>(null);
  const [isSubmittingBridge, setIsSubmittingBridge] = useState(false);
  const activeChainConfig = CHAIN_CONFIG[fromChain];
  const isOnRequiredChain =
    !chainId || chainId === activeChainConfig.chainId || !isConnected;
  const bridgeConfigured = Boolean(
    activeChainConfig.bridgeAddress && activeChainConfig.nftAddress,
  );

  /** For NFT fetch/display only; bridging always uses connected wallet. */
  const effectiveOwnerForFetch: Address | null = (TEST_OWNER_OVERRIDE ?? address) as Address | null;

  const originQueryEnabled = Boolean(effectiveOwnerForFetch) && Boolean(CHAIN_CONFIG[fromChain].nftAddress);
  const destinationQueryEnabled = Boolean(effectiveOwnerForFetch) && Boolean(CHAIN_CONFIG[toChain].nftAddress);

  const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? getAlchemyApiKeyFromRpc(baseRpcUrl);

  const {
    data: originNfts = [],
    isPending: isOriginPending,
    error: originNftError,
    refetch: refetchOrigin,
  } = useQuery<NftItem[]>({
    queryKey: ["nfts", effectiveOwnerForFetch, fromChain, alchemyApiKey ?? ""],
    enabled: originQueryEnabled,
    queryFn: async () => {
      if (!effectiveOwnerForFetch) return [];
      const nftAddress = CHAIN_CONFIG[fromChain].nftAddress;
      if (!nftAddress) return [];
      // Ethereum NFT (BB_on_ETH) has no tokensOfOwner; use Alchemy API when key is set
      if (fromChain === "base" && alchemyApiKey) {
        return await fetchOwnedNftsViaAlchemy(effectiveOwnerForFetch, nftAddress, alchemyApiKey);
      }
      const client = fromChain === "base" ? getBaseClient() : getMegaClient();
      return await fetchOwnedNfts({
        client,
        nftAddress,
        owner: effectiveOwnerForFetch,
      });
    },
    retry: 2,
  });

  const {
    data: destinationNfts = [],
    isPending: isDestinationPending,
    error: destinationNftError,
    refetch: refetchDestination,
  } = useQuery<NftItem[]>({
    queryKey: ["nfts", effectiveOwnerForFetch, toChain],
    enabled: destinationQueryEnabled,
    queryFn: async () => {
      if (!effectiveOwnerForFetch) return [];
      const client = toChain === "base" ? getBaseClient() : getMegaClient();
      const nftAddress = CHAIN_CONFIG[toChain].nftAddress;
      if (!nftAddress) return [];
      return await fetchOwnedNfts({
        client,
        nftAddress,
        owner: effectiveOwnerForFetch,
      });
    },
    retry: 2,
  });

  const ownedNfts = galleryTab === "origin" ? originNfts : destinationNfts;
  const isPending = galleryTab === "origin" ? isOriginPending : isDestinationPending;
  const nftError = galleryTab === "origin" ? originNftError : destinationNftError;
  const refetch = galleryTab === "origin" ? refetchOrigin : refetchDestination;
  const refetchBoth = useCallback(() => {
    refetchOrigin();
    refetchDestination();
  }, [refetchOrigin, refetchDestination]);

  // Memoize token IDs to prevent infinite loops
  const originTokenIds = useMemo(() => 
    new Set(originNfts.map((nft) => nft.tokenId)),
    [originNfts]
  );

  // When origin has a list (e.g. MegaETH), keep selection in sync; when origin has no list (Ethereum), keep manual selection
  useEffect(() => {
    if (originNfts.length === 0) return;
    setSelectedNFTs((current) => {
      const filtered = current.filter((tokenId) => originTokenIds.has(tokenId));
      if (filtered.length === current.length && 
          filtered.every((id, idx) => current[idx] === id)) {
        return current;
      }
      return filtered;
    });
  }, [originTokenIds, originNfts.length]);

  const toggleNFT = useCallback((tokenId: number) => {
    setSelectedNFTs((current) => {
      if (current.includes(tokenId)) return current.filter((id) => id !== tokenId);
      if (current.length >= MAX_BRIDGE_BATCH) return current;
      return [...current, tokenId];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedNFTs((current) => {
      const allIds = originNfts.map((nft) => nft.tokenId);
      const capped = allIds.slice(0, MAX_BRIDGE_BATCH);
      if (current.length === capped.length) return [];
      return capped;
    });
  }, [originNfts]);

  // Auto-hide "bridge initiated" banner after 90s
  useEffect(() => {
    if (bridgeInitiatedAt == null) return;
    const t = setTimeout(() => setBridgeInitiatedAt(null), 90_000);
    return () => clearTimeout(t);
  }, [bridgeInitiatedAt]);

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
      setBridgeInitiatedAt(null);
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

      setBridgeStatus("Checking bridge status…");
      let isPaused = false;
      try {
        isPaused = (await client.readContract({
          abi: bridgeAbi,
          address: bridgeAddress,
          functionName: "paused",
          args: [],
        })) as boolean;
      } catch (error) {
        console.warn("Could not check bridge pause status:", error);
      }

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

      setBridgeInitiatedAt(Date.now());
      setBridgeStatus("Bridge complete ✅");
      setSelectedNFTs([]);
      await refetchBoth();
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
    refetchBoth,
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

  const galleryChain = galleryTab === "origin" ? fromChain : toChain;
  const galleryLabel = CHAIN_CONFIG[galleryChain].label;

  const gallery = useMemo(() => {
    if (!effectiveOwnerForFetch) {
      return (
        <div className="grid-surface text-center">
          <Wallet className="mx-auto mb-4 h-10 w-10 text-slate-500" />
          <p>Connect your wallet to surface your Bad Bunnz inventory.</p>
        </div>
      );
    }

    return (
      <div className="grid-surface">
        {/* Tabs: Origin / Destination */}
        <div className="flex gap-1 p-1 rounded-xl bg-black/5 border border-black/10 mb-4">
          <button
            type="button"
            onClick={() => setGalleryTab("origin")}
            className={`flex-1 rounded-lg py-2.5 px-3 text-sm font-semibold transition-colors ${
              galleryTab === "origin"
                ? "bg-white text-foreground shadow-sm border border-black/10"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Origin · {CHAIN_CONFIG[fromChain].label}
          </button>
          <button
            type="button"
            onClick={() => setGalleryTab("destination")}
            className={`flex-1 rounded-lg py-2.5 px-3 text-sm font-semibold transition-colors ${
              galleryTab === "destination"
                ? "bg-white text-foreground shadow-sm border border-black/10"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Destination · {CHAIN_CONFIG[toChain].label}
          </button>
        </div>

        {isPending ? (
          <p className="text-center py-6">Fetching inventory on {galleryLabel}…</p>
        ) : nftError ? (
          <div className="text-center py-6">
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
        ) : ownedNfts.length === 0 ? (
          <p className="text-center py-6">No Bad Bunnz on {galleryLabel}.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="pill text-xs sm:text-sm">Inventory</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight">
                  Your Bad Bunnz on {galleryLabel}
                </h2>
              </div>
              {galleryTab === "origin" && originNfts.length > 0 && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="btn btn-ghost text-xs sm:text-sm uppercase tracking-[0.2em] px-3 sm:px-4 py-1.5 sm:py-2"
                >
                  {selectedNFTs.length === Math.min(originNfts.length, MAX_BRIDGE_BATCH)
                    ? "Deselect all"
                    : `Select all (max ${MAX_BRIDGE_BATCH})`}
                </button>
              )}
            </div>
            <div className="nft-grid">
              {ownedNfts.map((nft) => {
                const isOriginTab = galleryTab === "origin";
                const isSelected = isOriginTab && selectedNFTs.includes(nft.tokenId);
                const content = (
                  <>
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
                  </>
                );
                return isOriginTab ? (
                  <button
                    key={nft.tokenId}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Toggle ${nft.name}`}
                    onClick={() => toggleNFT(nft.tokenId)}
                    className={`nft-card ${isSelected ? "selected" : ""}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={nft.tokenId} className="nft-card cursor-default">
                    {content}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }, [
    fromChain,
    toChain,
    galleryTab,
    galleryLabel,
    effectiveOwnerForFetch,
    isPending,
    nftError,
    ownedNfts,
    originNfts,
    selectedNFTs,
    selectAll,
    toggleNFT,
    refetch,
  ]);

  return (
    <div className="app-shell">
      {/* Sticky bunny in bottom right */}
      <div className="fixed bottom-0 right-0 z-50 pointer-events-none hidden md:block">
        <Image
          src="/bunn1.png"
          alt=""
          width={600}
          height={600}
          className="opacity-90 hover:opacity-100 transition-opacity"
        />
      </div>
      
      <Header active="bridge" />

      {TEST_OWNER_OVERRIDE && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Test mode: showing NFTs for <code className="font-mono">{TEST_OWNER_OVERRIDE.slice(0, 6)}…{TEST_OWNER_OVERRIDE.slice(-4)}</code>. Bridging still uses your connected wallet.
          </p>
        </div>
      )}

      <main className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-10 px-4 sm:px-6 py-6 sm:py-10 fade-in relative">
        {/* Decorative bunny images */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-5 hidden md:block">
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
        <section className="grid gap-6 sm:gap-10 lg:grid-cols-[0.9fr,1.1fr]" id="bridge">
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <span className="badge">Bridge</span>
              <h1 className="hero-title text-3xl sm:text-4xl leading-tight">
                Bridge your Bad Bunnz instantly
              </h1>
              <p className="hero-subtitle text-sm sm:text-base">
                Transfer your NFTs between Ethereum and MegaETH
                securely with automated verification.
              </p>
              <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {statusHighlights.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-black/10 bg-white/90 p-3 sm:p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {label}
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bridge-panel space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <h3>Bridge setup</h3>
                <button
                  type="button"
                  className="pill btn-ghost text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  disabled
                  title="Will be available shortly"
                >
                  Swap direction
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 rounded-2xl border border-black/10 bg-white/80 p-3 sm:p-4">
                    <div className="text-xs uppercase tracking-[0.4em] text-slate-500">
                      From
                    </div>
                    <div className="mt-2 flex items-center gap-2 sm:gap-3">
                      {CHAIN_CONFIG[fromChain].iconPath ? (
                        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 overflow-hidden rounded-full bg-black">
                          <Image src={CHAIN_CONFIG[fromChain].iconPath!} alt="" width={36} height={36} className="h-full w-full object-cover" />
                        </span>
                      ) : (
                        <span className="rounded-full bg-black px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-white">
                          {CHAIN_CONFIG[fromChain].icon}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-sm sm:text-base">
                          {CHAIN_CONFIG[fromChain].label}
                        </p>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          {CHAIN_CONFIG[fromChain].subLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white/80 p-2 sm:p-3 self-center sm:self-auto">
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-black rotate-90 sm:rotate-0" />
                  </span>
                  <div className="flex-1 rounded-2xl border border-black/10 bg-white/80 p-3 sm:p-4">
                    <div className="text-xs uppercase tracking-[0.4em] text-slate-500">
                      To
                    </div>
                    <div className="mt-2 flex items-center gap-2 sm:gap-3">
                      {CHAIN_CONFIG[toChain].iconPath ? (
                        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 overflow-hidden rounded-full bg-slate-600">
                          <Image src={CHAIN_CONFIG[toChain].iconPath!} alt="" width={36} height={36} className="h-full w-full object-cover" />
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-600 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-white">
                          {CHAIN_CONFIG[toChain].icon}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-sm sm:text-base">
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

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Selected
                      </p>
                      <p
                        className="text-2xl sm:text-3xl font-semibold"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {selectedNFTs.length}
                        <span className="text-base font-normal text-slate-500"> / {MAX_BRIDGE_BATCH}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        ETA
                      </p>
                      <p className="text-base sm:text-lg font-semibold">~60 sec</p>
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
                  {bridgeInitiatedAt != null && (
                    <div
                      className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 sm:p-4 text-sm"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-start gap-3">
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-600 mt-0.5" aria-hidden />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-emerald-800">
                            Bridge initiated
                          </p>
                          <p className="mt-1 text-emerald-700">
                            Your NFT is being moved to {CHAIN_CONFIG[toChain].label}. This usually takes ~60 seconds. Check the <button type="button" onClick={() => setGalleryTab("destination")} className="underline font-medium hover:no-underline">Destination</button> tab for your NFT.
                          </p>
                          {bridgeTxHash && (
                            <p className="mt-2 text-xs font-mono text-emerald-600">
                              Lock tx: {shortenHash(bridgeTxHash)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setBridgeInitiatedAt(null)}
                          className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-200/50 hover:text-emerald-800 transition-colors"
                          aria-label="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">{gallery}</div>
        </section>
      </main>
    </div>
  );
}
