import Drawer from './Drawer';
import BottomNav from './BottomNav';

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
    <div style={{ minHeight: '100dvh', background: '#060608' }}>
      <Drawer />
      <main
        className={className}
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top), 0px) + 56px)',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          // Espaço para bottom nav (60px) + safe area + margem extra
          paddingBottom: hideBottomNav
            ? '2rem'
            : 'calc(max(env(safe-area-inset-bottom), 0px) + 76px)',
          maxWidth: 480,
          overflowX: 'hidden',
          margin: '0 auto',
        }}
      >
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
