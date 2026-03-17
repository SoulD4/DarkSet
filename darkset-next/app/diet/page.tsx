cat > app/diet/page.tsx << 'EOF'
'use client';
import { useState, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';

/* ── TIPOS ─────────────────────────────────────────────────── */
const LS_DIET  = 'darkset.v1.diet';
const LS_GOALS = 'ds.diet.goals';

type Meal = { name: string; icon: string; calories: string; protein: string; carbs: string; fat: string; time: string; note?: string };
type DietLog = Record<string, Meal[]>;
type Goals   = { calories: number; protein: number; carbs: number; fat: number };

const load = (k: string, fb: unknown = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const ICONS = ['🍳','🥗','🍗','🥩','🍚','🥛','🥤','🍌','🍎','🥜','🫙','🍫','🍱','🥙'];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => {
  const t = today();
  if (iso === t) return 'Hoje';
  const y = new Date(t + 'T12:00'); y.setDate(y.getDate() - 1);
  if (iso === y.toISOString().slice(0, 10)) return 'Ontem';
  return new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
};
const pct = (v: number, g: number) => Math.min(100, g > 0 ? Math.round(v / g * 100) : 0);
const num = (v: unknown) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };

/* ── FORM BLANK ─────────────────────────────────────────────── */
const blankForm = (): Omit<Meal, never> => ({
  name: '', icon: '🍳', calories: '', protein: '', carbs: '', fat: '',
  time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  note: '',
});

/* ── MACRO BAR ──────────────────────────────────────────────── */
function MacroBar({ label, val, goal, color }: { label: string; val: number; goal: number; color: string }) {
  const p = pct(val, goal);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '.58rem', color: '#6b6b75', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
        <span style={{ fontSize: '.6rem', color: val >= goal ? '#4ade80' : '#9898a8', fontWeight: 700 }}>{val}<span style={{ opacity: .5 }}>/{goal}g</span></span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

/* ── MODAL ──────────────────────────────────────────────────── */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 200, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '92dvh', background: '#0e0e11', borderRadius: '20px 20px 0 0', border: '1px solid #1e1e24', padding: '1.25rem 1rem 2rem', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: '#2a2a30', borderRadius: 4, margin: '0 auto 1.25rem' }} />
        {children}
      </div>
    </div>
  );
}

