'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import PageHeader from '@/components/core/PageHeader';
import EmptyState from '@/components/core/EmptyState';
import { useToast, ToastViewport } from '@/components/core/Toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGifUrls } from '@/lib/exerciseGifs';
import {
  Dumbbell, Plus, Minus, Trash2, Search, X, Copy, Pencil, Star,
  ChevronDown, ChevronUp, ArrowLeft, Loader2, ClipboardList, Check, GripVertical, LogIn,
} from 'lucide-react';

const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const GROUP_ORDER = ['Peito','Ombro','Trapézio','Costas','Bíceps','Tríceps','Antebraço','Lombar','Quadríceps','Posterior de Coxa','Glúteo','Panturrilha','Abdômen'];

type Ex = {id:string;name:string;primary:string;equipment:string;difficulty:string};
type Item = {exId:string;name:string;setsPlanned:number;repsTarget:string};
type Plan = {id:string;name:string;byDay:Record<string,Item[]>};
type Preset = Plan & {level:string;days:number;description:string};

const mkEx = (name:string,primary:string,equipment='',difficulty='intermediário'):Ex => ({
  id:name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''),
  name,primary,equipment,difficulty
});

const EXS:Ex[] = [
  mkEx('Supino reto barra','Peito','Barra'),
  mkEx('Supino reto halteres','Peito','Halteres'),
  mkEx('Supino inclinado barra','Peito','Barra'),
  mkEx('Supino inclinado halteres','Peito','Halteres'),
  mkEx('Supino declinado barra','Peito','Barra'),
  mkEx('Supino declinado halteres','Peito','Halteres'),
  mkEx('Crucifixo reto halteres','Peito','Halteres','iniciante'),
  mkEx('Crucifixo inclinado halteres','Peito','Halteres','iniciante'),
  mkEx('Crucifixo Máquina','Peito','Máquina','iniciante'),
  mkEx('Crossover polia alta','Peito','Cabo/Crossover'),
  mkEx('Flexão de braço','Peito','Peso corporal','iniciante'),
  mkEx('Pullover halteres','Peito','Halteres'),
  mkEx('Desenvolvimento barra','Ombro','Barra'),
  mkEx('Desenvolvimento halteres','Ombro','Halteres'),
  mkEx('Desenvolvimento máquina','Ombro','Máquina','iniciante'),
  mkEx('Elevação lateral halteres','Ombro','Halteres','iniciante'),
  mkEx('Elevação lateral polia','Ombro','Cabo/Crossover','iniciante'),
  mkEx('Elevação frontal halteres','Ombro','Halteres','iniciante'),
  mkEx('Crucifixo inverso halteres','Ombro','Halteres','iniciante'),
  mkEx('Crucifixo inverso máquina','Ombro','Máquina','iniciante'),
  mkEx('Face Pull corda','Ombro','Cabo/Crossover','iniciante'),
  mkEx('Arnold press halteres','Ombro','Halteres','avançado'),
  mkEx('Encolhimento barra','Trapézio','Barra','iniciante'),
  mkEx('Encolhimento halteres','Trapézio','Halteres','iniciante'),
  mkEx('Barra fixa','Costas','Peso corporal','avançado'),
  mkEx('Pulldown','Costas','Cabo/Crossover','iniciante'),
  mkEx('Puxada alta aberta','Costas','Cabo/Crossover'),
  mkEx('Puxada fechada','Costas','Cabo/Crossover','iniciante'),
  mkEx('Puxada triângulo','Costas','Cabo/Crossover'),
  mkEx('Remada curvada barra','Costas','Barra'),
  mkEx('Remada curvada halteres','Costas','Halteres'),
  mkEx('Remada serrote halteres','Costas','Halteres','iniciante'),
  mkEx('Remada baixa polia','Costas','Cabo/Crossover'),
  mkEx('Remada articulada','Costas','Máquina'),
  mkEx('Remada cavalinho','Costas','Barra'),
  mkEx('Extensão lombar máquina','Lombar','Máquina','iniciante'),
  mkEx('Rosca direta barra','Bíceps','Barra'),
  mkEx('Rosca direta halteres','Bíceps','Halteres'),
  mkEx('Rosca alternada halteres','Bíceps','Halteres'),
  mkEx('Rosca martelo halteres','Bíceps','Halteres'),
  mkEx('Rosca concentrada halteres','Bíceps','Halteres','iniciante'),
  mkEx('Rosca Scott máquina','Bíceps','Máquina','iniciante'),
  mkEx('Rosca Bayesian cabo','Bíceps','Cabo/Crossover'),
  mkEx('Tríceps pulley barra reta','Tríceps','Cabo/Crossover','iniciante'),
  mkEx('Tríceps pulley corda','Tríceps','Cabo/Crossover','iniciante'),
  mkEx('Tríceps francês barra','Tríceps','Barra'),
  mkEx('Tríceps francês halteres','Tríceps','Halteres'),
  mkEx('Tríceps testa barra W','Tríceps','Barra'),
  mkEx('Kick back tríceps halteres','Tríceps','Halteres','iniciante'),
  mkEx('Mergulho no banco','Tríceps','Peso corporal','iniciante'),
  mkEx('Paralelas','Tríceps','Peso corporal','avançado'),
  mkEx('Agachamento livre','Quadríceps','Barra','avançado'),
  mkEx('Agachamento hack máquina','Quadríceps','Máquina','iniciante'),
  mkEx('Agachamento sumô barra','Quadríceps','Barra'),
  mkEx('Agachamento sumô halteres','Quadríceps','Halteres'),
  mkEx('Agachamento búlgaro halteres','Quadríceps','Halteres','avançado'),
  mkEx('Leg press 45','Quadríceps','Máquina'),
  mkEx('Cadeira extensora','Quadríceps','Máquina','iniciante'),
  mkEx('Afundo com halteres','Quadríceps','Halteres'),
  mkEx('Passada avançada halteres','Quadríceps','Halteres'),
  mkEx('Stiff','Posterior de Coxa','Barra'),
  mkEx('Stiff barra','Posterior de Coxa','Barra'),
  mkEx('Stiff com halteres','Posterior de Coxa','Halteres'),
  mkEx('Cadeira flexora','Posterior de Coxa','Máquina','iniciante'),
  mkEx('Mesa flexora','Posterior de Coxa','Máquina'),
  mkEx('Hip Thrust barra','Glúteo','Barra'),
  mkEx('Elevação pélvica com barra','Glúteo','Barra'),
  mkEx('Hip Thrust máquina','Glúteo','Máquina','iniciante'),
  mkEx('Glúteo 4 apoios cabo','Glúteo','Cabo/Crossover'),
  mkEx('Abdução em pé polia','Glúteo','Cabo/Crossover','iniciante'),
  mkEx('Cadeira abdutora','Glúteo','Máquina','iniciante'),
  mkEx('Panturrilha em pé máquina','Panturrilha','Máquina','iniciante'),
  mkEx('Panturrilha sentado','Panturrilha','Máquina','iniciante'),
  mkEx('Panturrilha sentado máquina','Panturrilha','Máquina','iniciante'),
  mkEx('Abdominal crunch','Abdômen','Peso corporal','iniciante'),
  mkEx('Prancha','Abdômen','Peso corporal','iniciante'),
  mkEx('Prancha isométrica','Abdômen','Peso corporal','iniciante'),
  mkEx('Abdominal máquina','Abdômen','Máquina','iniciante'),
  mkEx('Levantamento terra','Costas','Barra','avançado'),
];

