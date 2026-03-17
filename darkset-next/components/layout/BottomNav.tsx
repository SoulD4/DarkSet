'use client';
import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { href: '/',          label: 'Início',    icon: '🏠' },
  { href: '/treino',    label: 'Treino',    icon: '🏋️' },
  { href: '/historico', label: 'Histórico', icon: '📋' },
  { href: '/evolucao',  label: 'Evolução',  icon: '📈' },
  { href: '/perfil',    label: 'Perfil',    icon: '👤' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav style={{ background: '#0e0e11', borderTop: '1px solid #202028' }}
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="flex items-center justify-around px-1 pt-2 pb-1">
        {TABS.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <button key={href} onClick={() => router.push(href)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
              style={{ minWidth: 52 }}>
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? '#e31b23' : '#5a5a6a' }}>
                {label}
              </span>
              {active && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: '#e31b23', display: 'block' }}/>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
