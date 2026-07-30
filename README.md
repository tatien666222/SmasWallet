# Arc SmasWallet

Arc SmasWallet is a comprehensive Web3 wallet application built specifically for the **Arc Testnet**, a blockchain network that natively uses USDC for gas. This project integrates Circle's **AppKit SDK** to provide seamless experiences for bridging, sending, and swapping tokens across multiple networks.

## Features

- **Multi-Chain Bridge (CCTP)**: Bridge USDC natively from various testnets (Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, Polygon Amoy, Avalanche Fuji) directly to Arc Testnet using Circle's Cross-Chain Transfer Protocol.
- **Send Tokens**: Send USDC and other supported tokens to any address on the Arc Testnet.
- **Swap Tokens**: Estimate and execute token swaps on Arc Testnet (e.g., USDC to EURC) with real-time balance checks and API integration.
- **Unified Balance & Transaction History**: View your transaction history and real-time on-chain token balances.
- **Circle AppKit Integration**: Native integration with `@circle-fin/app-kit` and `viem` for smart contract interactions and EIP-6963 browser wallet discovery.

## Project Structure

This repository is divided into two main parts:

- `frontend/`: The React web application built with Vite.
- `server/`: The Express.js backend that handles transaction history, mock price feeds, and swap estimations.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A Web3 Wallet (e.g., MetaMask, Phantom) with testnet networks configured.
- Testnet Tokens (Get them from the [Circle Faucet](https://faucet.circle.com/)).

## Installation & Setup

### 1. Clone the repository

```bash
git clone <your-github-repo-url>
cd arcTestnet
```

### 2. Setup the Backend Server

```bash
cd server
npm install

# The server runs on http://localhost:3001 by default
npm run dev
```

### 3. Setup the Frontend

Open a new terminal window:

```bash
cd frontend
npm install

# Copy the example env file and add your credentials
cp .env.example .env
```

**Environment Variables:**
Edit the `frontend/.env` file and add your Circle API keys (You can get these from the [Circle Developer Console](https://console.circle.com/)):

```env
VITE_CIRCLE_API_KEY=your_circle_api_key_here
VITE_KIT_KEY=your_circle_kit_key_here
```

Start the frontend development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Networks Supported

- **Arc Testnet** (Native USDC Gas)
- Ethereum Sepolia
- Base Sepolia
- Arbitrum Sepolia
- Polygon Amoy
- Avalanche Fuji

## Technologies Used

- **Frontend**: React, Vite, TypeScript, Lucide React (Icons)
- **Web3**: Viem, @circle-fin/app-kit
- **Backend**: Node.js, Express.js, TypeScript, SQLite/In-Memory storage
- **Styling**: Vanilla CSS

## License

MIT License
