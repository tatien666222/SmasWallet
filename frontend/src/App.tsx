import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './contexts/WalletContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { SendPage } from './pages/SendPage';
import { BridgePage } from './pages/BridgePage';
import { SwapPage } from './pages/SwapPage';

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/bridge" element={<BridgePage />} />
            <Route path="/swap" element={<SwapPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-card-solid)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
            },
          }}
        />
      </WalletProvider>
    </ErrorBoundary>
  );
}
