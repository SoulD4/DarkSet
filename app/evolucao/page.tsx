'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

// ── Tipos ────────────────────────────────────────────────────────
type SetEntry  = { w: string; r: string };
type ExEntry   = { name: string; sets: SetEntry[] };
type Session   = { planName?: string; day?: string; entries: ExEntry[]; duration?: number; savedAt?: number };
type History   = Record<string, Session>;
type Measure   = { date: string; peso?: string; gordura?: string; cintura?: string; quadril?: string; braco?: string; coxa?: string };

const TABS = [
  { id: 'treino',     label: '💪 Treino'      },
  { id: 'prs',        label: '🏆 PRs'         },
  { id: 'corpo',      label: '⚖️ Corpo'       },
  { id: 'composicao', label: '🔬 Composição'  },
];

const MUSCLE_COLORS: Record<string, string> = {
  'Peito':'#e31b23','Costas':'#6366f1','Pernas':'#22c55e','Ombro':'#f59e0b',
  'Bíceps':'#06b6d4','Tríceps':'#a855f7','Quadríceps':'#84cc16',
  'Posterior de Coxa':'#f97316','Glúteo':'#ec4899','Abdômen':'#14b8a6',
  'Panturrilha':'#64748b','Lombar':'#d97706','Trapézio':'#7c3aed',
};

const MUSCLE_MAP: Record<string, string> = {
  'Supino reto barra':'Peito','Supino reto halteres':'Peito','Supino inclinado barra':'Peito',
  'Supino inclinado halteres':'Peito','Supino declinado barra':'Peito','Crucifixo reto halteres':'Peito',
  'Crucifixo Máquina':'Peito','Crossover polia alta':'Peito','Flexão de braço':'Peito',
  'Desenvolvimento barra':'Ombro','Desenvolvimento halteres':'Ombro','Elevação lateral halteres':'Ombro',
  'Face Pull corda':'Ombro','Arnold press halteres':'Ombro','Crucifixo inverso halteres':'Ombro',
  'Encolhimento barra':'Trapézio','Encolhimento halteres':'Trapézio',
  'Barra fixa':'Costas','Pulldown':'Costas','Puxada alta aberta':'Costas','Puxada triângulo':'Costas',
  'Remada curvada barra':'Costas','Remada serrote halteres':'Costas','Remada baixa polia':'Costas',
  'Levantamento terra':'Costas',
  'Rosca direta barra':'Bíceps','Rosca direta halteres':'Bíceps','Rosca martelo halteres':'Bíceps',
  'Tríceps pulley corda':'Tríceps','Tríceps pulley barra reta':'Tríceps','Paralelas':'Tríceps',
  'Agachamento livre':'Quadríceps','Leg press 45':'Quadríceps','Cadeira extensora':'Quadríceps',
  'Stiff':'Posterior de Coxa','Cadeira flexora':'Posterior de Coxa','Mesa flexora':'Posterior de Coxa',
  'Hip Thrust barra':'Glúteo','Elevação pélvica com barra':'Glúteo','Cadeira abdutora':'Glúteo',
  'Panturrilha em pé máquina':'Panturrilha','Panturrilha sentado':'Panturrilha',
  'Abdominal crunch':'Abdômen','Prancha':'Abdômen',
};

const num   = (v: string) => { const n = parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; };
const fmtVol = (v: number) => v >= 1000 ? (v/1000).toFixed(1)+'t' : Math.round(v)+'kg';
const toBR   = (iso: string) => { if(!iso) return ''; const [,m,d]=iso.split('-'); return `${d}/${m}`; };
const toWeek = (iso: string) => {
  const d = new Date(iso+'T12:00:00');
  const start = new Date(d); start.setDate(d.getDate()-((d.getDay()+6)%7));
  return start.toISOString().slice(0,10);
};
const estRM = (w: number, r: number) => w > 0 ? +(w*(1+r/30)).toFixed(1) : r;

// ── Tooltip customizado ────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, unit='kg' }: any) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'#0f0f13',border:'1px solid #2e2e38',borderRadius:10,padding:'.5rem .75rem',boxShadow:'0 8px 24px rgba(0,0,0,.6)'}}>
      <div style={{fontSize:'.62rem',color:'#7a7a8a',marginBottom:'3px'}}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:p.color||'#f0f0f2',lineHeight:1.3}}>
          {p.name && <span style={{fontSize:'.6rem',color:'#7a7a8a',marginRight:4}}>{p.name}</span>}
          {typeof p.value === 'number' ? p.value.toFixed(p.value < 10 ? 1 : 0) : p.value}{unit}
        </div>
      ))}
    </div>
  );
};

