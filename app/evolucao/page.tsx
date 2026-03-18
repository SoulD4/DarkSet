'use client';
import { useState } from 'react';
import PageShell from '@/components/layout/PageShell';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const EXERCICIOS = ['Supino Reto','Agachamento','Remada Curvada','Desenvolvimento','Stiff'];

const HISTORICO_CARGAS: Record<string, { data: string; carga: number; reps: number }[]> = {
  'Supino Reto': [
    { data: 'Jan', carga: 60, reps: 10 },
    { data: 'Fev', carga: 67.5, reps: 10 },
    { data: '1Mar', carga: 70, reps: 10 },
    { data: '8Mar', carga: 75, reps: 10 },
    { data: '15Mar', carga: 77.5, reps: 10 },
    { data: 'Hoje', carga: 80, reps: 10 },
  ],
  'Agachamento': [
    { data: 'Jan', carga: 70, reps: 8 },
    { data: 'Fev', carga: 80, reps: 8 },
    { data: '1Mar', carga: 85, reps: 8 },
    { data: '8Mar', carga: 90, reps: 8 },
    { data: '15Mar', carga: 95, reps: 8 },
    { data: 'Hoje', carga: 100, reps: 8 },
  ],
  'Remada Curvada': [
    { data: 'Jan', carga: 50, reps: 10 },
    { data: 'Fev', carga: 55, reps: 10 },
    { data: '1Mar', carga: 60, reps: 10 },
    { data: '8Mar', carga: 63, reps: 10 },
    { data: '15Mar', carga: 65, reps: 10 },
    { data: 'Hoje', carga: 68, reps: 10 },
  ],
  'Desenvolvimento': [
    { data: 'Jan', carga: 40, reps: 10 },
    { data: 'Fev', carga: 44, reps: 10 },
    { data: '1Mar', carga: 46, reps: 10 },
    { data: '8Mar', carga: 48, reps: 10 },
    { data: '15Mar', carga: 50, reps: 10 },
    { data: 'Hoje', carga: 52, reps: 10 },
  ],
  'Stiff': [
    { data: 'Jan', carga: 50, reps: 12 },
    { data: 'Fev', carga: 55, reps: 12 },
    { data: '1Mar', carga: 58, reps: 12 },
    { data: '8Mar', carga: 60, reps: 12 },
    { data: '15Mar', carga: 60, reps: 12 },
    { data: 'Hoje', carga: 63, reps: 12 },
  ],
};

const VOLUME_SEMANAL = [
  { semana: 'S1', volume: 18200 },
  { semana: 'S2', volume: 21400 },
  { semana: 'S3', volume: 19800 },
  { semana: 'S4', volume: 24600 },
  { semana: 'S5', volume: 22100 },
  { semana: 'S6', volume: 27300 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0e0e11', border: '1px solid #202028',
      borderRadius: '8px', padding: '.6rem .85rem',
    }}>
      <div style={{ fontSize: '.7rem', color: '#5a5a6a', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#e31b23' }}>
        {payload[0].value}{payload[0].name === 'volume' ? 'kg' : 'kg'}
      </div>
    </div>
  );
};

