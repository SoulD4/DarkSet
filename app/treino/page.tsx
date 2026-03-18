'use client';
import { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGifUrls } from '@/lib/exerciseGifs';

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

const NIVEL_COR:Record<string,string> = {
  'iniciante':'#22c55e',
  'intermediário':'#facc15',
  'avançado':'#e31b23',
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

function ExerciseGif({name, size=80}:{name:string;size?:number}) {
  const urls = getGifUrls(name);
  const [frame, setFrame] = useState(0);
  const [img1Ok, setImg1Ok] = useState(true);

  useEffect(()=>{
    setFrame(0); setImg1Ok(true);
    if(!urls) return;
    const t = setInterval(()=>setFrame(f=>f===0?1:0), 900);
    return ()=>clearInterval(t);
  },[name]);

  if(!urls) return (
    <div style={{width:size,height:size,borderRadius:8,flexShrink:0,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size>60?'1.5rem':'1rem'}}>🏋️</div>
  );

  const src = frame===0 ? urls.url0 : (img1Ok ? urls.url1 : urls.url0);
  return (
    <img
      src={src}
      alt={name}
      onError={()=>{ if(frame===1) setImg1Ok(false); }}
      style={{width:size,height:size,borderRadius:8,objectFit:'cover',border:'1px solid #2e2e38',flexShrink:0}}
    />
  );
}

function Builder({plan,onSave,onBack}:{plan:Plan;onSave:(p:Plan)=>Promise<void>;onBack:()=>void}) {
  const [local, setLocal]   = useState<Plan>(JSON.parse(JSON.stringify(plan)));
  const [day, setDay]       = useState(DAYS[0]);
  const [tab, setTab]       = useState<'ficha'|'buscar'>('ficha');
  const [busca, setBusca]   = useState('');
  const [filtMuscle, setFiltMuscle] = useState('');
  const [filtEquip, setFiltEquip]   = useState('');
  const [saving, setSaving] = useState(false);
  const [showGif, setShowGif] = useState<string|null>(null);

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
  const move = (i:number,dir:number) => setLocal(prev=>{const c=JSON.parse(JSON.stringify(prev));const arr=c.byDay[day];const j=i+dir;if(j<0||j>=arr.length)return prev;[arr[i],arr[j]]=[arr[j],arr[i]];return c;});

  return (
    <PageShell>
      {showGif && (
        <div onClick={()=>setShowGif(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1rem'}}>
          <ExerciseGif name={showGif} size={200}/>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2'}}>{showGif}</div>
          <div style={{fontSize:'.75rem',color:'#7a7a8a'}}>Toque para fechar</div>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',animation:'fadeUp .3s ease'}}>
        <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
          <button onClick={onBack} style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .8rem',color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,cursor:'pointer'}}>← Voltar</button>
          <div>
            <div style={{fontSize:'.58rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em'}}>Editando</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{local.name}</div>
          </div>
        </div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:'#e31b23',lineHeight:1}}>
          {totalEx}<span style={{fontSize:'.75rem',color:'#484858'}}>ex</span>
        </div>
      </div>

      <div style={{display:'flex',gap:'.35rem',overflowX:'auto',marginBottom:'.75rem',paddingTop:'10px',paddingBottom:'.35rem',scrollbarWidth:'none',msOverflowStyle:'none'}}>
        {DAYS.map(dy=>{
          const count = local.byDay[dy]?.length||0;
          const active = day===dy;
          return (
            <button key={dy} onClick={()=>setDay(dy)} style={{flexShrink:0,minWidth:46,padding:'.45rem .6rem',borderRadius:'10px',cursor:'pointer',background:active?'#e31b23':'rgba(255,255,255,.04)',border:'1px solid '+(active?'#e31b23':'#2e2e38'),color:active?'#fff':'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',letterSpacing:'.04em',position:'relative',transition:'all .15s'}}>
              {dy.slice(0,3)}
              {count>0 && (
                <span style={{position:'absolute',top:-8,right:-6,background:active?'#fff':'#e31b23',color:active?'#e31b23':'#fff',borderRadius:'50%',width:18,height:18,fontSize:'.52rem',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,zIndex:1,boxShadow:'0 0 0 2px #0f0f13'}}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'3px',gap:'3px',marginBottom:'.75rem'}}>
        <button onClick={()=>setTab('ficha')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.8rem',textTransform:'uppercase',background:tab==='ficha'?'rgba(227,27,35,.15)':'transparent',color:tab==='ficha'?'#e31b23':'#7a7a8a',boxShadow:tab==='ficha'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',transition:'all .15s'}}>
          Ficha {day.slice(0,3)} ({dayItems.length})
        </button>
        <button onClick={()=>setTab('buscar')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.8rem',textTransform:'uppercase',background:tab==='buscar'?'rgba(227,27,35,.15)':'transparent',color:tab==='buscar'?'#e31b23':'#7a7a8a',boxShadow:tab==='buscar'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',transition:'all .15s'}}>
          + Adicionar
        </button>
      </div>

      {tab==='ficha' && (
        <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'14px',overflow:'hidden',animation:'fadeUp .25s ease'}}>
          {dayItems.length===0 ? (
            <div style={{textAlign:'center',padding:'2.5rem 1rem'}}>
              <div style={{fontSize:'2.5rem',marginBottom:'.5rem'}}>🏋️</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#484858',marginBottom:'.4rem'}}>Vazio</div>
              <div style={{fontSize:'.82rem',color:'#484858',marginBottom:'1rem'}}>Nenhum exercício para {day}</div>
              <button onClick={()=>setTab('buscar')} style={{background:'#e31b23',border:'none',borderRadius:'10px',padding:'.65rem 1.5rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.88rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.3)'}}>+ Adicionar Exercício</button>
            </div>
          ) : (
            <div style={{padding:'.65rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 3rem 3.2rem 2.2rem 1.8rem',gap:'.4rem',padding:'.2rem .3rem .4rem',marginBottom:'.1rem'}}>
                {['#','EXERCÍCIO','SÉR','REPS','',''].map((h,i)=>(
                  <div key={i} style={{fontSize:'.5rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em'}}>{h}</div>
                ))}
              </div>
              {dayItems.map((it,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 3rem 3.2rem 2.2rem 1.8rem',gap:'.4rem',alignItems:'center',background:'rgba(0,0,0,.25)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'.5rem .4rem',marginBottom:'.35rem',animation:'fadeUp .2s ease'}}>
                  <button onClick={()=>setShowGif(it.name)} style={{background:'none',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',color:'#484858',textAlign:'center',padding:0,lineHeight:1}} title="Ver GIF">
                    {i+1}
                  </button>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:'.82rem',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</div>
                    <div style={{fontSize:'.58rem',color:'#484858',marginTop:'1px'}}>{EXS.find(e=>e.id===it.exId)?.primary} · {EXS.find(e=>e.id===it.exId)?.equipment}</div>
                  </div>
                  <input type="number" min="1" max="10" value={it.setsPlanned} onChange={e=>updateSets(i,e.target.value)} style={{width:'100%',textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'6px',padding:'.3rem .2rem',fontSize:'.82rem',color:'#fff',outline:'none'}}/>
                  <input type="text" maxLength={6} value={it.repsTarget} placeholder="reps" onChange={e=>updateReps(i,e.target.value)} style={{width:'100%',textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'6px',padding:'.3rem .2rem',color:'#fff',fontSize:'.82rem',outline:'none'}}/>
                  <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                    <button onClick={()=>move(i,-1)} disabled={i===0} style={{background:'none',border:'1px solid #2e2e38',borderRadius:'4px',color:i===0?'#2e2e38':'#7a7a8a',padding:'2px 5px',cursor:i===0?'default':'pointer',fontSize:'.7rem',lineHeight:1}}>↑</button>
                    <button onClick={()=>move(i,1)} disabled={i===dayItems.length-1} style={{background:'none',border:'1px solid #2e2e38',borderRadius:'4px',color:i===dayItems.length-1?'#2e2e38':'#7a7a8a',padding:'2px 5px',cursor:i===dayItems.length-1?'default':'pointer',fontSize:'.7rem',lineHeight:1}}>↓</button>
                  </div>
                  <button onClick={()=>removeItem(i)} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'6px',color:'#e31b23',padding:'.35rem .3rem',cursor:'pointer',fontSize:'.75rem',fontWeight:700,lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='buscar' && (
        <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'14px',overflow:'hidden',animation:'fadeUp .25s ease'}}>
          <div style={{padding:'.75rem .75rem .4rem'}}>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar exercício…" style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',color:'#f0f0f2',padding:'10px 13px',fontSize:'.9rem',outline:'none',marginBottom:'.5rem'}}/>
            <div style={{display:'flex',gap:'.4rem',marginBottom:'.5rem'}}>
              <select value={filtMuscle} onChange={e=>setFiltMuscle(e.target.value)} style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .6rem',fontSize:'.78rem',color:filtMuscle?'#f0f0f2':'#7a7a8a',cursor:'pointer',outline:'none'}}>
                <option value="">Músculo</option>
                {MUSCLES.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filtEquip} onChange={e=>setFiltEquip(e.target.value)} style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .6rem',fontSize:'.78rem',color:filtEquip?'#f0f0f2':'#7a7a8a',cursor:'pointer',outline:'none'}}>
                <option value="">Equipamento</option>
                {EQUIPS.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
              {(busca||filtMuscle||filtEquip) && (
                <button onClick={()=>{setBusca('');setFiltMuscle('');setFiltEquip('');}} style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'8px',padding:'.4rem .6rem',color:'#e31b23',fontSize:'.75rem',fontWeight:700,cursor:'pointer',flexShrink:0}}>✕</button>
              )}
            </div>
            <div style={{fontSize:'.6rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em',paddingBottom:'.4rem'}}>{exsFiltrados.length} exercício(s)</div>
          </div>
          <div style={{maxHeight:460,overflowY:'auto',padding:'0 .75rem .75rem'}}>
            {(()=>{
              const rows:React.ReactNode[] = [];
              let lastGroup = '';
              exsFiltrados.forEach((e,idx)=>{
                if(e.primary!==lastGroup){
                  lastGroup=e.primary;
                  rows.push(
                    <div key={'g_'+e.primary} style={{fontSize:'.62rem',fontWeight:800,color:'#e31b23',textTransform:'uppercase',letterSpacing:'.1em',padding:'.5rem .3rem .2rem',borderBottom:'1px solid rgba(227,27,35,.15)',marginTop:idx?'.35rem':0}}>
                      {e.primary}
                    </div>
                  );
                }
                const added = dayItems.some(it=>it.exId===e.id);
                rows.push(
                  <button key={e.id} onClick={()=>!added&&addEx(e)} style={{width:'100%',display:'flex',alignItems:'center',gap:'.65rem',background:added?'rgba(34,197,94,.06)':'rgba(255,255,255,.02)',border:'1px solid '+(added?'rgba(34,197,94,.2)':'#2e2e38'),borderRadius:'10px',padding:'.5rem .65rem',textAlign:'left',cursor:added?'default':'pointer',marginBottom:'.3rem',transition:'all .15s'}}>
                    <ExerciseGif name={e.name} size={56}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'.85rem',fontWeight:600,color:added?'#4ade80':'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</div>
                      <div style={{fontSize:'.6rem',color:'#484858',marginTop:'2px'}}>{e.equipment} · <span style={{color:NIVEL_COR[e.difficulty]||'#484858'}}>{e.difficulty}</span></div>
                    </div>
                    <span style={{flexShrink:0,width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:added?'rgba(34,197,94,.15)':'rgba(255,255,255,.06)',border:'1px solid '+(added?'rgba(34,197,94,.3)':'#2e2e38'),fontSize:'.85rem',color:added?'#4ade80':'#7a7a8a',fontWeight:700}}>
                      {added?'✓':'+'}
                    </span>
                  </button>
                );
              });
              return rows;
            })()}
          </div>
        </div>
      )}

      <button onClick={async()=>{setSaving(true);await onSave(local);setSaving(false);onBack();}} disabled={saving} style={{width:'100%',marginTop:'.85rem',background:saving?'rgba(227,27,35,.4)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'14px',padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:saving?'not-allowed':'pointer',boxShadow:saving?'none':'0 4px 20px rgba(227,27,35,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',transition:'all .2s'}}>
        {saving && <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spinCw .6s linear infinite'}}/>}
        Salvar Ficha ✓
      </button>
    </PageShell>
  );
}

export default function TreinoPage() {
  const [uid, setUid]           = useState<string|null>(null);
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [activeId, setActiveId] = useState<string|null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [newName, setNewName]   = useState('');
  const [editPlan, setEditPlan] = useState<Plan|null>(null);
  const [tab, setTab]           = useState<'minhas'|'prontas'>('minhas');
  const [previewId, setPreviewId] = useState<string|null>(null);
  const [renameId, setRenameId] = useState<string|null>(null);
  const [toast, setToast]       = useState('');
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

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  const savePlans = async (newList:Plan[], newActive:string|null) => {
    if(!uid) return;
    setSaving(true);
    try { await setDoc(doc(db,'users',uid,'data','plans'),{payload:JSON.stringify({list:newList,activeId:newActive}),updatedAt:Date.now()}); }
    catch(e){ console.error(e); }
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
    showToast('Ficha criada!');
  };

  const handleSavePlan = async (updated:Plan) => {
    const newList = plans.map(p=>p.id===updated.id?updated:p);
    setPlans(newList);
    await savePlans(newList,activeId);
    showToast('Ficha salva! ✓');
  };

  const deletePlan = async (id:string) => {
    const newList = plans.filter(p=>p.id!==id);
    const newActive = activeId===id?(newList[0]?.id||null):activeId;
    setPlans(newList); setActiveId(newActive);
    await savePlans(newList,newActive);
    showToast('Ficha excluída');
  };

  const importPreset = async (preset:Preset) => {
    const plan:Plan = {...JSON.parse(JSON.stringify(preset)),id:'plan_'+Date.now()};
    const newList = [...plans,plan];
    const newActive = activeId||plan.id;
    setPlans(newList); setActiveId(newActive);
    await savePlans(newList,newActive);
    showToast('Ficha importada!');
    setTab('minhas');
  };

  const totalExsByDay = (pl:Plan) => Object.values(pl.byDay).flat().length;
  const presetsFiltrados = filtLevel==='todos' ? PRESET_PLANS : PRESET_PLANS.filter(p=>p.level===filtLevel);

  if(editPlan) return <Builder plan={editPlan} onSave={handleSavePlan} onBack={()=>setEditPlan(null)}/>;

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <div style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%',animation:'spinCw .65s linear infinite'}}/>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {toast && (
        <div style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',animation:'fadeUp .2s ease',backdropFilter:'blur(8px)'}}>
          ✓ {toast}
        </div>
      )}

      <div style={{marginBottom:'1.25rem',animation:'fadeUp .3s ease'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>Fichas de Treino</div>
        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px'}}>{plans.length} ficha(s) · {saving?'💾 salvando...':''}</div>
      </div>

      <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'14px',padding:'1rem',marginBottom:'.75rem',animation:'fadeUp .35s ease'}}>
        <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem'}}>Nova ficha</div>
        <div style={{display:'flex',gap:'.5rem',alignItems:'stretch'}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPlan()} placeholder="Nome da ficha…" style={{flex:1,minWidth:0,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'11px 13px',fontSize:'.9rem',color:'#f0f0f2',outline:'none'}}/>
          <button onClick={createPlan} disabled={saving} style={{flexShrink:0,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'11px 18px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.28)',whiteSpace:'nowrap'}}>+ Criar</button>
        </div>
      </div>

      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'3px',gap:'3px',marginBottom:'.75rem',animation:'fadeUp .4s ease'}}>
        <button onClick={()=>setTab('minhas')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',background:tab==='minhas'?'rgba(227,27,35,.15)':'transparent',color:tab==='minhas'?'#e31b23':'#7a7a8a',boxShadow:tab==='minhas'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',transition:'all .15s'}}>Minhas Fichas</button>
        <button onClick={()=>setTab('prontas')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',background:tab==='prontas'?'rgba(227,27,35,.15)':'transparent',color:tab==='prontas'?'#e31b23':'#7a7a8a',boxShadow:tab==='prontas'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',transition:'all .15s'}}>Fichas Prontas</button>
      </div>

      {tab==='minhas' && (
        plans.length===0 ? (
          <div style={{textAlign:'center',padding:'3rem 1rem',border:'1px dashed #2e2e38',borderRadius:'12px',animation:'fadeUp .4s ease'}}>
            <div style={{fontSize:'3rem',marginBottom:'.75rem'}}>📋</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.4rem'}}>Sem fichas ainda</div>
            <div style={{fontSize:'.82rem',color:'#7a7a8a',marginBottom:'1rem'}}>Crie uma ficha ou importe uma pronta</div>
            <button onClick={()=>setTab('prontas')} style={{background:'#e31b23',border:'none',borderRadius:'10px',padding:'.65rem 1.5rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.88rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.3)'}}>Ver fichas prontas</button>
          </div>
        ) : (
          <div style={{display:'grid',gap:'.65rem'}}>
            {plans.map((pl,idx)=>{
              const isActive = activeId===pl.id;
              return (
                <div key={pl.id} style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'14px',padding:'1rem',borderLeft:'2px solid '+(isActive?'#e31b23':'transparent'),animation:`fadeUp ${.3+idx*.05}s ease`,transition:'border-color .2s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'.6rem'}}>
                    <button onClick={async()=>{const nA=isActive?null:pl.id;setActiveId(nA);await savePlans(plans,nA);}} style={{width:22,height:22,borderRadius:'50%',flexShrink:0,cursor:'pointer',background:isActive?'#e31b23':'transparent',border:'2px solid '+(isActive?'#e31b23':'#484858'),display:'flex',alignItems:'center',justifyContent:'center',boxShadow:isActive?'0 0 10px rgba(227,27,35,.5)':'none',transition:'all .2s'}}>
                      {isActive && <div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                    </button>
                    {renameId===pl.id ? (
                      <input autoFocus value={pl.name} onChange={e=>setPlans(prev=>prev.map(p=>p.id===pl.id?{...p,name:e.target.value}:p))} onBlur={async()=>{setRenameId(null);await savePlans(plans,activeId);}} onKeyDown={e=>{if(e.key==='Enter'){setRenameId(null);savePlans(plans,activeId);}}} style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #e31b23',borderRadius:'8px',padding:'.4rem .7rem',fontSize:'.95rem',color:'#f0f0f2',fontWeight:600,outline:'none'}}/>
                    ) : (
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {pl.name}
                          {isActive && <span style={{marginLeft:'.5rem',fontSize:'.55rem',color:'#e31b23',fontWeight:700,letterSpacing:'.06em',verticalAlign:'middle',background:'rgba(227,27,35,.1)',borderRadius:'4px',padding:'1px 5px'}}>ATIVA</span>}
                        </div>
                        <div style={{fontSize:'.65rem',color:'#484858',marginTop:'1px'}}>{totalExsByDay(pl)} exercício(s)</div>
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.75rem'}}>
                    {DAYS.map(d=>{
                      const n = pl.byDay?.[d]?.length||0;
                      return n>0 ? (
                        <span key={d} style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'6px',padding:'2px 8px',fontSize:'.65rem',color:'#e31b23',fontWeight:700}}>{d.slice(0,3)} {n}</span>
                      ) : (
                        <span key={d} style={{background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:'6px',padding:'2px 8px',fontSize:'.65rem',color:'#2e2e38'}}>{d.slice(0,3)}</span>
                      );
                    })}
                  </div>
                  <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap'}}>
                    <button onClick={()=>setEditPlan(pl)} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'8px',padding:'.42rem .9rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.78rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 2px 10px rgba(227,27,35,.25)'}}>Editar</button>
                    <button onClick={()=>setRenameId(renameId===pl.id?null:pl.id)} style={{background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.42rem .75rem',color:'#7a7a8a',fontSize:'.75rem',fontWeight:600,cursor:'pointer'}}>Renomear</button>
                    <button onClick={async()=>{const cl={...JSON.parse(JSON.stringify(pl)),id:'plan_'+Date.now(),name:pl.name+' (cópia)'};const nl=[...plans,cl];setPlans(nl);await savePlans(nl,activeId);showToast('Duplicada!');}} style={{background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.42rem .75rem',color:'#7a7a8a',fontSize:'.75rem',fontWeight:600,cursor:'pointer'}}>Duplicar</button>
                    <button onClick={()=>deletePlan(pl.id)} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.18)',borderRadius:'8px',padding:'.42rem .65rem',color:'#e31b23',fontSize:'.78rem',fontWeight:700,cursor:'pointer'}}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab==='prontas' && (
        <div style={{animation:'fadeUp .3s ease'}}>
          <div style={{display:'flex',gap:'.4rem',marginBottom:'.75rem',overflowX:'auto',paddingBottom:'.25rem'}}>
            {['todos','iniciante','intermediário','avançado'].map(l=>(
              <button key={l} onClick={()=>setFiltLevel(l)} style={{flexShrink:0,padding:'.35rem .85rem',borderRadius:'999px',cursor:'pointer',background:filtLevel===l?NIVEL_COR[l]||'#e31b23':'rgba(255,255,255,.04)',border:'1px solid '+(filtLevel===l?NIVEL_COR[l]||'#e31b23':'#2e2e38'),color:filtLevel===l?'#fff':(NIVEL_COR[l]||'#7a7a8a'),fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',textTransform:'capitalize',transition:'all .15s'}}>
                {l==='todos'?'Todos':l}
              </button>
            ))}
          </div>
          <div style={{fontSize:'.62rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>{presetsFiltrados.length} ficha(s)</div>
          <div style={{display:'grid',gap:'.65rem'}}>
            {presetsFiltrados.map((preset,idx)=>(
              <div key={preset.id} style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'14px',padding:'1rem',animation:`fadeUp ${.3+idx*.05}s ease`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.5rem'}}>
                  <div style={{flex:1,minWidth:0,marginRight:'.75rem'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.05rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{preset.name}</div>
                    <div style={{fontSize:'.72rem',color:'#7a7a8a',marginTop:'.3rem',lineHeight:1.4}}>{preset.description}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.3rem',flexShrink:0}}>
                    <span style={{background:(NIVEL_COR[preset.level]||'#7a7a8a')+'22',border:'1px solid '+(NIVEL_COR[preset.level]||'#7a7a8a')+'44',borderRadius:'5px',padding:'.2rem .55rem',fontSize:'.6rem',fontWeight:700,color:NIVEL_COR[preset.level]||'#7a7a8a',textTransform:'uppercase',letterSpacing:'.05em'}}>{preset.level}</span>
                    <span style={{fontSize:'.65rem',color:'#7a7a8a',fontWeight:600}}>{preset.days} dias/sem</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.75rem'}}>
                  {DAYS.filter(d=>preset.byDay[d]?.length>0).map(d=>(
                    <span key={d} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'5px',padding:'2px 7px',fontSize:'.62rem',color:'#e31b23',fontWeight:700}}>{d.slice(0,3)} {preset.byDay[d].length}ex</span>
                  ))}
                </div>
                <div style={{display:'flex',gap:'.5rem'}}>
                  <button onClick={()=>setPreviewId(previewId===preset.id?null:preset.id)} style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.5rem',color:'#7a7a8a',fontSize:'.78rem',fontWeight:700,cursor:'pointer',transition:'all .15s'}}>
                    {previewId===preset.id?'▲ Fechar':'▼ Ver exercícios'}
                  </button>
                  <button onClick={()=>importPreset(preset)} style={{flex:1,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'8px',padding:'.5rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.82rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 2px 10px rgba(227,27,35,.25)'}}>+ Usar ficha</button>
                </div>
                {previewId===preset.id && (
                  <div style={{marginTop:'.75rem',borderTop:'1px solid #2e2e38',paddingTop:'.75rem',display:'grid',gap:'.4rem',animation:'fadeUp .2s ease'}}>
                    {DAYS.filter(d=>preset.byDay[d]?.length>0).map(d=>(
                      <div key={d}>
                        <div style={{fontSize:'.62rem',color:'#e31b23',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.25rem'}}>{d}</div>
                        {preset.byDay[d].map((it,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.22rem 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                            <span style={{fontSize:'.8rem',color:'#f0f0f2'}}>{it.name}</span>
                            <span style={{fontSize:'.7rem',color:'#7a7a8a',fontWeight:600}}>{it.setsPlanned}x {it.repsTarget}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
      `}</style>
    </PageShell>
  );
}
