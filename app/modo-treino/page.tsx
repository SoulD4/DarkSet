'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
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
function playBeep(type: 'tick'|'done'|'warn') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const configs = {
      tick: [{freq:880, dur:.08, vol:.15, delay:0}],
      warn: [{freq:660, dur:.12, vol:.25, delay:0},{freq:660, dur:.12, vol:.25, delay:.18}],
      done: [
        {freq:523, dur:.12, vol:.35, delay:0},
        {freq:659, dur:.12, vol:.35, delay:.15},
        {freq:784, dur:.22, vol:.45, delay:.30},
      ],
    };
    configs[type].forEach(({freq,dur,vol,delay})=>{
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime+delay);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime+delay+.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime+delay+dur);
      osc.start(ctx.currentTime+delay);
      osc.stop(ctx.currentTime+delay+dur+.05);
    });
  } catch(_){}
}

// ── Notificação push ──────────────────────────────────────────────
async function requestNotifPermission() {
  if(typeof Notification === 'undefined') return;
  if(Notification.permission === 'default') {
    await Notification.requestPermission();
  }
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
      renotify: true,
      silent: false,
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
    <div style={{width:size,height:size,borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:size>50?'1.5rem':'1rem'}}>🏋️</div>
  );
  const src = frame===0 ? urls.url0 : (img1Ok ? urls.url1 : urls.url0);
  return <img src={src} alt={name} onError={()=>{if(frame===1)setImg1Ok(false);}} style={{width:size,height:size,borderRadius:10,objectFit:'cover',border:'1px solid #2e2e38',flexShrink:0}}/>;
}

