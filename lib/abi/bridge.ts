export const bridgeAbi = [
  {
    type: "function",
    name: "lockNFT",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "batchLockNFT",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIds", type: "uint256[]" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "lockNFTForEthereum",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "batchLockNFTForEthereum",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIds", type: "uint256[]" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isTokenApproved",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
