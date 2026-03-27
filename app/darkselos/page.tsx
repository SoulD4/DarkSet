'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Lock, ChevronRight, Flame, Zap } from 'lucide-react';
import {
  SealCheck, Lightning, Medal, Crown
} from '@phosphor-icons/react';

// ── Tipos ─────────────────────────────────────────────────────
type HistEntry = { entries:{name?:string;sets:{w:string;r:string}[]}[]; startTime?:string };
type Raridade  = 'comum'|'raro'|'epico'|'lendario';
type Selo = {
  id:string; cat:string; title:string; desc:string;
  raridade:Raridade; check:(h:Record<string,HistEntry>,extra:Extra)=>boolean;
};
type Extra = {
  streak:number; totalTreinos:number; volTotal:number;
  prCount:number; uniqueEx:number; cardioCount:number;
  zenCount:number; dietDias:number; dietStreak:number;
  earlyCount:number; planTier:string; squadWins:number;
  runCount:number; bikeCount:number;
};

// ── Cores por raridade ─────────────────────────────────────────
const RCOR:Record<Raridade,string> = {
  comum:'#9898a8', raro:'#60a5fa', epico:'#a78bfa', lendario:'#facc15'
};
const RBG:Record<Raridade,string> = {
  comum:'rgba(152,152,168,.1)', raro:'rgba(96,165,250,.12)',
  epico:'rgba(167,139,250,.14)', lendario:'rgba(250,204,21,.14)'
};
const RBORDER:Record<Raridade,string> = {
  comum:'rgba(152,152,168,.2)', raro:'rgba(96,165,250,.25)',
  epico:'rgba(167,139,250,.3)', lendario:'rgba(250,204,21,.3)'
};

// ── Ícone por raridade ─────────────────────────────────────────
function RaridadeIcon({r,size=14}:{r:Raridade;size?:number}) {
  const cor = RCOR[r];
  if(r==='lendario') return <Crown size={size} color={cor} weight="fill"/>;
  if(r==='epico')    return <Lightning size={size} color={cor} weight="fill"/>;
  if(r==='raro')     return <Medal size={size} color={cor} weight="fill"/>;
  return <SealCheck size={size} color={cor} weight="fill"/>;
}

// ── Helpers de cálculo ─────────────────────────────────────────
function calcStreak(h:Record<string,HistEntry>, trainDays:number[]): number {
  let s=0; const today=new Date();
  const todayKey=today.toISOString().slice(0,10);
  const d=new Date(today);
  if(trainDays.includes(today.getDay())&&!h[todayKey]) d.setDate(d.getDate()-1);
  for(let i=0;i<800;i++){
    const k=d.toISOString().slice(0,10);
    const isTrain=trainDays.includes(d.getDay());
    if(!isTrain){d.setDate(d.getDate()-1);continue;}
    if(h[k]){s++;d.setDate(d.getDate()-1);}else break;
  }
  return s;
}
function calcVol(h:Record<string,HistEntry>): number {
  const n=(v:any)=>{const x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:0;};
  return Object.values(h).reduce((a,obj)=>
    a+(obj.entries||[]).reduce((b,en)=>b+(en.sets||[]).reduce((c,s)=>c+n(s.w)*n(s.r),0),0),0);
}
function calcPRs(h:Record<string,HistEntry>): number {
  const best:Record<string,number>={};
  const n=(v:any)=>{const x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:0;};
  let prs=0;
  Object.entries(h).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([,obj])=>{
    (obj.entries||[]).forEach(en=>{
      (en.sets||[]).forEach(s=>{
        const w=n(s.w),r=n(s.r);if(!w||!r)return;
        const est=w*(1+r/30);
        if(!best[en.name||'']||est>best[en.name||'']+0.01){best[en.name||'']=est;prs++;}
      });
    });
  });
  return prs;
}
function countUniqueEx(h:Record<string,HistEntry>): number {
  const ex=new Set<string>();
  Object.values(h).forEach(obj=>(obj.entries||[]).forEach(en=>en.name&&ex.add(en.name)));
  return ex.size;
}
function countEarly(h:Record<string,HistEntry>): number {
  return Object.values(h).filter(obj=>{
    const d=new Date(obj.startTime||'');return !isNaN(d.getTime())&&d.getHours()<7;
  }).length;
}
function hasPerfectWeek(h:Record<string,HistEntry>, trainDays:number[]): boolean {
  for(let w=0;w<12;w++){
    const d=new Date();d.setDate(d.getDate()-d.getDay()-w*7+1);
    let perfect=true;
    for(let i=0;i<7;i++){
      const dd=new Date(d);dd.setDate(d.getDate()+i);
      if(!trainDays.includes(dd.getDay()))continue;
      if(!h[dd.toISOString().slice(0,10)]){perfect=false;break;}
    }
    if(perfect&&trainDays.some(td=>{const dd=new Date(d);dd.setDate(d.getDate()+td);return h[dd.toISOString().slice(0,10)];}))return true;
  }
  return false;
}

