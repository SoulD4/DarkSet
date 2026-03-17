'use client';
import { useState } from 'react';
import PageShell from '@/components/layout/PageShell';

const GRUPOS = ['Peito','Costas','Ombro','Bíceps','Tríceps','Pernas','Glúteos','Abdômen','Cardio'];

const EXERCICIOS_POR_GRUPO: Record<string, string[]> = {
  Peito:    ['Supino Reto','Supino Inclinado','Crucifixo','Peck Deck','Flexão','Cross Over'],
  Costas:   ['Puxada Frontal','Remada Curvada','Remada Unilateral','Barra Fixa','Serrote','Pullover'],
  Ombro:    ['Desenvolvimento','Elevação Lateral','Elevação Frontal','Encolhimento','Remada Alta'],
  Bíceps:   ['Rosca Direta','Rosca Alternada','Rosca Martelo','Rosca Concentrada','Rosca Scott'],
  Tríceps:  ['Tríceps Pulley','Tríceps Testa','Mergulho','Tríceps Coice','Francês'],
  Pernas:   ['Agachamento','Leg Press','Cadeira Extensora','Cadeira Flexora','Stiff','Afundo'],
  Glúteos:  ['Hip Thrust','Elevação Pélvica','Abdução','Cadeira Abdutora','Glúteo no Cabo'],
  Abdômen:  ['Abdominal Crunch','Prancha','Abdominal Oblíquo','Elevação de Pernas','Abdominal Infra'],
  Cardio:   ['Corrida','Bike','Elíptico','Corda','HIIT','Caminhada'],
};

type Exercicio = { nome: string; series: number; reps: string; carga: string; };
type Ficha = { id: string; nome: string; dia: string; exercicios: Exercicio[]; };

const DIAS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

