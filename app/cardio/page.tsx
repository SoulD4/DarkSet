'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Timer, MapPin, Flame, Zap, RotateCcw, X,
  ChevronRight, TrendingUp, Clock, Activity,
  Play, Pause, Save, History, Satellite
} from 'lucide-react';
import {
  PersonSimpleRun, Bicycle, PersonSimpleWalk,
  Lightning, Waves, PersonSimpleSwim, ArrowsClockwise,
  Heartbeat, Barbell
} from '@phosphor-icons/react';

// ── Tipos ────────────────────────────────────────────────────
type Coords   = { lat: number; lng: number };
type CardioSession = {
  id: string;
  tipo: string;
  nome: string;
  cor: string;
  tempo: number;
  distancia: number;
  calorias: number;
  pace: string;
  notas: string;
  gps: boolean;
  date: string;
  savedAt: number;
};

const TIPOS = [
  { id:'corrida',   nome:'Corrida',   Icon:PersonSimpleRun,  gps:true,  cor:'#e31b23' },
  { id:'bike',      nome:'Bike',      Icon:Bicycle,          gps:true,  cor:'#f97316' },
  { id:'caminhada', nome:'Caminhada', Icon:PersonSimpleWalk, gps:true,  cor:'#22c55e' },
  { id:'hiit',      nome:'HIIT',      Icon:Lightning,        gps:false, cor:'#facc15' },
  { id:'natacao',   nome:'Natação',   Icon:PersonSimpleSwim, gps:false, cor:'#38bdf8' },
  { id:'eliptico',  nome:'Elíptico',  Icon:ArrowsClockwise,  gps:false, cor:'#a78bfa' },
  { id:'corda',     nome:'Corda',     Icon:Heartbeat,        gps:false, cor:'#fb7185' },
  { id:'livre',     nome:'Livre',     Icon:Barbell,          gps:false, cor:'#9898a8' },
];

