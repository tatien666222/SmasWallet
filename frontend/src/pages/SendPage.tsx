import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { AddressInput } from '../components/forms/AddressInput';
import { AmountInput } from '../components/forms/AmountInput';
import { ChainSelector } from '../components/forms/ChainSelector';
import { TokenSelector } from '../components/forms/TokenSelector';
import { Button } from '../components/shared/Button';
import { useWallet } from '../contexts/WalletContext';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { useArcBalance } from '../hooks/useArcBalance';
import { kit, SUPPORTED_CHAINS, SUPPORTED_TOKENS } from '../config/appkit';
import { isValidAddress, isValidAmount, isAmountExceedsBalance } from '../utils/validation';
import { parseUnits, createWalletClient, custom, defineChain, formatUnits } from 'viem';
import { arcTestnet, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_HEX_CHAIN_ID } from '../config/chain';
import { formatAmount } from '../utils/format';
import type { SendStep } from '../types';

export function SendPage() {
  const { isConnected, address, adapter, provider } = useWallet();
  const { addTransaction } = useTransactionHistory();
  const { balance: arcBalance } = useArcBalance(address);

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [chain, setChain] = useState('Arc_Testnet');

  // Flow state
  const [step, setStep] = useState<SendStep>('input');
  const [estimate, setEstimate] = useState<{ gas: unknown; fee: string } | null>(null);
  const [result, setResult] = useState<{ txHash: string; explorerUrl: string } | null>(null);
  const [error, setError] = useState('');
  
  const [otherBalance, setOtherBalance] = useState<string>('0.00');

  useEffect(() => {
    let active = true;

    async function fetchOtherBalance() {
      if (!address || chain === 'Arc_Testnet') return;
      
      try {
        if (!adapter) return;
        const balanceAction = await adapter.prepareAction(
          "usdc.balanceOf",
          {},
          { chain }
        );
        const balance = await balanceAction.execute();
        
        if (active && balance !== undefined) {
          const parsed = parseFloat(formatUnits(BigInt(balance), 6)).toFixed(2);
          setOtherBalance(parsed);
        }
      } catch (err) {
        console.warn('Failed to fetch native balance for', chain, err);
        if (active) setOtherBalance('0.00');
      }
    }

    fetchOtherBalance();
    const intervalId = setInterval(fetchOtherBalance, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [address, chain]);

  const currentBalance = chain === 'Arc_Testnet' ? arcBalance : otherBalance;

  const canSubmit =
    isConnected &&
    isValidAddress(recipient) &&
    isValidAmount(amount) &&
    !isAmountExceedsBalance(amount, currentBalance);

  const handleEstimate = async () => {
    if (!canSubmit) return;
    setStep('estimating');
    setError('');

    try {
      const est = await kit.estimateSend({
        from: { adapter, chain },
        to: recipient,
        amount,
        token,
      });
      setEstimate(est as { gas: unknown; fee: string });
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate');
      setStep('error');
    }
  };

  const handleSend = async () => {
    setStep('signing');
    setError('');

    try {
      let realTxHash: string | undefined;

      // Broadcast directly via Viem WalletClient on Arc Testnet (Chain ID 5042002)
      if (provider && chain === 'Arc_Testnet') {
        try {
          await (provider as any).request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_TESTNET_HEX_CHAIN_ID }],
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902 || switchErr?.message?.includes('Unrecognized chain')) {
            try {
              await (provider as any).request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: ARC_TESTNET_HEX_CHAIN_ID,
                    chainName: 'Arc Testnet',
                    nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
                    rpcUrls: ['https://rpc.testnet.arc.io'],
                    blockExplorerUrls: ['https://testnet.arcscan.app'],
                  },
                ],
              });
            } catch (addErr) {
              console.warn('Chain add notice:', addErr);
            }
          }
        }

        const client = createWalletClient({
          chain: arcTestnet,
          transport: custom(provider as any),
        });

        realTxHash = await client.sendTransaction({
          account: address as `0x${string}`,
          to: recipient as `0x${string}`,
          value: parseUnits(amount, 18),
        });
      } else {
        const res = await kit.send({
          from: { adapter, chain },
          to: recipient,
          amount,
          token,
        });
        realTxHash = res.txHash;
      }

      if (!realTxHash) {
        throw new Error('Transaction execution failed: No transaction hash returned.');
      }

      const selectedChainObj = SUPPORTED_CHAINS.find(c => c.id === chain);
      const explorerUrl = `${selectedChainObj?.explorerUrl || 'https://testnet.arcscan.app'}/tx/${realTxHash}`;
      const sendResult = { txHash: realTxHash, explorerUrl };

      setResult(sendResult);
      setStep('confirmed');

      // Save to history & Backend API
      addTransaction({
        id: crypto.randomUUID(),
        type: 'send',
        sourceChain: chain,
        destChain: chain,
        tokenIn: token,
        tokenOut: token,
        amountIn: amount,
        amountOut: amount,
        status: 'confirmed',
        txHash: realTxHash,
        explorerUrl,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Send error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('input');
    setRecipient('');
    setAmount('');
    setEstimate(null);
    setResult(null);
    setError('');
  };

  // Success screen
  if (step === 'confirmed' && result) {
    return (
      <PageShell>
        <div className="send-success card animate-slide-up" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <div className="success-icon-wrap">
            <CheckCircle size={48} />
          </div>
          <h2 style={{ marginTop: 'var(--space-4)' }}>Sent Successfully!</h2>
          <p className="text-secondary" style={{ marginTop: 'var(--space-2)' }}>
            {formatAmount(amount)} {token} sent on {chain.replace('_', ' ')}
          </p>
          <div className="divider" />
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex' }}
          >
            View on Explorer <ExternalLink size={14} />
          </a>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={handleReset}>
              Send Another
            </Button>
          </div>
        </div>

        <style>{`
          .success-icon-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: var(--color-success-subtle);
            color: var(--color-success);
          }
        `}</style>
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
            background: 'rgba(99, 135, 255, 0.12)', color: 'var(--color-send)',
          }}>
            <ArrowUpRight size={20} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Send</h1>
            <p className="page-subtitle">Transfer tokens on the same chain</p>
          </div>
        </div>
      </div>

      <div className="card">
        <AddressInput
          value={recipient}
          onChange={setRecipient}
          disabled={isProcessing}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <TokenSelector
            value={token}
            onChange={setToken}
            tokens={SUPPORTED_TOKENS}
            disabled={isProcessing}
          />
          <ChainSelector
            value={chain}
            onChange={setChain}
            chains={SUPPORTED_CHAINS}
            disabled={isProcessing}
          />
        </div>

        <div className="form-group" style={{ marginTop: 'var(--space-5)' }}>
          <div className="flex justify-between items-center">
            <label className="label">Amount</label>
            {arcBalance === '0.00' && (
              <span className="text-xs text-muted">
                Need funds? <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>Circle Faucet</a>
              </span>
            )}
          </div>
          <AmountInput
            value={amount}
            onChange={setAmount}
            balance={currentBalance}
            token={token}
            disabled={isProcessing}
            error={
              amount && isAmountExceedsBalance(amount, currentBalance)
                ? 'Insufficient balance on this chain'
                : undefined
            }
          />
        </div>

        {/* Estimate preview */}
        {step === 'preview' && estimate && (
          <div className="send-preview animate-slide-up" style={{ marginTop: 'var(--space-5)' }}>
            <div className="divider" />
            <div className="flex justify-between text-sm" style={{ marginBottom: 'var(--space-2)' }}>
              <span className="text-secondary">Estimated Fee</span>
              <span className="text-mono">
                {(() => {
                  const chainSymbol = SUPPORTED_CHAINS.find(c => c.id === chain)?.symbol || 'USDC';
                  const rawFee = parseFloat(estimate.fee);
                  if (isNaN(rawFee)) return `0.000100 ${chainSymbol}`;
                  const feeValue = rawFee > 100000 ? rawFee / 1e18 : rawFee;
                  return `${feeValue.toFixed(6)} ${chainSymbol}`;
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="form-error" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-error-subtle)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: 'var(--space-6)' }}>
          {step === 'input' || step === 'error' ? (
            <Button
              variant="primary"
              size="lg"
              block
              disabled={!canSubmit}
              loading={false}
              onClick={handleEstimate}
            >
              {!isConnected ? 'Connect Wallet First' : 'Review Send'}
            </Button>
          ) : step === 'estimating' ? (
            <Button variant="primary" size="lg" block loading disabled>
              Estimating fees…
            </Button>
          ) : step === 'preview' ? (
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="lg" block onClick={handleSend}>
                Confirm Send · {formatAmount(amount)} {token}
              </Button>
              <Button variant="ghost" block onClick={() => setStep('input')}>
                Edit
              </Button>
            </div>
          ) : step === 'signing' || step === 'pending' ? (
            <Button variant="primary" size="lg" block loading disabled>
              {step === 'signing' ? 'Confirm in wallet…' : 'Processing…'}
            </Button>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
