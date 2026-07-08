'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/core/PageHeader';
import Spinner from '@/components/core/Spinner';
import Button from '@/components/core/Button';
import EmptyState from '@/components/core/EmptyState';
import StatTile from '@/components/core/StatTile';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  TrendingUp, Trophy, Activity, BarChart2,
  Dumbbell, Scale, Target, Zap, Calendar,
  HeartPulse, LogIn, type LucideIcon,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

// ── Tipos ─────────────────────────────────────────────────────
type SetEntry  = { w: string; r: string };
type ExEntry   = { name: string; sets: SetEntry[] };
type Session   = { planName?:string; day?:string; entries:ExEntry[]; duration?:number };
type History   = Record<string, Session>;
type Measure   = { date:string; peso?:string; gordura?:string; cintura?:string; quadril?:string; braco?:string; coxa?:string };

const TABS: { id:string; label:string; Icon:LucideIcon }[] = [
  { id:'treino',     label:'Treino',     Icon:Dumbbell },
  { id:'prs',        label:'PRs',        Icon:Trophy   },
  { id:'corpo',      label:'Corpo',      Icon:Scale    },
  { id:'composicao', label:'Composição', Icon:Activity },
];

const MUSCLE_MAP: Record<string,string> = {
  'Supino reto barra':'Peito','Supino reto halteres':'Peito','Supino inclinado barra':'Peito',
  'Supino inclinado halteres':'Peito','Crucifixo reto halteres':'Peito','Crossover polia alta':'Peito',
  'Flexão de braço':'Peito','Desenvolvimento barra':'Ombro','Desenvolvimento halteres':'Ombro',
  'Elevação lateral halteres':'Ombro','Face Pull corda':'Ombro','Arnold press halteres':'Ombro',
  'Encolhimento barra':'Trapézio','Barra fixa':'Costas','Pulldown':'Costas','Puxada alta aberta':'Costas',
  'Remada curvada barra':'Costas','Remada serrote halteres':'Costas','Remada baixa polia':'Costas',
  'Levantamento terra':'Costas','Rosca direta barra':'Bíceps','Rosca direta halteres':'Bíceps',
  'Rosca martelo halteres':'Bíceps','Tríceps pulley corda':'Tríceps','Tríceps pulley barra reta':'Tríceps',
  'Paralelas':'Tríceps','Agachamento livre':'Quadríceps','Leg press 45':'Quadríceps',
  'Cadeira extensora':'Quadríceps','Stiff':'Posterior de Coxa','Cadeira flexora':'Posterior de Coxa',
  'Hip Thrust barra':'Glúteo','Cadeira abdutora':'Glúteo',
  'Panturrilha em pé máquina':'Panturrilha','Abdominal crunch':'Abdômen','Prancha':'Abdômen',
};

// Paleta de gráficos do DS (tokens CSS — nunca hex direto)
const CH = [
  'var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)',
  'var(--chart-5)','var(--chart-6)','var(--chart-7)','var(--chart-8)',
];
const GRID = 'rgba(151,163,181,0.08)';
const TICK = { fill:'#5E6878', fontSize:10 };

const MUSCLE_COLORS: Record<string,string> = {
  'Peito':CH[0],'Costas':CH[1],'Quadríceps':CH[2],'Ombro':CH[3],
  'Bíceps':CH[4],'Tríceps':CH[5],'Posterior de Coxa':CH[6],
  'Glúteo':CH[7],'Abdômen':CH[1],'Panturrilha':CH[3],'Trapézio':CH[5],
};

const num    = (v:string) => { const n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; };
const fmtVol = (v:number) => v>=1000?(v/1000).toFixed(1)+'t':Math.round(v)+'kg';
const toBR   = (iso:string) => { if(!iso) return ''; const [,m,d]=iso.split('-'); return `${d}/${m}`; };
const toWeek = (iso:string) => {
  const d=new Date(iso+'T12:00:00'); const s=new Date(d);
  s.setDate(d.getDate()-((d.getDay()+6)%7)); return s.toISOString().slice(0,10);
};
const estRM  = (w:number,r:number) => w>0?+(w*(1+r/30)).toFixed(1):r;