const fmt = (s: number) =>
  `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

const fmtH = (s: number) => {
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  if(h > 0) return `${h}h${String(m).padStart(2,'0')}`;
  return `${m}min`;
};

const calcPace = (d: number, s: number): string => {
  if(!d||!s) return '--:--';
  const p = (s/60)/d;
  return `${Math.floor(p)}:${String(Math.round((p%1)*60)).padStart(2,'0')}/km`;
};

const todayKey = () => new Date().toISOString().slice(0,10);

const haversine = (a: Coords, b: Coords): number => {
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};

// ── Página ────────────────────────────────────────────────────
export default function CardioPage() {
  const [uid,      setUid]      = useState<string|null>(null);
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<'home'|'sessao'|'historico'>('home');
  const [tipo,     setTipo]     = useState<typeof TIPOS[0]|null>(null);
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [dist,     setDist]     = useState('');
  const [notas,    setNotas]    = useState('');
  const [useGPS,   setUseGPS]   = useState(true);
  const [gpsStatus,setGpsStatus]= useState<'idle'|'waiting'|'ok'|'error'>('idle');
  const [distGPS,  setDistGPS]  = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState('');

  const timerRef   = useRef<NodeJS.Timeout|null>(null);
  const startTsRef = useRef(0);
  const elapsedRef = useRef(0);
  const watchRef   = useRef<number|null>(null);
  const lastRef    = useRef<Coords|null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db,'users',u.uid,'data','cardio'));
        if(snap.exists()) setSessions(JSON.parse(snap.data().payload||'[]'));
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  // Timer timestamp-based
  useEffect(()=>{
    if(running){
      if(!startTsRef.current) startTsRef.current = Date.now() - elapsedRef.current*1000;
      timerRef.current = setInterval(()=>{
        const s = Math.floor((Date.now()-startTsRef.current)/1000);
        elapsedRef.current = s;
        setElapsed(s);
      }, 500);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
    }
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[running]);

  // GPS watch
  useEffect(()=>{
    if(!running||!useGPS||!tipo?.gps) return;
    if(!navigator.geolocation){ setGpsStatus('error'); return; }
    setGpsStatus('waiting');
    watchRef.current = navigator.geolocation.watchPosition(
      ({coords:{latitude:lat,longitude:lng,accuracy}})=>{
        if(accuracy>50) return;
        setGpsStatus('ok');
        if(lastRef.current){
          const d = haversine(lastRef.current,{lat,lng});
          if(d>0.003){ setDistGPS(p=>Math.round((p+d)*1000)/1000); lastRef.current={lat,lng}; }
        } else { lastRef.current={lat,lng}; }
      },
      ()=>setGpsStatus('error'),
      {enableHighAccuracy:true,timeout:10000,maximumAge:2000}
    );
    return ()=>{ if(watchRef.current!=null) navigator.geolocation.clearWatch(watchRef.current); };
  },[running,useGPS,tipo]);

  const distancia = tipo?.gps&&useGPS ? distGPS : parseFloat(dist||'0');
  const pace      = calcPace(distancia, elapsed);
  const calorias  = Math.round(distancia*70*0.72 + elapsed*0.05);

  const iniciar = (t: typeof TIPOS[0]) => {
    setTipo(t); setElapsed(0); setRunning(false);
    setDist(''); setNotas(''); setDistGPS(0);
    setGpsStatus('idle'); lastRef.current=null;
    startTsRef.current=0; elapsedRef.current=0;
    setView('sessao');
  };

  const salvar = async () => {
    if(!tipo) return;
    setSaving(true);
    if(watchRef.current!=null) navigator.geolocation.clearWatch(watchRef.current);
    setRunning(false);

    const session: CardioSession = {
      id: String(Date.now()),
      tipo: tipo.id,
      nome: tipo.nome,
      cor: tipo.cor,
      tempo: elapsed,
      distancia,
      calorias,
      pace: distancia>0?pace:'--',
      notas,
      gps: !!(tipo.gps&&useGPS),
      date: todayKey(),
      savedAt: Date.now(),
    };

    const newSessions = [session, ...sessions];
    setSessions(newSessions);

    if(uid){
      try {
        await setDoc(doc(db,'users',uid,'data','cardio'),{
          payload: JSON.stringify(newSessions),
          updatedAt: Date.now(),
        });
      } catch(e){ console.error(e); }
    }

    setSaving(false);
    showToast('Cardio salvo! 🔥');
    setView('home');
  };

  const deleteSession = async (id: string) => {
    const newSessions = sessions.filter(s=>s.id!==id);
    setSessions(newSessions);
    if(uid){
      try {
        await setDoc(doc(db,'users',uid,'data','cardio'),{
          payload: JSON.stringify(newSessions),
          updatedAt: Date.now(),
        });
      } catch(e){ console.error(e); }
    }
    showToast('Sessão excluída');
  };

  // Stats reais
  const totalSessoes = sessions.length;
  const totalDist    = sessions.reduce((a,s)=>a+s.distancia,0);
  const totalTempo   = sessions.reduce((a,s)=>a+s.tempo,0);
  const thisMonth    = sessions.filter(s=>s.date.slice(0,7)===todayKey().slice(0,7));
  const distMes      = thisMonth.reduce((a,s)=>a+s.distancia,0);

  // Streak
  const streak = (() => {
    const dates = Array.from(new Set(sessions.map(s=>s.date))).sort().reverse();
    let count=0, expect=todayKey();
    for(const d of dates){
      if(d===expect){ count++; const dt=new Date(d+'T12:00:00'); dt.setDate(dt.getDate()-1); expect=dt.toISOString().slice(0,10); }
      else break;
    }
    return count;
  })();

  // ── LOADING ──────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  // ── SESSÃO ATIVA ──────────────────────────────────────────────
  if(view==='sessao'&&tipo) {
    const TipoIcon = tipo.Icon;
    return (
      <PageShell>
        <AnimatePresence>
          {toast && (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)'}}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${tipo.cor}22`,border:`1px solid ${tipo.cor}44`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <TipoIcon size={24} color={tipo.cor} weight="fill"/>
            </div>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{tipo.nome}</div>
              <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px'}}>
                {running?'Em andamento...':elapsed>0?'Pausado':'Pronto para iniciar'}
              </div>
            </div>
          </div>
          <motion.button whileTap={{scale:.95}}
            onClick={()=>{setRunning(false);if(watchRef.current!=null)navigator.geolocation.clearWatch(watchRef.current);setView('home');}}
            style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .8rem',color:'#7a7a8a',fontSize:'.78rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem'}}>
            <X size={14}/> Sair
          </motion.button>
        </motion.div>

        {/* Timer principal */}
        <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{delay:.1}}>
          <Card style={{background:'linear-gradient(135deg,#1a1a20,#12121a)',border:'1px solid #2e2e38',borderRadius:20,marginBottom:'.75rem',overflow:'hidden',position:'relative'}}>
            {running&&(
              <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 50%,${tipo.cor}12 0%,transparent 70%)`,pointerEvents:'none'}}/>
            )}
            <CardContent style={{padding:'2rem 1.5rem',textAlign:'center'}}>
              <motion.div
                key={Math.floor(elapsed/60)}
                initial={{scale:1.02}} animate={{scale:1}}
                style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'5.5rem',letterSpacing:'.02em',lineHeight:1,color:running?tipo.cor:'#f0f0f2',transition:'color .3s',textShadow:running?`0 0 40px ${tipo.cor}55`:'none'}}>
                {fmt(elapsed)}
              </motion.div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',marginTop:'.4rem'}}>
                <Timer size={12} color="#484858"/>
                <span style={{fontSize:'.58rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.14em'}}>tempo de atividade</span>
              </div>

              {/* Stats ao vivo */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.5rem',marginTop:'1.25rem'}}>
                {[
                  {val:distancia>0?distancia.toFixed(2):'0.00', unit:'km', label:'distância', color:tipo.cor, Icon:MapPin},
                  {val:distancia>0?pace:'--:--', unit:'', label:'pace/km', color:'#f0f0f2', Icon:TrendingUp},
                  {val:calorias>0?String(calorias):'0', unit:'kcal', label:'calorias', color:'#f97316', Icon:Flame},
                ].map((s,i)=>(
                  <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15+i*.05}}>
                    <div style={{background:'rgba(0,0,0,.35)',border:'1px solid #2e2e38',borderRadius:12,padding:'.75rem .5rem'}}>
                      <s.Icon size={14} color={s.color} style={{marginBottom:4}}/>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:s.color,lineHeight:1}}>
                        {s.val}<span style={{fontSize:'.6rem',color:'#484858',marginLeft:'2px'}}>{s.unit}</span>
                      </div>
                      <div style={{fontSize:'.5rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.08em',marginTop:'3px'}}>{s.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Controles */}
              <div style={{display:'flex',gap:'.6rem',marginTop:'1.25rem'}}>
                <motion.button whileTap={{scale:.97}} onClick={()=>setRunning(r=>!r)} style={{
                  flex:1,borderRadius:14,padding:'1rem',border:'none',cursor:'pointer',
                  background:running?'rgba(227,27,35,.12)':tipo.cor,
                  color:running?tipo.cor:'#fff',
                  fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',
                  textTransform:'uppercase',letterSpacing:'.06em',
                  boxShadow:running?'none':`0 4px 24px ${tipo.cor}44`,
                  outline:running?`1px solid ${tipo.cor}44`:'none',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',
                }}>
                  {running ? <><Pause size={18}/> Pausar</> : elapsed>0 ? <><Play size={18}/> Retomar</> : <><Play size={18}/> Iniciar</>}
                </motion.button>
                <motion.button whileTap={{scale:.95}}
                  onClick={()=>{setRunning(false);setElapsed(0);elapsedRef.current=0;startTsRef.current=0;setDistGPS(0);lastRef.current=null;}}
                  style={{background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:14,padding:'1rem 1.1rem',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <RotateCcw size={18}/>
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* GPS card */}
        {tipo.gps && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.2}}>
            <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'.75rem'}}>
              <CardContent style={{padding:'1rem'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:gpsStatus!=='idle'?'.6rem':0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                    <Satellite size={16} color="#7a7a8a"/>
                    <span style={{fontSize:'.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'#9898a8'}}>GPS</span>
                    {gpsStatus==='ok'&&(
                      <motion.div animate={{opacity:[1,.3,1]}} transition={{duration:1.2,repeat:Infinity}}
                        style={{width:7,height:7,borderRadius:'50%',background:'#22c55e'}}/>
                    )}
                  </div>
                  <motion.button whileTap={{scale:.95}} onClick={()=>setUseGPS(g=>!g)} style={{
                    fontSize:'.68rem',fontWeight:700,padding:'.25rem .7rem',borderRadius:8,cursor:'pointer',
                    border:`1px solid ${useGPS?'rgba(227,27,35,.3)':'#2e2e38'}`,
                    background:useGPS?'rgba(227,27,35,.1)':'rgba(255,255,255,.04)',
                    color:useGPS?'#e31b23':'#9898a8',outline:'none',
                    display:'flex',alignItems:'center',gap:'.3rem',
                  }}>
                    {useGPS ? <><Satellite size={12}/> Auto</> : <><Activity size={12}/> Manual</>}
                  </motion.button>
                </div>

                {useGPS && gpsStatus!=='idle' && (
                  <div style={{fontSize:'.78rem',fontWeight:600,
                    color:gpsStatus==='ok'?'#22c55e':gpsStatus==='error'?'#f87171':'#9898a8',
                    background:gpsStatus==='ok'?'rgba(34,197,94,.08)':'rgba(255,255,255,.04)',
                    border:`1px solid ${gpsStatus==='ok'?'rgba(34,197,94,.2)':'#2e2e38'}`,
                    borderRadius:8,padding:'.5rem .75rem',display:'flex',alignItems:'center',gap:'.5rem'}}>
                    {gpsStatus==='ok' ? <><MapPin size={14}/> Rastreando — {distGPS.toFixed(2)}km</> :
                     gpsStatus==='error' ? <><X size={14}/> Permissão negada</> :
                     <><Clock size={14}/> Aguardando sinal...</>}
                  </div>
                )}

                {!useGPS && (
                  <div>
                    <label style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:5}}>Distância (km)</label>
                    <input type="number" step="0.1" placeholder="0.0" value={dist} onChange={e=>setDist(e.target.value)}
                      style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:8,color:'#f0f0f2',padding:'10px 13px',fontSize:'1rem',outline:'none'}}/>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notas + Salvar */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.25}}>
          <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
            <CardContent style={{padding:'1rem'}}>
              <label style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:5}}>Como foi? (opcional)</label>
              <textarea placeholder="Condições, sensação, observações..." value={notas} onChange={e=>setNotas(e.target.value)} rows={2}
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:8,color:'#f0f0f2',padding:'10px 13px',fontSize:'.88rem',outline:'none',resize:'none',fontFamily:'Inter,sans-serif',marginBottom:'.75rem'}}/>
              <motion.button whileTap={{scale:.97}} onClick={salvar} disabled={saving} style={{
                width:'100%',background:saving?'rgba(227,27,35,.4)':'linear-gradient(135deg,#e31b23,#b31217)',
                border:'none',borderRadius:12,padding:'14px',color:'#fff',
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',
                textTransform:'uppercase',letterSpacing:'.05em',cursor:saving?'not-allowed':'pointer',
                boxShadow:saving?'none':'0 4px 20px rgba(227,27,35,.3)',
                display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',outline:'none',
              }}>
                {saving ? <><motion.div animate={{rotate:360}} transition={{duration:.6,repeat:Infinity,ease:'linear'}} style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%'}}/> Salvando…</> : <><Save size={18}/> Salvar Cardio</>}
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>
      </PageShell>
    );
  }

  // ── HISTÓRICO ─────────────────────────────────────────────────
  if(view==='historico') return (
    <PageShell>
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
        <motion.button whileTap={{scale:.95}} onClick={()=>setView('home')}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .8rem',color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
          ← Voltar
        </motion.button>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>Histórico</div>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'2px'}}>{sessions.length} sessão(ões)</div>
        </div>
      </motion.div>

      {sessions.length===0 ? (
        <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'3rem 1rem',textAlign:'center'}}>
            <Activity size={40} color="#484858" style={{margin:'0 auto .75rem'}}/>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#484858',textTransform:'uppercase'}}>Nenhuma sessão ainda</div>
          </CardContent>
        </Card>
      ) : (
        <div style={{display:'grid',gap:'.5rem'}}>
          {sessions.map((s,i)=>{
            const TipoIcon = TIPOS.find(t=>t.id===s.tipo)?.Icon || Activity;
            return (
              <motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                  <CardContent style={{padding:'.85rem 1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`${s.cor}22`,border:`1px solid ${s.cor}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <TipoIcon size={20} color={s.cor} weight="fill"/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2',lineHeight:1}}>{s.nome}</div>
                        <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px'}}>
                          {s.date} · {s.distancia>0?`${s.distancia.toFixed(1)}km`:'sem dist.'} · {s.pace!='--'?s.pace:'—'}
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.05rem',color:s.cor}}>{fmt(s.tempo)}</div>
                        <div style={{fontSize:'.58rem',color:'#7a7a8a'}}>{s.calorias} kcal</div>
                      </div>
                      <motion.button whileTap={{scale:.9}} onClick={()=>deleteSession(s.id)}
                        style={{background:'rgba(227,27,35,.07)',border:'1px solid rgba(227,27,35,.15)',borderRadius:6,padding:'.3rem .4rem',color:'#e31b23',cursor:'pointer',outline:'none',flexShrink:0,display:'flex'}}>
                        <X size={14}/>
                      </motion.button>
                    </div>
                    {s.notas && (
                      <>
                        <Separator style={{background:'rgba(255,255,255,.05)',margin:'.6rem 0'}}/>
                        <div style={{fontSize:'.72rem',color:'#7a7a8a',fontStyle:'italic'}}>{s.notas}</div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageShell>
  );

  // ── HOME ──────────────────────────────────────────────────────
  const recentSessions = sessions.slice(0,3);

  return (
    <PageShell>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)'}}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
            DARK<span style={{color:'#e31b23'}}>CARDIO</span>
          </div>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'2px',letterSpacing:'.06em'}}>Registre sua atividade</div>
        </div>
        <motion.button whileTap={{scale:.95}} onClick={()=>setView('historico')}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'.45rem .9rem',color:'#9898a8',fontSize:'.75rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.35rem'}}>
          <History size={14}/> Histórico
        </motion.button>
      </motion.div>

      {/* Stats reais */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.5rem',marginBottom:'1.25rem'}}>
        {[
          {val:String(streak)||'0', Icon:Flame,   label:'Streak dias', color:'#f97316'},
          {val:distMes>0?`${distMes.toFixed(1)}km`:'0km', Icon:MapPin,   label:'Este mês',   color:'#e31b23'},
          {val:totalTempo>0?fmtH(totalTempo):'0min', Icon:Clock,  label:'Tempo total', color:'#9898a8'},
        ].map((s,i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1+i*.06}}>
            <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
              <CardContent style={{padding:'.85rem .5rem',textAlign:'center'}}>
                <s.Icon size={18} color={s.color} style={{margin:'0 auto .3rem'}}/>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:s.color,lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:'.48rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'3px'}}>{s.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Label */}
      <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7a7a8a',marginBottom:'.65rem'}}>
        Selecione a atividade
      </div>

      {/* Grid principal — Corrida e Bike em destaque */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15}}
        style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem',marginBottom:'.6rem'}}>
        {TIPOS.slice(0,2).map((t,i)=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.97}} onClick={()=>iniciar(t)} style={{
              background:`linear-gradient(135deg,${t.cor}18,${t.cor}08)`,
              border:`1px solid ${t.cor}33`,
              borderRadius:16,padding:'1.25rem 1rem',
              display:'flex',flexDirection:'column',gap:'.5rem',
              cursor:'pointer',textAlign:'left',
              position:'relative',overflow:'hidden',outline:'none',
            }}>
              <div style={{position:'absolute',top:-8,right:-8,opacity:.12}}>
                <TIcon size={72} color={t.cor} weight="fill"/>
              </div>
              <TIcon size={28} color={t.cor} weight="fill"/>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',letterSpacing:'.04em'}}>{t.nome}</div>
                <div style={{display:'flex',alignItems:'center',gap:'.25rem',marginTop:'2px'}}>
                  <MapPin size={10} color={t.cor}/>
                  <span style={{fontSize:'.6rem',color:t.cor,fontWeight:700}}>GPS ativo</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Caminhada + HIIT */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.2}}
        style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem',marginBottom:'1rem'}}>
        {TIPOS.slice(2,4).map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.97}} onClick={()=>iniciar(t)} style={{
              background:`linear-gradient(135deg,${t.cor}15,${t.cor}06)`,
              border:`1px solid ${t.cor}28`,
              borderRadius:14,padding:'1rem',
              display:'flex',alignItems:'center',gap:'.75rem',
              cursor:'pointer',outline:'none',
            }}>
              <TIcon size={26} color={t.cor} weight="fill"/>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',color:'#f0f0f2'}}>{t.nome}</div>
                {t.gps && (
                  <div style={{display:'flex',alignItems:'center',gap:'.25rem',marginTop:'2px'}}>
                    <MapPin size={10} color={t.cor}/>
                    <span style={{fontSize:'.58rem',color:t.cor,fontWeight:700}}>GPS</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Outros tipos */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.25}}
        style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.25rem',marginBottom:'1.25rem',scrollbarWidth:'none'}}>
        {TIPOS.slice(4).map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.95}} onClick={()=>iniciar(t)} style={{
              background:'#1e1e24',border:'1px solid #2e2e38',
              borderRadius:12,padding:'.65rem .9rem',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'.35rem',
              cursor:'pointer',flexShrink:0,minWidth:68,outline:'none',
            }}>
              <TIcon size={22} color={t.cor} weight="fill"/>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.68rem',textTransform:'uppercase',color:'#9898a8'}}>{t.nome}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Recentes */}
      {recentSessions.length > 0 && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.3}}>
          <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7a7a8a',marginBottom:'.6rem'}}>Recentes</div>
          <div style={{display:'grid',gap:'.5rem'}}>
            {recentSessions.map((s,i)=>{
              const TipoIcon = TIPOS.find(t=>t.id===s.tipo)?.Icon || Activity;
              return (
                <motion.div key={s.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:.3+i*.05}}>
                  <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12,cursor:'pointer'}}
                    onClick={()=>setView('historico')}>
                    <CardContent style={{padding:'.85rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <div style={{width:38,height:38,borderRadius:10,background:`${s.cor}22`,border:`1px solid ${s.cor}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <TipoIcon size={18} color={s.cor} weight="fill"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2',lineHeight:1}}>{s.nome}</div>
                        <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px'}}>{s.date} · {s.distancia>0?`${s.distancia.toFixed(1)}km`:'—'} · {s.pace!='--'?s.pace:'—'}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:s.cor}}>{fmt(s.tempo)}</div>
                        <div style={{fontSize:'.58rem',color:'#7a7a8a'}}>{s.calorias} kcal</div>
                      </div>
                      <ChevronRight size={16} color="#484858"/>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {sessions.length===0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.3}}>
          <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14}}>
            <CardContent style={{padding:'2.5rem 1rem',textAlign:'center'}}>
              <Activity size={36} color="#484858" style={{margin:'0 auto .75rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#484858',textTransform:'uppercase',marginBottom:'.4rem'}}>Nenhuma sessão ainda</div>
              <div style={{fontSize:'.78rem',color:'#484858'}}>Selecione uma atividade acima para começar</div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </PageShell>
  );
}
