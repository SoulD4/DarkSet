'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  Timer, MapPin, Flame, RotateCcw, X, ChevronRight, ChevronLeft,
  TrendingUp, Clock, Activity, Play, Pause, Save, History, Satellite,
  Footprints, Bike, PersonStanding, Zap, Waves, RefreshCw, HeartPulse, Dumbbell,
  type LucideIcon,
} from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────
type Coords = { lat: number; lng: number };
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

type Tipo = {
  id: string;
  nome: string;
  Icon: LucideIcon;
  gps: boolean;
  /** Hex legado gravado no campo `cor` do payload (formato preservado). NUNCA usado na UI. */
  cor: string;
  /** Cor de apresentação — token CSS var do design system. */
  css: string;
};

const TIPOS: Tipo[] = [
  { id:'corrida',   nome:'Corrida',   Icon:Footprints,     gps:true,  cor:'#e31b23', css:'var(--chart-1)' },
  { id:'bike',      nome:'Bike',      Icon:Bike,           gps:true,  cor:'#f97316', css:'var(--chart-7)' },
  { id:'caminhada', nome:'Caminhada', Icon:PersonStanding, gps:true,  cor:'#22c55e', css:'var(--chart-5)' },
  { id:'hiit',      nome:'HIIT',      Icon:Zap,            gps:false, cor:'#facc15', css:'var(--chart-4)' },
  { id:'natacao',   nome:'Natação',   Icon:Waves,          gps:false, cor:'#38bdf8', css:'var(--chart-2)' },
  { id:'eliptico',  nome:'Elíptico',  Icon:RefreshCw,      gps:false, cor:'#a78bfa', css:'var(--chart-6)' },
  { id:'corda',     nome:'Corda',     Icon:HeartPulse,     gps:false, cor:'#fb7185', css:'var(--chart-3)' },
  { id:'livre',     nome:'Livre',     Icon:Dumbbell,       gps:false, cor:'#9898a8', css:'var(--ink-2)'   },
];

