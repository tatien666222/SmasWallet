import React from 'react';

interface TokenOption {
  symbol: string;
  name: string;
}

interface TokenSelectorProps {
  value: string;
  onChange: (value: string) => void;
  tokens: readonly TokenOption[];
  label?: string;
  disabled?: boolean;
}

export function TokenSelector({
  value,
  onChange,
  tokens,
  label = 'Token',
  disabled = false,
}: TokenSelectorProps) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="input select"
      >
        {tokens.map(t => (
          <option key={t.symbol} value={t.symbol}>
            {t.symbol} — {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
