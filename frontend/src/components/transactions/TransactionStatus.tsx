import type { TransactionRecord } from '../../types';

interface TransactionStatusProps {
  status: TransactionRecord['status'];
}

export function TransactionStatus({ status }: TransactionStatusProps) {
  const config = {
    pending: { label: 'Pending', className: 'badge-pending' },
    confirmed: { label: 'Confirmed', className: 'badge-confirmed' },
    failed: { label: 'Failed', className: 'badge-failed' },
  };

  const { label, className } = config[status];

  return (
    <span className={`badge ${className}`}>
      {status === 'pending' && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            animation: 'pulse 1.5s infinite',
            display: 'inline-block',
          }}
        />
      )}
      {label}
    </span>
  );
}
