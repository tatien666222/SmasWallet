import React from 'react';
import { Header } from './Header';

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <>
      <Header />
      <main className="page">
        <div className="page-content">{children}</div>
      </main>
    </>
  );
}
