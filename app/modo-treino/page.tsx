'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, X, Check, Plus, Minus, ChevronLeft, ChevronRight,
  Search, Timer, ClipboardList, Play, Share2, History, CheckCheck, BarChart3,
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import PageHeader from '@/components/core/PageHeader';
import EmptyState from '@/components/core/EmptyState';
import { useToast, ToastViewport } from '@/components/core/Toast';
import ShareWorkoutModal from '@/components/ShareWorkoutModal';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGifUrls } from '@/lib/exerciseGifs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
type SetLog = { w: string; r: string; done: boolean };
type Item   = { exId: string; name: string; setsPlanned: number; repsTarget: string };
type Plan   = { id: string; name: string; byDay: Record<string, Item[]> };
type ShareSession = { planName?: string; day?: string; entries: {name:string;sets:{w:string;r:string}[]}[]; duration?: number };

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const todayDayName = () => DAYS[(new Date().getDay()||7)-1];
const todayKey = () => new Date().toISOString().slice(0,10);
const vibrate = (ms: number|number[] = 40) => { try { navigator.vibrate?.(ms); } catch(_){} };

// ── Web Audio beep ────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch(_){ return null; }
}

function playBeep(type: 'tick'|'done'|'warn') {
  const ctx = getAudioCtx();
  if(!ctx) return;

  // Resume se suspenso (política autoplay)
  const play = () => {
    const configs: Record<string,{freq:number;dur:number;vol:number;delay:number;wave:OscillatorType}[]> = {
      tick: [
        {freq:1200, dur:.1,  vol:1.2, delay:0,   wave:'square'},
      ],
      warn: [
        {freq:900,  dur:.15, vol:1.4, delay:0,   wave:'square'},
        {freq:900,  dur:.15, vol:1.4, delay:.22, wave:'square'},
        {freq:900,  dur:.15, vol:1.4, delay:.44, wave:'square'},
      ],
      done: [
        {freq:600,  dur:.18, vol:1.5, delay:0,   wave:'square'},
        {freq:800,  dur:.18, vol:1.5, delay:.22, wave:'square'},
        {freq:1000, dur:.35, vol:1.6, delay:.44, wave:'square'},
      ],
    };

    configs[type].forEach(({freq,dur,vol,delay,wave})=>{
      const osc      = ctx.createOscillator();
      const gain     = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();

      osc.connect(gain);
      gain.connect(compressor);
      compressor.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = wave;

      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + .01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.start(t);
      osc.stop(t + dur + .05);
    });
  };

  if(ctx.state === 'suspended') {
    ctx.resume().then(play).catch(()=>{});
  } else {
    play();
  }
}

// ── Notificação push ──────────────────────────────────────────────
async function requestNotifPermission() {
  if(typeof Notification === 'undefined') return;
  if(Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function unlockAudio() {
  const ctx = getAudioCtx();
  if(ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{});
}

function sendNotif(title: string, body: string) {
  if(typeof Notification === 'undefined') return;
  if(Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'darkset-timer',
    });
  } catch(_){}
}

const ALL_EXS = [
  'Supino reto barra','Supino reto halteres','Supino inclinado barra','Supino inclinado halteres',
  'Crucifixo reto halteres','Crucifixo Máquina','Crossover polia alta','Flexão de braço',
  'Desenvolvimento barra','Desenvolvimento halteres','Elevação lateral halteres','Face Pull corda',
  'Arnold press halteres','Encolhimento barra','Barra fixa','Pulldown','Puxada alta aberta',
  'Remada curvada barra','Remada serrote halteres','Remada baixa polia','Levantamento terra',
  'Rosca direta barra','Rosca direta halteres','Rosca alternada halteres','Rosca martelo halteres',
  'Rosca concentrada halteres','Rosca Scott máquina','Tríceps pulley corda','Tríceps pulley barra reta',
  'Tríceps francês halteres','Tríceps testa barra W','Paralelas','Mergulho no banco',
  'Agachamento livre','Agachamento hack máquina','Leg press 45','Cadeira extensora',
  'Afundo com halteres','Stiff','Stiff com halteres','Cadeira flexora','Mesa flexora',
  'Hip Thrust barra','Elevação pélvica com barra','Cadeira abdutora',
  'Panturrilha em pé máquina','Panturrilha sentado','Abdominal crunch','Prancha',
];

// ── ExGif ─────────────────────────────────────────────────────────
function ExGif({name, size=64}:{name:string;size?:number}) {
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
    <div
      className="rounded-[10px] bg-surface-2 border border-line flex items-center justify-center shrink-0 text-ink-3"
      style={{width:size,height:size}}>
      <Dumbbell size={size>50?24:16}/>
    </div>
  );
  const src = frame===0 ? urls.url0 : (img1Ok ? urls.url1 : urls.url0);
  return (
    <img src={src} alt={name} onError={()=>{if(frame===1)setImg1Ok(false);}}
      className="rounded-[10px] object-cover border border-line shrink-0"
      style={{width:size,height:size}}/>
  );
}