export default function EvolucaoPage() {
  const [exercSel, setExercSel] = useState('Supino Reto');
  const dados = HISTORICO_CARGAS[exercSel];
  const primeiro = dados[0].carga;
  const ultimo   = dados[dados.length - 1].carga;
  const evolucao = (((ultimo - primeiro) / primeiro) * 100).toFixed(1);
  const pr       = Math.max(...dados.map(d => d.carga));

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.9rem', textTransform: 'uppercase', color: '#f0f0f2', lineHeight: 1 }}>
          EVOLUÇÃO
        </div>
        <div style={{ fontSize: '.68rem', color: '#5a5a6a', marginTop: '2px' }}>Seus recordes e progresso</div>
      </div>

      {/* PRs rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Supino Reto', pr: '80kg', icon: '🏆' },
          { label: 'Agachamento', pr: '100kg', icon: '🦵' },
          { label: 'Remada',      pr: '68kg', icon: '💪' },
          { label: 'Desenvolvim.', pr: '52kg', icon: '⚡' },
        ].map((item, i) => (
          <div key={i} style={{
            background: '#0e0e11', border: '1px solid #202028',
            borderRadius: '12px', padding: '.85rem',
            display: 'flex', alignItems: 'center', gap: '.75rem',
          }}>
            <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: '.65rem', color: '#5a5a6a', marginBottom: '1px' }}>{item.label}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.3rem', color: '#e31b23', lineHeight: 1 }}>
                {item.pr}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de carga por exercício */}
      <div style={{ background: '#0e0e11', border: '1px solid #202028', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '.65rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
          Evolução de carga
        </div>

        {/* Seletor de exercício */}
        <div style={{ display: 'flex', gap: '.35rem', overflowX: 'auto', paddingBottom: '.5rem', marginBottom: '.75rem' }}>
          {EXERCICIOS.map(ex => (
            <button key={ex} onClick={() => setExercSel(ex)} style={{
              padding: '.3rem .75rem', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid ' + (exercSel === ex ? '#e31b23' : '#202028'),
              background: exercSel === ex ? 'rgba(227,27,35,.15)' : 'transparent',
              color: exercSel === ex ? '#e31b23' : '#5a5a6a',
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '.75rem',
              letterSpacing: '.04em',
            }}>{ex}</button>
          ))}
        </div>

        {/* Stats do exercício */}
        <div style={{ display: 'flex', gap: '.75rem', marginBottom: '.85rem' }}>
          <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '8px', padding: '.5rem .75rem', flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.4rem', color: '#e31b23', lineHeight: 1 }}>{pr}kg</div>
            <div style={{ fontSize: '.52rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '2px' }}>PR</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '8px', padding: '.5rem .75rem', flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.4rem', color: Number(evolucao) > 0 ? '#22c55e' : '#f87171', lineHeight: 1 }}>
              +{evolucao}%
            </div>
            <div style={{ fontSize: '.52rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '2px' }}>evolução</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '8px', padding: '.5rem .75rem', flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.4rem', color: '#fff', lineHeight: 1 }}>{ultimo}kg</div>
            <div style={{ fontSize: '.52rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '2px' }}>atual</div>
          </div>
        </div>

        {/* Gráfico de linha */}
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={dados} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#202028" />
            <XAxis dataKey="data" tick={{ fill: '#5a5a6a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#5a5a6a', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone" dataKey="carga"
              stroke="#e31b23" strokeWidth={2.5}
              dot={{ fill: '#e31b23', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#e31b23', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de volume semanal */}
      <div style={{ background: '#0e0e11', border: '1px solid #202028', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '.65rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.85rem' }}>
          Volume semanal (kg)
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={VOLUME_SEMANAL} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#202028" vertical={false} />
            <XAxis dataKey="semana" tick={{ fill: '#5a5a6a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#5a5a6a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="#e31b23" radius={[4,4,0,0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Consistência — dias treinados */}
      <div style={{ background: '#0e0e11', border: '1px solid #202028', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ fontSize: '.65rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
          Consistência — últimos 30 dias
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
          {Array.from({ length: 30 }, (_, i) => {
            const treinou = [0,2,4,5,7,9,11,12,14,16,17,19,21,23,24,26,28,29].includes(i);
            return (
              <div key={i} style={{
                width: '28px', height: '28px', borderRadius: '5px',
                background: treinou ? '#e31b23' : 'rgba(255,255,255,.05)',
                boxShadow: treinou ? '0 0 6px rgba(227,27,35,.4)' : 'none',
                transition: 'all .2s',
              }}/>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.75rem' }}>
          <div style={{ fontSize: '.65rem', color: '#5a5a6a' }}>18 dias treinados</div>
          <div style={{ fontSize: '.65rem', color: '#e31b23', fontWeight: 700 }}>60% de frequência</div>
        </div>
      </div>
    </PageShell>
  );
}
