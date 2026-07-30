import { useWallet } from '../../contexts/WalletContext';
import { shortenAddress } from '../../utils/format';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function ConnectWalletButton() {
  const { isConnected, isConnecting, address, connect, disconnect } = useWallet();

  if (isConnecting) {
    return (
      <button className="btn btn-secondary" disabled>
        <Loader2 size={16} className="animate-spin" />
        Connecting…
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <div className="wallet-address-chip">
          <div className="wallet-dot" />
          <span className="text-mono text-sm">{shortenAddress(address)}</span>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={disconnect}
          aria-label="Disconnect wallet"
          title="Disconnect"
        >
          <LogOut size={16} />
        </button>

        <style>{`
          .wallet-connected {
            display: flex;
            align-items: center;
            gap: var(--space-2);
          }
          .wallet-address-chip {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            background: var(--color-bg-input);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-full);
            font-size: var(--text-sm);
          }
          .wallet-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-success);
            box-shadow: 0 0 6px var(--color-success);
          }
        `}</style>
      </div>
    );
  }

  return (
    <button className="btn btn-primary" onClick={connect}>
      <Wallet size={16} />
      Connect Wallet
    </button>
  );
}
