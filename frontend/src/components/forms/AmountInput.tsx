import React from 'react';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  balance?: string;
  token?: string;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  balance,
  token = 'USDC',
  disabled = false,
  error,
  placeholder = '0.00',
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Allow empty, or numbers with optional decimal
    if (v === '' || /^\d*\.?\d*$/.test(v)) {
      onChange(v);
    }
  };

  const handleMax = () => {
    if (balance) onChange(balance);
  };

  return (
    <div className="amount-input-wrapper">
      <div className={`amount-input-box ${error ? 'input-error' : ''}`}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="amount-input-field"
          autoComplete="off"
        />
        <span className="amount-input-token">{token}</span>
      </div>
      {(balance !== undefined || error) && (
        <div className="amount-input-meta">
          {error ? (
            <span className="form-error">{error}</span>
          ) : (
            <span className="text-xs text-muted">
              Balance: {balance} {token}
            </span>
          )}
          {balance && !disabled && (
            <button
              type="button"
              className="amount-max-btn"
              onClick={handleMax}
            >
              MAX
            </button>
          )}
        </div>
      )}

      <style>{`
        .amount-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .amount-input-box {
          display: flex;
          align-items: center;
          background: var(--color-bg-input);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          transition: all var(--transition-fast);
        }
        .amount-input-box:focus-within {
          border-color: var(--color-border-focus);
          background: var(--color-bg-input-focus);
          box-shadow: 0 0 0 3px var(--color-accent-subtle);
        }
        .amount-input-field {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--color-text-primary);
          font-size: var(--text-xl);
          font-weight: 600;
          font-family: var(--font-sans);
          outline: none;
          min-width: 0;
        }
        .amount-input-field::placeholder {
          color: var(--color-text-muted);
          font-weight: 400;
        }
        .amount-input-field:disabled {
          opacity: 0.5;
        }
        .amount-input-token {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-secondary);
          margin-left: var(--space-2);
        }
        .amount-input-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .amount-max-btn {
          border: none;
          background: var(--color-accent-subtle);
          color: var(--color-accent);
          font-size: var(--text-xs);
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .amount-max-btn:hover {
          background: var(--color-accent);
          color: white;
        }
      `}</style>
    </div>
  );
}
