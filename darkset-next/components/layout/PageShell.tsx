import BottomNav from './BottomNav';

export default function PageShell({ children, className = '' }: {
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#060608' }}>
      <main className={`flex-1 px-4 pt-4 pb-24 overflow-y-auto ${className}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
