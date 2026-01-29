import type { Address, PublicClient } from "viem";
import { badBunnzAbi } from "./abi/badBunnz";

export type NftItem = {
  tokenId: number;
  name: string;
  image?: string;
};

const ipfsToHttp = (uri: string) =>
  uri?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;

async function fetchMetadata(uri: string) {
  const response = await fetch(ipfsToHttp(uri));
  if (!response.ok) {
    throw new Error("metadata fetch failed");
  }
  return response.json();
}

type FetchOwnedNftsParams = {
  client: PublicClient;
  owner: Address;
  nftAddress: Address;
};

/** Extract Alchemy API key from RPC URL (e.g. https://eth-mainnet.g.alchemy.com/v2/KEY). */
export function getAlchemyApiKeyFromRpc(rpcUrl: string | undefined): string | undefined {
  if (!rpcUrl) return undefined;
  const m = rpcUrl.match(/alchemy\.com\/v2\/([^/?]+)/);
  return m ? m[1] : undefined;
}

/**
 * Fetch owned NFTs via Alchemy NFT API (Ethereum mainnet). Use when the contract
 * has no tokensOfOwner / Enumerable (e.g. BB_on_ETH). Uses same key as your Alchemy RPC.
 */
export async function fetchOwnedNftsViaAlchemy(
  owner: Address,
  nftAddress: Address,
  apiKey: string,
): Promise<NftItem[]> {
  const url = new URL(`https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
  url.searchParams.set("owner", owner);
  url.searchParams.set("contractAddresses[]", nftAddress);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Alchemy API error: ${res.status}`);
  }
  const data = (await res.json()) as {
    ownedNfts?: Array<{
      tokenId?: string;
      title?: string;
      name?: string;
      media?: Array<{ gateway?: string }>;
      image?: { cachedUrl?: string; gateway?: string };
    }>;
  };
  const list = data?.ownedNfts ?? [];
  const items: NftItem[] = [];
  for (const n of list) {
    const tokenId = n.tokenId ? (n.tokenId.startsWith("0x") ? parseInt(n.tokenId, 16) : Number(n.tokenId)) : NaN;
    if (Number.isNaN(tokenId)) continue;
    const name = n.title ?? n.name ?? `Bad Bunnz #${tokenId}`;
    const image = n.media?.[0]?.gateway ?? (n.image?.cachedUrl ?? n.image?.gateway);
    items.push({ tokenId, name, image });
  }
  return items.sort((a, b) => a.tokenId - b.tokenId);
}

/**
 * Fetch owned NFTs via contract (tokensOfOwner). Use for MegaETH Bad_Bunnz.
 */
export async function fetchOwnedNfts({
  client,
  owner,
  nftAddress,
}: FetchOwnedNftsParams): Promise<NftItem[]> {
  let tokenIds: readonly bigint[];
  try {
    tokenIds = (await client.readContract({
      abi: badBunnzAbi,
      address: nftAddress,
      functionName: "tokensOfOwner",
      args: [owner],
    })) as readonly bigint[];
  } catch {
    return [];
  }

  const enriched = await Promise.all(
    tokenIds.map(async (tokenId) => {
      let name = `Bad Bunnz #${tokenId}`;
      let image: string | undefined;
      try {
        const uri = (await client.readContract({
          abi: badBunnzAbi,
          address: nftAddress,
          functionName: "tokenURI",
          args: [tokenId],
        })) as string;
        const metadata = await fetchMetadata(uri);
        name = metadata?.name ?? name;
        image = metadata?.image ? ipfsToHttp(metadata.image) : undefined;
      } catch {
        // continue without metadata
      }
      return { tokenId: Number(tokenId), name, image };
    }),
  );

  return enriched.sort((a, b) => a.tokenId - b.tokenId);
}
