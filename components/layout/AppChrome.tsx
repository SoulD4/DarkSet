'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Menu, X, Home, ClipboardList, Play, TrendingUp, User as UserIcon,
  History, HeartPulse, Flower2, Salad, Swords, Globe, Medal, GraduationCap, Zap,
} from 'lucide-react';

/* ── Logo (única herança visual da marca) ─────────────────────── */
export function Logo({ size = '1.35rem' }: { size?: string }) {
  return (
    <span className="font-logo font-black tracking-[0.06em] leading-none text-ink-1" style={{ fontSize: size }}>
      DARK<span className="text-brand">SET</span>
    </span>
  );
}

/* ── Estrutura de navegação ───────────────────────────────────── */
const MENU = [
  {
    section: 'Treino',
    items: [
      { href: '/',            icon: Home,          label: 'Início' },
      { href: '/treino',      icon: ClipboardList, label: 'Fichas' },
      { href: '/modo-treino', icon: Zap,           label: 'Modo Treino' },
      { href: '/historico',   icon: History,       label: 'Histórico' },
      { href: '/evolucao',    icon: TrendingUp,    label: 'Evolução' },
    ],
  },
  {
    section: 'Saúde',
    items: [
      { href: '/cardio',   icon: HeartPulse, label: 'DarkCardio' },
      { href: '/darkzen',  icon: Flower2,    label: 'DarkZen' },
      { href: '/darkdiet', icon: Salad,      label: 'DarkDiet' },
    ],
  },
  {
    section: 'Comunidade',
    items: [
      { href: '/darksquad', icon: Swords,        label: 'DarkSquad' },
      { href: '/darkrank',  icon: Globe,         label: 'DarkRank' },
      { href: '/personal',  icon: GraduationCap, label: 'Personal' },
      { href: '/darkselos', icon: Medal,         label: 'DarkSelos' },
    ],
  },
  {
    section: 'Conta',
    items: [{ href: '/perfil', icon: UserIcon, label: 'Perfil' }],
  },
];

const TABS = [
  { href: '/',            icon: Home,          label: 'Início' },
  { href: '/treino',      icon: ClipboardList, label: 'Fichas' },
  { href: '/modo-treino', icon: Play,          label: 'Treinar', cta: true },
  { href: '/evolucao',    icon: TrendingUp,    label: 'Progresso' },
  { href: '/perfil',      icon: UserIcon,      label: 'Perfil' },
];

/* ── TopBar + MenuSheet ───────────────────────────────────────── */
export function TopBar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  const initials = (user?.displayName || user?.email || 'DS').slice(0, 2).toUpperCase();

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 border-b border-line"
        style={{
          background: 'rgba(12,14,17,.86)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingTop: 'max(env(safe-area-inset-top), 0.55rem)',
          paddingBottom: '0.55rem',
        }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="app-menu"
          className="w-9 h-9 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2"
        >
          <Menu size={17} />
        </button>

        <Logo />

        <button
          onClick={() => router.push('/perfil')}
          aria-label="Perfil"
          className="w-9 h-9 rounded-full overflow-hidden border border-line bg-surface-3 flex items-center justify-center"
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display font-bold text-[0.72rem] text-ink-2">{initials}</span>
          )}
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/70"
              style={{ backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              id="app-menu"
              role="dialog" aria-modal="true" aria-label="Menu de navegação"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed top-0 left-0 bottom-0 z-[61] w-[290px] max-w-[82vw] bg-surface-1 border-r border-line flex flex-col overflow-y-auto"
            >
              {/* Header do menu */}
              <div className="p-5 border-b border-line shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <Logo size="1.55rem" />
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Fechar menu"
                    className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-ink-3"
                  >
                    <X size={15} />
                  </button>
                </div>
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-3 border border-line flex items-center justify-center shrink-0">
                      {user.photoURL
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        : <span className="font-display font-bold text-xs text-ink-2">{initials}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[0.88rem] text-ink-1 truncate">{user.displayName || 'Atleta'}</div>
                      <div className="text-[0.68rem] text-ink-3 truncate">{user.email}</div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { router.push('/login'); setOpen(false); }}
                    className="w-full h-11 rounded-xl bg-accent text-accent-ink font-bold text-[0.88rem]"
                  >
                    Entrar / Criar conta
                  </button>
                )}
              </div>

              {/* Itens */}
              <nav className="flex-1 py-2">
                {MENU.map(group => (
                  <div key={group.section}>
                    <div className="eyebrow px-5 pt-4 pb-1.5">{group.section}</div>
                    {group.items.map(({ href, icon: Icon, label }) => {
                      const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                      return (
                        <button
                          key={href}
                          onClick={() => { router.push(href); setOpen(false); }}
                          className={`w-full flex items-center gap-3.5 px-5 py-3 text-left transition-colors
                            ${active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2'}`}
                        >
                          <Icon size={17} className={active ? 'text-accent' : 'text-ink-3'} />
                          <span className="font-semibold text-[0.9rem]">{label}</span>
                          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="p-5 border-t border-line text-center text-[0.6rem] text-ink-3 tracking-wider shrink-0">
                DARKSET v3.0 · darksetapp.com
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── TabBar inferior com CTA central "Treinar" ────────────────── */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-line"
      style={{
        background: 'rgba(12,14,17,.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      }}
    >
      <div className="flex items-end justify-around max-w-[480px] mx-auto pt-2 pb-1">
        {TABS.map(({ href, icon: Icon, label, cta }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          if (cta) {
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                aria-label={label}
                className="flex flex-col items-center gap-1 -mt-6"
              >
                <span className="w-[52px] h-[52px] rounded-full bg-accent text-accent-ink shadow-volt flex items-center justify-center">
                  <Icon size={22} fill="currentColor" />
                </span>
                <span className="text-[0.6rem] font-bold text-accent">{label}</span>
              </button>
            );
          }
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center gap-1 min-w-[52px] py-1"
            >
              <Icon size={19} className={active ? 'text-accent' : 'text-ink-3'} />
              <span className={`text-[0.6rem] font-semibold ${active ? 'text-accent' : 'text-ink-3'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
