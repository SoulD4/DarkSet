import { TopBar, TabBar } from './AppChrome';

/**
 * Shell padrão de todas as páginas: TopBar fixa + conteúdo + TabBar.
 * `hideBottomNav` para telas imersivas (sessão de treino, share, timers).
 */
export default function PageShell({
  children,
  className = '',
  hideBottomNav = false,
}: {
  children: React.ReactNode;
  className?: string;
  hideBottomNav?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-bg">
      <TopBar />
      <main
        className={`px-4 max-w-[480px] mx-auto overflow-x-hidden ${className}`}
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top), 0px) + 64px)',
          paddingBottom: hideBottomNav
            ? '2rem'
            : 'calc(max(env(safe-area-inset-bottom), 0px) + 92px)',
        }}
      >
        {children}
      </main>
      {!hideBottomNav && <TabBar />}
    </div>
  );
}
