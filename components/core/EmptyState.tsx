'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Estado vazio padrão: ícone + título + subtítulo + ação opcional. */
export default function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card border-dashed py-10 px-6 text-center flex flex-col items-center gap-3"
    >
      {icon && <div className="text-ink-3">{icon}</div>}
      <div>
        <div className="font-display font-semibold text-ink-1 text-lg">{title}</div>
        {subtitle && <div className="text-[0.84rem] text-ink-2 mt-1 max-w-[280px] mx-auto">{subtitle}</div>}
      </div>
      {action}
    </motion.div>
  );
}