/* ── PAGE ───────────────────────────────────────────────────── */
export default function DietPage() {
  const [diet, setDietState]   = useState<DietLog>(() => load(LS_DIET, {}));
  const [goals, setGoalsState] = useState<Goals>(() => load(LS_GOALS, { calories: 2000, protein: 150, carbs: 250, fat: 65 }));
  const [viewDate, setViewDate] = useState(today());
  const [tab, setTab]           = useState<'log' | 'goals'>('log');
  const [showAdd, setShowAdd]   = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [editIdx, setEditIdx]   = useState<number | null>(null);
  const [form, setForm]         = useState(blankForm());

  const setDiet = (next: DietLog) => { setDietState(next); save(LS_DIET, next); };
  const setGoals = (next: Goals)  => { setGoalsState(next); save(LS_GOALS, next); };

  const dayMeals: Meal[] = diet[viewDate] ?? [];

  const totals = useMemo(() => dayMeals.reduce((acc, m) => ({
    calories: acc.calories + num(m.calories),
    protein:  acc.protein  + num(m.protein),
    carbs:    acc.carbs    + num(m.carbs),
    fat:      acc.fat      + num(m.fat),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [dayMeals]);

  const weekData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const cal = (diet[k] ?? []).reduce((s, m) => s + num(m.calories), 0);
      days.push({ label: ['D','S','T','Q','Q','S','S'][d.getDay()], cal, today: i === 0 });
    }
    return days;
  }, [diet]);

  const streak = useMemo(() => {
    let count = 0; const d = new Date();
    while (true) {
      const k = d.toISOString().slice(0, 10);
      if ((diet[k] ?? []).length > 0) { count++; d.setDate(d.getDate() - 1); } else break;
    }
    return count;
  }, [diet]);

  const maxCal = Math.max(...weekData.map(d => d.cal), goals.calories, 1);

  const openAdd = () => { setForm(blankForm()); setEditIdx(null); setShowAdd(true); };
  const openEdit = (i: number) => { setForm({ ...dayMeals[i] }); setEditIdx(i); setShowAdd(true); };

  const saveMeal = () => {
    if (!form.name.trim()) return;
    const arr = [...dayMeals];
    if (editIdx !== null) arr[editIdx] = form; else arr.push(form);
    arr.sort((a, b) => a.time.localeCompare(b.time));
    setDiet({ ...diet, [viewDate]: arr });
    setShowAdd(false);
  };

  const deleteMeal = (i: number) => {
    const arr = [...dayMeals]; arr.splice(i, 1);
    setDiet({ ...diet, [viewDate]: arr });
  };

  const navigate = (dir: -1 | 1) => {
    const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() + dir);
    const k = d.toISOString().slice(0, 10);
    if (k <= today()) setViewDate(k);
  };

  const calPct   = pct(totals.calories, goals.calories);
  const calOver  = totals.calories > goals.calories;

  return (
    <PageShell>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', lineHeight: 1 }}>
            DARK<span style={{ color: '#e31b23' }}>DIET</span>
          </div>
          {streak > 1 && (
            <div style={{ fontSize: '.62rem', color: '#f59e0b', marginTop: 2, fontWeight: 700 }}>
              🔥 {streak} dias consecutivos
            </div>
          )}
        </div>
        <button onClick={() => setShowGoals(true)} className="ds-btn ds-btn-ghost" style={{ fontSize: '.72rem', padding: '.35rem .8rem' }}>
          ⚙ Metas
        </button>
      </div>

      {/* ── TABS ── */}
      <div className="mode-toggle" style={{ marginBottom: '1rem' }}>
        {(['log', 'goals'] as const).map(t => (
          <button key={t} className={`mode-toggle-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'log' ? '📋 Registro' : '📊 Semana'}
          </button>
        ))}
      </div>

      {/* ── DATE NAV ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid #222228', borderRadius: 8, width: 34, height: 34, color: '#f0f0f2', cursor: 'pointer', fontSize: '1rem' }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>
          {fmtDate(viewDate)}
        </div>
        <button onClick={() => navigate(1)} disabled={viewDate >= today()} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid #222228', borderRadius: 8, width: 34, height: 34, color: viewDate >= today() ? '#2a2a30' : '#f0f0f2', cursor: viewDate >= today() ? 'default' : 'pointer', fontSize: '1rem' }}>›</button>
      </div>

      {/* ── CALORIAS CARD ── */}
      <div className="ds-card" style={{ padding: '1rem', marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '.5rem' }}>
          <div>
            <div style={{ fontSize: '.58rem', color: '#6b6b75', textTransform: 'uppercase', letterSpacing: '.07em' }}>Calorias</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '2.2rem', lineHeight: 1, color: calOver ? '#f87171' : '#f0f0f2' }}>
              {totals.calories}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '.62rem', color: '#5a5a6a' }}>meta</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#5a5a6a' }}>{goals.calories} kcal</div>
          </div>
        </div>

        {/* progress bar */}
        <div style={{ height: 6, background: 'rgba(255,255,255,.07)', borderRadius: 6, overflow: 'hidden', marginBottom: '.85rem' }}>
          <div style={{ height: '100%', width: `${calPct}%`, background: calOver ? '#f87171' : '#e31b23', borderRadius: 6, transition: 'width .4s' }} />
        </div>

        <div style={{ display: 'flex', gap: '.6rem' }}>
          <MacroBar label="Proteína" val={totals.protein} goal={goals.protein} color="#60a5fa" />
          <MacroBar label="Carbs"    val={totals.carbs}   goal={goals.carbs}   color="#f59e0b" />
          <MacroBar label="Gordura"  val={totals.fat}      goal={goals.fat}     color="#a78bfa" />
        </div>
      </div>

      {/* ── TAB LOG ── */}
      {tab === 'log' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.65rem' }}>
            <div style={{ fontSize: '.62rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.07em' }}>
              {dayMeals.length} refeição{dayMeals.length !== 1 ? 'ões' : ''}
            </div>
            <button onClick={openAdd} className="ds-btn ds-btn-primary" style={{ fontSize: '.72rem', padding: '.35rem .85rem' }}>
              + Adicionar
            </button>
          </div>

          {dayMeals.length === 0 ? (
            <div className="ds-card" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🍽</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#2a2a30', textTransform: 'uppercase' }}>Nenhuma refeição</div>
              <div style={{ fontSize: '.78rem', color: '#404048', marginTop: '.3rem' }}>Registre o que você comeu hoje</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '.5rem' }}>
              {dayMeals.map((m, i) => (
                <div key={i} className="ds-card" style={{ padding: '.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{m.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                        <div style={{ fontSize: '.65rem', color: '#5a5a6a', marginTop: 2 }}>
                          {m.time}{m.note ? ` · ${m.note}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#e31b23' }}>{m.calories || '–'} <span style={{ fontSize: '.6rem', color: '#5a5a6a' }}>kcal</span></div>
                      <div style={{ fontSize: '.6rem', color: '#6b6b75', marginTop: 1 }}>P{m.protein||0} C{m.carbs||0} G{m.fat||0}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '.4rem', marginTop: '.6rem' }}>
                    <button onClick={() => openEdit(i)} className="ds-btn ds-btn-ghost" style={{ flex: 1, fontSize: '.68rem', padding: '.28rem' }}>Editar</button>
                    <button onClick={() => deleteMeal(i)} className="ds-btn ds-btn-danger" style={{ fontSize: '.68rem', padding: '.28rem .6rem' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB SEMANA ── */}
      {tab === 'goals' && (
        <div className="ds-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '.62rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.75rem' }}>Calorias — últimos 7 dias</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
            {weekData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: d.today ? '#e31b23' : 'rgba(255,255,255,.15)', height: Math.max(3, Math.round(d.cal / maxCal * 64)), transition: 'height .3s' }} />
                <div style={{ fontSize: '.55rem', color: d.today ? '#e31b23' : '#5a5a6a' }}>{d.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginTop: '1rem' }}>
            {[
              { ic: '🔥', v: Math.round(weekData.reduce((a,d)=>a+d.cal,0)/7), l: 'média kcal/dia' },
              { ic: '🎯', v: goals.calories, l: 'meta kcal' },
            ].map((s, i) => (
              <div key={i} className="ds-stat">
                <div style={{ fontSize: '.9rem', marginBottom: '.2rem' }}>{s.ic}</div>
                <div className="ds-stat-val" style={{ color: '#e31b23' }}>{s.v}</div>
                <div className="ds-stat-label">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL ADD/EDIT ── */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', marginBottom: '.85rem' }}>
            {editIdx !== null ? 'Editar refeição' : 'Nova refeição'}
          </div>

          {/* Icon + Nome */}
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.65rem' }}>
            <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              style={{ background: 'rgba(0,0,0,.3)', border: '1px solid #222228', borderRadius: 8, padding: '.5rem', color: '#f0f0f2', fontSize: '1.2rem', width: 54 }}>
              {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input placeholder="Nome da refeição" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ flex: 1, background: 'rgba(0,0,0,.3)', border: '1px solid #222228', borderRadius: 8, padding: '.5rem .75rem', color: '#f0f0f2', fontSize: '.9rem' }} />
          </div>

          {/* Horário */}
          <div style={{ marginBottom: '.65rem' }}>
            <div style={{ fontSize: '.58rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Horário</div>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              style={{ background: 'rgba(0,0,0,.3)', border: '1px solid #222228', borderRadius: 8, padding: '.5rem .75rem', color: '#f0f0f2', fontSize: '.9rem', width: '100%' }} />
          </div>

          {/* Macros */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '.65rem' }}>
            {([
              ['calories', 'Calorias', 'kcal'],
              ['protein',  'Proteína', 'g'],
              ['carbs',    'Carbs',    'g'],
              ['fat',      'Gordura',  'g'],
            ] as [keyof Meal, string, string][]).map(([k, l, u]) => (
              <div key={k}>
                <div style={{ fontSize: '.58rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{l} <span style={{ color: '#404048' }}>{u}</span></div>
                <input type="number" value={(form as Record<string,string>)[k]} placeholder="0"
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid #222228', borderRadius: 8, padding: '.5rem .6rem', color: '#f0f0f2', fontSize: '.9rem' }} />
              </div>
            ))}
          </div>

          {/* Nota */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '.58rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Nota (opcional)</div>
            <input placeholder="Ex: grelhado, sem sal..." value={form.note ?? ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid #222228', borderRadius: 8, padding: '.5rem .75rem', color: '#f0f0f2', fontSize: '.85rem' }} />
          </div>

          <button onClick={saveMeal} className="ds-btn ds-btn-primary" style={{ width: '100%', padding: '.85rem', fontSize: '.95rem', justifyContent: 'center', borderRadius: 12 }}>
            {editIdx !== null ? 'Salvar alterações' : '+ Adicionar refeição'}
          </button>
        </Modal>
      )}

      {/* ── MODAL METAS ── */}
      {showGoals && (
        <Modal onClose={() => setShowGoals(false)}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', marginBottom: '.85rem' }}>
            Metas diárias
          </div>
          {([
            ['calories', 'Calorias', 'kcal'],
            ['protein',  'Proteína', 'g'],
            ['carbs',    'Carboidratos', 'g'],
            ['fat',      'Gordura',  'g'],
          ] as [keyof Goals, string, string][]).map(([k, l, u]) => (
            <div key={k} style={{ marginBottom: '.7rem' }}>
              <div style={{ fontSize: '.6rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{l} <span style={{ color: '#404048' }}>{u}</span></div>
              <input type="number" value={goals[k]} onChange={e => setGoals({ ...goals, [k]: Number(e.target.value) })}
                style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid #222228', borderRadius: 8, padding: '.5rem .75rem', color: '#f0f0f2', fontSize: '.9rem' }} />
            </div>
          ))}
          <button onClick={() => setShowGoals(false)} className="ds-btn ds-btn-primary" style={{ width: '100%', padding: '.8rem', fontSize: '.9rem', justifyContent: 'center', borderRadius: 12, marginTop: '.25rem' }}>
            Salvar metas
          </button>
        </Modal>
      )}

    </PageShell>
  );
}