// ── Tooltip (re-skin no estilo card do DS) ────────────────────
const ChartTooltip = ({active,payload,label,unit='kg'}:any) => {
  if(!active||!payload?.length) return null;
  return (
    <div className="card px-3 py-2 shadow-float">
      <div className="text-[0.62rem] text-ink-3 mb-0.5">{label}</div>
      {payload.map((p:any,i:number)=>(
        <div key={i} className="font-display font-bold text-[0.95rem] leading-snug tnum text-ink-1"
          style={p.color?{color:p.color}:undefined}>
          {p.name&&<span className="font-sans font-normal text-[0.6rem] text-ink-3 mr-1">{p.name}</span>}
          {typeof p.value==='number'?p.value.toFixed(p.value<10?1:0):p.value}{unit}
        </div>
      ))}
    </div>
  );
};

// ── Rótulo de seção de card ───────────────────────────────────
const SectionLabel = ({icon:Icon,children,className=''}:{icon:LucideIcon;children:React.ReactNode;className?:string}) => (
  <div className={`eyebrow flex items-center gap-1.5 ${className}`}>
    <Icon size={12}/> {children}
  </div>
);

// ── Chip pequeno de seleção (ranges / exercícios) ─────────────
const PickChip = ({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}) => (
  <motion.button whileTap={{scale:.95}} onClick={onClick}
    className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full border text-[0.62rem] font-bold transition-colors
      ${active?'bg-accent-soft border-accent/40 text-accent':'bg-transparent border-line text-ink-3'}`}>
    {children}
  </motion.button>
);

// ── Heatmap ───────────────────────────────────────────────────
function FreqHeatmap({history}:{history:History}) {
  const now = useMemo(()=>new Date(),[]);
  const cells = useMemo(()=>{
    const result=[];
    for(let i=51;i>=0;i--){
      const ws=new Date(now); ws.setDate(now.getDate()-now.getDay()-i*7+1);
      const week=[];
      for(let j=0;j<7;j++){
        const d=new Date(ws); d.setDate(ws.getDate()+j);
        const iso=d.toISOString().slice(0,10);
        week.push({iso,trained:!!history[iso],future:d>now});
      }
      result.push(week);
    }
    return result;
  },[history,now]);

  const total  = cells.flat().filter(c=>c.trained).length;
  const month  = cells.flat().filter(c=>{
    if(!c.trained) return false;
    const d=new Date(c.iso+'T12:00:00');
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  }).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel icon={Calendar}>Frequência — último ano</SectionLabel>
        <div className="text-[0.62rem] font-bold text-accent tnum">{total} dias · {month} este mês</div>
      </div>
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <div className="flex gap-[2px] min-w-fit">
          {cells.map((week,wi)=>(
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((cell,di)=>(
                <div key={di} title={cell.iso}
                  className={`w-2.5 h-2.5 rounded-[2px] ${cell.future?'bg-transparent':cell.trained?'bg-accent':'bg-surface-2'}`}
                  style={cell.trained?{boxShadow:'0 0 4px rgb(var(--accent-rgb) / 0.45)'}:undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-1.5">
        <span className="text-[0.52rem] text-ink-3">Menos</span>
        {[.06,.25,.5,.75,1].map((o,i)=>(
          <div key={i} className="w-[9px] h-[9px] rounded-[2px]"
            style={{background:o<.15?'var(--surface-2)':`rgb(var(--accent-rgb) / ${o})`}}/>
        ))}
        <span className="text-[0.52rem] text-ink-3">Mais</span>
      </div>
    </div>
  );
}

// ── Radar músculos ────────────────────────────────────────────
function MuscleRadar({history}:{history:History}) {
  const data = useMemo(()=>{
    const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-28);
    const counts:Record<string,number>={};
    Object.entries(history).forEach(([date,s])=>{
      if(new Date(date+'T12:00:00')<cutoff) return;
      (s.entries||[]).forEach(en=>{
        const m=MUSCLE_MAP[en.name]||'Outros';
        counts[m]=(counts[m]||0)+(en.sets||[]).filter(s=>s.r).length;
      });
    });
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const max=Math.max(...top.map(([,v])=>v),1);
    return top.map(([muscle,val])=>({muscle,val,pct:Math.round((val/max)*100)}));
  },[history]);

  if(!data.length) return <div className="text-center py-8 text-ink-3 text-[0.82rem]">Sem dados</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{top:10,right:20,bottom:10,left:20}}>
        <PolarGrid stroke={GRID}/>
        <PolarAngleAxis dataKey="muscle" tick={TICK}/>
        <Radar dataKey="pct" stroke={CH[0]} fill={CH[0]} fillOpacity={0.18} strokeWidth={1.5}/>
        <Tooltip content={<ChartTooltip unit=" séries"/>}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Aba Treino ────────────────────────────────────────────────
function TabTreino({history}:{history:History}) {
  const [range,setRange] = useState(12);
  const [exSel,setExSel] = useState('');

  const sorted = useMemo(()=>Object.entries(history).sort((a,b)=>a[0].localeCompare(b[0])),[history]);

  const weeklyVol = useMemo(()=>{
    const map:Record<string,number>={};
    sorted.forEach(([iso,s])=>{
      const wk=toWeek(iso);
      const vol=s.entries.reduce((a,en)=>a+en.sets.reduce((b,st)=>b+num(st.w)*num(st.r),0),0);
      map[wk]=(map[wk]||0)+vol;
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]))
      .slice(-range).map(([wk,vol])=>({wk:toBR(wk),vol:Math.round(vol)}));
  },[sorted,range]);

  const rmMap = useMemo(()=>{
    const map:Record<string,{date:string;rm:number}[]>={};
    sorted.forEach(([iso,s])=>{
      s.entries.forEach(en=>{
        const best=en.sets.reduce((b,st)=>{
          const w=num(st.w),r=num(st.r); if(!r) return b;
          const rm=estRM(w,r); return rm>b?rm:b;
        },0);
        if(!best) return;
        if(!map[en.name]) map[en.name]=[];
        const last=map[en.name][map[en.name].length-1];
        if(!last||last.rm!==best) map[en.name].push({date:iso,rm:best});
      });
    });
    return map;
  },[sorted]);

  const allExes  = Object.keys(rmMap).sort();
  const selEx    = exSel||allExes[0]||'';
  const rmData   = (rmMap[selEx]||[]).slice(-20).map(d=>({data:toBR(d.date),rm:d.rm}));
  const totalVol = sorted.reduce((a,[,s])=>a+s.entries.reduce((b,en)=>b+en.sets.reduce((c,st)=>c+num(st.w)*num(st.r),0),0),0);
  const totalSets= sorted.reduce((a,[,s])=>a+s.entries.reduce((b,en)=>b+en.sets.filter(s=>s.r).length,0),0);
  const avgWkVol = weeklyVol.length?Math.round(weeklyVol.reduce((a,w)=>a+w.vol,0)/weeklyVol.length):0;
  const bestWeek = weeklyVol.reduce((b,w)=>w.vol>b.vol?w:b,{wk:'',vol:0});
  const lastWk   = weeklyVol[weeklyVol.length-1];
  const prevWk   = weeklyVol[weeklyVol.length-2];
  const wkDiff   = lastWk&&prevWk?Math.round(((lastWk.vol-prevWk.vol)/Math.max(prevWk.vol,1))*100):null;

  if(!sorted.length) return (
    <EmptyState
      icon={<BarChart2 size={40}/>}
      title="Sem dados de treino"
      subtitle="Complete treinos no Modo Treino para ver os gráficos"
    />
  );

  return (
    <div className="grid gap-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {([
          [String(sorted.length),'Treinos',<Dumbbell key="d" size={16}/>,'default'],
          [fmtVol(totalVol),'Volume',<Zap key="z" size={16}/>,'accent'],
          [String(totalSets),'Séries',<BarChart2 key="b" size={16}/>,'default'],
        ] as const).map(([v,l,icon,tone],i)=>(
          <motion.div key={l} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
            <StatTile value={v} label={l} icon={icon} tone={tone}/>
          </motion.div>
        ))}
      </div>

      {/* Insight semanal */}
      {wkDiff!==null && (
        <motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.15}}
          className="bg-accent-soft border border-accent/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
          <TrendingUp size={20} className={wkDiff>=0?'text-ok':'text-danger'}/>
          <div>
            <div className="text-[0.78rem] font-semibold text-ink-1">
              Esta semana: <span className={`tnum ${wkDiff>=0?'text-ok':'text-danger'}`}>{wkDiff>=0?'+':''}{wkDiff}%</span> vs semana anterior
            </div>
            {bestWeek.vol>0&&<div className="text-[0.65rem] text-ink-2 mt-px">Melhor semana: {bestWeek.wk} — {fmtVol(bestWeek.vol)}</div>}
          </div>
        </motion.div>
      )}

      {/* Volume semanal */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel icon={BarChart2}>Volume Semanal</SectionLabel>
          <div className="flex gap-1">
            {[{v:8,l:'8s'},{v:12,l:'3m'},{v:26,l:'6m'},{v:52,l:'1a'}].map(r=>(
              <PickChip key={r.v} active={range===r.v} onClick={()=>setRange(r.v)}>{r.l}</PickChip>
            ))}
          </div>
        </div>
        {avgWkVol>0&&<div className="text-[0.62rem] text-ink-3 mb-2 tnum">Média: {fmtVol(avgWkVol)}/semana</div>}
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyVol} margin={{top:4,right:4,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
            <XAxis dataKey="wk" tick={TICK} axisLine={false} tickLine={false}/>
            <YAxis tick={TICK} axisLine={false} tickLine={false}/>
            <Tooltip content={<ChartTooltip unit="kg"/>}/>
            <Bar dataKey="vol" name="Volume" radius={[4,4,0,0]} maxBarSize={32}>
              {weeklyVol.map((_,i)=>(
                <Cell key={i} fill={CH[0]} fillOpacity={i===weeklyVol.length-1?1:0.45}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 1RM */}
      <div className="card p-4">
        <SectionLabel icon={TrendingUp} className="mb-2.5">1RM Estimado por Exercício</SectionLabel>
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-2.5 no-scrollbar">
          {allExes.slice(0,12).map(ex=>(
            <PickChip key={ex} active={selEx===ex} onClick={()=>setExSel(ex)}>
              {ex.length>16?ex.slice(0,14)+'…':ex}
            </PickChip>
          ))}
        </div>
        {rmData.length>1?(
          <>
            <div className="flex gap-4 mb-2.5">
              <div>
                <div className="font-display font-bold text-2xl leading-none text-accent tnum">{rmData[rmData.length-1].rm}kg</div>
                <div className="eyebrow mt-1">1RM atual</div>
              </div>
              {(()=>{
                const diff=rmData[rmData.length-1].rm-rmData[0].rm;
                const pct=((diff/rmData[0].rm)*100).toFixed(1);
                return (
                  <div>
                    <div className={`font-display font-bold text-2xl leading-none tnum flex items-center gap-1 ${diff>=0?'text-ok':'text-danger'}`}>
                      <TrendingUp size={16}/>{diff>=0?'+':''}{diff.toFixed(1)}kg
                    </div>
                    <div className="eyebrow mt-1">evolução ({pct}%)</div>
                  </div>
                );
              })()}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={rmData} margin={{top:4,right:4,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                <XAxis dataKey="data" tick={TICK} axisLine={false} tickLine={false}/>
                <YAxis tick={TICK} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                <Tooltip content={<ChartTooltip unit="kg"/>}/>
                <Line type="monotone" dataKey="rm" name="1RM" stroke={CH[0]} strokeWidth={2.5}
                  dot={{fill:CH[0],r:3,strokeWidth:0}} activeDot={{r:6,fill:CH[0],strokeWidth:0}}/>
              </LineChart>
            </ResponsiveContainer>
          </>
        ):(
          <div className="text-center py-4 text-ink-3 text-[0.78rem]">
            {rmData.length===1?'Apenas 1 registro — treine mais para ver evolução':'Sem dados para este exercício'}
          </div>
        )}
      </div>

      {/* Radar músculos */}
      <div className="card p-4">
        <SectionLabel icon={Target} className="mb-2">Distribuição Muscular — últimas 4 semanas</SectionLabel>
        <MuscleRadar history={history}/>
      </div>

      {/* Heatmap */}
      <div className="card p-4">
        <FreqHeatmap history={history}/>
      </div>
    </div>
  );
}

// ── Aba PRs ───────────────────────────────────────────────────
function TabPRs({history}:{history:History}) {
  const sorted = useMemo(()=>Object.entries(history).sort((a,b)=>a[0].localeCompare(b[0])),[history]);

  const prMap = useMemo(()=>{
    const map:Record<string,{rm:number;date:string;w:number;r:number}>={};
    sorted.forEach(([iso,s])=>{
      s.entries.forEach(en=>{
        en.sets.forEach(st=>{
          const w=num(st.w),r=num(st.r); if(!r) return;
          const rm=estRM(w,r);
          if(!map[en.name]||rm>map[en.name].rm) map[en.name]={rm,date:iso,w,r};
        });
      });
    });
    return map;
  },[sorted]);

  const topPRs   = Object.entries(prMap).sort((a,b)=>b[1].rm-a[1].rm);
  const [exSel,setExSel] = useState('');
  const allExes  = topPRs.map(([n])=>n);
  const selEx    = exSel||allExes[0]||'';

  const prTimeline = useMemo(()=>{
    const pts:{data:string;rm:number;w:number;r:number}[]=[];
    let best=0;
    sorted.forEach(([iso,s])=>{
      s.entries.filter(en=>en.name===selEx).forEach(en=>{
        const top=en.sets.reduce((b,st)=>{
          const w=num(st.w),r=num(st.r); if(!r) return b;
          const rm=estRM(w,r); return rm>b.rm?{rm,w,r}:b;
        },{rm:0,w:0,r:0});
        if(top.rm>0&&top.rm>best){best=top.rm;pts.push({data:toBR(iso),rm:top.rm,w:top.w,r:top.r});}
      });
    });
    return pts;
  },[sorted,selEx]);

  if(!topPRs.length) return (
    <EmptyState
      icon={<Trophy size={40}/>}
      title="Nenhum PR ainda"
      subtitle="Complete treinos com carga para registrar recordes"
    />
  );

  return (
    <div className="grid gap-3">
      {/* Timeline */}
      <div className="card p-4">
        <SectionLabel icon={TrendingUp} className="mb-2.5">Evolução do 1RM — Recordes históricos</SectionLabel>
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-2.5 no-scrollbar">
          {allExes.slice(0,10).map(ex=>(
            <PickChip key={ex} active={selEx===ex} onClick={()=>setExSel(ex)}>
              {ex.length>16?ex.slice(0,14)+'…':ex}
            </PickChip>
          ))}
        </div>
        {prTimeline.length>0&&(
          <>
            <div className="flex items-end gap-4 mb-2.5">
              <div>
                <div className="font-display font-bold text-[1.6rem] leading-none text-warn tnum flex items-center gap-1.5">
                  <Trophy size={20}/> {prMap[selEx]?.rm.toFixed(1)}kg
                </div>
                <div className="eyebrow mt-1">1RM estimado (Epley)</div>
              </div>
              <div className="text-[0.72rem] text-ink-2 tnum">{prMap[selEx]?.w}kg × {prMap[selEx]?.r} reps</div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={prTimeline} margin={{top:4,right:4,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                <XAxis dataKey="data" tick={TICK} axisLine={false} tickLine={false}/>
                <YAxis tick={TICK} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                <Tooltip content={<ChartTooltip unit="kg"/>}/>
                <Line type="stepAfter" dataKey="rm" name="1RM" stroke={CH[0]} strokeWidth={2.5}
                  dot={{fill:CH[0],r:5,strokeWidth:0}} activeDot={{r:7,fill:CH[0],strokeWidth:0}}/>
              </LineChart>
            </ResponsiveContainer>
            <div className="text-[0.6rem] text-ink-3 italic text-center mt-1.5">
              1RM = Peso × (1 + Reps/30) — Fórmula de Epley
            </div>
          </>
        )}
      </div>

      {/* Tabela PRs */}
      <div className="card p-4">
        <SectionLabel icon={Trophy} className="mb-3">Top {topPRs.length} Recordes Pessoais</SectionLabel>
        <div className="grid gap-1.5">
          {topPRs.slice(0,15).map(([name,pr],i)=>{
            const muscle=MUSCLE_MAP[name];
            const color=MUSCLE_COLORS[muscle]||'var(--ink-3)';
            return (
              <motion.div key={name} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:Math.min(i*.04,.4)}}
                className="card-2 flex items-center gap-2.5 px-3 py-2"
                style={{borderLeft:`3px solid ${color}`}}>
                <div className="font-display font-bold text-[0.85rem] text-ink-3 w-5 shrink-0 tnum">#{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[0.85rem] text-ink-1 truncate">{name}</div>
                  <div className="text-[0.6rem] text-ink-3 mt-px tnum">{toBR(pr.date)} · {pr.w}kg × {pr.r} reps</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-[1.05rem] leading-none text-warn tnum">{pr.rm.toFixed(1)}kg</div>
                  <div className="text-[0.5rem] uppercase text-ink-3 tracking-wider">1RM</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Aba Corpo ─────────────────────────────────────────────────
function TabCorpo({measures}:{measures:Measure[]}) {
  const sorted = [...measures].sort((a,b)=>a.date.localeCompare(b.date));
  const hasPeso=sorted.some(m=>m.peso), hasGord=sorted.some(m=>m.gordura);
  const pesoData =sorted.filter(m=>m.peso).map(m=>({data:toBR(m.date),val:num(m.peso!)}));
  const gordData =sorted.filter(m=>m.gordura).map(m=>({data:toBR(m.date),val:num(m.gordura!)}));
  const massaData=sorted.filter(m=>m.peso&&m.gordura).map(m=>({
    data:toBR(m.date),massa:+(num(m.peso!)*(1-num(m.gordura!)/100)).toFixed(1),
    gordAbs:+(num(m.peso!)*num(m.gordura!)/100).toFixed(1),
  }));
  const medidas:('cintura'|'quadril'|'braco'|'coxa')[]=['cintura','quadril','braco','coxa'];
  const mColors:Record<string,string>={cintura:CH[0],quadril:CH[1],braco:CH[2],coxa:CH[3]};

  if(!hasPeso) return (
    <EmptyState
      icon={<Scale size={40}/>}
      title="Sem dados corporais"
      subtitle="Registre medições em DarkBody → Medidas"
    />
  );

  const last=sorted.filter(m=>m.peso)[sorted.filter(m=>m.peso).length-1];
  const first=sorted.filter(m=>m.peso)[0];
  const pesoChange=last&&first?(num(last.peso||'0')-num(first.peso||'0')).toFixed(1):null;

  return (
    <div className="grid gap-3">
      {pesoChange!==null&&(
        <div className="bg-info-soft border border-info/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
          <Scale size={20} className="text-info"/>
          <div>
            <div className="text-[0.78rem] font-semibold text-ink-1">
              Variação total: <span className={`tnum ${Number(pesoChange)<0?'text-ok':'text-danger'}`}>{Number(pesoChange)>0?'+':''}{pesoChange}kg</span>
            </div>
            <div className="text-[0.65rem] text-ink-2 mt-px tnum">{first.peso}kg → {last.peso}kg · {sorted.filter(m=>m.peso).length} medições</div>
          </div>
        </div>
      )}

      {/* Peso corporal */}
      <div className="card p-4">
        <SectionLabel icon={Scale} className="mb-3">Peso Corporal (kg)</SectionLabel>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={pesoData} margin={{top:4,right:4,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
            <XAxis dataKey="data" tick={TICK} axisLine={false} tickLine={false}/>
            <YAxis tick={TICK} axisLine={false} tickLine={false} domain={['auto','auto']}/>
            <Tooltip content={<ChartTooltip unit="kg"/>}/>
            <Area type="monotone" dataKey="val" name="Peso" stroke={CH[0]} strokeWidth={2.5}
              fill={CH[0]} fillOpacity={0.12} dot={{fill:CH[0],r:3,strokeWidth:0}}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* % Gordura */}
      {hasGord&&(
        <div className="card p-4">
          <SectionLabel icon={Activity} className="mb-3">% Gordura Corporal</SectionLabel>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={gordData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
              <XAxis dataKey="data" tick={TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={TICK} axisLine={false} tickLine={false} domain={['auto','auto']}/>
              <Tooltip content={<ChartTooltip unit="%"/>}/>
              <Area type="monotone" dataKey="val" name="Gordura" stroke={CH[0]} strokeWidth={2.5}
                fill={CH[0]} fillOpacity={0.12} dot={{fill:CH[0],r:3,strokeWidth:0}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Composição */}
      {massaData.length>1&&(
        <div className="card p-4">
          <SectionLabel icon={HeartPulse} className="mb-2">Composição Corporal (kg)</SectionLabel>
          <div className="flex gap-4 mb-2.5">
            {[[CH[0],'Massa magra'],[CH[1],'Gordura']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{background:c}}/>
                <span className="text-[0.62rem] text-ink-2">{l}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={massaData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
              <XAxis dataKey="data" tick={TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={TICK} axisLine={false} tickLine={false} domain={['auto','auto']}/>
              <Tooltip content={<ChartTooltip unit="kg"/>}/>
              <Area type="monotone" dataKey="massa" name="Massa magra" stroke={CH[0]} strokeWidth={2} fill={CH[0]} fillOpacity={0.14} dot={false}/>
              <Area type="monotone" dataKey="gordAbs" name="Gordura" stroke={CH[1]} strokeWidth={2} fill={CH[1]} fillOpacity={0.14} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
          <div className="text-[0.6rem] text-ink-3 italic text-center mt-1.5">Massa magra = Peso × (1 − %Gordura/100)</div>
        </div>
      )}

      {/* Medidas */}
      {medidas.filter(k=>sorted.some(m=>m[k])).length>0&&(
        <div className="card p-4">
          <SectionLabel icon={Target} className="mb-3">Medidas Corporais (cm)</SectionLabel>
          <div className="grid gap-2">
            {medidas.filter(k=>sorted.some(m=>m[k])).map(key=>{
              const data=sorted.filter(m=>m[key]).map(m=>({data:toBR(m.date),val:num((m[key] as string)||'0')}));
              const diff=data.length>1?(data[data.length-1].val-data[0].val).toFixed(1):null;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[0.62rem] font-bold capitalize" style={{color:mColors[key]}}>{key}</div>
                    {diff&&<div className={`text-[0.62rem] tnum ${Number(diff)<0?'text-ok':'text-danger'}`}>{Number(diff)>0?'+':''}{diff}cm</div>}
                  </div>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={data} margin={{top:2,right:4,left:-20,bottom:2}}>
                      <XAxis dataKey="data" tick={false} axisLine={false} tickLine={false}/>
                      <YAxis tick={TICK} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                      <Tooltip content={<ChartTooltip unit="cm"/>}/>
                      <Line type="monotone" dataKey="val" stroke={mColors[key]} strokeWidth={2} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba Composição ────────────────────────────────────────────
function TabComposicao({history,measures}:{history:History;measures:Measure[]}) {
  const sorted     = useMemo(()=>[...measures].sort((a,b)=>a.date.localeCompare(b.date)),[measures]);
  const histSorted = useMemo(()=>Object.entries(history).sort((a,b)=>a[0].localeCompare(b[0])),[history]);

  if(sorted.filter(m=>m.peso&&m.gordura).length<2) return (
    <EmptyState
      icon={<Activity size={40}/>}
      title="Dados insuficientes"
      subtitle="Registre ao menos 2 medições de peso + gordura em DarkBody"
    />
  );

  const wkVol:Record<string,number>={};
  histSorted.forEach(([iso,s])=>{
    const wk=toWeek(iso);
    const vol=s.entries.reduce((a,en)=>a+en.sets.reduce((b,st)=>b+num(st.w)*num(st.r),0),0);
    wkVol[wk]=(wkVol[wk]||0)+vol;
  });

  const ircData=sorted.filter(m=>m.peso&&m.gordura).map(m=>{
    const p=num(m.peso||'0'),g=num(m.gordura||'0')/100;
    return {date:m.date,data:toBR(m.date),mm:+(p*(1-g)).toFixed(2),gabs:+(p*g).toFixed(2)};
  });
  const irc=ircData.slice(1).map((d,i)=>{
    const prev=ircData[i];
    const val=+(d.mm-prev.mm-(d.gabs-prev.gabs)).toFixed(2);
    return {data:d.data,val,pos:val>=0};
  });

  const pesoVsVol=sorted.filter(m=>m.peso).map(m=>{
    const wk=toWeek(m.date);
    return {data:toBR(m.date),peso:num(m.peso||'0'),vol:Math.round((wkVol[wk]||0)/1000*10)/10};
  });

  const last=sorted.filter(m=>m.peso&&m.gordura)[sorted.filter(m=>m.peso&&m.gordura).length-1];
  const first=sorted.filter(m=>m.peso&&m.gordura)[0];
  const pesoChange=last&&first?(num(last.peso||'0')-num(first.peso||'0')).toFixed(1):null;
  const gordChange=last&&first?(num(last.gordura||'0')-num(first.gordura||'0')).toFixed(1):null;
  const mmFirst=num(first.peso||'0')*(1-num(first.gordura||'0')/100);
  const mmLast =num(last.peso||'0')*(1-num(last.gordura||'0')/100);
  const massaChange=(mmLast-mmFirst).toFixed(1);

  return (
    <div className="grid gap-3">
      {/* Variação total */}
      <div className="grid grid-cols-3 gap-2.5">
        {([
          [pesoChange,'Peso','kg'],
          [gordChange,'Gordura','%'],
          [massaChange,'Massa Magra','kg'],
        ] as const).map(([val,lbl,unit],i)=>{
          const tone = val===null||Number(val)===0
            ? 'default'
            : i===1
              ? (Number(val)<0?'ok':'danger')
              : (Number(val)>0?'ok':'danger');
          return (
            <motion.div key={lbl} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
              <StatTile
                value={<span className="text-[1.15rem]">{val===null?'–':((Number(val)>0?'+':'')+val+unit)}</span>}
                label={lbl}
                tone={tone}
              />
            </motion.div>
          );
        })}
      </div>

      {/* IRC */}
      {irc.length>0&&(
        <div className="card p-4">
          <SectionLabel icon={Activity} className="mb-2">Índice de Recomposição Corporal</SectionLabel>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={irc} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
              <XAxis dataKey="data" tick={TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={TICK} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip unit=""/>}/>
              <ReferenceLine y={0} stroke="var(--line)" strokeWidth={1}/>
              <Bar dataKey="val" name="IRC" radius={[3,3,0,0]} maxBarSize={28}>
                {irc.map((d,i)=><Cell key={i} fill={d.pos?CH[4]:CH[2]} fillOpacity={0.75}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[0.6rem] text-ink-3 italic text-center mt-1.5">
            IRC = ΔMassa magra − ΔGordura absoluta · positivo = recomposição
          </div>
        </div>
      )}

      {/* Peso × Volume */}
      {pesoVsVol.some(d=>d.vol>0)&&(
        <div className="card p-4">
          <SectionLabel icon={TrendingUp} className="mb-2">Peso × Volume de Treino Semanal</SectionLabel>
          <div className="flex gap-4 mb-2">
            {[[CH[0],'Peso (kg)'],[CH[1],'Volume (t)']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{background:c}}/>
                <span className="text-[0.62rem] text-ink-2">{l}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={pesoVsVol} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
              <XAxis dataKey="data" tick={TICK} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="left" tick={TICK} axisLine={false} tickLine={false} domain={['auto','auto']}/>
              <YAxis yAxisId="right" orientation="right" tick={TICK} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip unit=""/>}/>
              <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso" stroke={CH[0]} strokeWidth={2} dot={{fill:CH[0],r:3,strokeWidth:0}}/>
              <Line yAxisId="right" type="monotone" dataKey="vol" name="Volume" stroke={CH[1]} strokeWidth={2} dot={{fill:CH[1],r:3,strokeWidth:0}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function EvolucaoPage() {
  const router = useRouter();
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
        const [histSnap,measSnap] = await Promise.all([
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
      <Spinner full/>
    </PageShell>
  );

  if(!uid) return (
    <PageShell>
      <PageHeader title="Evolução" subtitle="Análise avançada do seu progresso"/>
      <EmptyState
        icon={<LogIn size={40}/>}
        title="Entre para ver sua evolução"
        subtitle="Faça login para acessar seus gráficos e recordes"
        action={<Button size="sm" onClick={()=>router.push('/login')}>Entrar</Button>}
      />
    </PageShell>
  );

  return (
    <PageShell>
      <PageHeader
        title="Evolução"
        subtitle="Análise avançada do seu progresso"
        right={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent-soft border border-accent/30 text-accent text-[0.55rem] font-bold tracking-[0.12em] uppercase">
            Elite
          </span>
        }
      />

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
        {TABS.map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.95}} onClick={()=>setTab(t.id)}
              className={`chip shrink-0 ${tab===t.id?'chip-active':''}`}>
              <TIcon size={14}/> {t.label}
            </motion.button>
          );
        })}
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
