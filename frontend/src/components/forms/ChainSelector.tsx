import React from 'react';

interface Option {
  id: string;
  name: string;
}

interface ChainSelectorProps {
  value: string;
  onChange: (value: string) => void;
  chains: readonly Option[];
  label?: string;
  disabled?: boolean;
}

export function ChainSelector({
  value,
  onChange,
  chains,
  label = 'Chain',
  disabled = false,
}: ChainSelectorProps) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="input select"
      >
        {chains.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