/** Tinta suave a partir de um token (apenas valores dinâmicos por tipo). */
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

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
  const [tipo,     setTipo]     = useState<Tipo|null>(null);
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [dist,     setDist]     = useState('');
  const [notas,    setNotas]    = useState('');
  const [useGPS,   setUseGPS]   = useState(true);
  const [gpsStatus,setGpsStatus]= useState<'idle'|'waiting'|'ok'|'error'>('idle');
  const [distGPS,  setDistGPS]  = useState(0);
  const [saving,   setSaving]   = useState(false);
  const { toast, show } = useToast();

  const timerRef   = useRef<NodeJS.Timeout|null>(null);
  const startTsRef = useRef(0);
  const elapsedRef = useRef(0);
  const watchRef   = useRef<number|null>(null);
  const lastRef    = useRef<Coords|null>(null);

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

  const iniciar = (t: Tipo) => {
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
    show('Cardio salvo! 🔥');
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
    show('Sessão excluída');
  };

  // Stats reais
  const totalTempo = sessions.reduce((a,s)=>a+s.tempo,0);
  const thisMonth  = sessions.filter(s=>s.date.slice(0,7)===todayKey().slice(0,7));
  const distMes    = thisMonth.reduce((a,s)=>a+s.distancia,0);

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

  const cssOf = (s: CardioSession) => TIPOS.find(t=>t.id===s.tipo)?.css || 'var(--ink-2)';

  // ── LOADING ──────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  // ── SESSÃO ATIVA ──────────────────────────────────────────────
  if(view==='sessao'&&tipo) {
    const TipoIcon = tipo.Icon;
    const sair = () => {
      setRunning(false);
      if(watchRef.current!=null) navigator.geolocation.clearWatch(watchRef.current);
      setView('home');
    };
    return (
      <PageShell hideBottomNav>
        <ToastViewport toast={toast}/>

        {/* Header */}
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
              style={{background:mix(tipo.css,13), borderColor:mix(tipo.css,27)}}>
              <TipoIcon size={22} style={{color:tipo.css}}/>
            </div>
            <div>
              <div className="font-display font-bold text-xl leading-none text-ink-1">{tipo.nome}</div>
              <div className="text-[0.68rem] text-ink-3 mt-1">
                {running?'Em andamento...':elapsed>0?'Pausado':'Pronto para iniciar'}
              </div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={sair}>
            <X size={14}/> Sair
          </Button>
        </motion.div>

        {/* Timer principal */}
        <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{delay:.1}}
          className="card relative overflow-hidden mb-3">
          {running&&(
            <div className="absolute inset-0 pointer-events-none"
              style={{background:`radial-gradient(circle at 50% 50%, ${mix(tipo.css,8)} 0%, transparent 70%)`}}/>
          )}
          <div className="relative px-6 py-8 text-center">
            <motion.div
              key={Math.floor(elapsed/60)}
              initial={{scale:1.02}} animate={{scale:1}}
              className="font-display font-bold tnum text-[4.6rem] leading-none tracking-tight text-ink-1 transition-colors duration-300"
              style={running?{color:tipo.css, textShadow:`0 0 40px ${mix(tipo.css,33)}`}:undefined}>
              {fmt(elapsed)}
            </motion.div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Timer size={12} className="text-ink-3"/>
              <span className="eyebrow">tempo de atividade</span>
            </div>

            {/* Stats ao vivo */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              {[
                {val:distancia>0?distancia.toFixed(2):'0.00', unit:'km', label:'distância', css:tipo.css, Icon:MapPin},
                {val:distancia>0?pace:'--:--', unit:'', label:'pace/km', css:'var(--ink-1)', Icon:TrendingUp},
                {val:calorias>0?String(calorias):'0', unit:'kcal', label:'calorias', css:'var(--chart-7)', Icon:Flame},
              ].map((s,i)=>(
                <motion.div key={s.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15+i*.05}}
                  className="card-2 px-2 py-3 text-center">
                  <s.Icon size={14} className="mx-auto mb-1" style={{color:s.css}}/>
                  <div className="font-display font-bold text-[1.15rem] leading-none tnum" style={{color:s.css}}>
                    {s.val}{s.unit && <span className="text-[0.6rem] text-ink-3 ml-0.5 font-sans">{s.unit}</span>}
                  </div>
                  <div className="eyebrow mt-1.5">{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Controles */}
            <div className="flex gap-2.5 mt-5">
              <Button size="lg" variant={running?'soft':'primary'} className="flex-1 font-display uppercase tracking-wide"
                onClick={()=>setRunning(r=>!r)}>
                {running ? <><Pause size={18}/> Pausar</> : elapsed>0 ? <><Play size={18}/> Retomar</> : <><Play size={18}/> Iniciar</>}
              </Button>
              <Button size="lg" variant="ghost" aria-label="Zerar"
                onClick={()=>{setRunning(false);setElapsed(0);elapsedRef.current=0;startTsRef.current=0;setDistGPS(0);lastRef.current=null;}}>
                <RotateCcw size={18}/>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* GPS card */}
        {tipo.gps && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.2}}
            className="card p-4 mb-3">
            <div className={`flex items-center justify-between ${gpsStatus!=='idle'||!useGPS?'mb-2.5':''}`}>
              <div className="flex items-center gap-2">
                <Satellite size={16} className="text-ink-3"/>
                <span className="eyebrow">GPS</span>
                {gpsStatus==='ok'&&(
                  <motion.div animate={{opacity:[1,.3,1]}} transition={{duration:1.2,repeat:Infinity}}
                    className="w-[7px] h-[7px] rounded-full bg-ok"/>
                )}
              </div>
              <motion.button whileTap={{scale:.95}} onClick={()=>setUseGPS(g=>!g)}
                className={useGPS?'chip chip-active':'chip'}>
                {useGPS ? <><Satellite size={12}/> Auto</> : <><Activity size={12}/> Manual</>}
              </motion.button>
            </div>

            {useGPS && gpsStatus!=='idle' && (
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[0.78rem] font-semibold ${
                gpsStatus==='ok' ? 'bg-ok-soft border-ok/20 text-ok'
                : gpsStatus==='error' ? 'bg-danger-soft border-danger/20 text-danger'
                : 'bg-surface-2 border-line text-ink-2'}`}>
                {gpsStatus==='ok' ? <><MapPin size={14}/> Rastreando — {distGPS.toFixed(2)}km</> :
                 gpsStatus==='error' ? <><X size={14}/> Permissão negada</> :
                 <><Clock size={14}/> Aguardando sinal...</>}
              </div>
            )}

            {!useGPS && (
              <div>
                <label className="eyebrow block mb-1.5">Distância (km)</label>
                <input type="number" step="0.1" placeholder="0.0" value={dist} onChange={e=>setDist(e.target.value)}
                  className="field tnum"/>
              </div>
            )}
          </motion.div>
        )}

        {/* Notas + Salvar */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.25}}
          className="card p-4">
          <label className="eyebrow block mb-1.5">Como foi? (opcional)</label>
          <textarea placeholder="Condições, sensação, observações..." value={notas} onChange={e=>setNotas(e.target.value)} rows={2}
            className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-[0.9rem] text-ink-1
                       placeholder:text-ink-3 focus:border-accent/40 transition-colors resize-none mb-3"/>
          <Button full size="lg" onClick={salvar} disabled={saving}
            className="font-display uppercase tracking-wide">
            {saving ? 'Salvando…' : <><Save size={18}/> Salvar Cardio</>}
          </Button>
        </motion.div>
      </PageShell>
    );
  }

  // ── HISTÓRICO ─────────────────────────────────────────────────
  if(view==='historico') return (
    <PageShell>
      <ToastViewport toast={toast}/>
      <PageHeader
        title="Histórico"
        subtitle={`${sessions.length} sessão(ões)`}
        right={
          <Button size="sm" variant="ghost" onClick={()=>setView('home')}>
            <ChevronLeft size={14}/> Voltar
          </Button>
        }
      />

      {sessions.length===0 ? (
        <EmptyState
          icon={<Activity size={40}/>}
          title="Nenhuma sessão ainda"
          subtitle="Complete um cardio para ver o histórico"
        />
      ) : (
        <div className="grid gap-2">
          {sessions.map((s,i)=>{
            const TipoIcon = TIPOS.find(t=>t.id===s.tipo)?.Icon || Activity;
            const css = cssOf(s);
            return (
              <motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                transition={{delay:Math.min(i*.04,.4)}}
                className="card px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                    style={{background:mix(css,13), borderColor:mix(css,20)}}>
                    <TipoIcon size={20} style={{color:css}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-[0.98rem] text-ink-1 leading-none">{s.nome}</div>
                    <div className="text-[0.68rem] text-ink-3 mt-1 tnum">
                      {s.date} · {s.distancia>0?`${s.distancia.toFixed(1)}km`:'sem dist.'} · {s.pace!=='--'?s.pace:'—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-[1.02rem] tnum" style={{color:css}}>{fmt(s.tempo)}</div>
                    <div className="text-[0.62rem] text-ink-3 tnum">{s.calorias} kcal</div>
                  </div>
                  <motion.button whileTap={{scale:.9}} onClick={()=>deleteSession(s.id)}
                    aria-label="Excluir sessão"
                    className="shrink-0 flex items-center justify-center rounded-lg p-1.5
                               bg-danger-soft border border-danger/20 text-danger">
                    <X size={14}/>
                  </motion.button>
                </div>
                {s.notas && (
                  <div className="border-t border-line mt-2.5 pt-2.5 text-[0.74rem] text-ink-2 italic">{s.notas}</div>
                )}
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
      <ToastViewport toast={toast}/>

      <PageHeader
        title="Cardio"
        subtitle="Registre sua atividade"
        right={
          <Button size="sm" variant="ghost" onClick={()=>setView('historico')}>
            <History size={14}/> Histórico
          </Button>
        }
      />

      {/* Stats reais */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        className="grid grid-cols-3 gap-2.5 mb-6">
        <StatTile value={String(streak)} label="Streak dias" icon={<Flame size={16}/>} tone={streak>0?'accent':'default'}/>
        <StatTile value={distMes>0?`${distMes.toFixed(1)}km`:'0km'} label="Este mês" icon={<MapPin size={16}/>}/>
        <StatTile value={totalTempo>0?fmtH(totalTempo):'0min'} label="Tempo total" icon={<Clock size={16}/>}/>
      </motion.div>

      {/* Label */}
      <div className="eyebrow mb-2.5">Selecione a atividade</div>

      {/* Grid principal — Corrida e Bike em destaque */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15}}
        className="grid grid-cols-2 gap-2.5 mb-2.5">
        {TIPOS.slice(0,2).map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.97}} onClick={()=>iniciar(t)}
              className="relative overflow-hidden rounded-2xl border p-4 text-left flex flex-col gap-2.5"
              style={{background:`linear-gradient(135deg, ${mix(t.css,11)}, ${mix(t.css,4)})`, borderColor:mix(t.css,24)}}>
              <div className="absolute -top-2 -right-2 opacity-10 pointer-events-none">
                <TIcon size={72} style={{color:t.css}}/>
              </div>
              <TIcon size={26} style={{color:t.css}}/>
              <div>
                <div className="font-display font-bold uppercase tracking-wide text-[1.02rem] text-ink-1">{t.nome}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} style={{color:t.css}}/>
                  <span className="text-[0.6rem] font-bold" style={{color:t.css}}>GPS ativo</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Caminhada + HIIT */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.2}}
        className="grid grid-cols-2 gap-2.5 mb-4">
        {TIPOS.slice(2,4).map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.97}} onClick={()=>iniciar(t)}
              className="rounded-2xl border p-4 flex items-center gap-3 text-left"
              style={{background:`linear-gradient(135deg, ${mix(t.css,9)}, ${mix(t.css,3)})`, borderColor:mix(t.css,18)}}>
              <TIcon size={24} style={{color:t.css}}/>
              <div>
                <div className="font-display font-bold uppercase text-[0.95rem] text-ink-1">{t.nome}</div>
                {t.gps && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} style={{color:t.css}}/>
                    <span className="text-[0.58rem] font-bold" style={{color:t.css}}>GPS</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Outros tipos */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.25}}
        className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-6">
        {TIPOS.slice(4).map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.95}} onClick={()=>iniciar(t)}
              className="card-2 flex flex-col items-center gap-1.5 px-3.5 py-2.5 shrink-0 min-w-[68px]">
              <TIcon size={20} style={{color:t.css}}/>
              <span className="text-[0.68rem] font-semibold text-ink-2">{t.nome}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Recentes */}
      {recentSessions.length > 0 && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.3}}>
          <div className="eyebrow mb-2.5">Recentes</div>
          <div className="grid gap-2">
            {recentSessions.map((s,i)=>{
              const TipoIcon = TIPOS.find(t=>t.id===s.tipo)?.Icon || Activity;
              const css = cssOf(s);
              return (
                <motion.div key={s.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:.3+i*.05}}>
                  <button onClick={()=>setView('historico')}
                    className="card w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                      style={{background:mix(css,13), borderColor:mix(css,20)}}>
                      <TipoIcon size={18} style={{color:css}}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-[0.95rem] text-ink-1 leading-none">{s.nome}</div>
                      <div className="text-[0.68rem] text-ink-3 mt-1 tnum">
                        {s.date} · {s.distancia>0?`${s.distancia.toFixed(1)}km`:'—'} · {s.pace!=='--'?s.pace:'—'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-bold text-[1.02rem] tnum" style={{color:css}}>{fmt(s.tempo)}</div>
                      <div className="text-[0.62rem] text-ink-3 tnum">{s.calorias} kcal</div>
                    </div>
                    <ChevronRight size={16} className="text-ink-3 shrink-0"/>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {sessions.length===0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.3}}>
          <EmptyState
            icon={<Activity size={36}/>}
            title="Nenhuma sessão ainda"
            subtitle="Selecione uma atividade acima para começar"
          />
        </motion.div>
      )}
    </PageShell>
  );
}
