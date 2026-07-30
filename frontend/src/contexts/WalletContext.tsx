import React, { createContext, useCallback, useContext, useReducer } from 'react';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { ArcTestnet, EthereumSepolia, BaseSepolia, ArbitrumSepolia, PolygonAmoy, AvalancheFuji } from '@circle-fin/app-kit/chains';
import { ARC_TESTNET_HEX_CHAIN_ID } from '../config/chain';
import type { WalletState } from '../types';

/* ------------------------------------------------------------------ */
/*  Context types                                                     */
/* ------------------------------------------------------------------ */

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
}

type WalletAction =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED'; address: string; adapter: unknown; provider: unknown }
  | { type: 'DISCONNECTED' }
  | { type: 'ERROR'; error: string };

/* ------------------------------------------------------------------ */
/*  Reducer                                                           */
/* ------------------------------------------------------------------ */

const initialState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  adapter: null,
  error: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, isConnecting: true, error: null };
    case 'CONNECTED':
      return {
        isConnected: true,
        isConnecting: false,
        address: action.address,
        adapter: action.adapter,
        provider: action.provider,
        error: null,
      };
    case 'DISCONNECTED':
      return initialState;
    case 'ERROR':
      return { ...state, isConnecting: false, error: action.error };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  EIP-6963 wallet discovery (mock-safe)                             */
/* ------------------------------------------------------------------ */

interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: {
    request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  };
}

declare global {
  interface WindowEventMap {
    'eip6963:announceProvider': CustomEvent<EIP6963ProviderDetail>;
  }
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

async function discoverWallets(): Promise<EIP6963ProviderDetail[]> {
  const providers = new Map<string, EIP6963ProviderDetail>();

  const handler = ((event: CustomEvent<EIP6963ProviderDetail>) => {
    providers.set(event.detail.info.uuid, event.detail);
  }) as EventListener;

  window.addEventListener('eip6963:announceProvider', handler);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise(r => setTimeout(r, 300));
  window.removeEventListener('eip6963:announceProvider', handler);

  return [...providers.values()];
}

/* ------------------------------------------------------------------ */
/*  Context & Provider                                                */
/* ------------------------------------------------------------------ */

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  const connect = useCallback(async () => {
    dispatch({ type: 'CONNECTING' });

    try {
      // Try EIP-6963 discovery first
      const wallets = await discoverWallets();
      const selected =
        wallets.find(w => w.info.rdns === 'io.metamask') ?? wallets[0];

      let provider = selected?.provider;

      // Fallback to window.ethereum
      if (!provider && window.ethereum) {
        provider = window.ethereum;
      }

      if (!provider) {
        throw new Error('No EVM wallet detected. Please install MetaMask or another browser wallet.');
      }

      // Request accounts
      await provider.request({ method: 'eth_requestAccounts' });
      const accounts = (await provider.request({
        method: 'eth_accounts',
      })) as string[];

      if (!accounts[0]) {
        throw new Error('No accounts returned from wallet');
      }

      // Try switching to Arc Testnet
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_TESTNET_HEX_CHAIN_ID }],
        });
      } catch (switchError: any) {
        if (switchError?.code === 4902 || switchError?.message?.includes('Unrecognized chain')) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: ARC_TESTNET_HEX_CHAIN_ID,
                  chainName: 'Arc Testnet',
                  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
                  rpcUrls: ['https://rpc.testnet.arc.io'],
                  blockExplorerUrls: ['https://testnet.arcscan.app'],
                },
              ],
            });
          } catch (addErr) {
            console.warn('Network add notice:', addErr);
          }
        } else {
          console.warn('Network switch notice:', switchError);
        }
      }

      let viemAdapter: unknown = provider;
      try {
        viemAdapter = await createViemAdapterFromProvider({
          provider: provider as any,
          capabilities: {
            supportedChains: [ArcTestnet, EthereumSepolia, BaseSepolia, ArbitrumSepolia, PolygonAmoy, AvalancheFuji],
          },
        });
      } catch (adapterErr) {
        console.warn('Could not create ViemAdapter, using provider fallback:', adapterErr);
      }

      dispatch({
        type: 'CONNECTED',
        address: accounts[0],
        adapter: viemAdapter,
        provider: provider,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect wallet';
      dispatch({ type: 'ERROR', error: message });
    }
  }, []);

  const disconnect = useCallback(() => {
    dispatch({ type: 'DISCONNECTED' });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
