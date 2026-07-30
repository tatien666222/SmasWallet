import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeftRight, ArrowLeft, CheckCircle, ExternalLink, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { AmountInput } from '../components/forms/AmountInput';
import { ChainSelector } from '../components/forms/ChainSelector';
import { Button } from '../components/shared/Button';
import { useWallet } from '../contexts/WalletContext';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { useArcBalance } from '../hooks/useArcBalance';
import { kit, BRIDGE_CHAINS, SUPPORTED_CHAINS } from '../config/appkit';
import { switchNetwork } from '../config/chain';
import { isValidAmount, isAmountExceedsBalance } from '../utils/validation';
import { formatAmount } from '../utils/format';
import type { BridgeStep } from '../types';
import { formatUnits } from 'viem';

/* ------------------------------------------------------------------ */
/*  Bridge step display config — matches SDK event step names          */
/* ------------------------------------------------------------------ */

const BRIDGE_STEPS_DISPLAY = [
  { key: 'approve', label: 'Approve' },
  { key: 'burn', label: 'Burn' },
  { key: 'fetchAttestation', label: 'Attestation' },
  { key: 'mint', label: 'Mint' },
] as const;

function getStepIndex(step: BridgeStep): number {
  const map: Record<string, number> = {
    approve: 0, burn: 1, fetchAttestation: 2, mint: 3, confirmed: 4,
  };
  return map[step] ?? -1;
}

/* ------------------------------------------------------------------ */
/*  Helper: extract explorer URLs from SDK BridgeResult.steps[]       */
/* ------------------------------------------------------------------ */

interface BridgeStepResult {
  name: string;
  state: string;
  txHash?: string;
  explorerUrl?: string;
  data?: {
    txHash?: string;
    explorerUrl?: string;
  };
}

