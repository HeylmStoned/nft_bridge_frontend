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

export async function fetchOwnedNfts({
  client,
  owner,
  nftAddress,
}: FetchOwnedNftsParams): Promise<NftItem[]> {
  console.log("[fetchOwnedNfts] Starting", { owner, nftAddress });
  try {
    const tokenIds = (await client.readContract({
      abi: badBunnzAbi,
      address: nftAddress,
      functionName: "tokensOfOwner",
      args: [owner],
    })) as readonly bigint[];
    console.log("[fetchOwnedNfts] Got tokenIds:", tokenIds.length);

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

    const result = enriched.sort((a, b) => a.tokenId - b.tokenId);
    console.log("[fetchOwnedNfts] Returning", result.length, "NFTs");
    return result;
  } catch (error) {
    console.error("[fetchOwnedNfts] Error:", error);
    throw error;
  }
}
