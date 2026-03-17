'use client';
import { useState } from 'react';
import PageShell from '@/components/layout/PageShell';

type Serie = { ex: string; series: number; reps: string; carga: string; };
type Treino = { id: string; data: string; nome: string; duracao: string; series: Serie[]; volume: number; };

const HISTORICO_MOCK: Treino[] = [
  {
    id: '1', data: '2026-03-17', nome: 'Treino A — Peito',
    duracao: '52 min', volume: 8420,
    series: [
      { ex: 'Supino Reto',     series: 4, reps: '10', carga: '80' },
      { ex: 'Crucifixo',       series: 3, reps: '12', carga: '14' },
      { ex: 'Peck Deck',       series: 3, reps: '12', carga: '40' },
      { ex: 'Supino Inclinado',series: 3, reps: '10', carga: '70' },
    ],
  },
  {
    id: '2', data: '2026-03-15', nome: 'Treino B — Costas',
    duracao: '48 min', volume: 7650,
    series: [
      { ex: 'Puxada Frontal',  series: 4, reps: '10', carga: '60' },
      { ex: 'Remada Curvada',  series: 3, reps: '10', carga: '70' },
      { ex: 'Barra Fixa',      series: 3, reps: '8',  carga: '0'  },
    ],
  },
  {
    id: '3', data: '2026-03-13', nome: 'Treino C — Pernas',
    duracao: '61 min', volume: 12300,
    series: [
      { ex: 'Agachamento',       series: 5, reps: '8',  carga: '100' },
      { ex: 'Leg Press',         series: 4, reps: '12', carga: '150' },
      { ex: 'Cadeira Extensora', series: 3, reps: '15', carga: '50'  },
      { ex: 'Stiff',             series: 3, reps: '12', carga: '60'  },
    ],
  },
  {
    id: '4', data: '2026-03-11', nome: 'Treino A — Peito',
    duracao: '50 min', volume: 8100,
    series: [
      { ex: 'Supino Reto',  series: 4, reps: '10', carga: '77.5' },
      { ex: 'Crucifixo',    series: 3, reps: '12', carga: '14'   },
      { ex: 'Peck Deck',    series: 3, reps: '12', carga: '38'   },
    ],
  },
  {
    id: '5', data: '2026-03-09', nome: 'Treino B — Costas',
    duracao: '45 min', volume: 7200,
    series: [
      { ex: 'Puxada Frontal', series: 4, reps: '10', carga: '58' },
      { ex: 'Remada Curvada', series: 3, reps: '10', carga: '68' },
    ],
  },
];

const formatarData = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === hoje.toDateString())  return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
};

const formatarVolume = (v: number) =>
  v >= 1000 ? (v / 1000).toFixed(1) + 't' : v + 'kg';