// ── Heatmap de frequência ──────────────────────────────────────
function FreqHeatmap({ history }: { history: History }) {
  const today = new Date();
  const cells = useMemo(() => {
    const result = [];
    for(let i = 51; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() - i*7 + 1);
      const week = [];
      for(let j = 0; j < 7; j++) {
        const d = new Date(weekStart); d.setDate(weekStart.getDate()+j);
        const iso = d.toISOString().slice(0,10);
        week.push({ iso, trained: !!history[iso], future: d > today });
      }
      result.push(week);
    }
    return result;
  }, [history]);

  const totalDays = cells.flat().filter(c=>c.trained).length;
  const thisMonth = cells.flat().filter(c=>{
    if(!c.trained) return false;
    const d = new Date(c.iso+'T12:00:00');
    return d.getMonth()===today.getMonth() && d.getFullYear()===today.getFullYear();
  }).length;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem'}}>
        <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em'}}>Frequência — último ano</div>
        <div style={{fontSize:'.6rem',color:'#e31b23',fontWeight:700}}>{totalDays} dias · {thisMonth} este mês</div>
      </div>
      <div style={{overflowX:'auto',paddingBottom:'.25rem'}}>
        <div style={{display:'flex',gap:'2px',minWidth:'fit-content'}}>
          {cells.map((week, wi) => (
            <div key={wi} style={{display:'flex',flexDirection:'column',gap:'2px'}}>
              {week.map((cell, di) => (
                <div key={di}
                  title={cell.iso}
                  style={{
                    width:10, height:10, borderRadius:2,
                    background: cell.future ? 'transparent' : cell.trained ? '#e31b23' : 'rgba(255,255,255,.06)',
                    boxShadow: cell.trained ? '0 0 4px rgba(227,27,35,.4)' : 'none',
                    transition:'all .2s',
                  }}/>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:'.5rem',marginTop:'.4rem',alignItems:'center',justifyContent:'flex-end'}}>
        <span style={{fontSize:'.52rem',color:'#484858'}}>Menos</span>
        {[.06,.2,.4,.7,1].map((o,i)=>(
          <div key={i} style={{width:9,height:9,borderRadius:2,background:o<.15?'rgba(255,255,255,.06)':`rgba(227,27,35,${o})`}}/>
        ))}
        <span style={{fontSize:'.52rem',color:'#484858'}}>Mais</span>
      </div>
    </div>
  );
}

// ── Radar de músculos ──────────────────────────────────────────
function MuscleRadar({ history, range }: { history: History; range: number }) {
  const data = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - range);
    const counts: Record<string,number> = {};
    Object.entries(history).forEach(([date, session]) => {
      if(new Date(date+'T12:00:00') < cutoff) return;
      session.entries.forEach(en => {
        const muscle = MUSCLE_MAP[en.name] || 'Outros';
        counts[muscle] = (counts[muscle]||0) + en.sets.filter(s=>s.r).length;
      });
    });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const max = Math.max(...top.map(([,v])=>v), 1);
    return top.map(([muscle, val]) => ({ muscle, val, pct: Math.round((val/max)*100) }));
  }, [history, range]);

  if(!data.length) return <div style={{textAlign:'center',padding:'2rem',color:'#484858',fontSize:'.82rem'}}>Sem dados</div>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{top:10,right:20,bottom:10,left:20}}>
        <PolarGrid stroke="rgba(255,255,255,.06)"/>
        <PolarAngleAxis dataKey="muscle" tick={{fill:'#7a7a8a',fontSize:10}}/>
        <Radar dataKey="pct" stroke="#e31b23" fill="#e31b23" fillOpacity={0.18} strokeWidth={1.5}/>
        <Tooltip content={<DarkTooltip unit=" séries"/>}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Aba Treino ─────────────────────────────────────────────────