export default function TreinoPage() {
  const [fichas, setFichas] = useState<Ficha[]>([
    { id: '1', nome: 'Treino A', dia: 'Segunda', exercicios: [
      { nome: 'Supino Reto', series: 4, reps: '8-12', carga: '80' },
      { nome: 'Crucifixo',   series: 3, reps: '12',   carga: '14' },
      { nome: 'Peck Deck',   series: 3, reps: '12',   carga: '40' },
    ]},
    { id: '2', nome: 'Treino B', dia: 'Quarta', exercicios: [
      { nome: 'Puxada Frontal',   series: 4, reps: '10', carga: '60' },
      { nome: 'Remada Curvada',   series: 3, reps: '10', carga: '70' },
    ]},
  ]);

  const [view, setView]           = useState<'lista'|'nova'|'detalhe'>('lista');
  const [fichaAtiva, setFichaAtiva] = useState<Ficha|null>(null);
  const [nomeFicha, setNomeFicha] = useState('');
  const [diaFicha, setDiaFicha]   = useState('Segunda');
  const [grupoSel, setGrupoSel]   = useState('Peito');
  const [exercSel, setExercSel]   = useState<Exercicio[]>([]);
  const [buscaEx, setBuscaEx]     = useState('');

  const criarFicha = () => {
    if (!nomeFicha.trim()) return;
    const nova: Ficha = {
      id: Date.now().toString(),
      nome: nomeFicha, dia: diaFicha, exercicios: exercSel,
    };
    setFichas(f => [...f, nova]);
    setNomeFicha(''); setDiaFicha('Segunda'); setExercSel([]);
    setView('lista');
  };

  const toggleEx = (nome: string) => {
    setExercSel(prev =>
      prev.find(e => e.nome === nome)
        ? prev.filter(e => e.nome !== nome)
        : [...prev, { nome, series: 3, reps: '10-12', carga: '' }]
    );
  };

  const updateEx = (nome: string, field: keyof Exercicio, val: string | number) => {
    setExercSel(prev => prev.map(e => e.nome === nome ? { ...e, [field]: val } : e));
  };

  const deletarFicha = (id: string) => {
    setFichas(f => f.filter(x => x.id !== id));
    setView('lista');
  };

  const exFiltrados = EXERCICIOS_POR_GRUPO[grupoSel].filter(e =>
    e.toLowerCase().includes(buscaEx.toLowerCase())
  );

  // ── DETALHE DA FICHA ───────────────────────────────────────────────────
  if (view === 'detalhe' && fichaAtiva) return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => setView('lista')} style={{
          background: 'rgba(255,255,255,.06)', border: '1px solid #202028',
          borderRadius: '8px', padding: '.4rem .8rem', color: '#9898a8',
          fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
        }}>← Voltar</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase', color: '#f0f0f2', lineHeight: 1 }}>
            {fichaAtiva.nome}
          </div>
          <div style={{ fontSize: '.72rem', color: '#5a5a6a', marginTop: '2px' }}>{fichaAtiva.dia} · {fichaAtiva.exercicios.length} exercícios</div>
        </div>
        <button onClick={() => deletarFicha(fichaAtiva.id)} style={{
          background: 'rgba(227,27,35,.1)', border: '1px solid rgba(227,27,35,.25)',
          borderRadius: '8px', padding: '.4rem .7rem', color: '#e31b23',
          fontSize: '.8rem', cursor: 'pointer',
        }}>🗑</button>
      </div>

      <div style={{ display: 'grid', gap: '.6rem' }}>
        {fichaAtiva.exercicios.map((ex, i) => (
          <div key={i} style={{
            background: '#0e0e11', border: '1px solid #202028',
            borderRadius: '12px', padding: '1rem',
            borderLeft: '2px solid #e31b23',
          }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#f0f0f2', marginBottom: '.5rem' }}>
              {ex.nome}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem' }}>
              {[
                [ex.series, 'séries'],
                [ex.reps,   'reps'],
                [ex.carga ? ex.carga+'kg' : '—', 'carga'],
              ].map(([val, lbl], j) => (
                <div key={j} style={{ background: 'rgba(0,0,0,.3)', borderRadius: '8px', padding: '.5rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.2rem', color: j === 2 ? '#e31b23' : '#fff' }}>{val}</div>
                  <div style={{ fontSize: '.52rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button style={{
        width: '100%', marginTop: '1.25rem',
        background: 'linear-gradient(135deg,#e31b23,#b31217)',
        border: 'none', borderRadius: '12px', padding: '14px', color: '#fff',
        fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
        fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '.05em',
        cursor: 'pointer', boxShadow: '0 4px 20px rgba(227,27,35,.3)',
      }}>
        ▶ Iniciar Treino
      </button>
    </PageShell>
  );

  // ── NOVA FICHA ─────────────────────────────────────────────────────────
  if (view === 'nova') return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => setView('lista')} style={{
          background: 'rgba(255,255,255,.06)', border: '1px solid #202028',
          borderRadius: '8px', padding: '.4rem .8rem', color: '#9898a8',
          fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
        }}>← Voltar</button>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase', color: '#f0f0f2' }}>
          Nova Ficha
        </div>
      </div>

      {/* Nome e dia */}
      <div style={{ background: '#0e0e11', border: '1px solid #202028', borderRadius: '12px', padding: '1rem', marginBottom: '.75rem' }}>
        <div style={{ marginBottom: '.75rem' }}>
          <label style={{ fontSize: '.68rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '5px' }}>Nome da ficha</label>
          <input value={nomeFicha} onChange={e => setNomeFicha(e.target.value)}
            placeholder="Ex: Treino A — Peito"
            style={{ width: '100%', background: '#111115', border: '1px solid #222227', borderRadius: '10px', color: '#eaeaea', padding: '10px 13px', fontSize: '.9rem', outline: 'none' }}/>
        </div>
        <div>
          <label style={{ fontSize: '.68rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '5px' }}>Dia da semana</label>
          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
            {DIAS.map(d => (
              <button key={d} onClick={() => setDiaFicha(d)} style={{
                padding: '.35rem .7rem', borderRadius: '8px', cursor: 'pointer',
                border: '1px solid ' + (diaFicha === d ? '#e31b23' : '#202028'),
                background: diaFicha === d ? 'rgba(227,27,35,.15)' : 'rgba(255,255,255,.04)',
                color: diaFicha === d ? '#e31b23' : '#5a5a6a',
                fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                fontSize: '.78rem', letterSpacing: '.04em',
              }}>{d.slice(0,3)}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Seletor de grupo muscular */}
      <div style={{ background: '#0e0e11', border: '1px solid #202028', borderRadius: '12px', padding: '1rem', marginBottom: '.75rem' }}>
        <div style={{ fontSize: '.68rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.6rem' }}>Grupo muscular</div>
        <div style={{ display: 'flex', gap: '.35rem', overflowX: 'auto', paddingBottom: '.25rem' }}>
          {GRUPOS.map(g => (
            <button key={g} onClick={() => setGrupoSel(g)} style={{
              padding: '.35rem .8rem', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid ' + (grupoSel === g ? '#e31b23' : '#202028'),
              background: grupoSel === g ? 'rgba(227,27,35,.15)' : 'rgba(255,255,255,.04)',
              color: grupoSel === g ? '#e31b23' : '#5a5a6a',
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '.78rem',
            }}>{g}</button>
          ))}
        </div>

        {/* Busca */}
        <input value={buscaEx} onChange={e => setBuscaEx(e.target.value)}
          placeholder="Buscar exercício..."
          style={{ width: '100%', background: '#111115', border: '1px solid #222227', borderRadius: '8px', color: '#eaeaea', padding: '8px 12px', fontSize: '.85rem', outline: 'none', marginTop: '.6rem' }}/>

        {/* Lista de exercícios */}
        <div style={{ display: 'grid', gap: '.35rem', marginTop: '.6rem' }}>
          {exFiltrados.map(ex => {
            const sel = exercSel.find(e => e.nome === ex);
            return (
              <div key={ex} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <button onClick={() => toggleEx(ex)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '.6rem',
                  background: sel ? 'rgba(227,27,35,.08)' : 'rgba(255,255,255,.03)',
                  border: '1px solid ' + (sel ? 'rgba(227,27,35,.3)' : '#202028'),
                  borderRadius: '8px', padding: '.55rem .75rem', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '.9rem' }}>{sel ? '✅' : '⭕'}</span>
                  <span style={{ color: sel ? '#f0f0f2' : '#9898a8', fontSize: '.88rem', fontWeight: sel ? 600 : 400 }}>{ex}</span>
                </button>
                {sel && (
                  <div style={{ display: 'flex', gap: '.3rem' }}>
                    <input type="number" value={sel.series} onChange={e => updateEx(ex, 'series', Number(e.target.value))}
                      style={{ width: '38px', background: '#111115', border: '1px solid #222227', borderRadius: '6px', color: '#fff', padding: '5px', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}/>
                    <input type="text" value={sel.reps} onChange={e => updateEx(ex, 'reps', e.target.value)}
                      placeholder="reps"
                      style={{ width: '48px', background: '#111115', border: '1px solid #222227', borderRadius: '6px', color: '#fff', padding: '5px', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}/>
                    <input type="number" value={sel.carga} onChange={e => updateEx(ex, 'carga', e.target.value)}
                      placeholder="kg"
                      style={{ width: '42px', background: '#111115', border: '1px solid #222227', borderRadius: '6px', color: '#fff', padding: '5px', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exercícios selecionados */}
      {exercSel.length > 0 && (
        <div style={{ background: 'rgba(227,27,35,.06)', border: '1px solid rgba(227,27,35,.2)', borderRadius: '12px', padding: '.75rem 1rem', marginBottom: '.75rem' }}>
          <div style={{ fontSize: '.68rem', color: '#e31b23', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>
            {exercSel.length} exercício{exercSel.length > 1 ? 's' : ''} selecionado{exercSel.length > 1 ? 's' : ''}
          </div>
          {exercSel.map((e, i) => (
            <div key={i} style={{ fontSize: '.82rem', color: '#f0f0f2', padding: '.2rem 0' }}>
              • {e.nome} — {e.series}x{e.reps}{e.carga ? ' · ' + e.carga + 'kg' : ''}
            </div>
          ))}
        </div>
      )}

      <button onClick={criarFicha} disabled={!nomeFicha.trim()} style={{
        width: '100%',
        background: nomeFicha.trim() ? 'linear-gradient(135deg,#e31b23,#b31217)' : 'rgba(227,27,35,.2)',
        border: 'none', borderRadius: '12px', padding: '14px', color: '#fff',
        fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
        fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '.05em',
        cursor: nomeFicha.trim() ? 'pointer' : 'not-allowed',
        boxShadow: nomeFicha.trim() ? '0 4px 20px rgba(227,27,35,.3)' : 'none',
      }}>
        Salvar Ficha
      </button>
    </PageShell>
  );

  // ── LISTA DE FICHAS ────────────────────────────────────────────────────
  return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.9rem', textTransform: 'uppercase', color: '#f0f0f2', lineHeight: 1 }}>
            MINHAS <span style={{ color: '#e31b23' }}>FICHAS</span>
          </div>
          <div style={{ fontSize: '.68rem', color: '#5a5a6a', marginTop: '2px' }}>{fichas.length} ficha{fichas.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => setView('nova')} style={{
          background: 'linear-gradient(135deg,#e31b23,#b31217)',
          border: 'none', borderRadius: '10px', padding: '.55rem 1rem', color: '#fff',
          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
          fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.04em',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(227,27,35,.28)',
        }}>+ Nova</button>
      </div>

      {fichas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed #202028', borderRadius: '12px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>📋</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', color: '#f0f0f2', marginBottom: '.4rem' }}>
            Nenhuma ficha ainda
          </div>
          <div style={{ fontSize: '.82rem', color: '#5a5a6a' }}>Crie sua primeira ficha de treino</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '.75rem' }}>
          {fichas.map((f, i) => (
            <button key={f.id} onClick={() => { setFichaAtiva(f); setView('detalhe'); }}
              style={{
                background: '#0e0e11', border: '1px solid #202028',
                borderRadius: '12px', padding: '1rem 1.1rem',
                textAlign: 'left', cursor: 'pointer', width: '100%',
                borderLeft: '2px solid #e31b23',
                transition: 'all .12s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', color: '#f0f0f2', lineHeight: 1 }}>
                    {f.nome}
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#5a5a6a', marginTop: '3px' }}>{f.dia}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#e31b23', lineHeight: 1 }}>
                    {f.exercicios.length}
                  </div>
                  <div style={{ fontSize: '.55rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em' }}>exerc.</div>
                </div>
              </div>
              {f.exercicios.length > 0 && (
                <div style={{ marginTop: '.6rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                  {f.exercicios.slice(0, 3).map((ex, j) => (
                    <span key={j} style={{
                      fontSize: '.65rem', color: '#9898a8',
                      background: 'rgba(255,255,255,.05)', borderRadius: '999px',
                      padding: '.2rem .6rem', border: '1px solid #202028',
                    }}>{ex.nome}</span>
                  ))}
                  {f.exercicios.length > 3 && (
                    <span style={{ fontSize: '.65rem', color: '#5a5a6a', padding: '.2rem .4rem' }}>
                      +{f.exercicios.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </PageShell>
  );
}
