import Drawer from './Drawer';

export default function PageShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
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
          paddingBottom: '2rem',
          maxWidth: 480,
            overflowX: 'hidden',
          margin: '0 auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}
