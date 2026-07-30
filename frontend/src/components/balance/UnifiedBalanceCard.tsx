import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { formatUSD, formatAmount } from '../../utils/format';
import { ChainBreakdown } from './ChainBreakdown';
import type { ChainBalance } from '../../types';
import { Skeleton } from '../shared/Spinner';

interface UnifiedBalanceCardProps {
  totalUsd: number;
  breakdown: ChainBalance[];
  isLoading: boolean;
}

export function UnifiedBalanceCard({
  totalUsd,
  breakdown,
  isLoading,
}: UnifiedBalanceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="balance-card card">
      <div className="balance-card-header">
        <div className="balance-card-icon">
          <Layers size={20} />
        </div>
        <span className="text-sm text-secondary">Unified Balance</span>
      </div>

      <div className="balance-card-amount">
        {isLoading ? (
          <Skeleton width="180px" height="40px" borderRadius="var(--radius-sm)" />
        ) : (
          <span className="balance-total">{formatUSD(totalUsd)}</span>
        )}
      </div>

      {!isLoading && breakdown.length > 0 && (
        <>
          <button
            className="balance-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            <span>
              {expanded ? 'Hide' : 'View'} breakdown ({breakdown.length} chains)
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && <ChainBreakdown breakdown={breakdown} />}
        </>
      )}

      <style>{`
        .balance-card {
          background: linear-gradient(
            135deg,
            rgba(99, 135, 255, 0.08) 0%,
            rgba(167, 139, 250, 0.05) 50%,
            rgba(17, 22, 36, 0.85) 100%
          );
          border: 1px solid rgba(99, 135, 255, 0.15);
          text-align: center;
          padding: var(--space-8) var(--space-6);
        }
        .balance-card-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }
        .balance-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: var(--color-accent-subtle);
          color: var(--color-accent);
        }
        .balance-card-amount {
          display: flex;
          justify-content: center;
          margin-bottom: var(--space-4);
        }
        .balance-total {
          font-size: var(--text-4xl);
          font-weight: 700;
          background: linear-gradient(135deg, #f1f3f9 30%, var(--color-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .balance-toggle {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          border: none;
          background: transparent;
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-family: var(--font-sans);
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        .balance-toggle:hover {
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
