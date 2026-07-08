'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import PageHeader from '@/components/core/PageHeader';
import StatTile from '@/components/core/StatTile';
import EmptyState from '@/components/core/EmptyState';
import { useToast, ToastViewport } from '@/components/core/Toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  ArrowLeft, Trash2, Download, Search,
  X, Dumbbell, TrendingUp, Trophy,
  Clock, ChevronRight, Filter, BarChart2,
  Medal, LogIn,
} from 'lucide-react';

// ── Constantes / helpers ──────────────────────────────────────
const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

const fmtTime = (s: number) =>
  `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const fmtVol = (v: number) =>
  v >= 1000 ? (v/1000).toFixed(1)+'t' : Math.round(v)+'kg';
const toBR = (iso: string) => {
  const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`;
};
const fmtData = (iso: string) => {
  const d = new Date(iso+'T12:00:00');
  const hoje  = new Date();
  const ontem = new Date(); ontem.setDate(ontem.getDate()-1);
  if(d.toDateString()===hoje.toDateString())  return 'Hoje';
  if(d.toDateString()===ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
};
const fmtDataLonga = (iso: string) =>
  new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

// ── Tipos ─────────────────────────────────────────────────────
type SetEntry = { w: string; r: string };
type ExEntry  = { name: string; exId?: string; sets: SetEntry[] };
type Session  = { planId?:string; planName?:string; day?:string; entries:ExEntry[]; duration?:number; savedAt?:number };
type History  = Record<string, Session>;

const parseNum = (v: string) => { const n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; };
const volSets  = (sets: SetEntry[]) => sets.reduce((a,s)=>a+parseNum(s.w)*parseNum(s.r),0);
const volSess  = (s: Session) => (s.entries||[]).reduce((a,en)=>a+volSets(en.sets||[]),0);
const estRM    = (w: number, r: number) => w*(1+r/30);

export default function HistoricoPage() {
  const router = useRouter();
  const [uid,     setUid]     = useState<string|null>(null);
  const [history, setHistory] = useState<History>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [detalhe, setDetalhe] = useState<{date:string;session:Session}|null>(null);
  const [busca,   setBusca]   = useState('');
  const [filtDay, setFiltDay] = useState('');
  const [filtPlan,setFiltPlan]= useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { toast, show } = useToast();

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db,'users',u.uid,'data','history'));
        if(snap.exists()) {
          try { setHistory(JSON.parse(snap.data().payload || '{}')); }
          catch { console.warn('historico: payload corrompido'); }
        }
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const saveHistory = async (h: History) => {
    if(!uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db,'users',uid,'data','history'),{payload:JSON.stringify(h),updatedAt:Date.now()});
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const deleteEntry = async (date: string) => {
    if(!confirm(`Excluir o treino de ${toBR(date)}?`)) return;
    const h = {...history}; delete h[date];
    setHistory(h); await saveHistory(h);
    show('Treino excluído');
    if(detalhe?.date===date) setDetalhe(null);
  };

  const sorted = useMemo(()=>
    Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0]))
  ,[history]);

  // PR map — melhor 1RM estimado por exercício
  const prMap = useMemo(()=>{
    const map: Record<string,number> = {};
    sorted.forEach(([,s])=>{
      (s.entries||[]).forEach(en=>{
        (en.sets||[]).forEach(st=>{
          const w=parseNum(st.w),r=parseNum(st.r); if(!w||!r) return;
          const rm=estRM(w,r);
          if(!map[en.name]||rm>map[en.name]) map[en.name]=rm;
        });
      });
    });
    return map;
  },[sorted]);

  const hasPR = (s: Session) =>
    (s.entries||[]).some(en=>(en.sets||[]).some(st=>{
      const w=parseNum(st.w),r=parseNum(st.r); if(!w||!r) return false;
      return Math.abs(estRM(w,r)-(prMap[en.name]||0))<0.01;
    }));

  const planOptions = useMemo(()=>
    Array.from(new Set(sorted.map(([,o])=>o.planName).filter(Boolean))) as string[]
  ,[sorted]);

  const filtered = sorted.filter(([date,o])=>{
    const matchDay  = !filtDay  || o.day===filtDay;
    const matchPlan = !filtPlan || o.planName===filtPlan;
    const matchDate = !busca    || toBR(date).includes(busca.trim()) || date.includes(busca.trim());
    return matchDay && matchPlan && matchDate;
  });

  const totalVol  = sorted.reduce((a,[,s])=>a+volSess(s),0);
  const melhorVol = sorted.length ? Math.max(...sorted.map(([,s])=>volSess(s))) : 0;
  const uniqueExs = new Set(sorted.flatMap(([,s])=>s.entries.map(e=>e.name))).size;

  const exportCSV = () => {
    const rows=[['Data','Dia','Ficha','Exercício','Série','Carga','Reps']];
    sorted.forEach(([date,obj])=>{
      (obj.entries||[]).forEach(en=>{
        (en.sets||[]).forEach((s,i)=>{
          rows.push([toBR(date),obj.day||'',obj.planName||'',en.name,String(i+1),s.w||'',s.r||'']);
        });
      });
    });
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
    a.download='darkset_historico_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click(); show('CSV exportado!');
  };

  // Frequência 8 semanas
  const weeks = useMemo(()=>{
    const b=Array(8).fill(0); const now=new Date();
    sorted.forEach(([date])=>{
      const diff=Math.floor((now.getTime()-new Date(date+'T12:00:00').getTime())/(7*24*3600*1000));
      if(diff>=0&&diff<8) b[7-diff]++;
    });
    return b;
  },[sorted]);
  const maxWeek = Math.max(...weeks,1);

  // ── LOADING ──────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  // ── NÃO LOGADO ───────────────────────────────────────────
  if(!uid) return (
    <PageShell>
      <PageHeader title="Histórico" subtitle="Seus treinos registrados"/>
      <EmptyState
        icon={<LogIn size={40}/>}
        title="Entre para ver seu histórico"
        subtitle="Faça login para acessar seus treinos salvos."
        action={<Button onClick={()=>router.push('/login')}>Entrar</Button>}
      />
    </PageShell>
  );

  // ── DETALHE ──────────────────────────────────────────────
  if(detalhe) {
    const { date, session } = detalhe;
    const totalSets = session.entries.reduce((a,en)=>a+en.sets.filter(s=>s.r).length,0);
    const sessVol   = volSess(session);
    const isPRsess  = hasPR(session);

    return (
      <PageShell>
        <ToastViewport toast={toast}/>

        {/* Header do detalhe */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={()=>setDetalhe(null)} className="shrink-0">
            <ArrowLeft size={14}/> Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[1.25rem] leading-tight tracking-tight text-ink-1 truncate">
              {session.planName||'Treino Livre'}
            </div>
            <div className="text-[0.7rem] text-ink-3 mt-0.5">
              {fmtDataLonga(date)}{session.duration?` · ${fmtTime(session.duration)}`:''}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {session.day && (
              <span className="chip text-[0.62rem]">{session.day.slice(0,3)}</span>
            )}
            {isPRsess && (
              <span className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn-soft text-warn text-[0.62rem] font-semibold px-2 py-0.5">
                <Trophy size={10}/> PR
              </span>
            )}
          </div>
        </motion.div>

        {/* Stats da sessão */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.08}}
          className="grid grid-cols-3 gap-2.5 mb-6">
          <StatTile value={session.entries.length} label="Exercícios" icon={<Dumbbell size={16}/>}/>
          <StatTile value={totalSets} label="Séries" icon={<BarChart2 size={16}/>}/>
          <StatTile value={fmtVol(sessVol)} label="Volume" tone="accent" icon={<TrendingUp size={16}/>}/>
        </motion.div>

        {/* Exercícios */}
        <div className="grid gap-2.5 mb-6">
          {session.entries.map((en,i)=>{
            const valid=en.sets.filter(s=>s.r);
            const bestW=valid.length?Math.max(0,...valid.map(s=>parseNum(s.w))):0;
            const vol=volSets(en.sets);
            const isPR=valid.some(s=>{
              const w=parseNum(s.w),r=parseNum(s.r); if(!w||!r) return false;
              return Math.abs(estRM(w,r)-(prMap[en.name]||0))<0.01;
            });
            return (
              <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                transition={{delay:Math.min(i*0.04,0.4)}}
                className={`card p-3.5 border-l-2 ${isPR?'border-l-accent border-accent/30':'border-l-line'}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="font-display font-semibold text-[1rem] leading-none text-ink-1">{en.name}</div>
                  <div className="flex items-center gap-1.5">
                    {isPR && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft text-accent text-[0.56rem] font-semibold px-2 py-0.5">
                        <Medal size={10}/> PR
                      </span>
                    )}
                    <span className="chip text-[0.58rem]">{valid.length} séries</span>
                  </div>
                </div>

                {/* Colunas */}
                <div className="grid grid-cols-[1.2rem_1fr_1fr_1fr] gap-1.5 px-1 pb-1">
                  {['#','Kg','Reps','Vol'].map((h,j)=>(
                    <div key={j} className={`eyebrow text-[0.5rem] ${j>0?'text-center':'text-left'}`}>{h}</div>
                  ))}
                </div>

                {/* Séries */}
                {valid.map((s,si)=>(
                  <motion.div key={si} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                    transition={{delay:Math.min(i*0.04+si*0.03,0.4)}}
                    className="grid grid-cols-[1.2rem_1fr_1fr_1fr] gap-1.5 items-center bg-surface-2 rounded-lg px-1 py-1.5 mb-1.5">
                    <div className="text-center font-display font-bold text-[0.72rem] text-accent/70 tnum">{si+1}</div>
                    <div className="text-center font-display font-semibold text-[0.88rem] text-ink-1 tnum">{parseNum(s.w)||0}kg</div>
                    <div className="text-center font-display font-semibold text-[0.88rem] text-ink-1 tnum">{s.r}</div>
                    <div className="text-center font-display font-semibold text-[0.88rem] text-accent tnum">{Math.round(parseNum(s.w)*parseNum(s.r))}kg</div>
                  </motion.div>
                ))}

                {valid.length > 0 && (
                  <>
                    <div className="border-t border-line my-2"/>
                    <div className="flex gap-3">
                      {bestW>0 && (
                        <span className="inline-flex items-center gap-1 text-[0.68rem] text-ink-3">
                          <TrendingUp size={11}/>Máx: <span className="text-ink-1 font-semibold tnum">{bestW}kg</span>
                        </span>
                      )}
                      {vol>0 && (
                        <span className="text-[0.68rem] text-ink-3">
                          Vol: <span className="text-accent font-semibold tnum">{fmtVol(vol)}</span>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Excluir */}
        <Button variant="danger" full onClick={()=>deleteEntry(date)}>
          <Trash2 size={16}/> Excluir treino
        </Button>
      </PageShell>
    );
  }

  // ── LISTA ────────────────────────────────────────────────
  return (
    <PageShell>
      <ToastViewport toast={toast}/>

      <PageHeader
        title="Histórico"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <BarChart2 size={12}/>
            {sorted.length} treino(s){saving?' · salvando...':''}
          </span>
        }
        right={
          <Button variant="ghost" size="sm" onClick={exportCSV} disabled={sorted.length===0}>
            <Download size={13}/> CSV
          </Button>
        }
      />

      {/* Stats gerais */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        className="grid grid-cols-3 gap-2.5 mb-6">
        <StatTile value={sorted.length} label="Treinos" icon={<Dumbbell size={16}/>}/>
        <StatTile value={fmtVol(totalVol)} label="Volume Total" tone="accent" icon={<TrendingUp size={16}/>}/>
        <StatTile value={uniqueExs} label="Exercícios" tone="warn" icon={<Trophy size={16}/>}/>
      </motion.div>

      {/* Frequência — últimas 8 semanas */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.16}}
        className="card p-4 mb-6">
        <div className="eyebrow mb-3">Frequência — últimas 8 semanas</div>
        <div className="flex items-end gap-1.5 h-[52px]">
          {weeks.map((n,i)=>(
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{height:0}} animate={{height:`${Math.max((n/maxWeek)*44,n>0?6:2)}px`}}
                transition={{delay:Math.min(0.2+i*0.04,0.4),ease:'easeOut'}}
                className={`w-full rounded-t ${i===7?'bg-accent':n>0?'bg-accent/40':'bg-surface-3'}`}/>
              <div className="text-[0.5rem] text-ink-3 tnum">{n>0?n:''}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-line my-2"/>
        <div className="flex justify-between">
          <span className="text-[0.58rem] text-ink-3">← 8 sem atrás</span>
          <span className="text-[0.58rem] text-accent font-semibold">Esta semana →</span>
        </div>
      </motion.div>

      {/* Busca + filtros */}
      {sorted.length > 0 && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.2}}
          className="card p-3 mb-6">
          <div className={`flex gap-2 ${showFilters?'mb-2':''}`}>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"/>
              <input value={busca} onChange={e=>setBusca(e.target.value)}
                placeholder="Buscar por data (ex: 19/03)..."
                className="field w-full pl-9"/>
            </div>
            <motion.button whileTap={{scale:.93}} onClick={()=>setShowFilters(f=>!f)}
              aria-label="Filtros"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 text-[0.75rem] font-semibold transition-colors
                ${showFilters?'bg-accent-soft border-accent/30 text-accent':'bg-surface-2 border-line text-ink-3'}`}>
              <Filter size={14}/>
              {(filtDay||filtPlan) && (
                <span className="bg-accent text-accent-ink rounded-full min-w-[16px] px-1 text-[0.55rem] font-bold text-center tnum">1</span>
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                className="overflow-hidden">
                <div className="flex gap-1.5 pt-2">
                  <select value={filtDay} onChange={e=>setFiltDay(e.target.value)}
                    className={`field flex-1 ${filtDay?'text-ink-1':'text-ink-3'}`}>
                    <option value="">Dia da semana</option>
                    {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={filtPlan} onChange={e=>setFiltPlan(e.target.value)}
                    className={`field flex-1 ${filtPlan?'text-ink-1':'text-ink-3'}`}>
                    <option value="">Ficha</option>
                    {planOptions.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  {(filtDay||filtPlan) && (
                    <motion.button whileTap={{scale:.93}} onClick={()=>{setFiltDay('');setFiltPlan('');}}
                      aria-label="Limpar filtros"
                      className="shrink-0 inline-flex items-center rounded-lg border border-danger/30 bg-danger-soft text-danger px-2.5">
                      <X size={14}/>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(busca||filtDay||filtPlan) && (
            <div className="eyebrow mt-2">{filtered.length} resultado(s)</div>
          )}
        </motion.div>
      )}

      {/* Vazio */}
      {sorted.length === 0 && (
        <EmptyState
          icon={<Dumbbell size={44}/>}
          title="Nenhum treino ainda"
          subtitle="Complete um treino no Modo Treino para ver aqui."
        />
      )}

      {/* Sem resultado no filtro */}
      {sorted.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<Search size={32}/>}
          title="Nenhum treino encontrado"
          subtitle="Ajuste a busca ou os filtros e tente de novo."
        />
      )}

      {/* Lista */}
      {filtered.length > 0 && (
        <div>
          <div className="eyebrow mb-2.5 flex items-center gap-1.5">
            <Clock size={11}/> Treinos recentes
          </div>
          <div className="grid gap-2.5">
            {filtered.map(([date,session],i)=>{
              const sessVol   = volSess(session);
              const totalSets = session.entries.reduce((a,en)=>a+en.sets.filter(s=>s.r).length,0);
              const isMelhor  = Math.abs(sessVol-melhorVol)<0.01 && melhorVol>0;
              const isPRsess  = hasPR(session);
              const pct       = melhorVol>0?(sessVol/melhorVol)*100:0;

              return (
                <motion.div key={date} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                  transition={{delay:Math.min(0.2+i*0.04,0.4)}} whileTap={{scale:.98}}>
                  <div onClick={()=>setDetalhe({date,session})}
                    className={`card p-4 cursor-pointer border-l-2 transition-colors hover:bg-surface-2
                      ${isMelhor?'border-l-warn':isPRsess?'border-l-accent':'border-l-line'}`}>
                    {/* Linha 1 */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[0.64rem] uppercase tracking-wide text-ink-3">{fmtData(date)}</span>
                          {session.day && (
                            <span className="chip text-[0.52rem] py-0">{session.day.slice(0,3)}</span>
                          )}
                          {isPRsess && (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-accent/30 bg-accent-soft text-accent text-[0.52rem] font-semibold px-1.5">
                              <Medal size={9}/> PR
                            </span>
                          )}
                        </div>
                        <div className="font-display font-semibold text-[1.08rem] leading-tight text-ink-1 truncate">
                          {session.planName||'Treino Livre'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                        {!!session.duration && session.duration>0 && (
                          <div className="inline-flex items-center gap-1 font-display font-semibold text-[0.95rem] text-accent tnum">
                            <Clock size={12}/>{fmtTime(session.duration)}
                          </div>
                        )}
                        {isMelhor && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-warn/30 bg-warn-soft text-warn text-[0.54rem] font-semibold px-1.5 py-0.5">
                            <Trophy size={9}/> Recorde
                          </span>
                        )}
                        <motion.button whileTap={{scale:.9}}
                          aria-label={`Excluir treino de ${toBR(date)}`}
                          onClick={e=>{e.stopPropagation();deleteEntry(date);}}
                          className="inline-flex items-center rounded-md border border-danger/30 bg-danger-soft text-danger px-1.5 py-1">
                          <Trash2 size={12}/>
                        </motion.button>
                      </div>
                    </div>

                    {/* Barra de volume relativa */}
                    <div className="bg-surface-3 rounded-full h-[3px] mb-1.5 overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width:`${pct}%`}}
                        transition={{delay:Math.min(0.3+i*0.04,0.4),duration:.5,ease:'easeOut'}}
                        className={`h-full rounded-full ${isMelhor?'bg-warn':'bg-accent'}`}/>
                    </div>

                    {/* Linha 2 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[0.64rem] text-ink-3 tnum">{session.entries.length} ex · {totalSets} séries</span>
                      {sessVol>0 && (
                        <>
                          <span className="text-[0.55rem] text-ink-3">·</span>
                          <span className="text-[0.64rem] text-accent font-semibold tnum">{fmtVol(sessVol)}</span>
                        </>
                      )}
                      <span className="ml-auto inline-flex items-center gap-0.5 text-[0.64rem] text-ink-3">
                        Ver <ChevronRight size={11}/>
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
