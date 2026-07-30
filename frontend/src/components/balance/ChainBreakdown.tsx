import { formatAmount, formatUSD } from '../../utils/format';
import type { ChainBalance } from '../../types';

interface ChainBreakdownProps {
  breakdown: ChainBalance[];
}

export function ChainBreakdown({ breakdown }: ChainBreakdownProps) {
  return (
    <div className="chain-breakdown animate-slide-up">
      <div className="divider" />
      {breakdown.map((item, i) => (
        <div key={`${item.chain}-${item.token}-${i}`} className="chain-row">
          <div className="chain-info">
            <div className="chain-name">{item.chain.replace('_', ' ')}</div>
            <div className="chain-token text-xs text-muted">{item.token}</div>
          </div>
          <div className="chain-values">
            <div className="chain-amount font-semibold">
              {formatAmount(item.amount, 2)} {item.token}
            </div>
            <div className="chain-usd text-xs text-muted">
              {formatUSD(item.usdValue)}
            </div>
          </div>
        </div>
      ))}

      <style>{`
        .chain-breakdown {
          text-align: left;
        }
        .chain-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-3) 0;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .chain-row:last-child {
          border-bottom: none;
        }
        .chain-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .chain-name {
          font-size: var(--text-sm);
          font-weight: 500;
        }
        .chain-values {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .chain-amount {
          font-size: var(--text-sm);
        }
      `}</style>
    </div>
  );
}