function extractExplorerUrls(result: any): { source?: string; dest?: string; txHash?: string } {
  const steps: BridgeStepResult[] = result?.steps || [];

  // Source tx is typically the first step with a txHash (approve or burn)
  const sourceStep = steps.find(s => s.name === 'approve' || s.name === 'burn');
  const mintStep = steps.find(s => s.name === 'mint');

  return {
    source: sourceStep?.explorerUrl || sourceStep?.data?.explorerUrl,
    dest: mintStep?.explorerUrl || mintStep?.data?.explorerUrl,
    txHash: sourceStep?.txHash || sourceStep?.data?.txHash,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BridgePage() {
  const { isConnected, address, adapter, provider } = useWallet();
  const { addTransaction } = useTransactionHistory();
  const { balance: arcBalance } = useArcBalance(address);

  const [sourceChain, setSourceChain] = useState('Ethereum_Sepolia');
  const [destChain, setDestChain] = useState('Arc_Testnet');
  const [amount, setAmount] = useState('');

  const [step, setStep] = useState<BridgeStep>('input');
  const [estimate, setEstimate] = useState<{ fees?: any[]; estimatedTime?: string } | null>(null);
  const [bridgeResult, setBridgeResult] = useState<any>(null);
  const [error, setError] = useState('');

  const [otherBalance, setOtherBalance] = useState<string>('0.00');

  // Keep a ref to the latest bridge result for retry
  const lastResultRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    async function fetchOtherBalance() {
      if (!address || sourceChain === 'Arc_Testnet') return;
      
      try {
        if (!adapter) return;
        const balanceAction = await adapter.prepareAction(
          "usdc.balanceOf",
          {},
          { chain: sourceChain }
        );
        const balance = await balanceAction.execute();
        
        if (active && balance !== undefined) {
          const parsed = parseFloat(formatUnits(BigInt(balance), 6)).toFixed(2);
          setOtherBalance(parsed);
        }
      } catch (err) {
        console.warn('Failed to fetch native balance for', sourceChain, err);
        if (active) setOtherBalance('0.00');
      }
    }

    fetchOtherBalance();
    
    // Poll every 10 seconds for the other chain
    const intervalId = setInterval(fetchOtherBalance, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [address, sourceChain]);

  const currentBalance = sourceChain === 'Arc_Testnet' ? arcBalance : otherBalance;
  const canSubmit =
    isConnected &&
    isValidAmount(amount) &&
    !isAmountExceedsBalance(amount, currentBalance) &&
    sourceChain !== destChain;

  /* ---------------------------------------------------------------- */
  /*  Listen to SDK lifecycle events via kit.on("*")                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const handler = (payload: any) => {
      const stepName = payload?.values?.name || payload?.method;
      if (!stepName) return;

      // Map SDK step names to our BridgeStep type
      if (stepName === 'approve') setStep('approve');
      else if (stepName === 'burn') setStep('burn');
      else if (stepName === 'fetchAttestation' || stepName === 'attestation') setStep('fetchAttestation');
      else if (stepName === 'mint') setStep('mint');
    };

    kit.on('*', handler);

    // SDK on() returns void — no built-in unsubscribe
    // Events are global and short-lived (only during bridge execution)
    return () => {
      // no-op
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Estimate                                                         */
  /* ---------------------------------------------------------------- */

  const handleEstimate = useCallback(async () => {
    if (!canSubmit) return;
    setStep('estimating');
    setError('');

    try {
      const est = await kit.estimateBridge({
        from: { adapter, chain: sourceChain },
        to: { adapter, chain: destChain },
        amount,
        token: 'USDC',
      });
      setEstimate(est as any);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate');
      setStep('error');
    }
  }, [canSubmit, adapter, sourceChain, destChain, amount]);

  /* ---------------------------------------------------------------- */
  /*  Execute Bridge                                                   */
  /* ---------------------------------------------------------------- */

  const handleBridge = useCallback(async () => {
    setStep('approve');
    setError('');

    try {
      // Ensure wallet is on the correct source chain before bridging
      await switchNetwork(provider, sourceChain);

      const result = await kit.bridge({
        from: { adapter, chain: sourceChain },
        to: { adapter, chain: destChain },
        amount,
        token: 'USDC',
      });

      lastResultRef.current = result;

      // Check if the SDK returned an error state
      if ((result as any)?.state === 'error') {
        setError('Bridge failed. You can retry the transaction.');
        setBridgeResult(result);
        setStep('error');
        return;
      }

      setBridgeResult(result);
      setStep('confirmed');

      // Extract transaction info from result.steps[]
      const urls = extractExplorerUrls(result);

      addTransaction({
        id: crypto.randomUUID(),
        type: 'bridge',
        sourceChain,
        destChain,
        tokenIn: 'USDC',
        tokenOut: 'USDC',
        amountIn: amount,
        amountOut: amount,
        status: 'confirmed',
        txHash: urls.txHash || '',
        explorerUrl: urls.source,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bridge failed');
      setStep('error');
    }
  }, [adapter, sourceChain, destChain, amount, addTransaction]);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const handleReset = () => {
    setStep('input');
    setAmount('');
    setEstimate(null);
    setBridgeResult(null);
    setError('');
    lastResultRef.current = null;
  };

  const isBridging = ['approve', 'burn', 'fetchAttestation', 'mint'].includes(step);
  const currentStepIdx = getStepIndex(step);

  /* ---------------------------------------------------------------- */
  /*  Format fees from EstimateResult                                  */
  /* ---------------------------------------------------------------- */

  const formatFee = (est: any): string => {
    if (!est) return '—';
    
    console.log('[Bridge Estimate]', est);
    const chainSymbol = SUPPORTED_CHAINS.find(c => c.id === sourceChain)?.symbol || 'USDC';

    // SDK EstimateResult may have fees[] array
    if (est.fees && Array.isArray(est.fees)) {
      const gasFee = est.fees.find((f: any) => f.type === 'gasFee');
      const providerFee = est.fees.find((f: any) => f.type === 'provider');
      const totalAmount = [gasFee, providerFee]
        .filter(Boolean)
        .reduce((sum: number, f: any) => sum + parseFloat(f.amount || '0'), 0);
        
      if (totalAmount === 0) return 'Free';
      if (totalAmount > 0) {
        return `${totalAmount.toFixed(6)} USDC`;
      }
    }

    // Fallback: various raw fee fields
    const rawFeeStr = est.fee !== undefined ? est.fee : 
                      est.estimatedFee !== undefined ? est.estimatedFee : 
                      est.totalFee !== undefined ? est.totalFee : 
                      est.gasFee !== undefined ? est.gasFee : undefined;
                      
    if (rawFeeStr !== undefined) {
      const rawFee = parseFloat(rawFeeStr);
      if (isNaN(rawFee)) return `0.000500 ${chainSymbol}`;
      const feeValue = rawFee > 100000 ? rawFee / 1e18 : rawFee;
      
      if (feeValue === 0) return 'Free';
      return `${feeValue.toFixed(6)} ${chainSymbol}`;
    }

    // If no fee info is returned by SDK on testnet, assume it's free/covered.
    return 'Free (Testnet)';
  };

  /* ---------------------------------------------------------------- */
  /*  Success screen                                                   */
  /* ---------------------------------------------------------------- */

  if (step === 'confirmed' && bridgeResult) {
    const urls = extractExplorerUrls(bridgeResult);
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
          <h2 style={{ marginTop: 'var(--space-4)' }}>Bridge Complete!</h2>
          <p className="text-secondary" style={{ marginTop: 'var(--space-2)' }}>
            {formatAmount(amount)} USDC moved from {sourceChain.replace('_', ' ')} to {destChain.replace('_', ' ')}
          </p>
          <div className="divider" />
          <div className="flex gap-3 justify-center">
            {urls.source && (
              <a href={urls.source} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                Source TX <ExternalLink size={14} />
              </a>
            )}
            {urls.dest && (
              <a href={urls.dest} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                Dest TX <ExternalLink size={14} />
              </a>
            )}
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={handleReset}>Bridge Again</Button>
          </div>
        </div>
      </PageShell>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main form                                                        */
  /* ---------------------------------------------------------------- */

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
            background: 'rgba(167, 139, 250, 0.12)', color: 'var(--color-bridge)',
          }}>
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Bridge</h1>
            <p className="page-subtitle">Move USDC across blockchains via CCTP</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <ChainSelector
            value={sourceChain}
            onChange={setSourceChain}
            chains={BRIDGE_CHAINS}
            label="From"
            disabled={isBridging}
          />
          <ChainSelector
            value={destChain}
            onChange={setDestChain}
            chains={BRIDGE_CHAINS}
            label="To"
            disabled={isBridging}
          />
        </div>

        {sourceChain === destChain && (
          <p className="form-error" style={{ marginTop: 'var(--space-2)' }}>
            Source and destination must be different chains
          </p>
        )}

        <div className="form-group" style={{ marginTop: 'var(--space-5)' }}>
          <label className="label">Amount (USDC)</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            balance={currentBalance}
            token="USDC"
            disabled={isBridging}
            error={
              amount && isAmountExceedsBalance(amount, currentBalance)
                ? 'Insufficient USDC on source chain'
                : undefined
            }
          />
        </div>

        {/* Bridge progress stepper */}
        {isBridging && (
          <div className="bridge-stepper animate-slide-up" style={{ marginTop: 'var(--space-6)' }}>
            {BRIDGE_STEPS_DISPLAY.map((s, i) => {
              const isDone = i < currentStepIdx;
              const isActive = i === currentStepIdx;
              return (
                <div
                  key={s.key}
                  className={`bridge-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                >
                  <div className="bridge-step-dot">
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className="bridge-step-label">{s.label}</span>
                  {i < BRIDGE_STEPS_DISPLAY.length - 1 && (
                    <div className={`bridge-step-line ${isDone ? 'done' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Estimate preview */}
        {step === 'preview' && estimate && (
          <div className="animate-slide-up" style={{ marginTop: 'var(--space-5)' }}>
            <div className="divider" />
            {estimate.estimatedTime && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-secondary">Estimated Time</span>
                <span>{estimate.estimatedTime}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Estimated Fee</span>
              <span className="text-mono">{formatFee(estimate)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="form-error" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-error-subtle)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 'var(--space-6)' }}>
          {step === 'input' ? (
            <Button variant="primary" size="lg" block disabled={!canSubmit} onClick={handleEstimate}>
              {!isConnected ? 'Connect Wallet First' : 'Review Bridge'}
            </Button>
          ) : step === 'error' ? (
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="lg" block onClick={handleEstimate}>
                <RotateCcw size={16} /> Try Again
              </Button>
              <Button variant="ghost" block onClick={handleReset}>
                Reset
              </Button>
            </div>
          ) : step === 'estimating' ? (
            <Button variant="primary" size="lg" block loading disabled>
              Estimating…
            </Button>
          ) : step === 'preview' ? (
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="lg" block onClick={handleBridge}>
                Confirm Bridge · {formatAmount(amount)} USDC
              </Button>
              <Button variant="ghost" block onClick={() => setStep('input')}>
                Edit
              </Button>
            </div>
          ) : isBridging ? (
            <Button variant="primary" size="lg" block loading disabled>
              Bridging… do not close this page
            </Button>
          ) : null}
        </div>
      </div>

      <style>{`
        .bridge-stepper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) 0;
        }
        .bridge-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-1);
          position: relative;
          flex: 1;
        }
        .bridge-step-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-xs);
          font-weight: 700;
          background: var(--color-bg-input);
          color: var(--color-text-muted);
          border: 2px solid var(--color-border);
          transition: all var(--transition-base);
          z-index: 1;
        }
        .bridge-step.active .bridge-step-dot {
          border-color: var(--color-bridge);
          color: var(--color-bridge);
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.3);
          animation: pulse 1.5s infinite;
        }
        .bridge-step.done .bridge-step-dot {
          background: var(--color-success);
          border-color: var(--color-success);
          color: white;
        }
        .bridge-step-label {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }
        .bridge-step.active .bridge-step-label {
          color: var(--color-bridge);
          font-weight: 600;
        }
        .bridge-step.done .bridge-step-label {
          color: var(--color-success);
        }
        .bridge-step-line {
          position: absolute;
          top: 16px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: var(--color-border);
          z-index: 0;
        }
        .bridge-step-line.done {
          background: var(--color-success);
        }
      `}
      </style>
    </PageShell>
  );
}
