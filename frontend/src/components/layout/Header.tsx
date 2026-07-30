import { Link, useLocation } from 'react-router-dom';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';
import { Hexagon } from 'lucide-react';

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/send', label: 'Send' },
    { path: '/bridge', label: 'Bridge' },
    { path: '/swap', label: 'Swap' },
  ];

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <Hexagon size={24} strokeWidth={2.5} />
          <span className="header-logo-text">Arc SmasWallet</span>
        </Link>

        <nav className="header-nav hide-mobile">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`header-nav-link ${location.pathname === item.path ? 'active' : ''
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ConnectWalletButton />
      </div>

      <style>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(8, 11, 18, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--color-border);
        }
        .header-inner {
          max-width: 960px;
          margin: 0 auto;
          padding: var(--space-3) var(--page-padding);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
        }
        .header-logo {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--color-text-primary);
          text-decoration: none;
          font-weight: 700;
          font-size: var(--text-lg);
        }
        .header-logo svg {
          color: var(--color-accent);
        }
        .header-nav {
          display: flex;
          gap: var(--space-1);
        }
        .header-nav-link {
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--color-text-muted);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: all var(--transition-fast);
        }
        .header-nav-link:hover {
          color: var(--color-text-secondary);
          background: var(--color-bg-hover);
        }
        .header-nav-link.active {
          color: var(--color-text-primary);
          background: var(--color-accent-subtle);
        }
      `}</style>
    </header>
  );
}
