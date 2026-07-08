'use client';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type Tone = 'default' | 'accent' | 'ok' | 'warn' | 'danger' | 'info';

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-ink-1',
  accent:  'text-accent',
  ok:      'text-ok',
  warn:    'text-warn',
  danger:  'text-danger',
  info:    'text-info',
};

/** Tile de estatística: valor grande display + label pequeno. */
export default function StatTile({
  value,
  label,
  sub,
  icon,
  tone = 'default',
  className,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={clsx('card px-4 py-3.5 text-center', className)}>
      {icon && <div className="flex justify-center mb-1.5 text-ink-3">{icon}</div>}
      <div className={clsx('font-display font-bold text-[1.55rem] leading-none tnum', TONE_TEXT[tone])}>
        {value}
      </div>
      <div className="eyebrow mt-1.5">{label}</div>
      {sub && <div className="text-[0.68rem] text-ink-3 mt-0.5">{sub}</div>}
    </div>
  );
}
