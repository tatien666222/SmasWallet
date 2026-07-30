import { ArrowUpRight, ArrowLeftRight, RefreshCw, ExternalLink } from 'lucide-react';
import type { TransactionRecord } from '../../types';
import { TransactionStatus } from './TransactionStatus';
import { formatRelativeTime, formatAmount, shortenAddress } from '../../utils/format';

interface TransactionItemProps {
  tx: TransactionRecord;
}

const typeConfig = {
  send: { icon: ArrowUpRight, label: 'Send', className: 'badge-send' },
  bridge: { icon: ArrowLeftRight, label: 'Bridge', className: 'badge-bridge' },
  swap: { icon: RefreshCw, label: 'Swap', className: 'badge-swap' },
};

export function TransactionItem({ tx }: TransactionItemProps) {
  const config = typeConfig[tx.type];
  const Icon = config.icon;

  const detail =
    tx.type === 'swap'
      ? `${formatAmount(tx.amountIn)} ${tx.tokenIn} → ${tx.tokenOut}`
      : tx.type === 'bridge'
        ? `${formatAmount(tx.amountIn)} ${tx.tokenIn} · ${tx.sourceChain.replace('_', ' ')} → ${tx.destChain.replace('_', ' ')}`
        : `${formatAmount(tx.amountIn)} ${tx.tokenIn}`;

  return (
    <div className="tx-item">
      <div className="tx-icon-wrap" style={{ '--tx-color': `var(--color-${tx.type})` } as React.CSSProperties}>
        <Icon size={16} />
      </div>

      <div className="tx-info">
        <div className="tx-info-top">
          <span className={`badge ${config.className}`}>{config.label}</span>
          <TransactionStatus status={tx.status} />
        </div>
        <div className="tx-detail text-sm">{detail}</div>
      </div>

      <div className="tx-meta">
        <span className="text-xs text-muted">{formatRelativeTime(tx.createdAt)}</span>
        {tx.explorerUrl && (
          <a
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-explorer-link"
            title="View on explorer"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <style>{`
        .tx-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          transition: background var(--transition-fast);
        }
        .tx-item:hover {
          background: var(--color-bg-hover);
        }
        .tx-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--color-bg-input);
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }
        .tx-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tx-info-top {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .tx-detail {
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tx-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }
        .tx-explorer-link {
          color: var(--color-text-muted);
          transition: color var(--transition-fast);
        }
        .tx-explorer-link:hover {
          color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}
