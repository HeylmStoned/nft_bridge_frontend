# Bad Bunnz Bridge Frontend

Next.js frontend for the Bad Bunnz NFT bridge between Ethereum and MegaETH.

## Features

- **Wallet Integration** - RainbowKit + Wagmi for seamless wallet connections
- **NFT Gallery** - Browse and select NFTs to bridge
- **Automatic Approval** - Handles NFT approvals automatically
- **Bridge Status** - Real-time bridge status checking
- **Pause Detection** - Checks if bridge is paused before operations
- **WebSocket Updates** - Real-time updates via WebSocket connection

## Tech Stack

- **Next.js 16** - React framework
- **React 19** - UI library
- **Wagmi** - Ethereum React hooks
- **Viem** - Ethereum library
- **RainbowKit** - Wallet connection UI
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Setup

### Prerequisites

- Node.js >=18.0.0
- npm or yarn

### Installation

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Backend API (used by server-side stats proxy; not exposed to the browser)
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url
API_KEY=your-backend-api-key

# RPC Endpoints
NEXT_PUBLIC_BASE_RPC_URL=https://base-sepolia.drpc.org
NEXT_PUBLIC_MEGA_RPC_URL=https://carrot.megaeth.com/rpc

# Chain IDs (hex format)
NEXT_PUBLIC_BASE_CHAIN_ID=0x14a34
NEXT_PUBLIC_MEGA_CHAIN_ID=0x18c7

# Contract Addresses
NEXT_PUBLIC_BAD_BUNNZ_BASE=0x...
NEXT_PUBLIC_BAD_BUNNZ_MEGA=0x...
NEXT_PUBLIC_ETH_BRIDGE=0x...
NEXT_PUBLIC_MEGA_BRIDGE=0x...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Railway

1. Connect GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Cloudflare Pages
- Your own server

## Usage

1. **Connect Wallet** - Click "Connect Wallet" and select your wallet
2. **Select Chain** - Choose source chain (Base or MegaETH)
3. **Select NFT** - Browse your NFTs and select one to bridge
4. **Bridge** - Click "Bridge" and approve transactions
5. **Wait for Confirmation** - Wait for lock confirmation
6. **Unlock on Destination** - Switch to destination chain and unlock

## Architecture

The frontend communicates with:
- **Backend API** - For merkle proofs and bridge status
- **Blockchain** - Direct contract interactions via Wagmi/Viem
- **WebSocket** - Real-time updates from backend

## License

MIT License - see LICENSE file for details.
