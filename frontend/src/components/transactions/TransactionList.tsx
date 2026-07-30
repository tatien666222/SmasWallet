import { Clock, Trash2 } from 'lucide-react';
import type { TransactionRecord } from '../../types';
import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  transactions: TransactionRecord[];
  onClear?: () => void;
  limit?: number;
}

export function TransactionList({
  transactions,
  onClear,
  limit = 10,
}: TransactionListProps) {
  const visible = transactions.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className="tx-empty card">
        <Clock size={24} color="var(--color-text-muted)" />
        <p className="text-sm text-muted" style={{ marginTop: 'var(--space-2)' }}>
          No transactions yet
        </p>
        <p className="text-xs text-muted">
          Your Send, Bridge, and Swap activity will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="tx-list">
      <div className="tx-list-header">
        <h4>Recent Transactions</h4>
        {onClear && transactions.length > 0 && (
          <button
            className="btn btn-ghost"
            onClick={onClear}
            style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>
      <div className="tx-list-items card" style={{ padding: 'var(--space-2)' }}>
        {visible.map(tx => (
          <TransactionItem key={tx.id} tx={tx} />
        ))}
      </div>

      <style>{`
        .tx-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .tx-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tx-list-items {
          display: flex;
          flex-direction: column;
        }
        .tx-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-10) var(--space-6);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