// ── RestTimer ─────────────────────────────────────────────────────
function RestTimer({seconds: initialSeconds, onDone}:{seconds:number;onDone:()=>void}) {
  // onDone é estabilizado pelo chamador — não precisa re-registrar o interval
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [total, setTotal] = useState(initialSeconds);
  const [left,  setLeft]  = useState(initialSeconds);
  const leftRef = useRef(initialSeconds);
  const totalRef = useRef(initialSeconds);

  const restStartRef = useRef(Date.now());
  const endTimeRef   = useRef(Date.now() + initialSeconds * 1000);
  const warnedRef    = useRef(false);

  useEffect(()=>{
    restStartRef.current = Date.now();
    endTimeRef.current   = Date.now() + leftRef.current * 1000;

    const t = setInterval(()=>{
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      leftRef.current = remaining;
      setLeft(remaining);

      if(remaining <= 0) {
        clearInterval(t);
        // Som, vibração e notificação com pequeno delay para garantir execução
        setTimeout(()=>{
          playBeep('done');
          try { navigator.vibrate?.([300,100,300,100,500]); } catch(_){}
          sendNotif('DarkSet 💪', 'Descanso encerrado! Hora da próxima série!');
        }, 50);
        onDoneRef.current();
        return;
      }
      if(remaining === 10 && !warnedRef.current) {
        warnedRef.current = true;
        playBeep('warn');
        try { navigator.vibrate?.([100,50,100]); } catch(_){}
      }
      if(remaining <= 5 && remaining > 0) {
        playBeep('tick');
        try { navigator.vibrate?.(40); } catch(_){}
      }
    }, 500);
    return ()=>clearInterval(t);
  },[]);

  const adjust = (delta: number) => {
    const newTotal = Math.max(10, totalRef.current + delta);
    const newLeft  = Math.max(1, leftRef.current + delta);
    totalRef.current = newTotal;
    leftRef.current  = newLeft;
    endTimeRef.current = Date.now() + newLeft * 1000;
    setTotal(newTotal);
    setLeft(newLeft);
    vibrate(20);
  };

  const pct  = Math.max(0, (left / total) * 100);
  // Urgência via tokens semânticos: ok → warn → danger
  const tone = left <= 5 ? 'var(--danger)' : left <= 10 ? 'var(--warn)' : 'var(--ok)';

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[150] bg-bg flex flex-col items-center justify-center gap-5 p-8">

      <motion.div initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:200}}>
        <span className="eyebrow inline-block border border-line rounded-full px-3 py-1">Descanso</span>
      </motion.div>

      {/* Círculo SVG */}
      <div className="relative w-[200px] h-[200px]">
        <svg width="200" height="200" className="-rotate-90">
          <circle cx="100" cy="100" r="88" fill="none" stroke="var(--surface-3)" strokeWidth="10"/>
          <motion.circle cx="100" cy="100" r="88" fill="none" strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*88}`}
            style={{stroke: tone, transition:'stroke .3s'}}
            animate={{strokeDashoffset: 2*Math.PI*88*(1-pct/100)}}
            transition={{duration:.9, ease:'linear'}}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div key={left} initial={{scale:1.15,opacity:.7}} animate={{scale:1,opacity:1}} transition={{duration:.2}}
            className="font-display font-bold tnum text-ink-1 leading-none text-[3.4rem]">
            {fmtTime(left)}
          </motion.div>
          <div className="eyebrow mt-1">restante</div>
        </div>
      </div>

      {/* Controles +/- 30s */}
      <div className="flex items-center gap-4">
        <motion.button whileTap={{scale:.9}} onClick={()=>adjust(-30)}
          className="w-14 h-14 rounded-xl bg-surface-2 border border-line flex flex-col items-center justify-center text-ink-1">
          <Minus size={18}/>
          <span className="text-[0.5rem] text-ink-3 leading-tight">30s</span>
        </motion.button>

        <Button variant="ghost" size="md" className="rounded-full px-8" onClick={()=>{vibrate(20);onDone();}}>
          Pular
        </Button>

        <motion.button whileTap={{scale:.9}} onClick={()=>adjust(30)}
          className="w-14 h-14 rounded-xl bg-surface-2 border border-line flex flex-col items-center justify-center text-ink-1">
          <Plus size={18}/>
          <span className="text-[0.5rem] text-ink-3 leading-tight">30s</span>
        </motion.button>
      </div>

      {/* Total configurado */}
      <div className="text-[0.68rem] text-ink-3 tracking-wide tnum">
        Total: {fmtTime(total)}
      </div>
    </motion.div>
  );
}

// ── FinishScreen ──────────────────────────────────────────────────
function FinishScreen({elapsed,exerciseCount,setCount,onShare,onClose}:{elapsed:number;exerciseCount:number;setCount:number;onShare:()=>void;onClose:()=>void}) {
  useEffect(()=>{ vibrate([80,40,80,40,120]); },[]);
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      className="fixed inset-0 z-[160] bg-bg flex flex-col items-center justify-center gap-5 p-8">
      <motion.div initial={{scale:0,rotate:-20}} animate={{scale:1,rotate:0}}
        transition={{type:'spring',stiffness:200,damping:12,delay:.1}} className="text-[5rem] leading-none">💪</motion.div>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:.25}}
        className="font-display font-bold text-[2.6rem] leading-[1.05] tracking-tight text-ink-1 text-center">
        Treino<br/><span className="text-accent">Concluído!</span>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.4}}
        className="card px-6 py-5 flex gap-8 w-full max-w-[340px] justify-around">
        {([
          [<Timer key="i" size={20}/>, fmtTime(elapsed), 'Duração'],
          [<Dumbbell key="i" size={20}/>, String(exerciseCount), 'Exercícios'],
          [<BarChart3 key="i" size={20}/>, String(setCount), 'Séries'],
        ] as [React.ReactNode,string,string][]).map(([icon,val,lbl],idx)=>(
          <motion.div key={lbl} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.5+idx*.1}} className="text-center">
            <div className="flex justify-center text-accent mb-1">{icon}</div>
            <div className="font-display font-bold text-[1.8rem] leading-none text-ink-1 tnum">{val}</div>
            <div className="eyebrow mt-1">{lbl}</div>
          </motion.div>
        ))}
      </motion.div>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.65}} className="w-full max-w-[340px]">
        <Button variant="primary" size="lg" full onClick={onShare}>
          <Share2 size={18}/> Compartilhar Treino
        </Button>
      </motion.div>
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.8}} className="w-full max-w-[340px]">
        <Button variant="ghost" size="md" full onClick={onClose}>
          <History size={16}/> Ver Histórico
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────
export default function ModoTreino() {
  const router = useRouter();
  const [uid, setUid]           = useState<string|null>(null);
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [activeId, setActiveId] = useState<string|null>(null);
  const [loading, setLoading]   = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string|null>(null);
  const [day, setDay]           = useState(todayDayName());
  const [mode, setMode]         = useState<'plan'|'livre'>('plan');
  const [started, setStarted]   = useState(false);
  const [cursor, setCursor]     = useState(0);
  const [prevCursor, setPrevCursor] = useState(0);
  const [allSets, setAllSets]   = useState<Record<number,SetLog[]>>({});
  const [elapsed, setElapsed]   = useState(0);
  const elapsedRef              = useRef(0);
  const timerRef                = useRef<NodeJS.Timeout|null>(null);
  const [restSecs, setRestSecs] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [restPreset, setRestPreset] = useState(60);
  const [livreExs, setLivreExs] = useState<{name:string;sets:SetLog[]}[]>([]);
  const [livreBusca, setLivreBusca] = useState('');
  const [showGif, setShowGif]   = useState<string|null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareSession, setShareSession] = useState<ShareSession|null>(null);
  const [finishData, setFinishData] = useState({elapsed:0,exerciseCount:0,setCount:0});
  const { toast, show } = useToast();
  const [checkedSets, setCheckedSets] = useState<Record<string,boolean>>({});

  // Solicitar permissão de notificação ao montar
  useEffect(()=>{
    requestNotifPermission();
  },[]);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){setLoading(false);return;}
      setUid(u.uid);
      try {
        const d = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(d.exists()){
          let p = {list:[] as Plan[], activeId:null as string|null};
          try { p = d.data().payload ? JSON.parse(d.data().payload) : p; } catch { /* payload inválido */ }
          setPlans(p.list||[]);
          setActiveId(p.activeId||null);
          setSelectedPlanId(p.activeId||null);
        }
      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  const showToast = (msg:string, tone:'ok'|'warn'|'danger'='ok') => show(msg, tone);

  const startTsRef = useRef<number>(0);

  useEffect(()=>{
    if(started){
      startTsRef.current = Date.now() - elapsedRef.current * 1000;
      timerRef.current = setInterval(()=>{
        const secs = Math.floor((Date.now() - startTsRef.current) / 1000);
        elapsedRef.current = secs;
        setElapsed(secs);
      }, 500);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
      elapsedRef.current=0; setElapsed(0); startTsRef.current=0;
    }
    return ()=>{if(timerRef.current) clearInterval(timerRef.current);};
  },[started]);

  const resolvedPlan = plans.find(p=>p.id===(selectedPlanId||activeId))||plans[0]||null;
  const planItems    = resolvedPlan?.byDay?.[day]||[];
  const currentEx    = planItems[cursor]||null;
  const currentSets  = allSets[cursor]||[];

  useEffect(()=>{
    if(!started||mode!=='plan'||!currentEx) return;
    // allSets lido via setState funcional abaixo para evitar dep cíclica
    setAllSets(prev=>{
      if(prev[cursor]&&prev[cursor].length>0) return prev;
      const n = currentEx.setsPlanned||3;
      return {...prev,[cursor]:Array.from({length:n},()=>({w:'',r:'',done:false}))};
    });
  },[cursor,started,mode,currentEx]);

  const updateSet = (si:number,field:'w'|'r',val:string) => {
    setAllSets(prev=>{const cur=[...(prev[cursor]||[])];cur[si]={...cur[si],[field]:val};return{...prev,[cursor]:cur};});
  };

  const handleSetDone = (si:number) => {
    if(!currentSets[si]?.r) return;
    const key = `${cursor}-${si}`;
    setCheckedSets(prev=>({...prev,[key]:true}));
    setAllSets(prev=>{const cur=[...(prev[cursor]||[])];cur[si]={...cur[si],done:true};return{...prev,[cursor]:cur};});
    playBeep('tick');
    vibrate([40,20,40]);
    setRestSecs(restPreset);
    setShowRest(true);
  };

  const saveSession = async () => {
    const entries:any[] = [];
    let totalSetCount = 0;
    planItems.forEach((ex,ci)=>{
      const sets=(allSets[ci]||[]).filter(s=>s.r.trim());
      if(!sets.length) return;
      totalSetCount+=sets.length;
      entries.push({name:ex.name,exId:ex.exId,sets:sets.map(s=>({w:s.w,r:s.r}))});
    });
    if(!entries.length){showToast('Nenhuma série registrada','warn');return;}
    const sessData:ShareSession = {planName:resolvedPlan?.name,day,entries,duration:elapsed};
    if(uid){
      try {
        const histRef = doc(db,'users',uid,'data','history');
        const histSnap = await getDoc(histRef);
        let hist: Record<string,unknown> = {};
        try { hist = histSnap.exists() ? JSON.parse(histSnap.data().payload||'{}') : {}; } catch { /* payload corrompido, reseta */ }
        hist[todayKey()]={...sessData,planId:resolvedPlan?.id,savedAt:Date.now()};
        await setDoc(histRef,{payload:JSON.stringify(hist),updatedAt:Date.now()});
      } catch(e){ console.error(e); showToast('Erro ao salvar treino','danger'); return; }
    }
    setFinishData({elapsed,exerciseCount:entries.length,setCount:totalSetCount});
    setShareSession(sessData);
    setShowFinish(true); setStarted(false); setAllSets({}); setCursor(0);
  };

  const saveLivre = async () => {
    const valid = livreExs.filter(ex=>ex.sets.some(s=>s.r.trim()));
    if(!valid.length){showToast('Adicione ao menos uma série','warn');return;}
    const entries = valid.map(ex=>({name:ex.name,sets:ex.sets.filter(s=>s.r.trim()).map(s=>({w:s.w,r:s.r}))}));
    const sessData:ShareSession = {planName:'Treino Livre',day,entries,duration:elapsed};
    if(uid){
      try {
        const histRef = doc(db,'users',uid,'data','history');
        const histSnap = await getDoc(histRef);
        let hist: Record<string,unknown> = {};
        try { hist = histSnap.exists() ? JSON.parse(histSnap.data().payload||'{}') : {}; } catch { /* payload corrompido, reseta */ }
        hist[todayKey()]={...sessData,savedAt:Date.now()};
        await setDoc(histRef,{payload:JSON.stringify(hist),updatedAt:Date.now()});
      } catch(e){ console.error(e); showToast('Erro ao salvar treino','danger'); return; }
    }
    const totalSetCount=entries.reduce((a,ex)=>a+ex.sets.length,0);
    setFinishData({elapsed,exerciseCount:entries.length,setCount:totalSetCount});
    setShareSession(sessData);
    setShowFinish(true); setStarted(false); setLivreExs([]);
  };

  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  if(showGif) return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} onClick={()=>setShowGif(null)}
      className="fixed inset-0 z-[200] bg-bg flex flex-col items-center justify-center gap-5 p-8">
      <motion.div initial={{scale:.85}} animate={{scale:1}} transition={{type:'spring',stiffness:200}}>
        <ExGif name={showGif} size={270}/>
      </motion.div>
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.15}}
        className="font-display font-bold text-xl text-ink-1 text-center">
        {showGif}
      </motion.div>
      <div className="eyebrow">Toque para fechar</div>
    </motion.div>
  );

  if(showRest) return <RestTimer seconds={restSecs} onDone={()=>setShowRest(false)}/>;

  if(showFinish) return (
    <FinishScreen elapsed={finishData.elapsed} exerciseCount={finishData.exerciseCount} setCount={finishData.setCount}
      onShare={()=>{setShowFinish(false);setShowShare(true);}}
      onClose={()=>{setShowFinish(false);router.push('/historico');}}/>
  );

  if(showShare && shareSession) return (
    <div className="fixed inset-0 z-[250] bg-bg">
      <AnimatePresence>
        <ShareWorkoutModal session={shareSession} onClose={()=>{setShowShare(false);router.push('/historico');}}/>
      </AnimatePresence>
    </div>
  );

  // ── PRÉ-INÍCIO ────────────────────────────────────────────────────
  if(!started) return (
    <PageShell>
      <ToastViewport toast={toast}/>

      <PageHeader title="Modo Treino" subtitle="Registre suas séries em tempo real"/>

      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        className="flex bg-surface-2 border border-line rounded-xl p-1 gap-1 mb-4">
        {(['plan','livre'] as const).map(m=>(
          <motion.button key={m} whileTap={{scale:.97}} onClick={()=>setMode(m)}
            className={`flex-1 py-2 rounded-lg text-[0.82rem] font-semibold transition-colors ${
              mode===m ? 'bg-accent-soft text-accent border border-accent/30' : 'text-ink-3 border border-transparent'
            }`}>
            {m==='plan'?'Com Ficha':'Treino Livre'}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {mode==='plan' && (
          <motion.div key="plan" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:.2}}>
            {plans.length===0 ? (
              <EmptyState
                icon={<ClipboardList size={36}/>}
                title="Nenhuma ficha criada ainda"
                subtitle="Monte sua primeira ficha de treino para começar."
                action={<Button onClick={()=>router.push('/treino')}>Criar Ficha</Button>}/>
            ) : (
              <div className="card p-4 grid gap-3.5">
                {plans.length>1 && (
                  <div>
                    <div className="eyebrow mb-1.5">Ficha</div>
                    <Select value={selectedPlanId||activeId||''} onValueChange={v=>setSelectedPlanId(v)}>
                      <SelectTrigger className="w-full h-11 bg-surface-2 border-line rounded-xl px-3.5 text-ink-1">
                        <SelectValue>{plans.find(p=>p.id===(selectedPlanId||activeId))?.name||'Selecione uma ficha'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-line">
                        {plans.map(p=><SelectItem key={p.id} value={p.id} className="text-ink-1">{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <div className="eyebrow mb-1.5">Dia da semana</div>
                  <Select value={day} onValueChange={v=>setDay(v)}>
                    <SelectTrigger className="w-full h-11 bg-surface-2 border-line rounded-xl px-3.5 text-ink-1">
                      <SelectValue>{day}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-surface-1 border-line">
                      {DAYS.map(d=><SelectItem key={d} value={d} className="text-ink-1">{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {planItems.length>0 && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1}}
                    className="card-2 p-3 grid gap-2">
                    <div className="eyebrow">{planItems.length} exercício(s) hoje</div>
                    {planItems.slice(0,4).map((ex,i)=>(
                      <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.04*i}}
                        className="flex items-center gap-2.5">
                        <ExGif name={ex.name} size={34}/>
                        <span className="text-sm text-ink-2 flex-1 truncate">{ex.name}</span>
                        <span className="text-[0.65rem] text-ink-3 font-bold bg-surface-2 border border-line rounded-md px-1.5 py-0.5 shrink-0 tnum">{ex.setsPlanned}x</span>
                      </motion.div>
                    ))}
                    {planItems.length>4 && <div className="text-xs text-ink-3 text-center pt-0.5">+{planItems.length-4} exercícios</div>}
                  </motion.div>
                )}
                {planItems.length===0 && (
                  <div className="text-center py-3 text-ink-3 text-[0.82rem]">Nenhum exercício para {day}. Selecione outro dia.</div>
                )}

                {/* Timer descanso */}
                <div className="flex items-center justify-between card-2 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[0.75rem] text-ink-2">
                    <Timer size={14} className="text-ink-3"/> Descanso padrão
                  </div>
                  <div className="flex gap-1.5">
                    {[30,60,90,120].map(s=>(
                      <motion.button key={s} whileTap={{scale:.9}} onClick={()=>setRestPreset(s)}
                        className={`px-2 py-1 rounded-lg text-[0.72rem] font-bold border transition-colors tnum ${
                          restPreset===s ? 'bg-accent-soft border-accent/40 text-accent' : 'border-line text-ink-3'
                        }`}>
                        {s}s
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Button size="lg" full disabled={planItems.length===0}
                  onClick={()=>{unlockAudio();vibrate(30);setCursor(0);setAllSets({});setStarted(true);}}>
                  <Play size={18}/> Iniciar Treino
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {mode==='livre' && (
          <motion.div key="livre" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:.2}}>
            <div className="card p-7 text-center grid gap-4">
              <motion.div initial={{scale:.8}} animate={{scale:1}} transition={{type:'spring',stiffness:200}}
                className="flex justify-center text-accent">
                <Dumbbell size={48}/>
              </motion.div>
              <div>
                <div className="font-display font-bold text-[1.7rem] leading-tight tracking-tight text-ink-1">
                  Treino <span className="text-accent">Livre</span>
                </div>
                <div className="text-[0.82rem] text-ink-2 mt-2 leading-relaxed">Sem ficha? Sem problema.</div>
              </div>
              <Button size="lg" full onClick={()=>{unlockAudio();vibrate(30);setStarted(true);}}>
                <Play size={18}/> Começar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );

  // ── SESSÃO ATIVA — COM FICHA ──────────────────────────────────────
  if(mode==='plan') return (
    <PageShell hideBottomNav>
      <ToastViewport toast={toast}/>

      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <div className="eyebrow">Em andamento</div>
          <div className="font-display font-bold text-lg leading-tight text-ink-1 truncate">{resolvedPlan?.name}</div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <motion.div key={Math.floor(elapsed/60)} initial={{scale:1.05}} animate={{scale:1}}
              className="font-display font-bold text-[1.6rem] leading-none text-accent tnum">
              {fmtTime(elapsed)}
            </motion.div>
            <div className="eyebrow">duração</div>
          </div>
          <Button variant="ghost" size="sm" aria-label="Encerrar treino"
            onClick={()=>{if(confirm('Encerrar sem salvar?')){vibrate(30);setStarted(false);}}}>
            <X size={16}/>
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1}} className="mb-3">
        <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
          <motion.div animate={{width:`${((cursor+1)/planItems.length)*100}%`}} transition={{duration:.4,ease:'easeOut'}}
            className="h-full bg-accent rounded-full"/>
        </div>
        <div className="flex justify-between mt-1">
          <div className="text-[0.62rem] text-ink-3 tnum">{cursor+1} de {planItems.length} exercícios</div>
          <div className="text-[0.62rem] text-ink-3 tnum">{Object.values(allSets).flat().filter(s=>s.r).length} séries registradas</div>
        </div>
      </motion.div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-1">
        {planItems.map((ex,i)=>{
          const done=(allSets[i]||[]).some(s=>s.r.trim());
          const active=cursor===i;
          return (
            <motion.button key={i} whileTap={{scale:.9}} onClick={()=>{setPrevCursor(cursor);setCursor(i);}}
              className={`shrink-0 w-9 h-9 rounded-lg border font-display font-bold text-[0.8rem] flex items-center justify-center transition-colors tnum ${
                active ? 'border-accent/50 bg-accent-soft text-accent'
                : done ? 'border-ok/30 bg-ok-soft text-ok'
                : 'border-line bg-surface-2 text-ink-3'
              }`}>
              {done ? <Check size={14}/> : i+1}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {currentEx && (
          <motion.div key={cursor}
            initial={{opacity:0,x:cursor>=prevCursor?30:-30}}
            animate={{opacity:1,x:0}}
            exit={{opacity:0,x:cursor>=prevCursor?-30:30}}
            transition={{duration:.22,ease:'easeOut'}}
            className="card mb-3 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <motion.button whileTap={{scale:.93}} onClick={()=>setShowGif(currentEx.name)}
                  className="rounded-[10px] overflow-hidden shrink-0" aria-label={`Ver demonstração de ${currentEx.name}`}>
                  <ExGif name={currentEx.name} size={72}/>
                </motion.button>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[0.6rem] font-bold text-accent bg-accent-soft rounded px-1.5 py-px mb-1 tnum">{cursor+1}/{planItems.length}</span>
                  <div className="font-display font-bold text-[1.05rem] leading-tight text-ink-1 break-words">{currentEx.name}</div>
                  <div className="text-[0.68rem] text-ink-3 mt-0.5 tnum">{currentEx.setsPlanned} séries · {currentEx.repsTarget} reps</div>
                </div>
              </div>

              <div className="grid grid-cols-[1.5rem_1fr_1fr_2.2rem] gap-2 px-1 pb-1.5">
                {['#','Kg','Reps',''].map((h,i)=>(
                  <div key={i} className={`eyebrow ${i>0?'text-center':'text-left'}`}>{h}</div>
                ))}
              </div>

              <div className="grid gap-1.5 mb-3">
                <AnimatePresence>
                  {currentSets.map((s,si)=>{
                    const key=`${cursor}-${si}`;
                    const isDone=checkedSets[key]||s.done;
                    return (
                      <motion.div key={si} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-20}} transition={{delay:si*.04}}
                        className={`grid grid-cols-[1.5rem_1fr_1fr_2.2rem] gap-2 items-center rounded-xl px-1.5 py-2 border transition-colors ${
                          isDone ? 'bg-ok-soft border-ok/25' : 'bg-surface-2 border-line'
                        }`}>
                        <div className={`font-display font-bold text-[0.9rem] text-center tnum ${isDone?'text-ok':'text-ink-3'}`}>{si+1}</div>
                        <input type="number" min="0" step="0.5" placeholder="0" value={s.w} onChange={e=>updateSet(si,'w',e.target.value)}
                          className="text-center bg-bg/50 border border-line rounded-lg text-[0.9rem] text-ink-1 h-9 w-full px-1 focus:border-accent/40 transition-colors tnum"/>
                        <input type="number" min="0" placeholder="0" value={s.r} onChange={e=>updateSet(si,'r',e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSetDone(si)}
                          className="text-center bg-bg/50 border border-line rounded-lg text-[0.9rem] text-ink-1 h-9 w-full px-1 focus:border-accent/40 transition-colors tnum"/>
                        <motion.button whileTap={{scale:.85}} onClick={()=>handleSetDone(si)} aria-label={`Concluir série ${si+1}`}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            isDone ? 'border-ok/60 bg-ok-soft text-ok'
                            : s.r ? 'border-ok/30 text-ok'
                            : 'border-line text-ink-3'
                          }`}>
                          <Check size={15}/>
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1"
                  onClick={()=>setAllSets(prev=>{const cur=[...(prev[cursor]||[])];cur.push({w:'',r:'',done:false});return{...prev,[cursor]:cur};})}>
                  <Plus size={14}/> Série
                </Button>
                {currentSets.length>1 && (
                  <Button variant="danger" size="sm"
                    onClick={()=>setAllSets(prev=>{const cur=(prev[cursor]||[]).slice(0,-1);return{...prev,[cursor]:cur};})}>
                    <Minus size={14}/> Série
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" disabled={cursor===0}
          onClick={()=>{setPrevCursor(cursor);setCursor(c=>Math.max(0,c-1));}}>
          <ChevronLeft size={16}/> Anterior
        </Button>
        {cursor<planItems.length-1 ? (
          <Button className="flex-[2]" onClick={()=>{vibrate(20);setPrevCursor(cursor);setCursor(c=>c+1);}}>
            Próximo <ChevronRight size={16}/>
          </Button>
        ) : (
          <Button className="flex-[2]" onClick={saveSession}>
            <CheckCheck size={16}/> Finalizar
          </Button>
        )}
      </div>
    </PageShell>
  );

  // ── SESSÃO ATIVA — TREINO LIVRE ───────────────────────────────────
  return (
    <PageShell hideBottomNav>
      <ToastViewport toast={toast}/>

      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="flex items-center justify-between mb-4">
        <div>
          <span className="inline-block eyebrow text-accent bg-accent-soft rounded px-1.5 py-px mb-1">Treino Livre</span>
          <motion.div key={Math.floor(elapsed/60)} initial={{scale:1.05}} animate={{scale:1}}
            className="font-display font-bold text-[1.8rem] leading-none text-accent tnum">
            {fmtTime(elapsed)}
          </motion.div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" aria-label="Encerrar treino"
            onClick={()=>{if(confirm('Encerrar sem salvar?')){vibrate(30);setStarted(false);}}}>
            <X size={16}/>
          </Button>
          <Button size="sm" onClick={saveLivre}>
            <CheckCheck size={14}/> Salvar
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        className="card p-3 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"/>
          <input value={livreBusca} onChange={e=>setLivreBusca(e.target.value)} placeholder="Adicionar exercício…"
            className="field pl-10 h-11"/>
        </div>
        <AnimatePresence>
          {livreBusca.length>=1 && (
            <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
              className="mt-2 max-h-[220px] overflow-y-auto grid gap-1.5">
              {ALL_EXS.filter(n=>n.toLowerCase().includes(livreBusca.toLowerCase())).slice(0,8).map(n=>(
                <motion.button key={n} whileTap={{scale:.98}}
                  onClick={()=>{vibrate(20);setLivreExs(prev=>[{name:n,sets:[{w:'',r:'',done:false}]},...prev]);setLivreBusca('');}}
                  className="flex items-center gap-2.5 card-2 px-2.5 py-2 text-left">
                  <ExGif name={n} size={40}/>
                  <span className="text-sm text-ink-1 flex-1 truncate">{n}</span>
                  <Plus size={18} className="text-accent shrink-0"/>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {livreExs.length===0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          className="text-center py-8 px-4 border border-dashed border-line rounded-2xl text-ink-3 text-[0.85rem]">
          Use a busca acima para adicionar exercícios
        </motion.div>
      )}

      <div className="grid gap-2.5">
        <AnimatePresence>
          {livreExs.map((ex,ei)=>(
            <motion.div key={ei} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-30,height:0}} transition={{duration:.2}}
              className="card overflow-hidden">
              <div className="p-3.5">
                <div className="flex items-center gap-2.5 mb-3">
                  <motion.button whileTap={{scale:.93}} onClick={()=>setShowGif(ex.name)}
                    className="rounded-lg overflow-hidden shrink-0" aria-label={`Ver demonstração de ${ex.name}`}>
                    <ExGif name={ex.name} size={52}/>
                  </motion.button>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-[0.95rem] leading-tight text-ink-1 break-words">{ex.name}</div>
                    <div className="text-[0.68rem] text-ink-3 mt-px tnum">{ex.sets.length} série(s)</div>
                  </div>
                  <motion.button whileTap={{scale:.9}} onClick={()=>{vibrate(20);setLivreExs(prev=>prev.filter((_,i)=>i!==ei));}}
                    aria-label={`Remover ${ex.name}`}
                    className="bg-danger-soft border border-danger/30 rounded-lg w-8 h-8 flex items-center justify-center text-danger shrink-0">
                    <X size={14}/>
                  </motion.button>
                </div>

                <div className="grid grid-cols-[1.5rem_1fr_1fr_2.2rem] gap-2 px-1 pb-1">
                  {['#','Kg','Reps',''].map((h,i)=>(
                    <div key={i} className={`eyebrow ${i>0?'text-center':'text-left'}`}>{h}</div>
                  ))}
                </div>

                <div className="grid gap-1.5 mb-2.5">
                  <AnimatePresence>
                    {ex.sets.map((s,si)=>{
                      const isDone=s.done;
                      return (
                        <motion.div key={si} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{delay:si*.03}}
                          className={`grid grid-cols-[1.5rem_1fr_1fr_2.2rem] gap-2 items-center rounded-xl px-1.5 py-1.5 border transition-colors ${
                            isDone ? 'bg-ok-soft border-ok/20' : 'bg-surface-2 border-line'
                          }`}>
                          <div className={`font-display font-bold text-[0.85rem] text-center tnum ${isDone?'text-ok':'text-ink-3'}`}>{si+1}</div>
                          <input type="number" min="0" step="0.5" placeholder="0" value={s.w}
                            onChange={e=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,w:e.target.value})}))}
                            className="text-center bg-bg/50 border border-line rounded-lg text-[0.88rem] text-ink-1 h-[34px] w-full px-1 focus:border-accent/40 transition-colors tnum"/>
                          <input type="number" min="0" placeholder="0" value={s.r}
                            onChange={e=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,r:e.target.value})}))}
                            className="text-center bg-bg/50 border border-line rounded-lg text-[0.88rem] text-ink-1 h-[34px] w-full px-1 focus:border-accent/40 transition-colors tnum"/>
                          <motion.button whileTap={{scale:.85}} aria-label={`Concluir série ${si+1}`}
                            onClick={()=>{
                              if(s.r){
                                playBeep('tick');
                                vibrate([40,20,40]);
                                setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,done:true})}));
                                setRestSecs(restPreset);setShowRest(true);
                              }
                            }}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                              isDone ? 'border-ok/60 bg-ok-soft text-ok'
                              : s.r ? 'border-ok/30 text-ok'
                              : 'border-line text-ink-3'
                            }`}>
                            <Check size={14}/>
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" className="flex-1"
                    onClick={()=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:[...ex2.sets,{w:'',r:'',done:false}]}))}>
                    <Plus size={14}/> Série
                  </Button>
                  {ex.sets.length>1 && (
                    <Button variant="danger" size="sm"
                      onClick={()=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.slice(0,-1)}))}>
                      <Minus size={14}/> Série
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {livreExs.length>0 && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="mt-3.5">
          <Button size="lg" full onClick={saveLivre}>
            <CheckCheck size={18}/> Finalizar Treino
          </Button>
        </motion.div>
      )}
    </PageShell>
  );
}