const MUSCLES = Array.from(new Set(EXS.map(e=>e.primary)));
const EQUIPS  = Array.from(new Set(EXS.map(e=>e.equipment)));

const ex = (name:string, sets=3):Item => {
  const found = EXS.find(e=>e.name===name||e.name.toLowerCase()===name.toLowerCase());
  return {
    exId: found?.id || name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''),
    name: found?.name || name,
    setsPlanned: sets,
    repsTarget: '10-12'
  };
};

const emptyByDay = ():Record<string,Item[]> => Object.fromEntries(DAYS.map(d=>[d,[]]));

/* Tons semânticos por nível (tokens do design system — sem hex) */
const LEVEL_BADGE:Record<string,string> = {
  'iniciante':'bg-ok-soft border-ok/30 text-ok',
  'intermediário':'bg-warn-soft border-warn/30 text-warn',
  'avançado':'bg-danger-soft border-danger/30 text-danger',
};
const LEVEL_TEXT:Record<string,string> = {
  'iniciante':'text-ok',
  'intermediário':'text-warn',
  'avançado':'text-danger',
};

const PRESET_PLANS:Preset[] = [
  {
    id:'preset_fb3_ini', name:'Full Body 3x', level:'iniciante', days:3,
    description:'Treino completo do corpo 3x por semana. Ideal para quem está começando.',
    byDay:{
      Segunda:[ex('Agachamento livre',3),ex('Supino reto barra',3),ex('Remada curvada barra',3),ex('Desenvolvimento máquina',3),ex('Rosca direta halteres',3),ex('Tríceps pulley corda',3),ex('Prancha isométrica',3)],
      Quarta:[ex('Leg press 45',3),ex('Supino inclinado halteres',3),ex('Puxada alta aberta',3),ex('Elevação lateral halteres',3),ex('Rosca martelo halteres',3),ex('Tríceps pulley barra reta',3)],
      Sexta:[ex('Agachamento sumô halteres',3),ex('Crucifixo Máquina',3),ex('Remada baixa polia',3),ex('Face Pull corda',3),ex('Rosca Scott máquina',3),ex('Mergulho no banco',3)],
      Terça:[],Quinta:[],Sábado:[],Domingo:[],
    }
  },
  {
    id:'preset_abc_ini', name:'ABC — Iniciante', level:'iniciante', days:3,
    description:'A=Peito+Ombro+Tríceps · B=Costas+Bíceps · C=Pernas. Distribuição clássica.',
    byDay:{
      Segunda:[ex('Supino reto barra',4),ex('Supino inclinado halteres',3),ex('Crucifixo Máquina',3),ex('Desenvolvimento máquina',3),ex('Elevação lateral halteres',3),ex('Tríceps pulley corda',3)],
      Quarta:[ex('Puxada alta aberta',4),ex('Remada curvada barra',4),ex('Remada baixa polia',3),ex('Encolhimento halteres',3),ex('Rosca direta halteres',4),ex('Rosca martelo halteres',3)],
      Sexta:[ex('Agachamento livre',4),ex('Leg press 45',4),ex('Cadeira extensora',3),ex('Stiff',3),ex('Mesa flexora',3),ex('Panturrilha em pé máquina',3)],
      Terça:[],Quinta:[],Sábado:[],Domingo:[],
    }
  },
  {
    id:'preset_ul4_ini', name:'Upper/Lower — Iniciante', level:'iniciante', days:4,
    description:'Superior e Inferior alternados 2x por semana. Equilíbrio perfeito.',
    byDay:{
      Segunda:[ex('Supino reto barra',4),ex('Remada curvada barra',4),ex('Desenvolvimento máquina',3),ex('Puxada alta aberta',3),ex('Rosca direta halteres',3),ex('Tríceps pulley corda',3)],
      Terça:[ex('Agachamento livre',4),ex('Leg press 45',4),ex('Cadeira extensora',3),ex('Mesa flexora',3),ex('Stiff',3),ex('Panturrilha em pé máquina',4)],
      Quinta:[ex('Supino inclinado halteres',4),ex('Remada serrote halteres',4),ex('Desenvolvimento halteres',3),ex('Puxada triângulo',3),ex('Rosca martelo halteres',3),ex('Tríceps pulley barra reta',3)],
      Sexta:[ex('Agachamento sumô halteres',4),ex('Elevação pélvica com barra',4),ex('Cadeira extensora',3),ex('Cadeira flexora',3),ex('Cadeira abdutora',4),ex('Panturrilha sentado',3)],
      Quarta:[],Sábado:[],Domingo:[],
    }
  },
  {
    id:'preset_ppl4_int', name:'PPL 4 dias', level:'intermediário', days:4,
    description:'Push/Pull/Legs + Full Body. Bom volume em 4 sessões.',
    byDay:{
      Segunda:[ex('Supino reto barra',4),ex('Supino inclinado halteres',4),ex('Crucifixo reto halteres',3),ex('Desenvolvimento barra',4),ex('Elevação lateral halteres',4),ex('Tríceps testa barra W',4),ex('Tríceps pulley corda',3)],
      Terça:[ex('Puxada alta aberta',4),ex('Remada curvada barra',4),ex('Remada baixa polia',3),ex('Puxada triângulo',3),ex('Rosca direta barra',4),ex('Rosca martelo halteres',3),ex('Face Pull corda',3)],
      Quinta:[ex('Agachamento livre',5),ex('Leg press 45',4),ex('Cadeira extensora',3),ex('Stiff',4),ex('Mesa flexora',3),ex('Elevação pélvica com barra',4),ex('Panturrilha em pé máquina',4)],
      Sábado:[ex('Supino reto halteres',4),ex('Remada articulada',4),ex('Desenvolvimento halteres',3),ex('Puxada alta aberta',3),ex('Rosca direta halteres',3),ex('Tríceps pulley barra reta',3),ex('Elevação lateral halteres',3)],
      Quarta:[],Sexta:[],Domingo:[],
    }
  },
  {
    id:'preset_ppl5_int', name:'PPL Clássico — 5 dias', level:'intermediário', days:5,
    description:'Push/Pull/Legs x5 sessões com Push e Pull repetidos. Volume ideal.',
    byDay:{
      Segunda:[ex('Supino reto barra',4),ex('Supino inclinado halteres',4),ex('Crossover polia alta',3),ex('Desenvolvimento barra',4),ex('Elevação lateral halteres',4),ex('Tríceps testa barra W',4),ex('Tríceps pulley corda',3)],
      Terça:[ex('Puxada alta aberta',4),ex('Remada curvada barra',4),ex('Remada baixa polia',4),ex('Puxada triângulo',3),ex('Face Pull corda',3),ex('Rosca direta barra',4),ex('Rosca martelo halteres',3)],
      Quarta:[ex('Agachamento livre',5),ex('Leg press 45',4),ex('Cadeira extensora',3),ex('Agachamento búlgaro halteres',3),ex('Stiff',4),ex('Mesa flexora',3),ex('Panturrilha em pé máquina',5)],
      Quinta:[ex('Supino inclinado barra',4),ex('Supino declinado halteres',3),ex('Crucifixo Máquina',4),ex('Desenvolvimento halteres',4),ex('Elevação lateral halteres',4),ex('Crucifixo inverso máquina',3),ex('Tríceps francês halteres',4)],
      Sexta:[ex('Barra fixa',4),ex('Remada articulada',4),ex('Puxada triângulo',3),ex('Remada serrote halteres',4),ex('Encolhimento halteres',3),ex('Rosca direta halteres',4),ex('Rosca Scott máquina',3)],
      Sábado:[],Domingo:[],
    }
  },
  {
    id:'preset_abcde_av', name:'ABCDE — Avançado', level:'avançado', days:5,
    description:'Um grupo muscular por dia. Alto volume. Peito/Costas/Ombro/Pernas/Braços.',
    byDay:{
      Segunda:[ex('Supino reto barra',5),ex('Supino inclinado halteres',4),ex('Supino declinado barra',4),ex('Crucifixo reto halteres',4),ex('Crossover polia alta',3),ex('Crucifixo Máquina',3),ex('Pullover halteres',3)],
      Terça:[ex('Puxada alta aberta',5),ex('Remada curvada barra',5),ex('Remada baixa polia',4),ex('Puxada triângulo',4),ex('Remada cavalinho',4),ex('Extensão lombar máquina',3),ex('Encolhimento barra',3)],
      Quarta:[ex('Desenvolvimento barra',5),ex('Elevação lateral halteres',5),ex('Elevação lateral polia',4),ex('Arnold press halteres',4),ex('Crucifixo inverso halteres',4),ex('Face Pull corda',4),ex('Elevação frontal halteres',3)],
      Quinta:[ex('Agachamento livre',5),ex('Leg press 45',5),ex('Cadeira extensora',4),ex('Agachamento hack máquina',4),ex('Stiff',4),ex('Mesa flexora',4),ex('Panturrilha em pé máquina',5)],
      Sexta:[ex('Rosca direta barra',5),ex('Rosca alternada halteres',4),ex('Rosca Scott máquina',4),ex('Rosca concentrada halteres',3),ex('Tríceps testa barra W',5),ex('Paralelas',4),ex('Tríceps francês halteres',4),ex('Kick back tríceps halteres',3)],
      Sábado:[],Domingo:[],
    }
  },
  {
    id:'preset_gluteo_foco', name:'Foco Glúteo — 4 dias', level:'intermediário', days:4,
    description:'Alto volume em glúteo e posterior. Inclui dia de superior para equilibrar.',
    byDay:{
      Segunda:[ex('Elevação pélvica com barra',5),ex('Agachamento sumô barra',4),ex('Stiff',4),ex('Cadeira abdutora',4),ex('Glúteo 4 apoios cabo',4),ex('Abdução em pé polia',3)],
      Terça:[ex('Supino reto barra',4),ex('Puxada alta aberta',4),ex('Desenvolvimento halteres',3),ex('Remada curvada barra',3),ex('Rosca direta halteres',3),ex('Tríceps pulley corda',3)],
      Quinta:[ex('Agachamento hack máquina',4),ex('Leg press 45',4),ex('Agachamento búlgaro halteres',4),ex('Cadeira extensora',3),ex('Cadeira abdutora',3),ex('Panturrilha em pé máquina',4)],
      Sexta:[ex('Stiff com halteres',4),ex('Mesa flexora',4),ex('Cadeira flexora',3),ex('Elevação pélvica com barra',4),ex('Glúteo 4 apoios cabo',3),ex('Panturrilha sentado',3)],
      Quarta:[],Sábado:[],Domingo:[],
    }
  },
];

