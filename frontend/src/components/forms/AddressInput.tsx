import React from 'react';
import { isValidAddress } from '../../utils/validation';
import { Check, AlertCircle } from 'lucide-react';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export function AddressInput({
  value,
  onChange,
  disabled = false,
  placeholder = '0x...',
  label = 'Recipient Address',
}: AddressInputProps) {
  const isValid = value.length > 0 && isValidAddress(value);
  const isInvalid = value.length > 5 && !isValidAddress(value);

  return (
    <div className="form-group">
      <label className="label">{label}</label>
      <div className="address-input-box">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`input text-mono ${isInvalid ? 'input-error' : ''}`}
          style={{ fontSize: 'var(--text-sm)', paddingRight: '40px' }}
          autoComplete="off"
          spellCheck={false}
        />
        {isValid && (
          <span className="address-check valid">
            <Check size={14} />
          </span>
        )}
        {isInvalid && (
          <span className="address-check invalid">
            <AlertCircle size={14} />
          </span>
        )}
      </div>
      {isInvalid && (
        <span className="form-error">Invalid Ethereum address format</span>
      )}

      <style>{`
        .address-input-box {
          position: relative;
        }
        .address-check {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
        }
        .address-check.valid {
          color: var(--color-success);
        }
        .address-check.invalid {
          color: var(--color-error);
        }
      `}</style>
    </div>
  );
}
