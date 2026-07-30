import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowLeftRight, RefreshCw, Wallet } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { TransactionList } from '../components/transactions/TransactionList';
import { useWallet } from '../contexts/WalletContext';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { useArcBalance } from '../hooks/useArcBalance';

const actions = [
  {
    path: '/send',
    label: 'Send',
    desc: 'Transfer tokens same chain',
    icon: ArrowUpRight,
    color: 'var(--color-send)',
  },
  {
    path: '/bridge',
    label: 'Bridge',
    desc: 'Move assets cross-chain',
    icon: ArrowLeftRight,
    color: 'var(--color-bridge)',
  },
  {
    path: '/swap',
    label: 'Swap',
    desc: 'Exchange tokens instantly',
    icon: RefreshCw,
    color: 'var(--color-swap)',
  },
];

export function HomePage() {
  const { isConnected, address, connect } = useWallet();
  const { transactions, clearHistory } = useTransactionHistory();
  const { balance, isError } = useArcBalance(address);

  return (
    <PageShell>
      {/* Balance */}
      {isConnected ? (
        <div className="balance-card card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
            Arc Testnet Balance
          </div>
          <div style={{ fontSize: 'var(--text-4xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {balance} <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)' }}>USDC</span>
          </div>
          {isError && (
            <div className="form-error" style={{ marginTop: 'var(--space-2)' }}>
              Failed to load balance
            </div>
          )}
        </div>
      ) : (
        <div className="connect-cta card">
          <Wallet size={32} color="var(--color-accent)" />
          <h3 style={{ marginTop: 'var(--space-4)' }}>Welcome to Arc Wallet</h3>
          <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-2)' }}>
            Connect your wallet to send, bridge, and swap tokens across chains
          </p>
          <button
            className="btn btn-primary btn-lg"
            style={{ marginTop: 'var(--space-6)' }}
            onClick={connect}
          >
            <Wallet size={18} />
            Connect Wallet
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-grid">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="action-card card"
              style={{ '--action-color': action.color } as React.CSSProperties}
            >
              <div className="action-icon">
                <Icon size={24} />
              </div>
              <div className="action-label">{action.label}</div>
              <div className="action-desc text-xs text-muted">{action.desc}</div>
            </Link>
          );
        })}
      </div>

      {/* Transaction History */}
      <TransactionList transactions={transactions} onClear={clearHistory} />

      <style>{`
        .connect-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-10) var(--space-6);
          background: linear-gradient(
            135deg,
            rgba(99, 135, 255, 0.06) 0%,
            rgba(17, 22, 36, 0.85) 100%
          );
          border: 1px solid rgba(99, 135, 255, 0.12);
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
        }
        @media (max-width: 400px) {
          .action-grid {
            grid-template-columns: 1fr;
          }
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-5) var(--space-3);
          text-decoration: none;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: 1px solid var(--color-border);
        }
        .action-card:hover {
          border-color: var(--action-color);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        .action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--action-color) 12%, transparent);
          color: var(--action-color);
          transition: all var(--transition-fast);
        }
        .action-card:hover .action-icon {
          background: color-mix(in srgb, var(--action-color) 20%, transparent);
          transform: scale(1.05);
        }
        .action-label {
          font-weight: 600;
          font-size: var(--text-sm);
          color: var(--color-text-primary);
        }
        .action-desc {
          line-height: var(--leading-tight);
        }
      `}</style>
    </PageShell>
  );
}
