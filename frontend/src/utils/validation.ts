/**
 * Input validators for wallet addresses and amounts.
 */

/** Check if a string is a valid EVM address (0x + 40 hex chars) */
export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/** Check if a string is a valid positive amount */
export function isValidAmount(value: string): boolean {
  if (!value || value.trim() === '') return false;
  const n = parseFloat(value);
  return !isNaN(n) && n > 0 && isFinite(n);
}

/** Check if amount exceeds balance */
export function isAmountExceedsBalance(amount: string, balance: string): boolean {
  const a = parseFloat(amount);
  const b = parseFloat(balance);
  if (isNaN(a) || isNaN(b)) return false;
  return a > b;
}

/** Validate amount has max N decimals */
export function hasMaxDecimals(value: string, max = 6): boolean {
  const parts = value.split('.');
  if (parts.length < 2) return true;
  return parts[1].length <= max;
}