// ── Definição dos selos ────────────────────────────────────────
const SELOS: Selo[] = [
  // Assiduidade
  {id:'ferro_1',    cat:'assiduidade', title:'Primeira Gota de Sangue', desc:'Primeiro treino registrado',              raridade:'comum',   check:(_,e)=>e.totalTreinos>=1},
  {id:'ferro_20',   cat:'assiduidade', title:'Iniciado',                desc:'20 treinos completados',                  raridade:'comum',   check:(_,e)=>e.totalTreinos>=20},
  {id:'ferro_50',   cat:'assiduidade', title:'Meio Caminho',            desc:'50 treinos — o começo ficou pra trás',    raridade:'raro',    check:(_,e)=>e.totalTreinos>=50},
  {id:'ferro_150',  cat:'assiduidade', title:'Veterano de Ferro',       desc:'150 treinos — dedicação real',            raridade:'raro',    check:(_,e)=>e.totalTreinos>=150},
  {id:'ferro_365',  cat:'assiduidade', title:'Um Ano de Ferro',         desc:'365 treinos ao longo da vida',            raridade:'epico',   check:(_,e)=>e.totalTreinos>=365},
  {id:'ferro_730',  cat:'assiduidade', title:'O Ferro É Meu Lar',       desc:'730 treinos — isso é estilo de vida',     raridade:'lendario',check:(_,e)=>e.totalTreinos>=730},
  {id:'streak_14',  cat:'assiduidade', title:'Chama Acesa',             desc:'14 dias consecutivos de treino',          raridade:'comum',   check:(_,e)=>e.streak>=14},
  {id:'streak_30',  cat:'assiduidade', title:'Mês Inquebrável',         desc:'30 dias de streak consecutivos',          raridade:'epico',   check:(_,e)=>e.streak>=30},
  {id:'streak_60',  cat:'assiduidade', title:'Fogo Que Não Apaga',      desc:'60 dias de streak — quase impossível',    raridade:'epico',   check:(_,e)=>e.streak>=60},
  {id:'streak_180', cat:'assiduidade', title:'Eterno',                  desc:'180 dias consecutivos. Você é diferente.', raridade:'lendario',check:(_,e)=>e.streak>=180},
  // Volume
  {id:'vol_5t',     cat:'volume',      title:'Primeiros Quilos',        desc:'5 toneladas de volume acumulado',         raridade:'comum',   check:(_,e)=>e.volTotal>=5000},
  {id:'vol_50t',    cat:'volume',      title:'Carregador',              desc:'50 toneladas — você move montanhas',      raridade:'raro',    check:(_,e)=>e.volTotal>=50000},
  {id:'vol_250t',   cat:'volume',      title:'Máquina de Guerra',       desc:'250 toneladas totais',                    raridade:'epico',   check:(_,e)=>e.volTotal>=250000},
  {id:'vol_1000t',  cat:'volume',      title:'Colossus',                desc:'1.000 toneladas. Humano? Duvido.',        raridade:'lendario',check:(_,e)=>e.volTotal>=1000000},
  // Força
  {id:'pr_5',       cat:'forca',       title:'Quebrador',               desc:'5 PRs batidos',                           raridade:'comum',   check:(_,e)=>e.prCount>=5},
  {id:'pr_25',      cat:'forca',       title:'Obliterador',             desc:'25 PRs ao longo da carreira',             raridade:'raro',    check:(_,e)=>e.prCount>=25},
  {id:'pr_100',     cat:'forca',       title:'Lenda do Ferro',          desc:'100 PRs — apenas os melhores chegam aqui',raridade:'epico',   check:(_,e)=>e.prCount>=100},
  {id:'pr_300',     cat:'forca',       title:'Imortal',                 desc:'300 PRs. Você redefiniu seus limites.',   raridade:'lendario',check:(_,e)=>e.prCount>=300},
  {id:'ex_15',      cat:'forca',       title:'Explorador',              desc:'15 exercícios diferentes treinados',      raridade:'comum',   check:(_,e)=>e.uniqueEx>=15},
  {id:'ex_40',      cat:'forca',       title:'Arsenal Completo',        desc:'40 exercícios diferentes',                raridade:'raro',    check:(_,e)=>e.uniqueEx>=40},
  {id:'ex_80',      cat:'forca',       title:'Mestre do Movimento',     desc:'80 exercícios únicos treinados',          raridade:'epico',   check:(_,e)=>e.uniqueEx>=80},
  // Cardio
  {id:'run_first',  cat:'cardio',      title:'Primeira Corrida',        desc:'Primeira sessão de corrida registrada',   raridade:'comum',   check:(_,e)=>e.runCount>=1},
  {id:'run_10',     cat:'cardio',      title:'DarkRunner',              desc:'10 sessões de corrida completadas',       raridade:'comum',   check:(_,e)=>e.runCount>=10},
  {id:'cardio_20',  cat:'cardio',      title:'Pulmão de Aço',           desc:'20 sessões de cardio registradas',        raridade:'raro',    check:(_,e)=>e.cardioCount>=20},
  {id:'cardio_50',  cat:'cardio',      title:'Cardio Intenso',          desc:'50 sessões de cardio no total',           raridade:'epico',   check:(_,e)=>e.cardioCount>=50},
  {id:'bike_first', cat:'cardio',      title:'DarkBiker',               desc:'Primeira sessão de ciclismo registrada',  raridade:'comum',   check:(_,e)=>e.bikeCount>=1},
  // Squad
  {id:'squad_win_1', cat:'squad',      title:'Conquistador',            desc:'Vença o ranking do squad 1 vez',          raridade:'raro',    check:(_,e)=>e.squadWins>=1},
  {id:'squad_win_6', cat:'squad',      title:'Dominador',               desc:'Vença o ranking do squad 6 vezes',        raridade:'epico',   check:(_,e)=>e.squadWins>=6},
  {id:'squad_win_12',cat:'squad',      title:'Rei do Squad',            desc:'Vença o ranking do squad 12 vezes',       raridade:'lendario',check:(_,e)=>e.squadWins>=12},
  // DarkDiet
  {id:'diet_first',  cat:'darkdiet',   title:'Nutrição Ativada',        desc:'Primeiro registro de dieta no DarkDiet',  raridade:'comum',   check:(_,e)=>e.dietDias>=1},
  {id:'diet_streak', cat:'darkdiet',   title:'Consistência Alimentar',  desc:'7 dias consecutivos com dieta registrada',raridade:'raro',    check:(_,e)=>e.dietStreak>=7},
  {id:'diet_iron',   cat:'darkdiet',   title:'Vontade de Ferro',        desc:'30 dias consecutivos dentro da meta',     raridade:'epico',   check:(_,e)=>e.dietStreak>=30},
  {id:'diet_ascetic',cat:'darkdiet',   title:'Asceta da Fome',          desc:'90 dias de dieta registrada',             raridade:'lendario',check:(_,e)=>e.dietDias>=90},
  // DarkZen
  {id:'zen_first',   cat:'darkzen',    title:'Corpo Preparado',         desc:'Primeira sessão de DarkZen completa',     raridade:'comum',   check:(_,e)=>e.zenCount>=1},
  {id:'zen_10',      cat:'darkzen',    title:'Corpo Flexível',          desc:'10 sessões de DarkZen completadas',       raridade:'raro',    check:(_,e)=>e.zenCount>=10},
  {id:'zen_50',      cat:'darkzen',    title:'Guardião da Mobilidade',  desc:'50 sessões — disciplina absoluta',        raridade:'epico',   check:(_,e)=>e.zenCount>=50},
  {id:'zen_100',     cat:'darkzen',    title:'Lenda da Flexibilidade',  desc:'100 sessões — um entre mil',              raridade:'lendario',check:(_,e)=>e.zenCount>=100},
  // Especial
  {id:'madrugador',  cat:'especial',   title:'Enquanto o Mundo Dorme',  desc:'5 treinos antes das 7h da manhã',         raridade:'epico',   check:(_,e)=>e.earlyCount>=5},
  {id:'semana_full', cat:'especial',   title:'Semana Perfeita',         desc:'Treinou todos os dias programados na semana',raridade:'raro', check:(h,e)=>hasPerfectWeek(h,[1,2,3,4,5,6])},
  {id:'elite_badge', cat:'especial',   title:'DarkSet Elite',           desc:'Assinante Elite ativo',                   raridade:'epico',   check:(_,e)=>['elite','darkgod'].includes(e.planTier)},
  {id:'darkgod_badge',cat:'especial',  title:'DarkGod Founder',         desc:'Fundador do DarkSet — edição limitada',   raridade:'lendario',check:(_,e)=>e.planTier==='darkgod'},
];

