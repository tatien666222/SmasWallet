import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, ArrowLeft, CheckCircle, ExternalLink, ArrowDownUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { AmountInput } from '../components/forms/AmountInput';
import { ChainSelector } from '../components/forms/ChainSelector';
import { TokenSelector } from '../components/forms/TokenSelector';
import { Button } from '../components/shared/Button';
import { useWallet } from '../contexts/WalletContext';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { useArcBalance } from '../hooks/useArcBalance';
import { kit, SWAP_CHAINS, SWAP_TOKENS } from '../config/appkit';
import { switchNetwork } from '../config/chain';
import { estimateSwapFromApi, executeSwapFromApi } from '../services/api';
import { isValidAmount, isAmountExceedsBalance } from '../utils/validation';
import { formatAmount } from '../utils/format';
import type { SwapStep } from '../types';
import { formatUnits } from 'viem';

export function SwapPage() {
  const { isConnected, address, adapter, provider } = useWallet();
  const { addTransaction } = useTransactionHistory();
  const { balance: arcBalance } = useArcBalance(address);

  const [tokenIn, setTokenIn] = useState('USDC');
  const [tokenOut, setTokenOut] = useState('EURC');
  const [amountIn, setAmountIn] = useState('');
  const [chain, setChain] = useState('Arc_Testnet');
  const [slippage, setSlippage] = useState('0.5');

  const [step, setStep] = useState<SwapStep>('input');
  const [quote, setQuote] = useState<{
    amountOut: string;
    minAmountOut: string;
    rate: string;
    fees: Array<{ type: string; amount: string; token: string }>;
    slippage: string;
  } | null>(null);
  const [result, setResult] = useState<{ txHash: string; amountOut: string; explorerUrl: string } | null>(null);
  const [error, setError] = useState('');

  const [tokenBalance, setTokenBalance] = useState<string>('0.00');

  useEffect(() => {
    let active = true;

    async function fetchTokenBalance() {
      if (!address || !adapter) return;
      
      try {
        let balanceAction;
        if (tokenIn === 'USDC') {
          balanceAction = await adapter.prepareAction(
            'usdc.balanceOf',
            {},
            { chain }
          );
        } else {
          // Known Arc Testnet ERC-20 addresses for AppKit
          const ARC_TESTNET_TOKEN_ADDRESSES: Record<string, string> = {
            'EURC': '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
          };
          
          const tokenAddress = ARC_TESTNET_TOKEN_ADDRESSES[tokenIn];
          if (!tokenAddress) {
            // Unsupported or mock tokens fall back to 0
            if (active) setTokenBalance('0.00');
            return;
          }

          balanceAction = await adapter.prepareAction(
            'token.balanceOf',
            { tokenAddress, walletAddress: address },
            { chain }
          );
        }
        
        const balance = await balanceAction.execute();
        
        if (active && balance !== undefined) {
          const tokenDef = SWAP_TOKENS.find(t => t.symbol === tokenIn);
          const decimals = tokenDef ? tokenDef.decimals : 6;
          const parsed = parseFloat(formatUnits(BigInt(balance), decimals)).toFixed(2);
          setTokenBalance(parsed);
        }
      } catch (err) {
        console.warn(`Failed to fetch native balance for ${tokenIn} on ${chain}`, err);
        // Fallback for mock tokens or unsupported tokens in testnet
        if (active) setTokenBalance('0.00');
      }
    }

    fetchTokenBalance();
    const intervalId = setInterval(fetchTokenBalance, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [address, adapter, tokenIn, chain]);

  const currentBalance = tokenBalance;
  const canSubmit = isConnected && isValidAmount(amountIn) && !isAmountExceedsBalance(amountIn, currentBalance) && tokenIn !== tokenOut;

  // Auto-estimate on input change with debounce
  useEffect(() => {
    if (!canSubmit) {
      setQuote(null);
      setStep('input');
      return;
    }

    const timer = setTimeout(() => {
      handleEstimate();
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [amountIn, tokenIn, tokenOut, chain, adapter]);

  const handleSwapDirection = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setQuote(null);
  };

  const handleEstimate = useCallback(async () => {
    if (!canSubmit) return;
    setStep('estimating');
    setError('');

    try {
      // Direct call to Backend Server Endpoint /api/swap/estimate
      const estApi = await estimateSwapFromApi({
        tokenIn,
        tokenOut,
        amountIn,
        chain,
      });

      if (estApi) {
        setQuote(estApi);
        setStep('preview');
        return;
      }

      // Fallback
      const est = await kit.estimateSwap({
        from: { adapter, chain },
        tokenIn,
        tokenOut,
        amountIn,
      });
      setQuote(est);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      setStep('error');
    }
  }, [canSubmit, adapter, chain, tokenIn, tokenOut, amountIn]);

  const handleSwap = useCallback(async () => {
    setStep('signing');
    setError('');

    try {
      // Direct call to Backend Server Endpoint /api/swap/execute
      await executeSwapFromApi({
        tokenIn,
        tokenOut,
        amountIn,
        chain,
        walletAddress: address,
      });

      // Ensure the wallet is on the correct network before swapping
      await switchNetwork(provider, chain);

      // On-chain execution
      const res = await kit.swap({
        from: { adapter, chain },
        tokenIn,
        tokenOut,
        amountIn,
      });

      setResult(res as { txHash: string; amountOut: string; explorerUrl: string });
      setStep('confirmed');

      addTransaction({
        id: crypto.randomUUID(),
        type: 'swap',
        sourceChain: chain,
        destChain: chain,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut: res.amountOut,
        status: 'confirmed',
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const message = err?.message || (typeof err === 'string' ? err : 'Swap failed');
      setError(
        message.includes('slippage')
          ? 'Slippage exceeded. Try increasing slippage tolerance or reducing amount.'
          : message,
      );
      setStep('error');
    }
  }, [adapter, address, chain, tokenIn, tokenOut, amountIn, addTransaction]);

  const handleReset = () => {
    setStep('input');
    setAmountIn('');
    setQuote(null);
    setResult(null);
    setError('');
  };

  // Success screen
  if (step === 'confirmed' && result) {
    return (
      <PageShell>
        <div className="card animate-slide-up" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--color-success-subtle)', color: 'var(--color-success)',
          }}>
            <CheckCircle size={48} />
          </div>
          <h2 style={{ marginTop: 'var(--space-4)' }}>Swap Complete!</h2>
          <p className="text-secondary" style={{ marginTop: 'var(--space-2)' }}>
            {formatAmount(amountIn)} {tokenIn} → {formatAmount(result.amountOut)} {tokenOut}
          </p>
          <div className="divider" />
          <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
            View on Explorer <ExternalLink size={14} />
          </a>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={handleReset}>Swap Again</Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const isProcessing = step === 'estimating' || step === 'signing' || step === 'pending';

  return (
    <PageShell>
      <div>
        <Link to="/" className="btn btn-ghost" style={{ marginBottom: 'var(--space-4)', padding: '4px 8px' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-3">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'rgba(52, 211, 153, 0.12)', color: 'var(--color-swap)',
          }}>
            <RefreshCw size={20} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Swap</h1>
            <p className="page-subtitle">Exchange tokens on Arc Testnet</p>
          </div>
        </div>
      </div>

      <div className="card">
        {/* Token In */}
        <div className="form-group">
          <label className="label">You Pay</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
            <AmountInput
              value={amountIn}
              onChange={setAmountIn}
              balance={currentBalance}
              token={tokenIn}
              disabled={isProcessing}
              error={
                amountIn && isAmountExceedsBalance(amountIn, currentBalance)
                  ? 'Insufficient balance'
                  : undefined
              }
            />
            <div style={{ minWidth: 120 }}>
              <TokenSelector
                value={tokenIn}
                onChange={v => {
                  setTokenIn(v);
                  if (v === tokenOut) setTokenOut(tokenIn);
                }}
                tokens={SWAP_TOKENS}
                label=""
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Swap direction button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-3) 0' }}>
          <button
            className="swap-direction-btn"
            onClick={handleSwapDirection}
            disabled={isProcessing}
            title="Swap direction"
          >
            <ArrowDownUp size={16} />
          </button>
        </div>

        {/* Token Out */}
        <div className="form-group">
          <label className="label">You Receive</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
            <div className="amount-input-wrapper">
              <div className="amount-input-box" style={{ opacity: 0.7 }}>
                <input
                  type="text"
                  value={quote ? formatAmount(quote.amountOut, 6) : ''}
                  readOnly
                  placeholder="0.00"
                  className="amount-input-field"
                  style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}
                />
                <span className="amount-input-token">{tokenOut}</span>
              </div>
            </div>
            <div style={{ minWidth: 120 }}>
              <TokenSelector
                value={tokenOut}
                onChange={v => {
                  setTokenOut(v);
                  if (v === tokenIn) setTokenIn(tokenOut);
                }}
                tokens={SWAP_TOKENS}
                label=""
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Chain selector */}
        <div style={{ marginTop: 'var(--space-3)' }}>
          <ChainSelector
            value={chain}
            onChange={setChain}
            chains={SWAP_CHAINS}
            label="Chain"
            disabled={isProcessing}
          />
        </div>

        {/* Slippage */}
        <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
          <label className="label">Slippage Tolerance</label>
          <div className="slippage-options">
            {['0.5', '1', '3'].map(val => (
              <button
                key={val}
                className={`slippage-btn ${slippage === val ? 'active' : ''}`}
                onClick={() => setSlippage(val)}
                disabled={isProcessing}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Quote preview */}
        {quote && amountIn && (
          <div className="swap-preview animate-fade-in" style={{ marginTop: 'var(--space-4)' }}>
            <div className="divider" />
            <div className="flex justify-between text-sm mb-2">
              <span className="text-secondary">Rate</span>
              <span>1 {tokenIn} = {formatAmount(quote.rate, 6)} {tokenOut}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-secondary">Min Received</span>
              <span>{formatAmount(quote.minAmountOut, 6)} {tokenOut}</span>
            </div>
            {quote.fees.map((fee, i) => (
              <div key={i} className="flex justify-between text-sm mb-2">
                <span className="text-secondary">Fee</span>
                <span>{fee.amount} {fee.token}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Slippage</span>
              <span>{slippage}%</span>
            </div>
          </div>
        )}

        {tokenIn === tokenOut && (
          <p className="form-error" style={{ marginTop: 'var(--space-2)' }}>
            Select different tokens to swap
          </p>
        )}

        {error && (
          <div className="form-error" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-error-subtle)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 'var(--space-6)' }}>
          {step === 'input' || step === 'error' ? (
            <Button variant="primary" size="lg" block disabled={!canSubmit} onClick={handleEstimate}>
              {!isConnected ? 'Connect Wallet First' : 'Review Swap'}
            </Button>
          ) : step === 'estimating' ? (
            <Button variant="primary" size="lg" block loading disabled>
              Getting quote…
            </Button>
          ) : step === 'preview' ? (
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="lg" block onClick={handleSwap}>
                Confirm Swap · {formatAmount(amountIn)} {tokenIn} → {tokenOut}
              </Button>
              <Button variant="ghost" block onClick={() => setStep('input')}>
                Edit
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="lg" block loading disabled>
              {step === 'signing' ? 'Confirm in wallet…' : 'Swapping…'}
            </Button>
          )}
        </div>
      </div>

      <style>{`
        .swap-direction-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid var(--color-border);
          background: var(--color-bg-card-solid);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .swap-direction-btn:hover:not(:disabled) {
          border-color: var(--color-swap);
          color: var(--color-swap);
          transform: rotate(180deg);
        }
        .swap-direction-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .slippage-options {
          display: flex;
          gap: var(--space-2);
        }
        .slippage-btn {
          padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
          font-weight: 500;
          font-family: var(--font-sans);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-bg-input);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .slippage-btn:hover:not(:disabled) {
          border-color: var(--color-border-focus);
        }
        .slippage-btn.active {
          border-color: var(--color-swap);
          color: var(--color-swap);
          background: rgba(52, 211, 153, 0.08);
        }
        .slippage-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </PageShell>
  );
}