function TabTreino({ history }: { history: History }) {
  const [range, setRange]   = useState(12);
  const [exSel, setExSel]   = useState('');

  const sorted = useMemo(() => Object.entries(history).sort((a,b)=>a[0].localeCompare(b[0])), [history]);

  // Volume semanal
  const weeklyVol = useMemo(() => {
    const map: Record<string,number> = {};
    sorted.forEach(([iso,s]) => {
      const wk = toWeek(iso);
      const vol = s.entries.reduce((a,en)=>a+en.sets.reduce((b,st)=>b+num(st.w)*num(st.r),0),0);
      map[wk] = (map[wk]||0)+vol;
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]))
      .slice(-range).map(([wk,vol])=>({ wk:toBR(wk), vol:Math.round(vol) }));
  }, [sorted, range]);

  // 1RM por exercício
  const rmMap = useMemo(() => {
    const map: Record<string,{date:string;rm:number}[]> = {};
    sorted.forEach(([iso,s]) => {
      s.entries.forEach(en => {
        const best = en.sets.reduce((best,st)=>{
          const w=num(st.w),r=num(st.r); if(!r) return best;
          const rm=estRM(w,r); return rm>best?rm:best;
        }, 0);
        if(!best) return;
        if(!map[en.name]) map[en.name]=[];
        const last = map[en.name][map[en.name].length-1];
        if(!last || last.rm !== best) map[en.name].push({date:iso, rm:best});
      });
    });
    return map;
  }, [sorted]);

  const allExes = Object.keys(rmMap).sort();
  const selEx   = exSel || allExes[0] || '';
  const rmData  = (rmMap[selEx]||[]).slice(-20).map(d=>({ data:toBR(d.date), rm:d.rm }));

  // Stats
  const totalVol   = sorted.reduce((a,[,s])=>a+s.entries.reduce((b,en)=>b+en.sets.reduce((c,st)=>c+num(st.w)*num(st.r),0),0),0);
  const totalSets  = sorted.reduce((a,[,s])=>a+s.entries.reduce((b,en)=>b+en.sets.filter(s=>s.r).length,0),0);
  const avgWeekVol = weeklyVol.length ? Math.round(weeklyVol.reduce((a,w)=>a+w.vol,0)/weeklyVol.length) : 0;

  // Insight
  const bestWeek = weeklyVol.reduce((best,w)=>w.vol>best.vol?w:best, {wk:'',vol:0});
  const lastWeek = weeklyVol[weeklyVol.length-1];
  const prevWeek = weeklyVol[weeklyVol.length-2];
  const weekDiff = lastWeek && prevWeek ? Math.round(((lastWeek.vol-prevWeek.vol)/Math.max(prevWeek.vol,1))*100) : null;

  if(!sorted.length) return (
    <div style={{textAlign:'center',padding:'3rem 1rem',color:'#484858'}}>
      <div style={{fontSize:'3rem',marginBottom:'.75rem'}}>📊</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#484858'}}>Sem dados de treino</div>
      <div style={{fontSize:'.8rem',marginTop:'.4rem'}}>Complete treinos no Modo Treino para ver os gráficos</div>
    </div>
  );

  return (
    <div style={{display:'grid',gap:'.75rem'}}>

      {/* Stats rápidos */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.4rem'}}>
        {[
          [String(sorted.length),'Treinos'],
          [fmtVol(totalVol),'Volume Total'],
          [String(totalSets),'Séries'],
        ].map(([v,l],i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
            <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
              <CardContent style={{padding:'.65rem .5rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:i===1?'#e31b23':'#f0f0f2',lineHeight:1}}>{v}</div>
                <div style={{fontSize:'.48rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'2px'}}>{l}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Insight automático */}
      {weekDiff !== null && (
        <motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.15}}>
          <div style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:12,padding:'.65rem .85rem',display:'flex',alignItems:'center',gap:'.6rem'}}>
            <span style={{fontSize:'1.1rem'}}>{weekDiff >= 0 ? '📈' : '📉'}</span>
            <div>
              <div style={{fontSize:'.72rem',color:'#f0f0f2',fontWeight:600}}>
                Esta semana: <span style={{color:weekDiff>=0?'#4ade80':'#f87171'}}>{weekDiff>=0?'+':''}{weekDiff}%</span> vs semana anterior
              </div>
              {bestWeek.vol > 0 && <div style={{fontSize:'.6rem',color:'#7a7a8a',marginTop:'1px'}}>Melhor semana: {bestWeek.wk} — {fmtVol(bestWeek.vol)}</div>}
            </div>
          </div>
        </motion.div>
      )}

      {/* Volume semanal */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
        <CardContent style={{padding:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em'}}>Volume Semanal</div>
            <div style={{display:'flex',gap:'.25rem'}}>
              {[{v:8,l:'8s'},{v:12,l:'3m'},{v:26,l:'6m'},{v:52,l:'1a'}].map(r=>(
                <motion.button key={r.v} whileTap={{scale:.9}} onClick={()=>setRange(r.v)}
                  style={{padding:'2px 7px',borderRadius:6,border:'1px solid '+(range===r.v?'#e31b23':'#2e2e38'),background:range===r.v?'rgba(227,27,35,.15)':'transparent',color:range===r.v?'#e31b23':'#7a7a8a',fontSize:'.6rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
                  {r.l}
                </motion.button>
              ))}
            </div>
          </div>
          {avgWeekVol > 0 && <div style={{fontSize:'.6rem',color:'#484858',marginBottom:'.5rem'}}>Média: {fmtVol(avgWeekVol)}/semana</div>}
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyVol} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
              <XAxis dataKey="wk" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip content={<DarkTooltip unit="kg"/>}/>
              <Bar dataKey="vol" name="Volume" radius={[4,4,0,0]} maxBarSize={32}>
                {weeklyVol.map((_,i)=>(
                  <Cell key={i} fill={i===weeklyVol.length-1?'#e31b23':'rgba(227,27,35,.5)'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 1RM por exercício */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
        <CardContent style={{padding:'1rem'}}>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>1RM Estimado por Exercício</div>
          <div style={{display:'flex',gap:'.3rem',overflowX:'auto',paddingBottom:'.4rem',marginBottom:'.6rem',scrollbarWidth:'none'}}>
            {allExes.slice(0,12).map(ex=>(
              <motion.button key={ex} whileTap={{scale:.95}} onClick={()=>setExSel(ex)}
                style={{flexShrink:0,padding:'.28rem .65rem',borderRadius:999,border:'1px solid '+(selEx===ex?'#e31b23':'#2e2e38'),background:selEx===ex?'rgba(227,27,35,.15)':'transparent',color:selEx===ex?'#e31b23':'#7a7a8a',fontSize:'.62rem',fontWeight:700,cursor:'pointer',outline:'none',whiteSpace:'nowrap'}}>
                {ex.length>16?ex.slice(0,14)+'…':ex}
              </motion.button>
            ))}
          </div>
          {rmData.length > 1 ? (
            <>
              <div style={{display:'flex',gap:'1rem',marginBottom:'.6rem'}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:'#e31b23',lineHeight:1}}>{rmData[rmData.length-1].rm}kg</div>
                  <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em'}}>1RM atual</div>
                </div>
                {rmData.length > 1 && (() => {
                  const diff = rmData[rmData.length-1].rm - rmData[0].rm;
                  const pct  = ((diff/rmData[0].rm)*100).toFixed(1);
                  return (
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:diff>=0?'#4ade80':'#f87171',lineHeight:1}}>{diff>=0?'+':''}{diff.toFixed(1)}kg</div>
                      <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em'}}>evolução ({pct}%)</div>
                    </div>
                  );
                })()}
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={rmData} margin={{top:4,right:4,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                  <XAxis dataKey="data" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                  <Tooltip content={<DarkTooltip unit="kg"/>}/>
                  <Line type="monotone" dataKey="rm" name="1RM" stroke="#e31b23" strokeWidth={2.5}
                    dot={{fill:'#e31b23',r:3,strokeWidth:0}} activeDot={{r:6,fill:'#e31b23',strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : rmData.length === 1 ? (
            <div style={{textAlign:'center',padding:'1rem',color:'#484858',fontSize:'.78rem'}}>
              Apenas 1 registro — treine mais vezes para ver a evolução
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'1rem',color:'#484858',fontSize:'.78rem'}}>Sem dados para este exercício</div>
          )}
        </CardContent>
      </Card>

      {/* Radar de músculos */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
        <CardContent style={{padding:'1rem'}}>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem'}}>Distribuição Muscular — últimas 4 semanas</div>
          <MuscleRadar history={history} range={28}/>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
        <CardContent style={{padding:'1rem'}}>
          <FreqHeatmap history={history}/>
        </CardContent>
      </Card>

    </div>
  );
}

// ── Aba PRs ────────────────────────────────────────────────────
function TabPRs({ history }: { history: History }) {
  const sorted = useMemo(() => Object.entries(history).sort((a,b)=>a[0].localeCompare(b[0])), [history]);

  const prMap = useMemo(() => {
    const map: Record<string,{rm:number;date:string;w:number;r:number}> = {};
    sorted.forEach(([iso,s]) => {
      s.entries.forEach(en => {
        en.sets.forEach(st => {
          const w=num(st.w),r=num(st.r); if(!r) return;
          const rm = estRM(w,r);
          if(!map[en.name]||rm>map[en.name].rm) map[en.name]={rm,date:iso,w,r};
        });
      });
    });
    return map;
  }, [sorted]);

  const topPRs = Object.entries(prMap).sort((a,b)=>b[1].rm-a[1].rm);

  // Timeline PRs do exercício selecionado
  const [exSel, setExSel] = useState('');
  const allExes = topPRs.map(([n])=>n);
  const selEx   = exSel || allExes[0] || '';

  const prTimeline = useMemo(() => {
    const points: {data:string;rm:number;w:number;r:number}[] = [];
    let best = 0;
    sorted.forEach(([iso,s]) => {
      s.entries.filter(en=>en.name===selEx).forEach(en => {
        const topSet = en.sets.reduce((b,st)=>{
          const w=num(st.w),r=num(st.r); if(!r) return b;
          const rm=estRM(w,r); return rm>b.rm?{rm,w,r}:b;
        },{rm:0,w:0,r:0});
        if(topSet.rm>0 && topSet.rm>best) {
          best = topSet.rm;
          points.push({data:toBR(iso),rm:topSet.rm,w:topSet.w,r:topSet.r});
        }
      });
    });
    return points;
  }, [sorted, selEx]);

  if(!topPRs.length) return (
    <div style={{textAlign:'center',padding:'3rem 1rem',color:'#484858'}}>
      <div style={{fontSize:'3rem',marginBottom:'.75rem'}}>🏆</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#484858'}}>Nenhum PR ainda</div>
    </div>
  );

  return (
    <div style={{display:'grid',gap:'.75rem'}}>

      {/* Timeline do PR selecionado */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
        <CardContent style={{padding:'1rem'}}>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>Evolução do 1RM — Recordes históricos</div>
          <div style={{display:'flex',gap:'.3rem',overflowX:'auto',paddingBottom:'.4rem',marginBottom:'.6rem',scrollbarWidth:'none'}}>
            {allExes.slice(0,10).map(ex=>(
              <motion.button key={ex} whileTap={{scale:.95}} onClick={()=>setExSel(ex)}
                style={{flexShrink:0,padding:'.28rem .65rem',borderRadius:999,border:'1px solid '+(selEx===ex?'#facc15':'#2e2e38'),background:selEx===ex?'rgba(250,204,21,.1)':'transparent',color:selEx===ex?'#facc15':'#7a7a8a',fontSize:'.62rem',fontWeight:700,cursor:'pointer',outline:'none',whiteSpace:'nowrap'}}>
                {ex.length>16?ex.slice(0,14)+'…':ex}
              </motion.button>
            ))}
          </div>
          {prTimeline.length > 0 && (
            <>
              <div style={{display:'flex',gap:'1rem',marginBottom:'.6rem',alignItems:'flex-end'}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:'#facc15',lineHeight:1}}>
                    🏆 {prMap[selEx]?.rm.toFixed(1)}kg
                  </div>
                  <div style={{fontSize:'.55rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em'}}>1RM estimado (Epley)</div>
                </div>
                <div style={{fontSize:'.7rem',color:'#7a7a8a'}}>
                  {prMap[selEx]?.w}kg × {prMap[selEx]?.r} reps
                </div>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={prTimeline} margin={{top:4,right:4,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                  <XAxis dataKey="data" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                  <Tooltip content={<DarkTooltip unit="kg"/>}/>
                  <Line type="stepAfter" dataKey="rm" stroke="#facc15" strokeWidth={2.5}
                    dot={{fill:'#facc15',r:5,strokeWidth:0}} activeDot={{r:7,fill:'#facc15',strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{fontSize:'.58rem',color:'#484858',textAlign:'center',marginTop:'.4rem',fontStyle:'italic'}}>
                1RM = Peso × (1 + Reps/30) — Fórmula de Epley
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabela top PRs */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
        <CardContent style={{padding:'1rem'}}>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.75rem'}}>
            Top {topPRs.length} Recordes Pessoais
          </div>
          <div style={{display:'grid',gap:'.4rem'}}>
            {topPRs.slice(0,15).map(([name,pr],i)=>{
              const muscle = MUSCLE_MAP[name];
              const color  = MUSCLE_COLORS[muscle] || '#7a7a8a';
              return (
                <motion.div key={name} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*.04}}
                  style={{display:'flex',alignItems:'center',gap:'.6rem',background:'rgba(0,0,0,.2)',borderRadius:10,padding:'.5rem .65rem',borderLeft:`3px solid ${color}`}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.85rem',color:'rgba(255,255,255,.3)',width:18,flexShrink:0}}>#{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
                    <div style={{fontSize:'.55rem',color:'#484858',marginTop:'1px'}}>{toBR(pr.date)} · {pr.w}kg × {pr.r} reps</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#facc15',lineHeight:1}}>{pr.rm.toFixed(1)}kg</div>
                    <div style={{fontSize:'.5rem',color:'#484858',textTransform:'uppercase'}}>1RM</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Aba Corpo ──────────────────────────────────────────────────
function TabCorpo({ measures }: { measures: Measure[] }) {
  const sorted = [...measures].sort((a,b)=>a.date.localeCompare(b.date));
  const hasPeso = sorted.some(m=>m.peso);
  const hasGord = sorted.some(m=>m.gordura);

  const pesoData  = sorted.filter(m=>m.peso).map(m=>({data:toBR(m.date), val:num(m.peso!)}));
  const gordData  = sorted.filter(m=>m.gordura).map(m=>({data:toBR(m.date), val:num(m.gordura!)}));
  const massaData = sorted.filter(m=>m.peso&&m.gordura).map(m=>({
    data:toBR(m.date),
    massa:+(num(m.peso!)*(1-num(m.gordura!)/100)).toFixed(1),
    gordAbs:+(num(m.peso!)*num(m.gordura!)/100).toFixed(1),
  }));

  const medidas = ['cintura','quadril','braco','coxa'] as const;
  const hasMedidas = medidas.some(k=>sorted.some(m=>m[k]));

  if(!hasPeso) return (
    <div style={{textAlign:'center',padding:'3rem 1rem',color:'#484858'}}>
      <div style={{fontSize:'3rem',marginBottom:'.75rem'}}>⚖️</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#484858',marginBottom:'.4rem'}}>Sem dados corporais</div>
      <div style={{fontSize:'.8rem'}}>Registre medições em DarkBody → Medidas</div>
    </div>
  );

  const last  = sorted.filter(m=>m.peso)[sorted.filter(m=>m.peso).length-1];
  const first = sorted.filter(m=>m.peso)[0];
  const pesoChange = last&&first ? (num(last.peso||'0')-num(first.peso||'0')).toFixed(1) : null;

  return (
    <div style={{display:'grid',gap:'.75rem'}}>

      {/* Resumo */}
      {pesoChange !== null && (
        <div style={{background:'rgba(96,165,250,.06)',border:'1px solid rgba(96,165,250,.15)',borderRadius:12,padding:'.65rem .85rem',display:'flex',alignItems:'center',gap:'.6rem'}}>
          <span style={{fontSize:'1.1rem'}}>📊</span>
          <div>
            <div style={{fontSize:'.72rem',color:'#f0f0f2',fontWeight:600}}>
              Variação total de peso: <span style={{color:Number(pesoChange)<0?'#4ade80':'#f87171'}}>{Number(pesoChange)>0?'+':''}{pesoChange}kg</span>
            </div>
            <div style={{fontSize:'.6rem',color:'#7a7a8a',marginTop:'1px'}}>
              {first.peso}kg → {last.peso}kg · {sorted.filter(m=>m.peso).length} medições
            </div>
          </div>
        </div>
      )}

      {/* Peso */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
        <CardContent style={{padding:'1rem'}}>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.75rem'}}>Peso Corporal (kg)</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={pesoData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
              <XAxis dataKey="data" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
              <Tooltip content={<DarkTooltip unit="kg"/>}/>
              <Area type="monotone" dataKey="val" name="Peso" stroke="#60a5fa" strokeWidth={2.5} fill="url(#pesoGrad)" dot={{fill:'#60a5fa',r:3,strokeWidth:0}}/>
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* % Gordura */}
      {hasGord && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'1rem'}}>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.75rem'}}>% Gordura Corporal</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={gordData} margin={{top:4,right:4,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="gordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="data" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                <Tooltip content={<DarkTooltip unit="%"/>}/>
                <Area type="monotone" dataKey="val" name="Gordura" stroke="#f87171" strokeWidth={2.5} fill="url(#gordGrad)" dot={{fill:'#f87171',r:3,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Composição empilhada */}
      {massaData.length > 1 && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'1rem'}}>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem'}}>Composição Corporal (kg)</div>
            <div style={{display:'flex',gap:'1rem',marginBottom:'.65rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.3rem'}}><div style={{width:10,height:10,borderRadius:2,background:'#4ade80'}}/><span style={{fontSize:'.6rem',color:'#7a7a8a'}}>Massa magra</span></div>
              <div style={{display:'flex',alignItems:'center',gap:'.3rem'}}><div style={{width:10,height:10,borderRadius:2,background:'#f87171'}}/><span style={{fontSize:'.6rem',color:'#7a7a8a'}}>Gordura</span></div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={massaData} margin={{top:4,right:4,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="massaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="gordAbsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="data" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                <Tooltip content={<DarkTooltip unit="kg"/>}/>
                <Area type="monotone" dataKey="massa" name="Massa magra" stroke="#4ade80" strokeWidth={2} fill="url(#massaGrad)" dot={false}/>
                <Area type="monotone" dataKey="gordAbs" name="Gordura" stroke="#f87171" strokeWidth={2} fill="url(#gordAbsGrad)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{fontSize:'.58rem',color:'#484858',textAlign:'center',marginTop:'.4rem',fontStyle:'italic'}}>Massa magra = Peso × (1 − %Gordura/100)</div>
          </CardContent>
        </Card>
      )}

      {/* Medidas corporais */}
      {hasMedidas && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'1rem'}}>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.75rem'}}>Medidas Corporais (cm)</div>
            <div style={{display:'grid',gap:'.5rem'}}>
              {medidas.filter(k=>sorted.some(m=>m[k])).map(key=>{
                const data = sorted.filter(m=>m[k]).map(m=>({data:toBR(m.date),val:num(m[key]!)}));
                const colors: Record<string,string> = {cintura:'#f59e0b',quadril:'#ec4899',braco:'#06b6d4',coxa:'#a855f7'};
                const diff = data.length>1 ? (data[data.length-1].val - data[0].val).toFixed(1) : null;
                return (
                  <div key={key}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.4rem'}}>
                      <div style={{fontSize:'.6rem',color:colors[key],textTransform:'capitalize',fontWeight:700}}>{key}</div>
                      {diff && <div style={{fontSize:'.6rem',color:Number(diff)<0?'#4ade80':'#f87171'}}>{Number(diff)>0?'+':''}{diff}cm</div>}
                    </div>
                    <ResponsiveContainer width="100%" height={60}>
                      <LineChart data={data} margin={{top:2,right:4,left:-20,bottom:2}}>
                        <XAxis dataKey="data" tick={false} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:'#484858',fontSize:8}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                        <Tooltip content={<DarkTooltip unit="cm"/>}/>
                        <Line type="monotone" dataKey="val" stroke={colors[key]} strokeWidth={2} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Aba Composição ─────────────────────────────────────────────
function TabComposicao({ history, measures }: { history: History; measures: Measure[] }) {
  const sorted     = useMemo(()=>[...measures].sort((a,b)=>a.date.localeCompare(b.date)),[measures]);
  const histSorted = useMemo(()=>Object.entries(history).sort((a,b)=>a[0].localeCompare(b[0])),[history]);

  if(sorted.filter(m=>m.peso&&m.gordura).length < 2) return (
    <div style={{textAlign:'center',padding:'3rem 1rem',color:'#484858'}}>
      <div style={{fontSize:'3rem',marginBottom:'.75rem'}}>🔬</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#484858',marginBottom:'.4rem'}}>Dados insuficientes</div>
      <div style={{fontSize:'.8rem'}}>Registre ao menos 2 medições de peso + gordura em DarkBody</div>
    </div>
  );

  // Volume semanal de treino
  const wkVol: Record<string,number> = {};
  histSorted.forEach(([iso,s]) => {
    const wk = toWeek(iso);
    const vol = s.entries.reduce((a,en)=>a+en.sets.reduce((b,st)=>b+num(st.w)*num(st.r),0),0);
    wkVol[wk] = (wkVol[wk]||0)+vol;
  });

  // IRC (Índice de Recomposição Corporal)
  const ircData = sorted.filter(m=>m.peso&&m.gordura).map(m=>{
    const p=num(m.peso||'0'), g=num(m.gordura||'0')/100;
    return { date:m.date, data:toBR(m.date), mm:+(p*(1-g)).toFixed(2), gabs:+(p*g).toFixed(2) };
  });
  const irc = ircData.slice(1).map((d,i)=>{
    const prev=ircData[i];
    const val = +(d.mm-prev.mm-(d.gabs-prev.gabs)).toFixed(2);
    return { data:d.data, val, positivo:val>=0 };
  });

  // Peso × Volume semanal
  const pesoVsVol = sorted.filter(m=>m.peso).map(m=>{
    const wk = toWeek(m.date);
    return { data:toBR(m.date), peso:num(m.peso||'0'), vol:Math.round((wkVol[wk]||0)/1000*10)/10 };
  });

  const last  = sorted.filter(m=>m.peso&&m.gordura)[sorted.filter(m=>m.peso&&m.gordura).length-1];
  const first = sorted.filter(m=>m.peso&&m.gordura)[0];
  const pesoChange  = last&&first ? (num(last.peso||'0')-num(first.peso||'0')).toFixed(1) : null;
  const gordChange  = last&&first ? (num(last.gordura||'0')-num(first.gordura||'0')).toFixed(1) : null;
  const mmFirst = num(first.peso||'0')*(1-num(first.gordura||'0')/100);
  const mmLast  = num(last.peso||'0')*(1-num(last.gordura||'0')/100);
  const massaChange = (mmLast-mmFirst).toFixed(1);

  return (
    <div style={{display:'grid',gap:'.75rem'}}>

      {/* Variação total */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.4rem'}}>
        {[
          [pesoChange,'Peso','kg','#60a5fa'],
          [gordChange,'Gordura','%','#f87171'],
          [massaChange,'Massa Magra','kg','#4ade80'],
        ].map(([val,lbl,unit,color],i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
            <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
              <CardContent style={{padding:'.65rem .5rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.15rem',color:val===null?'#484858':Number(val)===0?'#f0f0f2':i===1?Number(val)<0?'#4ade80':'#f87171':Number(val)>0?'#4ade80':'#f87171',lineHeight:1}}>
                  {val===null?'–':((Number(val)>0?'+':'')+val+unit)}
                </div>
                <div style={{fontSize:'.48rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'2px'}}>{lbl}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* IRC */}
      {irc.length > 0 && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'1rem'}}>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem'}}>Índice de Recomposição Corporal</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={irc} margin={{top:4,right:4,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="data" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTooltip unit=""/>}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,.1)" strokeWidth={1}/>
                <Bar dataKey="val" name="IRC" radius={[3,3,0,0]} maxBarSize={28}>
                  {irc.map((d,i)=><Cell key={i} fill={d.positivo?'rgba(74,222,128,.65)':'rgba(248,113,113,.55)'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{fontSize:'.58rem',color:'#484858',textAlign:'center',marginTop:'.4rem',fontStyle:'italic'}}>
              IRC = ΔMassa magra − ΔGordura absoluta · positivo = recomposição
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peso × Volume */}
      {pesoVsVol.some(d=>d.vol>0) && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'1rem'}}>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem'}}>Peso × Volume de Treino Semanal</div>
            <div style={{display:'flex',gap:'1rem',marginBottom:'.5rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.3rem'}}><div style={{width:10,height:10,borderRadius:2,background:'#60a5fa'}}/><span style={{fontSize:'.6rem',color:'#7a7a8a'}}>Peso (kg)</span></div>
              <div style={{display:'flex',alignItems:'center',gap:'.3rem'}}><div style={{width:10,height:10,borderRadius:2,background:'#e31b23'}}/><span style={{fontSize:'.6rem',color:'#7a7a8a'}}>Volume (t)</span></div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={pesoVsVol} margin={{top:4,right:4,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="data" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="left" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                <YAxis yAxisId="right" orientation="right" tick={{fill:'#484858',fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTooltip unit=""/>}/>
                <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso" stroke="#60a5fa" strokeWidth={2} dot={{fill:'#60a5fa',r:3,strokeWidth:0}}/>
                <Line yAxisId="right" type="monotone" dataKey="vol" name="Volume" stroke="#e31b23" strokeWidth={2} dot={{fill:'#e31b23',r:3,strokeWidth:0}}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────
export default function EvolucaoPage() {
  const [uid,      setUid]      = useState<string|null>(null);
  const [history,  setHistory]  = useState<History>({});
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('treino');

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const [histSnap, measSnap] = await Promise.all([
          getDoc(doc(db,'users',u.uid,'data','history')),
          getDoc(doc(db,'users',u.uid,'data','measures')),
        ]);
        if(histSnap.exists()) setHistory(JSON.parse(histSnap.data().payload||'{}'));
        if(measSnap.exists()) setMeasures(JSON.parse(measSnap.data().payload||'[]'));
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Header */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{marginBottom:'1rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
          Dark<span style={{color:'#e31b23'}}>Charts</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginTop:'3px'}}>
          <div style={{fontSize:'.65rem',color:'#7a7a8a'}}>Análise avançada do seu progresso</div>
          <Badge style={{background:'rgba(227,27,35,.15)',color:'#e31b23',border:'1px solid rgba(227,27,35,.25)',fontSize:'.52rem',padding:'1px 6px'}}>ELITE</Badge>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        style={{display:'flex',gap:'.3rem',overflowX:'auto',marginBottom:'1rem',paddingBottom:'.25rem',scrollbarWidth:'none'}}>
        {TABS.map(t=>(
          <motion.button key={t.id} whileTap={{scale:.95}} onClick={()=>setTab(t.id)}
            style={{flexShrink:0,padding:'.38rem .85rem',borderRadius:999,border:'1px solid '+(tab===t.id?'#e31b23':'#2e2e38'),background:tab===t.id?'rgba(227,27,35,.15)':'rgba(255,255,255,.03)',color:tab===t.id?'#e31b23':'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',cursor:'pointer',outline:'none',transition:'all .15s',whiteSpace:'nowrap'}}>
            {t.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Conteúdo */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.2}}>
          {tab==='treino'     && <TabTreino      history={history}/>}
          {tab==='prs'        && <TabPRs         history={history}/>}
          {tab==='corpo'      && <TabCorpo       measures={measures}/>}
          {tab==='composicao' && <TabComposicao  history={history} measures={measures}/>}
        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}
