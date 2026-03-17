'use client';
import PageShell from '@/components/layout/PageShell';

export default function HomePage() {
  const streak = 12;
  const weekDone = 3;
  const weekGoal = 5;
  const weekDays = ['S','T','Q','Q','S','S','D'];
  const trainedDays = [0, 1, 3];

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: '#5a5a6a' }}>
            Bem-vindo de volta
          </p>
          <h1 className="font-condensed font-black text-3xl uppercase tracking-wide leading-none mt-0.5"
            style={{ color: '#f0f0f2' }}>
            DarkSet
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
          style={{ background: 'linear-gradient(135deg,#e31b23,#6b0a0e)', color: '#fff' }}>
          DS
        </div>
      </div>

      {/* Streak + Semana */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="ds-card p-4 text-center">
          <div className="font-condensed font-black text-4xl leading-none"
            style={{ color: streak > 0 ? '#f97316' : '#323240' }}>
            {streak}
          </div>
          <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#9898a8' }}>
            🔥 Streak dias
          </div>
        </div>
        <div className="ds-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest" style={{ color: '#9898a8' }}>Semana</span>
            <span className="font-condensed font-black text-lg" style={{ color: '#e31b23' }}>
              {weekDone}/{weekGoal}
            </span>
          </div>
          <div className="flex gap-1 justify-between">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-5 h-5 rounded-full transition-all"
                  style={{
                    background: trainedDays.includes(i) ? '#e31b23' : 'rgba(255,255,255,.06)',
                    boxShadow: trainedDays.includes(i) ? '0 0 8px rgba(227,27,35,.5)' : 'none',
                  }} />
                <span className="text-xs" style={{ color: '#323240' }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Treino de hoje */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a6a' }}>Hoje</p>
      <div className="ds-card p-4 mb-4" style={{ borderLeft: '2px solid #e31b23' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-condensed font-black text-xl uppercase tracking-wide" style={{ color: '#f0f0f2' }}>
              Treino A — Peito
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9898a8' }}>8 exercícios · ~55 min</div>
          </div>
          <button className="ds-btn-primary px-5 py-2.5 text-sm">Iniciar</button>
        </div>
        <div className="mt-3">
          <div className="ds-progress-track">
            <div className="ds-progress-fill" style={{ width: '0%' }} />
          </div>
          <p className="text-xs mt-1" style={{ color: '#5a5a6a' }}>0 de 8 exercícios</p>
        </div>
      </div>

      {/* Últimos treinos */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a6a' }}>Últimos treinos</p>
      <div className="grid gap-2">
        {[
          { date: 'Ontem',        plan: 'Treino B — Costas', dur: '48 min' },
          { date: 'Quinta-feira', plan: 'Treino A — Peito',  dur: '52 min' },
          { date: 'Terça-feira',  plan: 'Treino C — Pernas', dur: '61 min' },
        ].map((t, i) => (
          <div key={i} className="ds-card p-3 flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-xs uppercase tracking-wide font-bold" style={{ color: '#5a5a6a' }}>{t.date}</div>
              <div className="font-semibold text-sm mt-0.5" style={{ color: '#f0f0f2' }}>{t.plan}</div>
            </div>
            <div className="font-condensed font-bold text-lg" style={{ color: '#e31b23' }}>{t.dur}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