/* ── GIF animado do exercício (alterna 2 frames) ─────────────── */
function ExerciseGif({name, size=80}:{name:string;size?:number}) {
  const urls = getGifUrls(name);
  const [frame, setFrame] = useState(0);
  const [img1Ok, setImg1Ok] = useState(true);

  useEffect(()=>{
    setFrame(0); setImg1Ok(true);
    if(!urls) return;
    const t = setInterval(()=>setFrame(f=>f===0?1:0), 900);
    return ()=>clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[name]);

  if(!urls) return (
    <div
      className="shrink-0 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-ink-3"
      style={{width:size,height:size}}
    >
      <Dumbbell size={size>60?24:16}/>
    </div>
  );

  const src = frame===0 ? urls.url0 : (img1Ok ? urls.url1 : urls.url0);
  return (
    <img
      src={src}
      alt={name}
      onError={()=>{ if(frame===1) setImg1Ok(false); }}
      className="shrink-0 rounded-lg object-cover border border-line"
      style={{width:size,height:size}}
    />
  );
}

/* ── Segmented control local ─────────────────────────────────── */
function Segmented<T extends string>({options, value, onChange}:{
  options:{key:T;label:React.ReactNode}[];
  value:T;
  onChange:(v:T)=>void;
}) {
  return (
    <div className="card-2 flex p-1 gap-1 mb-4">
      {options.map(o=>(
        <button
          key={o.key}
          onClick={()=>onChange(o.key)}
          className={`flex-1 h-9 rounded-lg text-[0.8rem] font-semibold transition-colors ${
            value===o.key ? 'bg-accent-soft text-accent border border-accent/30' : 'text-ink-2 border border-transparent'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Editor de ficha (dias, exercícios, busca/adição) ────────── */
function Builder({plan,onSave,onBack}:{plan:Plan;onSave:(p:Plan)=>Promise<void>;onBack:()=>void}) {
  const [local, setLocal]     = useState<Plan>(JSON.parse(JSON.stringify(plan)));
  const [day, setDay]         = useState(DAYS[0]);
  const [tab, setTab]         = useState<'ficha'|'buscar'>('ficha');
  const [busca, setBusca]     = useState('');
  const [filtMuscle, setFiltMuscle] = useState('');
  const [filtEquip, setFiltEquip]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [showGif, setShowGif] = useState<string|null>(null);
  const [dragIdx, setDragIdx]     = useState<number|null>(null);
  const [dragOver, setDragOver]   = useState<number|null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout>|null>(null);
  const [dragging, setDragging]   = useState(false);

  const dayItems = local.byDay[day]||[];
  const totalEx  = Object.values(local.byDay).flat().length;

  const exsFiltrados = useMemo(()=>
    EXS.filter(e=>
      e.name.toLowerCase().includes(busca.toLowerCase()) &&
      (!filtMuscle||e.primary===filtMuscle) &&
      (!filtEquip||e.equipment===filtEquip)
    ).sort((a,b)=>GROUP_ORDER.indexOf(a.primary)-GROUP_ORDER.indexOf(b.primary)||a.name.localeCompare(b.name,'pt'))
  ,[busca,filtMuscle,filtEquip]);

  const addEx = (e:Ex) => setLocal(prev=>{
    const c=JSON.parse(JSON.stringify(prev));
    if(c.byDay[day].some((it:Item)=>it.exId===e.id)) return prev;
    c.byDay[day].push({exId:e.id,name:e.name,setsPlanned:3,repsTarget:'10-12'});
    return c;
  });
  const removeItem = (i:number) => setLocal(prev=>{const c=JSON.parse(JSON.stringify(prev));c.byDay[day].splice(i,1);return c;});
  const updateSets = (i:number,v:string) => setLocal(prev=>{const c=JSON.parse(JSON.stringify(prev));c.byDay[day][i].setsPlanned=Math.max(1,Math.min(10,parseInt(v)||3));return c;});
  const updateReps = (i:number,v:string) => setLocal(prev=>{const c=JSON.parse(JSON.stringify(prev));c.byDay[day][i].repsTarget=v;return c;});

  const reorder = (from:number, to:number) => {
    if(from===to) return;
    setLocal(prev=>{
      const c=JSON.parse(JSON.stringify(prev));
      const arr=c.byDay[day];
      const [item]=arr.splice(from,1);
      arr.splice(to,0,item);
      return c;
    });
  };

  const handleTouchStart = (i:number) => {
    const t = setTimeout(()=>{
      setDragIdx(i);
      setDragging(true);
      if(navigator.vibrate) navigator.vibrate(40);
    }, 400);
    setLongPressTimer(t);
  };

  const handleTouchEnd = () => {
    if(longPressTimer) clearTimeout(longPressTimer);
    if(dragging && dragIdx!==null && dragOver!==null) {
      reorder(dragIdx, dragOver);
    }
    setDragIdx(null);
    setDragOver(null);
    setDragging(false);
    setLongPressTimer(null);
  };

  const handleTouchMove = (e:React.TouchEvent, listLen:number) => {
    if(!dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el?.closest('[data-drag-idx]');
    if(row) {
      const idx = parseInt(row.getAttribute('data-drag-idx')||'-1');
      if(idx>=0 && idx<listLen) setDragOver(idx);
    }
  };

  return (
    <PageShell>
      {/* Modal fullscreen do GIF */}
      {showGif && (
        <div
          onClick={()=>setShowGif(null)}
          className="fixed inset-0 z-[200] bg-bg/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 p-8"
        >
          <div className="relative rounded-xl ring-1 ring-accent/30">
            <ExerciseGif name={showGif} size={280}/>
          </div>
          <div className="font-display font-bold text-xl text-ink-1 text-center">{showGif}</div>
          <div className="eyebrow">Toque para fechar</div>
        </div>
      )}

      {/* Cabeçalho do editor */}
      <motion.div
        initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
        className="flex items-center justify-between gap-3 mb-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} aria-label="Voltar">
            <ArrowLeft size={16}/>
          </Button>
          <div className="min-w-0">
            <div className="eyebrow">Editando</div>
            <div className="font-display font-bold text-lg text-ink-1 leading-tight truncate">{local.name}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display font-bold text-2xl text-accent leading-none tnum">{totalEx}</div>
          <div className="eyebrow">exercícios</div>
        </div>
      </motion.div>

      {/* Seletor de dia com contadores */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2 pb-2 mb-3">
        {DAYS.map(dy=>{
          const count = local.byDay[dy]?.length||0;
          const active = day===dy;
          return (
            <button
              key={dy}
              onClick={()=>setDay(dy)}
              className={`chip shrink-0 relative min-w-[52px] justify-center ${active?'chip-active':''}`}
            >
              {dy.slice(0,3)}
              {count>0 && (
                <span className="absolute -top-1.5 -right-1 w-[18px] h-[18px] rounded-full bg-accent text-accent-ink text-[0.55rem] font-bold flex items-center justify-center tnum ring-2 ring-bg">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Segmented<'ficha'|'buscar'>
        value={tab}
        onChange={setTab}
        options={[
          {key:'ficha', label:`Ficha ${day.slice(0,3)} (${dayItems.length})`},
          {key:'buscar', label:(
            <span className="inline-flex items-center gap-1.5"><Plus size={14}/>Adicionar</span>
          )},
        ]}
      />

      {tab==='ficha' && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
          {dayItems.length===0 ? (
            <EmptyState
              icon={<Dumbbell size={36}/>}
              title="Dia vazio"
              subtitle={`Nenhum exercício para ${day}. Bora montar!`}
              action={
                <Button size="sm" onClick={()=>setTab('buscar')}>
                  <Plus size={15}/> Adicionar exercício
                </Button>
              }
            />
          ) : (
            <>
              {dayItems.length > 1 && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 card-2">
                  <GripVertical size={13} className="text-ink-3 shrink-0"/>
                  <span className="text-[0.68rem] text-ink-3">Segure e arraste para reordenar</span>
                </div>
              )}
              <div
                className="grid gap-2.5"
                onTouchMove={e=>handleTouchMove(e,dayItems.length)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                {dayItems.map((it,i)=>{
                  const exInfo = EXS.find(e=>e.id===it.exId);
                  const isDragged = dragIdx===i;
                  const isTarget  = dragOver===i && dragIdx!==i;
                  return (
                    <motion.div
                      key={it.exId}
                      initial={{opacity:0,y:10}}
                      animate={{opacity:1,y:0}}
                      transition={{delay:Math.min(i*0.04,0.4)}}
                      data-drag-idx={i}
                      onTouchStart={()=>handleTouchStart(i)}
                      className={`card p-3 relative overflow-hidden select-none transition-[border-color,transform] ${
                        isDragged ? 'border-accent bg-accent-soft scale-[1.02] shadow-float'
                        : isTarget ? 'border-accent/40 -translate-y-0.5'
                        : ''
                      }`}
                    >
                      {isTarget && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent"/>}

                      <div className="flex items-center gap-2.5 mb-2.5">
                        <button
                          onClick={()=>!dragging&&setShowGif(it.name)}
                          className="relative shrink-0 rounded-lg overflow-hidden"
                          aria-label={`Ver demonstração de ${it.name}`}
                        >
                          <ExerciseGif name={it.name} size={56}/>
                          <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-bg/70 text-[0.55rem] font-bold text-ink-2 tnum">
                            {i+1}
                          </span>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="font-display font-semibold text-[0.95rem] text-ink-1 leading-tight break-words">
                            {it.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {exInfo?.primary && (
                              <span className="text-[0.58rem] font-bold uppercase tracking-wide text-accent bg-accent-soft rounded px-1.5 py-px">
                                {exInfo.primary}
                              </span>
                            )}
                            {exInfo?.equipment && (
                              <span className="text-[0.62rem] text-ink-3 font-medium">{exInfo.equipment}</span>
                            )}
                          </div>
                        </div>

                        <GripVertical size={16} className="text-ink-3 opacity-50 shrink-0 cursor-grab"/>

                        <button
                          onClick={()=>removeItem(i)}
                          className="shrink-0 w-9 h-9 rounded-lg bg-danger-soft border border-danger/30 text-danger flex items-center justify-center"
                          aria-label="Remover exercício"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {/* Séries */}
                        <div className="flex-1 card-2 px-2.5 py-2 flex items-center justify-between gap-2">
                          <div>
                            <div className="eyebrow">Séries</div>
                            <div className="font-display font-bold text-xl text-ink-1 leading-none tnum">{it.setsPlanned}</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={()=>updateSets(i,String(it.setsPlanned+1))}
                              className="w-7 h-6 rounded-md bg-surface-3 text-ink-1 flex items-center justify-center"
                              aria-label="Mais uma série"
                            ><Plus size={13}/></button>
                            <button
                              onClick={()=>updateSets(i,String(it.setsPlanned-1))}
                              className="w-7 h-6 rounded-md bg-surface-3 text-ink-2 flex items-center justify-center"
                              aria-label="Menos uma série"
                            ><Minus size={13}/></button>
                          </div>
                        </div>

                        {/* Reps */}
                        <div className="flex-1 card-2 px-2.5 py-2 flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="eyebrow">Reps</div>
                            <input
                              type="text"
                              maxLength={8}
                              value={it.repsTarget}
                              onChange={e=>updateReps(i,e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-display font-bold text-xl text-ink-1 leading-none p-0 tnum"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {['8-10','10-12','12-15'].map(r=>(
                              <button
                                key={r}
                                onClick={()=>updateReps(i,r)}
                                className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded border leading-none whitespace-nowrap tnum transition-colors ${
                                  it.repsTarget===r
                                    ? 'bg-accent-soft border-accent/30 text-accent'
                                    : 'bg-surface-2 border-line text-ink-3'
                                }`}
                              >{r}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      )}

      {tab==='buscar' && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card overflow-hidden">
          <div className="p-3 pb-2">
            {/* Busca */}
            <div className="relative mb-2.5">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"/>
              <input
                value={busca}
                onChange={e=>setBusca(e.target.value)}
                placeholder="Buscar exercício…"
                className="field pl-10"
              />
            </div>

            {/* Filtro por músculo */}
            <div className="eyebrow mb-1.5">Músculo</div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
              <button onClick={()=>setFiltMuscle('')} className={`chip shrink-0 ${!filtMuscle?'chip-active':''}`}>Todos</button>
              {MUSCLES.map(m=>(
                <button key={m} onClick={()=>setFiltMuscle(filtMuscle===m?'':m)} className={`chip shrink-0 ${filtMuscle===m?'chip-active':''}`}>{m}</button>
              ))}
            </div>

            {/* Filtro por equipamento */}
            <div className="eyebrow mb-1.5">Equipamento</div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
              <button onClick={()=>setFiltEquip('')} className={`chip shrink-0 ${!filtEquip?'chip-active':''}`}>Todos</button>
              {EQUIPS.map(eq=>(
                <button key={eq} onClick={()=>setFiltEquip(filtEquip===eq?'':eq)} className={`chip shrink-0 ${filtEquip===eq?'chip-active':''}`}>{eq}</button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="eyebrow">{exsFiltrados.length} exercício(s)</div>
              {(busca||filtMuscle||filtEquip) && (
                <button
                  onClick={()=>{setBusca('');setFiltMuscle('');setFiltEquip('');}}
                  className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-danger"
                >
                  <X size={12}/> Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto px-3 pb-3">
            {(()=>{
              const rows:React.ReactNode[] = [];
              let lastGroup = '';
              exsFiltrados.forEach((e,idx)=>{
                if(e.primary!==lastGroup){
                  lastGroup=e.primary;
                  rows.push(
                    <div key={'g_'+e.primary} className={`eyebrow text-accent border-b border-accent/20 px-1 pb-1 ${idx?'mt-3':''} mb-1.5`}>
                      {e.primary}
                    </div>
                  );
                }
                const added = dayItems.some(it=>it.exId===e.id);
                rows.push(
                  <button
                    key={e.id}
                    onClick={()=>!added&&addEx(e)}
                    className={`w-full flex items-center gap-2.5 rounded-xl border p-2 mb-1.5 text-left transition-colors ${
                      added ? 'bg-ok-soft border-ok/30 cursor-default' : 'bg-surface-2 border-line'
                    }`}
                  >
                    <ExerciseGif name={e.name} size={56}/>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[0.85rem] font-semibold truncate ${added?'text-ok':'text-ink-1'}`}>{e.name}</div>
                      <div className="text-[0.65rem] text-ink-3 mt-0.5">
                        {e.equipment} · <span className={LEVEL_TEXT[e.difficulty]||'text-ink-3'}>{e.difficulty}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center ${
                      added ? 'bg-ok-soft border-ok/30 text-ok' : 'bg-surface-3 border-line text-ink-2'
                    }`}>
                      {added ? <Check size={14}/> : <Plus size={14}/>}
                    </span>
                  </button>
                );
              });
              return rows;
            })()}
          </div>
        </motion.div>
      )}

      <Button
        full
        className="mt-4"
        disabled={saving}
        onClick={async()=>{setSaving(true);await onSave(local);setSaving(false);onBack();}}
      >
        {saving ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
        {saving ? 'Salvando…' : 'Salvar ficha'}
      </Button>
    </PageShell>
  );
}

/* ── Página principal: minhas fichas + fichas prontas ────────── */
export default function TreinoPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [uid, setUid]             = useState<string|null>(null);
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [activeId, setActiveId]   = useState<string|null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [newName, setNewName]     = useState('');
  const [editPlan, setEditPlan]   = useState<Plan|null>(null);
  const [tab, setTab]             = useState<'minhas'|'prontas'>('minhas');
  const [previewId, setPreviewId] = useState<string|null>(null);
  const [renameId, setRenameId]   = useState<string|null>(null);
  const [filtLevel, setFiltLevel] = useState('todos');

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const d = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(d.exists()){
          const p = d.data().payload ? JSON.parse(d.data().payload) : {list:[],activeId:null};
          setPlans(p.list||[]);
          setActiveId(p.activeId||null);
        }
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const savePlans = async (newList:Plan[], newActive:string|null) => {
    if(!uid) return;
    setSaving(true);
    try { await setDoc(doc(db,'users',uid,'data','plans'),{payload:JSON.stringify({list:newList,activeId:newActive}),updatedAt:Date.now()}); }
    catch(e){ console.error(e); show('Erro ao salvar','danger'); }
    setSaving(false);
  };

  const createPlan = async () => {
    const name = newName.trim() || ('Minha Ficha '+(plans.length+1));
    const plan:Plan = {id:'plan_'+Date.now(),name,byDay:emptyByDay()};
    const newList = [...plans,plan];
    const newActive = activeId||plan.id;
    setPlans(newList); setActiveId(newActive); setNewName('');
    await savePlans(newList,newActive);
    setEditPlan(plan);
    show('Ficha criada!');
  };

  const handleSavePlan = async (updated:Plan) => {
    const newList = plans.map(p=>p.id===updated.id?updated:p);
    setPlans(newList);
    await savePlans(newList,activeId);
    show('Ficha salva!');
  };

  const deletePlan = async (id:string) => {
    const newList = plans.filter(p=>p.id!==id);
    const newActive = activeId===id?(newList[0]?.id||null):activeId;
    setPlans(newList); setActiveId(newActive);
    await savePlans(newList,newActive);
    show('Ficha excluída');
  };

  const importPreset = async (preset:Preset) => {
    const plan:Plan = {...JSON.parse(JSON.stringify(preset)),id:'plan_'+Date.now()};
    const newList = [...plans,plan];
    const newActive = activeId||plan.id;
    setPlans(newList); setActiveId(newActive);
    await savePlans(newList,newActive);
    show('Ficha importada!');
    setTab('minhas');
  };

  const totalExsByDay = (pl:Plan) => Object.values(pl.byDay).flat().length;
  const presetsFiltrados = filtLevel==='todos' ? PRESET_PLANS : PRESET_PLANS.filter(p=>p.level===filtLevel);

  if(editPlan) return <Builder plan={editPlan} onSave={handleSavePlan} onBack={()=>setEditPlan(null)}/>;

  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  if(!uid) return (
    <PageShell>
      <PageHeader title="Fichas de Treino"/>
      <EmptyState
        icon={<LogIn size={36}/>}
        title="Entre para montar suas fichas"
        subtitle="Faça login para criar, editar e salvar suas fichas de treino."
        action={<Button onClick={()=>router.push('/login')}>Entrar</Button>}
      />
    </PageShell>
  );

  return (
    <PageShell>
      <ToastViewport toast={toast}/>

      <PageHeader
        title="Fichas de Treino"
        subtitle={`${plans.length} ficha(s)${saving?' · salvando…':''}`}
        right={<Dumbbell size={22} className="text-accent"/>}
      />

      {/* Nova ficha */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card p-4 mb-4">
        <div className="eyebrow mb-2">Nova ficha</div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&createPlan()}
            placeholder="Nome da ficha…"
            className="field flex-1 min-w-0"
          />
          <Button size="md" className="shrink-0" disabled={saving} onClick={createPlan}>
            <Plus size={16}/> Criar
          </Button>
        </div>
      </motion.div>

      <Segmented<'minhas'|'prontas'>
        value={tab}
        onChange={setTab}
        options={[
          {key:'minhas', label:'Minhas fichas'},
          {key:'prontas', label:'Fichas prontas'},
        ]}
      />

      {tab==='minhas' && (
        plans.length===0 ? (
          <EmptyState
            icon={<ClipboardList size={36}/>}
            title="Sem fichas ainda"
            subtitle="Crie uma ficha do zero ou importe uma pronta para começar."
            action={<Button variant="soft" onClick={()=>setTab('prontas')}>Ver fichas prontas</Button>}
          />
        ) : (
          <div className="grid gap-2.5">
            {plans.map((pl,idx)=>{
              const isActive = activeId===pl.id;
              return (
                <motion.div
                  key={pl.id}
                  initial={{opacity:0,y:10}}
                  animate={{opacity:1,y:0}}
                  transition={{delay:Math.min(idx*0.04,0.4)}}
                  className={`card p-4 border-l-2 ${isActive?'border-l-accent':'border-l-transparent'}`}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <button
                      onClick={async()=>{const nA=isActive?null:pl.id;setActiveId(nA);await savePlans(plans,nA);}}
                      className={`shrink-0 ${isActive?'text-accent':'text-ink-3'}`}
                      aria-label={isActive?'Desativar ficha':'Ativar ficha'}
                    >
                      <Star size={20} fill={isActive?'currentColor':'none'}/>
                    </button>
                    {renameId===pl.id ? (
                      <input
                        autoFocus
                        value={pl.name}
                        onChange={e=>setPlans(prev=>prev.map(p=>p.id===pl.id?{...p,name:e.target.value}:p))}
                        onBlur={async()=>{setRenameId(null);await savePlans(plans,activeId);}}
                        onKeyDown={e=>{if(e.key==='Enter'){setRenameId(null);savePlans(plans,activeId);}}}
                        className="field flex-1 h-10 border-accent/40"
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-display font-bold text-[1.05rem] text-ink-1 truncate">{pl.name}</span>
                          {isActive && (
                            <span className="shrink-0 text-[0.55rem] font-bold uppercase tracking-wide text-accent bg-accent-soft border border-accent/30 rounded px-1.5 py-px">
                              Ativa
                            </span>
                          )}
                        </div>
                        <div className="text-[0.68rem] text-ink-3 mt-0.5">{totalExsByDay(pl)} exercício(s)</div>
                      </div>
                    )}
                  </div>

                  {/* Contadores por dia */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {DAYS.map(d=>{
                      const n = pl.byDay?.[d]?.length||0;
                      return (
                        <span
                          key={d}
                          className={`text-[0.65rem] font-semibold rounded-md border px-2 py-0.5 tnum ${
                            n>0 ? 'bg-accent-soft border-accent/30 text-accent' : 'bg-surface-2 border-line text-ink-3 opacity-60'
                          }`}
                        >
                          {d.slice(0,3)}{n>0?` ${n}`:''}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" onClick={()=>setEditPlan(pl)}>
                      <Pencil size={13}/> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={()=>setRenameId(renameId===pl.id?null:pl.id)}>
                      Renomear
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={async()=>{const cl={...JSON.parse(JSON.stringify(pl)),id:'plan_'+Date.now(),name:pl.name+' (cópia)'};const nl=[...plans,cl];setPlans(nl);await savePlans(nl,activeId);show('Duplicada!');}}
                    >
                      <Copy size={13}/> Duplicar
                    </Button>
                    <Button size="sm" variant="danger" onClick={()=>deletePlan(pl.id)} aria-label="Excluir ficha">
                      <Trash2 size={13}/>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {tab==='prontas' && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
          {/* Filtro por nível */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
            {['todos','iniciante','intermediário','avançado'].map(l=>(
              <button
                key={l}
                onClick={()=>setFiltLevel(l)}
                className={`chip shrink-0 capitalize ${filtLevel===l?'chip-active':''}`}
              >
                {l==='todos'?'Todos':l}
              </button>
            ))}
          </div>
          <div className="eyebrow mb-2.5">{presetsFiltrados.length} ficha(s)</div>

          <div className="grid gap-2.5">
            {presetsFiltrados.map((preset,idx)=>(
              <motion.div
                key={preset.id}
                initial={{opacity:0,y:10}}
                animate={{opacity:1,y:0}}
                transition={{delay:Math.min(idx*0.04,0.4)}}
                className="card p-4"
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-[1rem] text-ink-1 leading-tight">{preset.name}</div>
                    <div className="text-[0.74rem] text-ink-2 mt-1 leading-snug">{preset.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[0.6rem] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 ${LEVEL_BADGE[preset.level]||'bg-surface-2 border-line text-ink-2'}`}>
                      {preset.level}
                    </span>
                    <span className="text-[0.68rem] text-ink-2 font-semibold tnum">{preset.days} dias/sem</span>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap mb-3">
                  {DAYS.filter(d=>preset.byDay[d]?.length>0).map(d=>(
                    <span key={d} className="text-[0.62rem] font-semibold rounded-md bg-accent-soft border border-accent/20 text-accent px-1.5 py-0.5 tnum">
                      {d.slice(0,3)} {preset.byDay[d].length}ex
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={()=>setPreviewId(previewId===preset.id?null:preset.id)}>
                    {previewId===preset.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    {previewId===preset.id ? 'Fechar' : 'Ver exercícios'}
                  </Button>
                  <Button size="sm" className="flex-1" onClick={()=>importPreset(preset)}>
                    <Plus size={14}/> Usar ficha
                  </Button>
                </div>

                {previewId===preset.id && (
                  <motion.div
                    initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                    className="mt-3 pt-3 border-t border-line grid gap-2.5"
                  >
                    {DAYS.filter(d=>preset.byDay[d]?.length>0).map(d=>(
                      <div key={d}>
                        <div className="eyebrow text-accent mb-1.5">{d}</div>
                        {preset.byDay[d].map((it,i)=>(
                          <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-line/50 last:border-b-0">
                            <ExerciseGif name={it.name} size={36}/>
                            <span className="flex-1 text-[0.82rem] text-ink-1 truncate">{it.name}</span>
                            <span className="shrink-0 text-[0.7rem] text-ink-2 font-semibold tnum">{it.setsPlanned}x {it.repsTarget}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </PageShell>
  );
}
