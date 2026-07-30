import { defineChain } from 'viem';

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_HEX_CHAIN_ID = `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`; // '0x4cef52'
export const ARC_TESTNET_RPC_URL = import.meta.env?.DEV ? '/arc-rpc' : 'https://rpc.testnet.arc.io';

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET_RPC_URL],
      webSocket: ['wss://rpc.testnet.arc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

export const CHAIN_HEX_IDS: Record<string, string> = {
  Arc_Testnet: ARC_TESTNET_HEX_CHAIN_ID,
  Ethereum_Sepolia: '0xaa36a7',
  Base_Sepolia: '0x14a34',
  Arbitrum_Sepolia: '0x66eee',
  Polygon_Amoy_Testnet: '0x13882',
  Avalanche_Fuji: '0xa869',
};

export async function switchNetwork(provider: any, chain: string) {
  const chainIdHex = CHAIN_HEX_IDS[chain];
  if (!provider || !chainIdHex) return;
  
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (error: any) {
    console.warn(`Failed to switch network to ${chain}:`, error);
    // If it's Arc_Testnet and not added, we try to add it.
    if (chain === 'Arc_Testnet' && (error?.code === 4902 || error?.message?.includes('Unrecognized chain'))) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ARC_TESTNET_HEX_CHAIN_ID,
              chainName: 'Arc Testnet',
              nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
              rpcUrls: [ARC_TESTNET_RPC_URL],
              blockExplorerUrls: ['https://testnet.arcscan.app'],
            },
          ],
        });
      } catch (addErr) {
        console.warn('Failed to add Arc Testnet:', addErr);
      }
    }
  }
}

