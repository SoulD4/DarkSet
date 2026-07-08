'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Cabeçalho padrão de página: título display + subtítulo + ação à direita. */
export default function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between gap-3 mb-6"
    >
      <div className="min-w-0">
        <h1 className="font-display font-bold text-[1.7rem] leading-tight tracking-tight text-ink-1">
          {title}
        </h1>
        {subtitle && <p className="text-[0.82rem] text-ink-2 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0 pt-1">{right}</div>}
    </motion.div>
  );
}