const CATS = [
  {id:'todos',      label:'Todos'    },
  {id:'assiduidade',label:'Assiduidade'},
  {id:'volume',     label:'Volume'   },
  {id:'forca',      label:'Força'    },
  {id:'cardio',     label:'Cardio'   },
  {id:'squad',      label:'Squad'    },
  {id:'darkdiet',   label:'DarkDiet' },
  {id:'darkzen',    label:'DarkZen'  },
  {id:'especial',   label:'Especial' },
];

// ── Animação de desbloqueio ────────────────────────────────────
function AnimUnlock({selo, onClose}:{selo:Selo&{desbloqueado:boolean};onClose:()=>void}) {
  const [fase, setFase] = useState(0);
  useEffect(()=>{
    const t1=setTimeout(()=>setFase(1),300);
    const t2=setTimeout(()=>setFase(2),800);
    const t3=setTimeout(()=>setFase(3),1500);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[]);
  const cor = RCOR[selo.raridade];
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(6,6,8,.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}
      onClick={onClose}>
      {/* Partículas */}
      {fase>=2&&Array.from({length:12}).map((_,i)=>(
        <motion.div key={i}
          initial={{opacity:.8,x:0,y:0,scale:1}}
          animate={{opacity:0,x:(Math.random()-.5)*200,y:(Math.random()-.5)*200,scale:0}}
          transition={{duration:1.2,delay:i*.05}}
          style={{position:'absolute',width:Math.random()*8+3,height:Math.random()*8+3,borderRadius:'50%',background:[cor,'#e31b23','#facc15','#fff'][i%4],pointerEvents:'none'}}/>
      ))}
      <motion.div initial={{scale:.5,opacity:0}} animate={{scale:fase>=1?1:.5,opacity:fase>=1?1:0}}
        transition={{type:'spring',stiffness:200,damping:15}}
        style={{textAlign:'center',zIndex:1}}>
        <div style={{width:120,height:120,borderRadius:'50%',background:RBG[selo.raridade],border:`2px solid ${cor}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.5rem',boxShadow:`0 0 40px ${cor}55,0 0 80px ${cor}22`,fontSize:'3.5rem'}}>
          <RaridadeIcon r={selo.raridade} size={48}/>
        </div>
        <motion.div initial={{opacity:0}} animate={{opacity:fase>=2?1:0}} transition={{delay:.3}}
          style={{fontSize:'.7rem',color:cor,textTransform:'uppercase',letterSpacing:'.2em',fontWeight:700,marginBottom:'.5rem'}}>
          Selo Desbloqueado!
        </motion.div>
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:fase>=2?1:0,y:fase>=2?0:10}} transition={{delay:.4}}
          style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2.2rem',textTransform:'uppercase',color:'#fff',lineHeight:1,marginBottom:'.5rem'}}>
          {selo.title}
        </motion.div>
        <motion.div initial={{opacity:0}} animate={{opacity:fase>=3?1:0}} transition={{delay:.6}}
          style={{fontSize:'.88rem',color:'#9898a8',maxWidth:260,lineHeight:1.5,margin:'0 auto 1.5rem'}}>
          {selo.desc}
        </motion.div>
        <motion.div initial={{opacity:0}} animate={{opacity:fase>=3?1:0}} transition={{delay:.8}}
          style={{display:'inline-block',background:RBG[selo.raridade],border:`1px solid ${RBORDER[selo.raridade]}`,borderRadius:999,padding:'.35rem .9rem',fontSize:'.65rem',color:cor,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em'}}>
          {selo.raridade}
        </motion.div>
        <motion.div initial={{opacity:0}} animate={{opacity:fase>=3?1:0}} transition={{delay:1.2}}
          style={{marginTop:'2rem',fontSize:'.75rem',color:'#484858'}}>
          Toque para continuar
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Página ─────────────────────────────────────────────────────
export default function DarkSelosPage() {
  const [uid,       setUid]       = useState<string|null>(null);
  const [loading,   setLoading]   = useState(true);
  const [history,   setHistory]   = useState<Record<string,HistEntry>>({});
  const [trainDays, setTrainDays] = useState<number[]>([1,2,3,4,5,6]);
  const [extra,     setExtra]     = useState<Extra>({
    streak:0,totalTreinos:0,volTotal:0,prCount:0,uniqueEx:0,
    cardioCount:0,zenCount:0,dietDias:0,dietStreak:0,
    earlyCount:0,planTier:'free',squadWins:0,runCount:0,bikeCount:0,
  });
  const [selosFirebase, setSelosFirebase] = useState<Record<string,boolean>>({});
  const [catAtiva,  setCatAtiva]  = useState('todos');
  const [seloAnim,  setSeloAnim]  = useState<(Selo&{desbloqueado:boolean})|null>(null);
  const [featuredId,setFeaturedId]= useState<string|null>(null);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){setLoading(false);return;}
      setUid(u.uid);
      try {
        // User prefs
        const userSnap = await getDoc(doc(db,'users',u.uid));
        const ud = userSnap.exists()?userSnap.data():{} as any;
        setTrainDays(ud.trainDays||[1,2,3,4,5,6]);

        // Histórico
        const histSnap = await getDoc(doc(db,'users',u.uid,'data','history'));
        const hist: Record<string,HistEntry> = histSnap.exists()
          ? JSON.parse(histSnap.data().payload||'{}') : {};
        setHistory(hist);

        // Cardio
        const cardioSnap = await getDoc(doc(db,'users',u.uid,'data','cardio'));
        const cardioData = cardioSnap.exists()
          ? JSON.parse(cardioSnap.data().payload||'[]') : [];
        const cardioCount = Array.isArray(cardioData)?cardioData.length:0;
        const runCount  = cardioData.filter((s:any)=>s.tipo==='corrida'||s.tipo==='Corrida').length;
        const bikeCount = cardioData.filter((s:any)=>s.tipo==='ciclismo'||s.tipo==='Ciclismo').length;

        // DarkZen
        const zenSnap = await getDoc(doc(db,'users',u.uid,'data','darkzen'));
        const zenData = zenSnap.exists()
          ? JSON.parse(zenSnap.data().payload||'[]') : [];
        const zenCount = Array.isArray(zenData)?zenData.length:0;

        // DarkDiet
        const dietSnap = await getDoc(doc(db,'users',u.uid,'data','diet'));
        const dietData = dietSnap.exists()
          ? JSON.parse(dietSnap.data().payload||'{}') : {};
        const dietHist = dietData.historico||[];
        const dietDias = Array.isArray(dietHist)?dietHist.length:0;
        const dietStreak = (() => {
          if(!Array.isArray(dietHist)||dietHist.length===0) return 0;
          const datas = dietHist.map((d:any)=>d.data||d.date).filter(Boolean).sort().reverse();
          let s=0;
          const hoje=new Date();
          for(let i=0;i<365;i++){
            const d=new Date(hoje);d.setDate(d.getDate()-i);
            const k=d.toISOString().slice(0,10);
            if(datas.includes(k))s++;else if(i>0)break;
          }
          return s;
        })();

        // Plan tier
        const planTier = ud.planData?.tier||'free';

        // Squad wins (do doc do squad)
        const userSquadSnap = await getDoc(doc(db,'users',u.uid,'data','squad'));
        const squadWins = userSquadSnap.exists()
          ? (userSquadSnap.data().wins||0) : 0;

        // Calcular extra
        const totalTreinos = Object.keys(hist).length;
        const streak    = calcStreak(hist, ud.trainDays||[1,2,3,4,5,6]);
        const volTotal  = calcVol(hist);
        const prCount   = calcPRs(hist);
        const uniqueEx  = countUniqueEx(hist);
        const earlyCount= countEarly(hist);

        setExtra({
          streak,totalTreinos,volTotal,prCount,uniqueEx,
          cardioCount,zenCount,dietDias,dietStreak,
          earlyCount,planTier,squadWins,runCount,bikeCount,
        });

        // Selos do Firebase
        const selosSnap = await getDoc(doc(db,'users',u.uid,'data','selos'));
        if(selosSnap.exists()) setSelosFirebase(selosSnap.data());

      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  // Calcular selos desbloqueados
  const unlocked = useMemo(()=>{
    const set = new Set<string>();
    SELOS.forEach(s=>{
      try{ if(s.check(history,extra)) set.add(s.id); }catch(_){}
    });
    // Selos manuais do Firebase
    Object.entries(selosFirebase).forEach(([id,on])=>{ if(on) set.add(id); });
    return set;
  },[history,extra,selosFirebase]);

  // Salvar selos desbloqueados no Firebase
  useEffect(()=>{
    if(!uid||unlocked.size===0) return;
    const data: Record<string,boolean> = {};
    unlocked.forEach(id=>{data[id]=true;});
    setDoc(doc(db,'users',uid,'data','selos'),data,{merge:true}).catch(()=>{});
  },[uid,unlocked]);

  const totalSelos  = SELOS.length;
  const totalUnlock = unlocked.size;
  const pct         = Math.round(totalUnlock/totalSelos*100);
  const nivelPct  = proxNivel
    ? Math.round((totalUnlock-nivel.minSelos)/(proxNivel.minSelos-nivel.minSelos)*100)
    : 100;

  const selosFiltrados = SELOS.filter(s=>catAtiva==='todos'||s.cat===catAtiva);

  // ── LOADING ──────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  const NivelIcon = nivel.Icon;

  return (
    <PageShell>
      <AnimatePresence>
        {seloAnim&&<AnimUnlock selo={seloAnim} onClose={()=>setSeloAnim(null)}/>}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{marginBottom:'1.25rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
          DARK<span style={{color:'#e31b23'}}>SELOS</span>
        </div>
        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px',display:'flex',alignItems:'center',gap:'.4rem'}}>
          <Trophy size={11} color="#7a7a8a"/> {totalUnlock}/{totalSelos} selos · {pct}% completo
        </div>
      </motion.div>
      {/* Stats rápidos */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1}}
        style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.4rem',marginBottom:'.75rem'}}>
        {[
          {val:extra.totalTreinos, lbl:'Treinos',  cor:'#e31b23'},
          {val:extra.streak,       lbl:'Streak',   cor:'#f97316'},
          {val:extra.prCount,      lbl:'PRs',      cor:'#a78bfa'},
          {val:extra.cardioCount,  lbl:'Cardio',   cor:'#34d399'},
        ].map((s,i)=>(
          <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:.12+i*.04}}>
            <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:10}}>
              <CardContent style={{padding:'.5rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:s.cor,lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>{s.lbl}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filtros de categoria */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.14}}
        style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'1rem'}}>
        {CATS.map(cat=>(
          <motion.button key={cat.id} whileTap={{scale:.92}} onClick={()=>setCatAtiva(cat.id)}
            style={{padding:'.3rem .65rem',borderRadius:8,border:`1px solid ${catAtiva===cat.id?'#e31b23':'#2e2e38'}`,background:catAtiva===cat.id?'rgba(227,27,35,.15)':'transparent',color:catAtiva===cat.id?'#e31b23':'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.72rem',cursor:'pointer',outline:'none',textTransform:'uppercase' as const}}>
            {cat.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Grid de selos */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'.5rem'}}>
        {selosFiltrados.map((selo,i)=>{
          const done = unlocked.has(selo.id);
          const cor  = RCOR[selo.raridade];
          return (
            <motion.div key={selo.id}
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.03,.3)}}
              whileTap={{scale:.97}}
              onClick={()=>done&&setSeloAnim({...selo,desbloqueado:done})}
              style={{cursor:done?'pointer':'default'}}>
              <Card style={{
                background:done?RBG[selo.raridade]:'rgba(255,255,255,.02)',
                border:`1px solid ${done?RBORDER[selo.raridade]:'#1a1a20'}`,
                borderRadius:14,
                opacity:done?1:.55,
                height:'100%',
              }}>
                <CardContent style={{padding:'.85rem .75rem'}}>
                  {/* Ícone + raridade */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.5rem'}}>
                    <div style={{width:40,height:40,borderRadius:10,background:done?`${cor}22`:'rgba(255,255,255,.04)',border:`1px solid ${done?`${cor}44`:'#2e2e38'}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {done
                        ? <RaridadeIcon r={selo.raridade} size={20}/>
                        : <Lock size={16} color="#484858"/>
                      }
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'.2rem',background:done?RBG[selo.raridade]:'rgba(255,255,255,.04)',border:`1px solid ${done?RBORDER[selo.raridade]:'#2e2e38'}`,borderRadius:6,padding:'2px 6px'}}>
                      <RaridadeIcon r={selo.raridade} size={10}/>
                      <span style={{fontSize:'.52rem',color:done?cor:'#484858',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{selo.raridade}</span>
                    </div>
                  </div>
                  {/* Título */}
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.9rem',color:done?'#f0f0f2':'#484858',textTransform:'uppercase' as const,lineHeight:1.1,marginBottom:'.3rem'}}>
                    {selo.title}
                  </div>
                  {/* Desc */}
                  <div style={{fontSize:'.62rem',color:done?'#9898a8':'#2e2e38',lineHeight:1.4}}>
                    {selo.desc}
                  </div>
                  {/* Badge desbloqueado */}
                  {done&&(
                    <div style={{marginTop:'.5rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                      <SealCheck size={12} color={cor} weight="fill"/>
                      <span style={{fontSize:'.58rem',color:cor,fontWeight:700}}>Desbloqueado</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

    </PageShell>
  );
}
