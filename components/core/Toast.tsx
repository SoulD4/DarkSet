'use client';
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type Tone = 'ok' | 'warn' | 'danger';
type ToastState = { msg: string; tone: Tone } | null;

const TONES: Record<Tone, { cls: string; Icon: typeof CheckCircle2 }> = {
  ok:     { cls: 'bg-ok-soft border-ok/30 text-ok',         Icon: CheckCircle2 },
  warn:   { cls: 'bg-warn-soft border-warn/30 text-warn',   Icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft border-danger/30 text-danger', Icon: XCircle },
};

/**
 * Toast unificado.
 * Uso: const { toast, show } = useToast(); ... show('Salvo!'); show('Erro', 'danger');
 * Render: <ToastViewport toast={toast}/>
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, tone: Tone = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, tone });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return { toast, show };
}

export function ToastViewport({ toast }: { toast: ToastState }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2
                      border rounded-full px-4 py-2 text-[0.82rem] font-semibold whitespace-nowrap
                      backdrop-blur-md pointer-events-none ${TONES[toast.tone].cls}`}
          style={{ transform: 'translateX(-50%)' }}
        >
          {(() => { const I = TONES[toast.tone].Icon; return <I size={14} />; })()}
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