export default function HistoricoPage() {
  const [detalhe, setDetalhe] = useState<Treino | null>(null);

  const totalTreinos = HISTORICO_MOCK.length;
  const totalVolume  = HISTORICO_MOCK.reduce((s, t) => s + t.volume, 0);
  const melhorVolume = Math.max(...HISTORICO_MOCK.map(t => t.volume));

  // ── DETALHE ──────────────────────────────────────────────────────────
  if (detalhe) return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => setDetalhe(null)} style={{
          background: 'rgba(255,255,255,.06)', border: '1px solid #202028',
          borderRadius: '8px', padding: '.4rem .8rem', color: '#9898a8',
          fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
        }}>← Voltar</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#f0f0f2', lineHeight: 1 }}>
            {detalhe.nome}
          </div>
          <div style={{ fontSize: '.72rem', color: '#5a5a6a', marginTop: '2px' }}>
            {formatarData(detalhe.data)} · {detalhe.duracao}
          </div>
        </div>
      </div>

      {/* Stats do treino */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '1rem' }}>
        {[
          [detalhe.series.length, 'exercícios'],
          [detalhe.series.reduce((s, e) => s + e.series, 0), 'séries'],
          [formatarVolume(detalhe.volume), 'volume'],
        ].map(([val, lbl], i) => (
          <div key={i} style={{
            background: '#0e0e11', border: '1px solid #202028',
            borderRadius: '10px', padding: '.65rem', textAlign: 'center',
          }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: i === 2 ? '#e31b23' : '#fff', lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: '.52rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '2px' }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Exercícios */}
      <div style={{ display: 'grid', gap: '.6rem' }}>
        {detalhe.series.map((ex, i) => (
          <div key={i} style={{
            background: '#0e0e11', border: '1px solid #202028',
            borderRadius: '12px', padding: '1rem',
            borderLeft: '2px solid #e31b23',
          }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#f0f0f2', marginBottom: '.5rem' }}>
              {ex.ex}
            </div>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              {[
                [ex.series + 'x', 'séries'],
                [ex.reps, 'reps'],
                [ex.carga !== '0' ? ex.carga + 'kg' : 'Peso corpo', 'carga'],
              ].map(([val, lbl], j) => (
                <div key={j} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: j === 2 ? '#e31b23' : '#fff' }}>{val}</div>
                  <div style={{ fontSize: '.52rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );

  // ── LISTA ─────────────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.9rem', textTransform: 'uppercase', color: '#f0f0f2', lineHeight: 1 }}>
          HISTÓRICO
        </div>
        <div style={{ fontSize: '.68rem', color: '#5a5a6a', marginTop: '2px' }}>{totalTreinos} treinos registrados</div>
      </div>

      {/* Stats gerais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '1.25rem' }}>
        {[
          [totalTreinos,              '🏋️', 'treinos'],
          [formatarVolume(totalVolume),'⚡', 'volume total'],
          [formatarVolume(melhorVolume),'🏆','melhor sessão'],
        ].map(([val, icon, lbl], i) => (
          <div key={i} style={{
            background: '#0e0e11', border: '1px solid #202028',
            borderRadius: '12px', padding: '.75rem .5rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '.2rem' }}>{icon}</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.3rem', color: i === 2 ? '#e31b23' : '#fff', lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: '.5rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '2px' }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Frequência semanal */}
      <div style={{ background: '#0e0e11', border: '1px solid #202028', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '.65rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
          Frequência — últimas 4 semanas
        </div>
        <div style={{ display: 'flex', gap: '.3rem', alignItems: 'flex-end', height: '48px' }}>
          {[3, 4, 2, 5].map((n, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }}>
              <div style={{
                width: '100%',
                height: `${(n / 5) * 40}px`,
                background: i === 3 ? '#e31b23' : 'rgba(227,27,35,.3)',
                borderRadius: '4px 4px 0 0',
                transition: 'height .3s',
              }}/>
              <div style={{ fontSize: '.52rem', color: '#5a5a6a' }}>S{i + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de treinos */}
      <div style={{ fontSize: '.65rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.6rem' }}>
        Treinos recentes
      </div>
      <div style={{ display: 'grid', gap: '.6rem' }}>
        {HISTORICO_MOCK.map((t, i) => (
          <button key={t.id} onClick={() => setDetalhe(t)} style={{
            background: '#0e0e11', border: '1px solid #202028',
            borderRadius: '12px', padding: '1rem 1.1rem',
            textAlign: 'left', cursor: 'pointer', width: '100%',
            transition: 'all .12s',
            animationDelay: `${i * 0.05}s`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.68rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '2px' }}>
                  {formatarData(t.data)}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#f0f0f2', lineHeight: 1.1 }}>
                  {t.nome}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '.75rem' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#e31b23' }}>
                  {t.duracao}
                </div>
                <div style={{ fontSize: '.6rem', color: '#5a5a6a', marginTop: '1px' }}>
                  {formatarVolume(t.volume)} vol.
                </div>
              </div>
            </div>

            {/* Mini barra de volume */}
            <div style={{ marginTop: '.65rem' }}>
              <div style={{ background: '#16161c', borderRadius: '3px', height: '3px' }}>
                <div style={{
                  height: '100%', borderRadius: '3px',
                  background: 'linear-gradient(90deg,#e31b23,#ff4444)',
                  width: `${(t.volume / melhorVolume) * 100}%`,
                  boxShadow: '0 0 8px rgba(227,27,35,.4)',
                }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                <div style={{ fontSize: '.55rem', color: '#323240' }}>
                  {t.series.length} exercícios · {t.series.reduce((s, e) => s + e.series, 0)} séries
                </div>
                {t.volume === melhorVolume && (
                  <div style={{ fontSize: '.55rem', color: '#facc15', fontWeight: 700 }}>🏆 Melhor</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
