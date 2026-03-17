'use client';
import { ReactNode } from 'react';

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      paddingBottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 16px))',
    }}>
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '0.75rem 0.85rem',
        paddingTop: 'max(env(safe-area-inset-top), 0.75rem)',
      }}>
        {children}
      </div>
    </div>
  );
}