// ── RestTimer ─────────────────────────────────────────────────────
function RestTimer({seconds: initialSeconds, onDone}:{seconds:number;onDone:()=>void}) {
  const [total, setTotal] = useState(initialSeconds);
  const [left,  setLeft]  = useState(initialSeconds);
  const leftRef = useRef(initialSeconds);
  const totalRef = useRef(initialSeconds);

  useEffect(()=>{
    const t = setInterval(()=>{
      leftRef.current -= 1;
      setLeft(leftRef.current);

      if(leftRef.current <= 0) {
        clearInterval(t);
        playBeep('done');
        vibrate([200,100,200,100,400]);
        sendNotif('DarkSet — Descanso encerrado! 💪', 'Hora da próxima série!');
        onDone();
        return;
      }
      if(leftRef.current === 10) {
        playBeep('warn');
        vibrate([80,40,80]);
      }
      if(leftRef.current <= 5) {
        playBeep('tick');
        vibrate(30);
      }
    }, 1000);
    return ()=>clearInterval(t);
  },[]);

  const adjust = (delta: number) => {
    const newTotal = Math.max(10, totalRef.current + delta);
    const newLeft  = Math.max(1, leftRef.current + delta);
    totalRef.current = newTotal;
    leftRef.current  = newLeft;
    setTotal(newTotal);
    setLeft(newLeft);
    vibrate(20);
  };

  const pct   = Math.max(0, (left / total) * 100);
  const color = left <= 5 ? '#e31b23' : left <= 10 ? '#facc15' : '#22c55e';

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:150,background:'rgba(0,0,0,.96)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.25rem',padding:'2rem'}}>

      <motion.div initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:200}}>
        <span style={{display:'inline-block',fontSize:'.65rem',color:'#7a7a8a',fontWeight:700,letterSpacing:'.15em',border:'1px solid rgba(255,255,255,.1)',borderRadius:999,padding:'3px 12px'}}>DESCANSO</span>
      </motion.div>

      {/* Círculo SVG */}
      <div style={{position:'relative',width:200,height:200}}>
        <svg width="200" height="200" style={{transform:'rotate(-90deg)'}}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="#1e1e24" strokeWidth="10"/>
          <motion.circle cx="100" cy="100" r="88" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*88}`}
            animate={{strokeDashoffset: 2*Math.PI*88*(1-pct/100), stroke: color}}
            transition={{duration:.9, ease:'linear'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <motion.div key={left} initial={{scale:1.15,opacity:.7}} animate={{scale:1,opacity:1}} transition={{duration:.2}}
            style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3.8rem',color:'#fff',lineHeight:1}}>
            {fmtTime(left)}
          </motion.div>
          <div style={{fontSize:'.6rem',color:'#7a7a8a',marginTop:'4px',textTransform:'uppercase',letterSpacing:'.1em'}}>restante</div>
        </div>
      </div>

      {/* Controles +/- 30s */}
      <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
        <motion.button whileTap={{scale:.9}}
          onClick={()=>adjust(-30)}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:12,width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',color:'#f0f0f2',fontSize:'1.1rem',fontWeight:700,cursor:'pointer',outline:'none',flexDirection:'column',gap:0}}>
          <span style={{fontSize:'1rem',lineHeight:1}}>−</span>
          <span style={{fontSize:'.5rem',color:'#7a7a8a',lineHeight:1.2}}>30s</span>
        </motion.button>

        <motion.button whileTap={{scale:.95}} onClick={()=>{vibrate(20);onDone();}}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:'999px',padding:'.55rem 2rem',color:'#7a7a8a',fontSize:'.85rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
          Pular
        </motion.button>

        <motion.button whileTap={{scale:.9}}
          onClick={()=>adjust(30)}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:12,width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',color:'#f0f0f2',fontSize:'1.1rem',fontWeight:700,cursor:'pointer',outline:'none',flexDirection:'column',gap:0}}>
          <span style={{fontSize:'1rem',lineHeight:1}}>+</span>
          <span style={{fontSize:'.5rem',color:'#7a7a8a',lineHeight:1.2}}>30s</span>
        </motion.button>
      </div>

      {/* Total configurado */}
      <div style={{fontSize:'.65rem',color:'#484858',letterSpacing:'.06em'}}>
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
      style={{position:'fixed',inset:0,zIndex:160,background:'#0a0a0e',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.25rem',padding:'2rem'}}>
      <motion.div initial={{scale:0,rotate:-20}} animate={{scale:1,rotate:0}}
        transition={{type:'spring',stiffness:200,damping:12,delay:.1}} style={{fontSize:'5rem'}}>💪</motion.div>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:.25}}
        style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3rem',textTransform:'uppercase',color:'#fff',textAlign:'center',lineHeight:1}}>
        Treino<br/><span style={{color:'#e31b23'}}>Concluído!</span>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.4}}
        style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:18,padding:'1.25rem 1.5rem',display:'flex',gap:'2rem',width:'100%',maxWidth:340,justifyContent:'space-around'}}>
        {[['⏱',fmtTime(elapsed),'Duração'],['🏋️',String(exerciseCount),'Exercícios'],['📊',String(setCount),'Séries']].map(([icon,val,lbl],idx)=>(
          <motion.div key={lbl} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.5+idx*.1}} style={{textAlign:'center'}}>
            <div style={{fontSize:'1.5rem'}}>{icon}</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2.2rem',color:'#f0f0f2',lineHeight:1}}>{val}</div>
            <div style={{fontSize:'.58rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginTop:'2px'}}>{lbl}</div>
          </motion.div>
        ))}
      </motion.div>
      <motion.button initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.65}}
        whileTap={{scale:.97}} onClick={onShare}
        style={{width:'100%',maxWidth:340,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:14,padding:'16px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',boxShadow:'0 6px 24px rgba(227,27,35,.4)',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.6rem'}}>
        📸 Compartilhar Treino
      </motion.button>
      <motion.button initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.8}}
        whileTap={{scale:.97}} onClick={onClose}
        style={{width:'100%',maxWidth:340,background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:14,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
        Ver Histórico →
      </motion.button>
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
  const [toast, setToast]       = useState('');
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
          const p = d.data().payload ? JSON.parse(d.data().payload) : {list:[],activeId:null};
          setPlans(p.list||[]);
          setActiveId(p.activeId||null);
          setSelectedPlanId(p.activeId||null);
        }
      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  const showToast = (msg:string) => {setToast(msg);setTimeout(()=>setToast(''),2500);};

  useEffect(()=>{
    if(started){
      timerRef.current = setInterval(()=>{elapsedRef.current+=1;setElapsed(elapsedRef.current);},1000);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
      elapsedRef.current=0; setElapsed(0);
    }
    return ()=>{if(timerRef.current) clearInterval(timerRef.current);};
  },[started]);

  const resolvedPlan = plans.find(p=>p.id===(selectedPlanId||activeId))||plans[0]||null;
  const planItems    = resolvedPlan?.byDay?.[day]||[];
  const currentEx    = planItems[cursor]||null;
  const currentSets  = allSets[cursor]||[];

  useEffect(()=>{
    if(!started||mode!=='plan'||!currentEx) return;
    if(allSets[cursor]&&allSets[cursor].length>0) return;
    const n = currentEx.setsPlanned||3;
    setAllSets(prev=>({...prev,[cursor]:Array.from({length:n},()=>({w:'',r:'',done:false}))}));
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
    if(!entries.length){showToast('Nenhuma série registrada');return;}
    const sessData:ShareSession = {planName:resolvedPlan?.name,day,entries,duration:elapsed};
    if(uid){
      try {
        const histRef = doc(db,'users',uid,'data','history');
        const histSnap = await getDoc(histRef);
        const hist = histSnap.exists()?JSON.parse(histSnap.data().payload||'{}'):{};
        hist[todayKey()]={...sessData,planId:resolvedPlan?.id,savedAt:Date.now()};
        await setDoc(histRef,{payload:JSON.stringify(hist),updatedAt:Date.now()});
      } catch(e){console.error(e);}
    }
    setFinishData({elapsed,exerciseCount:entries.length,setCount:totalSetCount});
    setShareSession(sessData);
    setShowFinish(true); setStarted(false); setAllSets({}); setCursor(0);
  };

  const saveLivre = async () => {
    const valid = livreExs.filter(ex=>ex.sets.some(s=>s.r.trim()));
    if(!valid.length){showToast('Adicione ao menos uma série');return;}
    const entries = valid.map(ex=>({name:ex.name,sets:ex.sets.filter(s=>s.r.trim()).map(s=>({w:s.w,r:s.r}))}));
    const sessData:ShareSession = {planName:'Treino Livre',day,entries,duration:elapsed};
    if(uid){
      try {
        const histRef = doc(db,'users',uid,'data','history');
        const histSnap = await getDoc(histRef);
        const hist = histSnap.exists()?JSON.parse(histSnap.data().payload||'{}'):{};
        hist[todayKey()]={...sessData,savedAt:Date.now()};
        await setDoc(histRef,{payload:JSON.stringify(hist),updatedAt:Date.now()});
      } catch(e){console.error(e);}
    }
    const totalSetCount=entries.reduce((a,ex)=>a+ex.sets.length,0);
    setFinishData({elapsed,exerciseCount:entries.length,setCount:totalSetCount});
    setShareSession(sessData);
    setShowFinish(true); setStarted(false); setLivreExs([]);
  };

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  if(showGif) return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} onClick={()=>setShowGif(null)}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.97)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1.25rem',padding:'2rem'}}>
      <motion.div initial={{scale:.85}} animate={{scale:1}} transition={{type:'spring',stiffness:200}}>
        <ExGif name={showGif} size={270}/>
      </motion.div>
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.15}}
        style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',textAlign:'center'}}>
        {showGif}
      </motion.div>
      <div style={{fontSize:'.72rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.1em'}}>Toque para fechar</div>
    </motion.div>
  );

  if(showRest) return <RestTimer seconds={restSecs} onDone={()=>setShowRest(false)}/>;

  if(showFinish) return (
    <FinishScreen elapsed={finishData.elapsed} exerciseCount={finishData.exerciseCount} setCount={finishData.setCount}
      onShare={()=>{setShowFinish(false);setShowShare(true);}}
      onClose={()=>{setShowFinish(false);router.push('/historico');}}/>
  );

  if(showShare && shareSession) return (
    <div style={{position:'fixed',inset:0,background:'#0a0a0e',zIndex:250}}>
      <AnimatePresence>
        <ShareWorkoutModal session={shareSession} onClose={()=>{setShowShare(false);router.push('/historico');}}/>
      </AnimatePresence>
    </div>
  );

  // ── PRÉ-INÍCIO ────────────────────────────────────────────────────
  if(!started) return (
    <PageShell>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)'}}>
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{marginBottom:'1.25rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>Modo Treino</div>
        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px'}}>Registre suas séries em tempo real</div>
      </motion.div>

      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'3px',gap:'3px',marginBottom:'.75rem'}}>
        {(['plan','livre'] as const).map(m=>(
          <motion.button key={m} whileTap={{scale:.97}} onClick={()=>setMode(m)}
            style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',background:mode===m?'rgba(227,27,35,.15)':'transparent',color:mode===m?'#e31b23':'#7a7a8a',boxShadow:mode===m?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',transition:'all .15s',outline:'none'}}>
            {m==='plan'?'Com Ficha':'Treino Livre'}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {mode==='plan' && (
          <motion.div key="plan" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:.2}}>
            <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,padding:'1rem',display:'grid',gap:'.85rem'}}>
              {plans.length===0 ? (
                <div style={{textAlign:'center',padding:'1.5rem 0'}}>
                  <div style={{fontSize:'2.5rem',marginBottom:'.5rem'}}>📋</div>
                  <div style={{fontSize:'.85rem',color:'#7a7a8a',marginBottom:'1rem'}}>Nenhuma ficha criada ainda.</div>
                  <motion.button whileTap={{scale:.97}} onClick={()=>router.push('/treino')}
                    style={{background:'#e31b23',border:'none',borderRadius:10,padding:'.65rem 1.5rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
                    Criar Ficha
                  </motion.button>
                </div>
              ) : (
                <>
                  {plans.length>1 && (
                    <div>
                      <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.35rem'}}>Ficha</div>
                      <Select value={selectedPlanId||activeId||''} onValueChange={v=>setSelectedPlanId(v)}>
                        <SelectTrigger style={{background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',height:44,outline:'none',boxShadow:'none'}}>
                          <SelectValue>{plans.find(p=>p.id===(selectedPlanId||activeId))?.name||'Selecione uma ficha'}</SelectValue>
                        </SelectTrigger>
                        <SelectContent style={{background:'#1e1e24',border:'1px solid #2e2e38',outline:'none'}}>
                          {plans.map(p=><SelectItem key={p.id} value={p.id} style={{color:'#f0f0f2',outline:'none'}}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.35rem'}}>Dia da semana</div>
                    <Select value={day} onValueChange={v=>setDay(v)}>
                      <SelectTrigger style={{background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',height:44,outline:'none',boxShadow:'none'}}>
                        <SelectValue>{day}</SelectValue>
                      </SelectTrigger>
                      <SelectContent style={{background:'#1e1e24',border:'1px solid #2e2e38',outline:'none'}}>
                        {DAYS.map(d=><SelectItem key={d} value={d} style={{color:'#f0f0f2',outline:'none'}}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {planItems.length>0 && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1}}
                      style={{background:'rgba(0,0,0,.2)',borderRadius:12,padding:'.75rem',display:'grid',gap:'.45rem'}}>
                      <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.1rem'}}>{planItems.length} exercício(s) hoje</div>
                      {planItems.slice(0,4).map((ex,i)=>(
                        <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.05*i}}
                          style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                          <ExGif name={ex.name} size={34}/>
                          <span style={{fontSize:'.85rem',color:'#b0b0be',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ex.name}</span>
                          <span style={{fontSize:'.65rem',color:'#484858',fontWeight:700,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:6,padding:'2px 7px',flexShrink:0}}>{ex.setsPlanned}x</span>
                        </motion.div>
                      ))}
                      {planItems.length>4 && <div style={{fontSize:'.7rem',color:'#484858',textAlign:'center',paddingTop:'.2rem'}}>+{planItems.length-4} exercícios</div>}
                    </motion.div>
                  )}
                  {planItems.length===0 && <div style={{textAlign:'center',padding:'.75rem',color:'#484858',fontSize:'.82rem'}}>Nenhum exercício para {day}. Selecione outro dia.</div>}

                  {/* Timer descanso */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.6rem .75rem',background:'rgba(0,0,0,.2)',borderRadius:10}}>
                    <div style={{fontSize:'.75rem',color:'#7a7a8a'}}>⏱ Descanso padrão</div>
                    <div style={{display:'flex',gap:'.35rem'}}>
                      {[30,60,90,120].map(s=>(
                        <motion.button key={s} whileTap={{scale:.9}} onClick={()=>setRestPreset(s)}
                          style={{padding:'.28rem .55rem',borderRadius:7,border:'1px solid '+(restPreset===s?'#e31b23':'#2e2e38'),background:restPreset===s?'rgba(227,27,35,.15)':'transparent',color:restPreset===s?'#e31b23':'#7a7a8a',fontSize:'.72rem',fontWeight:700,cursor:'pointer',transition:'all .15s',outline:'none'}}>
                          {s}s
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <motion.button whileTap={{scale:.98}}
                    onClick={()=>{vibrate(30);setCursor(0);setAllSets({});setStarted(true);}}
                    disabled={planItems.length===0}
                    style={{width:'100%',background:planItems.length===0?'rgba(227,27,35,.3)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'15px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:planItems.length===0?'not-allowed':'pointer',boxShadow:planItems.length===0?'none':'0 4px 20px rgba(227,27,35,.35)',outline:'none'}}>
                    Iniciar Treino →
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {mode==='livre' && (
          <motion.div key="livre" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:.2}}>
            <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,padding:'1.75rem',textAlign:'center',display:'grid',gap:'1rem'}}>
              <motion.div initial={{scale:.8}} animate={{scale:1}} transition={{type:'spring',stiffness:200}} style={{fontSize:'3.5rem'}}>🏋️</motion.div>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
                  Treino <span style={{color:'#e31b23'}}>Livre</span>
                </div>
                <div style={{fontSize:'.82rem',color:'#7a7a8a',marginTop:'.5rem',lineHeight:1.6}}>Sem ficha? Sem problema.</div>
              </div>
              <motion.button whileTap={{scale:.97}} onClick={()=>{vibrate(30);setStarted(true);}}
                style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'15px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.35)',outline:'none'}}>
                Começar →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );

  // ── SESSÃO ATIVA — COM FICHA ──────────────────────────────────────
  if(mode==='plan') return (
    <PageShell>
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
        <div>
          <div style={{fontSize:'.58rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em'}}>Em andamento</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{resolvedPlan?.name}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'.65rem'}}>
          <div style={{textAlign:'right'}}>
            <motion.div key={Math.floor(elapsed/60)} initial={{scale:1.05}} animate={{scale:1}}
              style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:'#e31b23',lineHeight:1}}>
              {fmtTime(elapsed)}
            </motion.div>
            <div style={{fontSize:'.55rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>duração</div>
          </div>
          <motion.button whileTap={{scale:.95}}
            onClick={()=>{if(confirm('Encerrar sem salvar?')){vibrate(30);setStarted(false);}}}
            style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'0 .65rem',height:34,fontSize:'.75rem',fontWeight:700,color:'#7a7a8a',cursor:'pointer',outline:'none'}}>✕</motion.button>
        </div>
      </motion.div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1}} style={{marginBottom:'.75rem'}}>
        <div style={{height:4,background:'#2e2e38',borderRadius:2,overflow:'hidden'}}>
          <motion.div animate={{width:`${((cursor+1)/planItems.length)*100}%`}} transition={{duration:.4,ease:'easeOut'}}
            style={{height:'100%',background:'#e31b23',borderRadius:2}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'4px'}}>
          <div style={{fontSize:'.6rem',color:'#484858'}}>{cursor+1} de {planItems.length} exercícios</div>
          <div style={{fontSize:'.6rem',color:'#484858'}}>{Object.values(allSets).flat().filter(s=>s.r).length} séries registradas</div>
        </div>
      </motion.div>

      <div style={{display:'flex',gap:'.3rem',overflowX:'auto',marginBottom:'.75rem',paddingBottom:'.25rem',scrollbarWidth:'none'}}>
        {planItems.map((ex,i)=>{
          const done=(allSets[i]||[]).some(s=>s.r.trim());
          const active=cursor===i;
          return (
            <motion.button key={i} whileTap={{scale:.9}} onClick={()=>{setPrevCursor(cursor);setCursor(i);}}
              style={{flexShrink:0,width:36,height:36,borderRadius:8,border:'1px solid '+(active?'#e31b23':done?'rgba(34,197,94,.3)':'#2e2e38'),background:active?'rgba(227,27,35,.15)':done?'rgba(34,197,94,.08)':'rgba(255,255,255,.03)',color:active?'#e31b23':done?'#4ade80':'#484858',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.8rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',outline:'none'}}>
              {done?'✓':i+1}
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
            style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,marginBottom:'.75rem',overflow:'hidden'}}>
            <div style={{padding:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1rem'}}>
                <motion.button whileTap={{scale:.93}} onClick={()=>setShowGif(currentEx.name)}
                  style={{background:'none',border:'none',cursor:'pointer',padding:0,borderRadius:10,overflow:'hidden',flexShrink:0,outline:'none'}}>
                  <ExGif name={currentEx.name} size={72}/>
                </motion.button>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{display:'inline-block',fontSize:'.58rem',color:'#e31b23',fontWeight:700,background:'rgba(227,27,35,.1)',borderRadius:4,padding:'1px 6px',marginBottom:4}}>{cursor+1}/{planItems.length}</span>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.15rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1.1,wordBreak:'break-word',whiteSpace:'normal'}}>{currentEx.name}</div>
                  <div style={{fontSize:'.62rem',color:'#484858',marginTop:'3px'}}>{currentEx.setsPlanned} séries · {currentEx.repsTarget} reps</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2.2rem',gap:'.5rem',padding:'0 .25rem .3rem'}}>
                {['#','Kg','Reps',''].map((h,i)=>(
                  <div key={i} style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em',textAlign:i>0?'center':'left'}}>{h}</div>
                ))}
              </div>

              <div style={{display:'grid',gap:'.4rem',marginBottom:'.75rem'}}>
                <AnimatePresence>
                  {currentSets.map((s,si)=>{
                    const key=`${cursor}-${si}`;
                    const isDone=checkedSets[key]||s.done;
                    return (
                      <motion.div key={si} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-20}} transition={{delay:si*.04}}
                        style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2.2rem',gap:'.5rem',alignItems:'center',background:isDone?'rgba(34,197,94,.05)':'rgba(0,0,0,.25)',border:'1px solid '+(isDone?'rgba(34,197,94,.25)':s.r?'rgba(255,255,255,.08)':'#2e2e38'),borderRadius:10,padding:'.5rem .35rem',transition:'all .2s'}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',color:isDone?'#4ade80':'#484858',textAlign:'center'}}>{si+1}</div>
                        <input type="number" min="0" step="0.5" placeholder="0" value={s.w} onChange={e=>updateSet(si,'w',e.target.value)}
                          style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.9rem',color:'#fff',height:36,padding:'0 .2rem',outline:'none',width:'100%'}}/>
                        <input type="number" min="0" placeholder="0" value={s.r} onChange={e=>updateSet(si,'r',e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSetDone(si)}
                          style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.9rem',color:'#fff',height:36,padding:'0 .2rem',outline:'none',width:'100%'}}/>
                        <motion.button whileTap={{scale:.85}} onClick={()=>handleSetDone(si)}
                          style={{width:32,height:32,borderRadius:'50%',border:'1px solid '+(isDone?'rgba(34,197,94,.6)':s.r?'rgba(34,197,94,.3)':'#2e2e38'),background:isDone?'rgba(34,197,94,.2)':s.r?'rgba(34,197,94,.08)':'transparent',color:isDone?'#4ade80':s.r?'#4ade80':'#484858',fontSize:'.9rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',outline:'none'}}>✓</motion.button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.97}}
                  onClick={()=>setAllSets(prev=>{const cur=[...(prev[cursor]||[])];cur.push({w:'',r:'',done:false});return{...prev,[cursor]:cur};})}
                  style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:8,color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,height:36,cursor:'pointer',outline:'none'}}>+ Série</motion.button>
                {currentSets.length>1 && (
                  <motion.button whileTap={{scale:.97}}
                    onClick={()=>setAllSets(prev=>{const cur=(prev[cursor]||[]).slice(0,-1);return{...prev,[cursor]:cur};})}
                    style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.2)',borderRadius:8,color:'#e31b23',fontSize:'.8rem',fontWeight:700,height:36,padding:'0 .75rem',cursor:'pointer',outline:'none'}}>− Série</motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{display:'flex',gap:'.5rem'}}>
        <motion.button whileTap={{scale:.97}} onClick={()=>{setPrevCursor(cursor);setCursor(c=>Math.max(0,c-1));}} disabled={cursor===0}
          style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:10,color:cursor===0?'#2e2e38':'#7a7a8a',height:46,fontSize:'.85rem',fontWeight:700,cursor:cursor===0?'not-allowed':'pointer',outline:'none'}}>← Anterior</motion.button>
        {cursor<planItems.length-1 ? (
          <motion.button whileTap={{scale:.97}} onClick={()=>{vibrate(20);setPrevCursor(cursor);setCursor(c=>c+1);}}
            style={{flex:2,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:10,color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',height:46,boxShadow:'0 2px 12px rgba(227,27,35,.3)',cursor:'pointer',outline:'none'}}>Próximo →</motion.button>
        ) : (
          <motion.button whileTap={{scale:.97}} onClick={saveSession}
            style={{flex:2,background:'linear-gradient(135deg,#22c55e,#15803d)',border:'none',borderRadius:10,color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',height:46,boxShadow:'0 2px 12px rgba(34,197,94,.3)',cursor:'pointer',outline:'none'}}>Finalizar 💪</motion.button>
        )}
      </div>
    </PageShell>
  );

  // ── SESSÃO ATIVA — TREINO LIVRE ───────────────────────────────────
  return (
    <PageShell>
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
        <div>
          <span style={{display:'inline-block',fontSize:'.6rem',color:'#e31b23',fontWeight:700,background:'rgba(227,27,35,.1)',borderRadius:4,padding:'1px 6px',letterSpacing:'.06em',marginBottom:3}}>TREINO LIVRE</span>
          <motion.div key={Math.floor(elapsed/60)} initial={{scale:1.05}} animate={{scale:1}}
            style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',color:'#e31b23',lineHeight:1}}>
            {fmtTime(elapsed)}
          </motion.div>
        </div>
        <div style={{display:'flex',gap:'.5rem'}}>
          <motion.button whileTap={{scale:.95}} onClick={()=>{if(confirm('Encerrar sem salvar?')){vibrate(30);setStarted(false);}}}
            style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'0 .65rem',height:36,fontSize:'.75rem',fontWeight:700,color:'#7a7a8a',cursor:'pointer',outline:'none'}}>✕</motion.button>
          <motion.button whileTap={{scale:.97}} onClick={saveLivre}
            style={{background:'linear-gradient(135deg,#22c55e,#15803d)',border:'none',borderRadius:8,color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.78rem',textTransform:'uppercase',height:36,padding:'0 .9rem',boxShadow:'0 2px 10px rgba(34,197,94,.25)',cursor:'pointer',outline:'none'}}>Salvar 💪</motion.button>
        </div>
      </motion.div>

      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'.75rem',padding:'.75rem'}}>
        <input value={livreBusca} onChange={e=>setLivreBusca(e.target.value)} placeholder="🔍 Adicionar exercício…"
          style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',height:42,fontSize:'.9rem',padding:'0 13px',outline:'none'}}/>
        <AnimatePresence>
          {livreBusca.length>=1 && (
            <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
              style={{marginTop:'.5rem',maxHeight:220,overflowY:'auto',display:'grid',gap:'.3rem'}}>
              {ALL_EXS.filter(n=>n.toLowerCase().includes(livreBusca.toLowerCase())).slice(0,8).map(n=>(
                <motion.button key={n} whileTap={{scale:.98}}
                  onClick={()=>{vibrate(20);setLivreExs(prev=>[{name:n,sets:[{w:'',r:'',done:false}]},...prev]);setLivreBusca('');}}
                  style={{display:'flex',alignItems:'center',gap:'.6rem',background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:8,padding:'.45rem .65rem',textAlign:'left',cursor:'pointer',outline:'none'}}>
                  <ExGif name={n} size={40}/>
                  <span style={{fontSize:'.85rem',color:'#f0f0f2',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n}</span>
                  <span style={{color:'#e31b23',fontWeight:700,fontSize:'1.1rem',flexShrink:0}}>+</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {livreExs.length===0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{textAlign:'center',padding:'2rem 1rem',border:'1px dashed #2e2e38',borderRadius:12,color:'#484858',fontSize:'.85rem'}}>
          Use a busca acima para adicionar exercícios
        </motion.div>
      )}

      <div style={{display:'grid',gap:'.65rem'}}>
        <AnimatePresence>
          {livreExs.map((ex,ei)=>(
            <motion.div key={ei} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-30,height:0}} transition={{duration:.2}}
              style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,overflow:'hidden'}}>
              <div style={{padding:'.85rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'.75rem'}}>
                  <motion.button whileTap={{scale:.93}} onClick={()=>setShowGif(ex.name)}
                    style={{background:'none',border:'none',cursor:'pointer',padding:0,borderRadius:8,overflow:'hidden',flexShrink:0,outline:'none'}}>
                    <ExGif name={ex.name} size={52}/>
                  </motion.button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',color:'#f0f0f2',wordBreak:'break-word',whiteSpace:'normal',lineHeight:1.2}}>{ex.name}</div>
                    <div style={{fontSize:'.62rem',color:'#484858',marginTop:'1px'}}>{ex.sets.length} série(s)</div>
                  </div>
                  <motion.button whileTap={{scale:.9}} onClick={()=>{vibrate(20);setLivreExs(prev=>prev.filter((_,i)=>i!==ei));}}
                    style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.2)',borderRadius:6,padding:'0 .4rem',height:30,fontSize:'.75rem',fontWeight:700,color:'#e31b23',cursor:'pointer',flexShrink:0,outline:'none'}}>✕</motion.button>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2.2rem',gap:'.5rem',padding:'0 .25rem .2rem'}}>
                  {['#','Kg','Reps',''].map((h,i)=>(
                    <div key={i} style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em',textAlign:i>0?'center':'left'}}>{h}</div>
                  ))}
                </div>

                <div style={{display:'grid',gap:'.3rem',marginBottom:'.5rem'}}>
                  <AnimatePresence>
                    {ex.sets.map((s,si)=>{
                      const isDone=s.done;
                      return (
                        <motion.div key={si} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{delay:si*.03}}
                          style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2.2rem',gap:'.5rem',alignItems:'center',background:isDone?'rgba(34,197,94,.05)':'rgba(0,0,0,.25)',border:'1px solid '+(isDone?'rgba(34,197,94,.2)':'#2e2e38'),borderRadius:8,padding:'.4rem .3rem',transition:'all .2s'}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.85rem',color:isDone?'#4ade80':'#484858',textAlign:'center'}}>{si+1}</div>
                          <input type="number" min="0" step="0.5" placeholder="0" value={s.w}
                            onChange={e=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,w:e.target.value})}))}
                            style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.88rem',color:'#fff',height:34,padding:'0 .2rem',outline:'none',width:'100%'}}/>
                          <input type="number" min="0" placeholder="0" value={s.r}
                            onChange={e=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,r:e.target.value})}))}
                            style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.88rem',color:'#fff',height:34,padding:'0 .2rem',outline:'none',width:'100%'}}/>
                          <motion.button whileTap={{scale:.85}}
                            onClick={()=>{
                              if(s.r){
                                playBeep('tick');
                                vibrate([40,20,40]);
                                setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,done:true})}));
                                setRestSecs(restPreset);setShowRest(true);
                              }
                            }}
                            style={{width:32,height:32,borderRadius:'50%',border:'1px solid '+(isDone?'rgba(34,197,94,.6)':s.r?'rgba(34,197,94,.3)':'#2e2e38'),background:isDone?'rgba(34,197,94,.2)':s.r?'rgba(34,197,94,.08)':'transparent',color:isDone?'#4ade80':s.r?'#4ade80':'#484858',fontSize:'.85rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',outline:'none'}}>✓</motion.button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div style={{display:'flex',gap:'.4rem'}}>
                  <motion.button whileTap={{scale:.97}}
                    onClick={()=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:[...ex2.sets,{w:'',r:'',done:false}]}))}
                    style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:7,color:'#7a7a8a',fontSize:'.78rem',fontWeight:700,height:32,cursor:'pointer',outline:'none'}}>+ Série</motion.button>
                  {ex.sets.length>1 && (
                    <motion.button whileTap={{scale:.97}}
                      onClick={()=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.slice(0,-1)}))}
                      style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.2)',borderRadius:7,color:'#e31b23',fontSize:'.78rem',fontWeight:700,height:32,padding:'0 .65rem',cursor:'pointer',outline:'none'}}>− Série</motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {livreExs.length>0 && (
        <motion.button initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} whileTap={{scale:.98}} onClick={saveLivre}
          style={{width:'100%',marginTop:'.85rem',background:'linear-gradient(135deg,#22c55e,#15803d)',border:'none',borderRadius:14,padding:'15px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',boxShadow:'0 4px 20px rgba(34,197,94,.3)',cursor:'pointer',outline:'none'}}>
          Finalizar Treino 💪
        </motion.button>
      )}
    </PageShell>
  );
}
