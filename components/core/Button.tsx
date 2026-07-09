'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

type Variant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink font-bold shadow-volt hover:bg-accent-hover',
  soft:    'bg-accent-soft text-accent border border-accent/30 font-semibold',
  ghost:   'bg-surface-2 text-ink-2 border border-line font-semibold hover:bg-surface-3',
  danger:  'bg-danger-soft text-danger border border-danger/30 font-semibold',
  outline: 'bg-transparent text-ink-1 border border-line font-semibold hover:bg-surface-2',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.8rem] rounded-lg gap-1.5',
  md: 'h-12 px-5 text-[0.92rem] rounded-xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2.5',
};

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center select-none transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
