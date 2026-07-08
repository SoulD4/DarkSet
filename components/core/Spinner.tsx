export default function Spinner({ size = 28, full = false }: { size?: number; full?: boolean }) {
  const el = (
    <div
      role="status"
      aria-label="Carregando"
      style={{ width: size, height: size, animation: 'spin .7s linear infinite' }}
      className="rounded-full border-[3px] border-surface-3 border-t-accent"
    />
  );
  if (!full) return el;
  return <div className="flex items-center justify-center min-h-[55vh]">{el}</div>;
}
