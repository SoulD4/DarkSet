'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import EmptyState from '@/components/core/EmptyState';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getLiga, LIGAS } from '@/lib/rankSystem';
import {
  Play, Flame, Globe, ChevronRight, Dumbbell,
  History, Medal, HeartPulse, Salad, Swords, Flower2,
} from 'lucide-react';

type UserData = { name: string; photoURL: string | null; weeklyGoal: number; trainDays: number[]; };
type HistoryEntry = { date: string; entries: {sets:{w:string;r:string}[]}[]; };
type Ficha = { id: string; name: string; byDay: Record<string, {name:string}[]>; };

const DIAS_NOME  = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DIAS_LABEL = ['S','T','Q','Q','S','S','D'];

const ATALHOS = [
  { icon: History,    label: 'Histórico', href: '/historico' },
  { icon: Medal,      label: 'Selos',     href: '/darkselos' },
  { icon: HeartPulse, label: 'Cardio',    href: '/cardio' },
  { icon: Salad,      label: 'DarkDiet',  href: '/darkdiet' },
  { icon: Swords,     label: 'Squad',     href: '/darksquad' },
  { icon: Flower2,    label: 'DarkZen',   href: '/darkzen' },
];

function calcStreak(history: Record<string,HistoryEntry>, trainDays: number[]): number {
  let streak = 0;
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const d = new Date(today);
  if (trainDays.includes(today.getDay()) && !history[todayKey]) d.setDate(d.getDate()-1);
  for (let i=0; i<365; i++) {
    const k = d.toISOString().slice(0,10);
    const isTrain = trainDays.includes(d.getDay());
    if (!isTrain) { d.setDate(d.getDate()-1); continue; }
    if (history[k]) { streak++; d.setDate(d.getDate()-1); } else break;
  }
  return streak;
}

function calcWeekVol(history: Record<string,HistoryEntry>): number {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay()||7)-1));
  const wsStr = weekStart.toISOString().slice(0,10);
  let vol = 0;
  Object.entries(history).forEach(([iso, entry]) => {
    if (iso >= wsStr) (entry.entries||[]).forEach(e =>
      (e.sets||[]).forEach(s => {
        const w = parseFloat(String(s.w).replace(',','.'));
        const r = parseFloat(String(s.r).replace(',','.'));
        if (isFinite(w) && isFinite(r)) vol += w*r;
      })
    );
  });
  return Math.round(vol);
}

function getWeekDots(history: Record<string,HistoryEntry>, trainDays: number[]) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay()||7)-1));
  return Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate()+i);
    return { trained: !!history[d.toISOString().slice(0,10)], isTrainDay: trainDays.includes(d.getDay()), label: DIAS_LABEL[i] };
  });
}

function getNextTrainDay(ficha: Ficha|null) {
  if (!ficha) return null;
  const todayIdx = (new Date().getDay()+6)%7;
  const todayNome = DIAS_NOME[todayIdx];
  if (ficha.byDay[todayNome]?.length > 0) return { day:'Hoje', exs: ficha.byDay[todayNome] };
  for (let i=1; i<=7; i++) {
    const d = DIAS_NOME[(todayIdx+i)%7];
    if (ficha.byDay[d]?.length > 0) return { day:d, exs:ficha.byDay[d] };
  }
  return null;
}

const fmtVol = (v: number) => v>=1000 ? (v/1000).toFixed(1)+'t' : Math.round(v)+'kg';

export default function HomePage() {
  const router = useRouter();
  const [user,      setUser]      = useState<any>(null);
  const [userData,  setUserData]  = useState<UserData>({name:'',photoURL:null,weeklyGoal:5,trainDays:[1,2,3,4,5,6]});
  const [history,   setHistory]   = useState<Record<string,HistoryEntry>>({});
  const [fichas,    setFichas]    = useState<Ficha[]>([]);
  const [activeId,  setActiveId]  = useState<string|null>(null);
  const [meuRank,   setMeuRank]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async u=>{
      if(!u){setLoading(false);return;}
      setUser(u);
      try {
        const userDoc = await getDoc(doc(db,'users',u.uid));
        if(userDoc.exists()){
          const d = userDoc.data();
          setUserData({name:d.name||u.displayName||'',photoURL:d.photoURL||u.photoURL||null,weeklyGoal:d.weeklyGoal||5,trainDays:d.trainDays||[1,2,3,4,5,6]});
        } else {
          setUserData(p=>({...p,name:u.displayName||'',photoURL:u.photoURL||null}));
        }
        const histDoc = await getDoc(doc(db,'users',u.uid,'data','history'));
        if(histDoc.exists()){
          try { setHistory(JSON.parse(histDoc.data().payload||'{}')); }
          catch { console.warn('home: history payload corrompido'); }
        }
        const plansDoc = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(plansDoc.exists()){
          try {
            const p = JSON.parse(plansDoc.data().payload||'{"list":[],"activeId":null}');
            setFichas(p.list||[]);
            setActiveId(p.activeId||null);
          } catch { console.warn('home: plans payload corrompido'); }
        }
        const rankSnap = await getDoc(doc(db,'globalRank',u.uid));
        if(rankSnap.exists()) setMeuRank(rankSnap.data());
      } catch(e){console.error(e);}
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  const trainDays     = userData.trainDays;
  const streak        = calcStreak(history, trainDays);
  const weekVol       = calcWeekVol(history);
  const weekDots      = getWeekDots(history, trainDays);
  const thisWeek      = weekDots.filter(d=>d.trained&&d.isTrainDay).length;
  const totalSessions = Object.keys(history).length;
  const activeFicha   = fichas.find(f=>f.id===activeId)||fichas[0]||null;
  const nextTreino    = getNextTrainDay(activeFicha);
  const ultimosTreinos = Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,3);
  const liga          = getLiga(meuRank?.pontos||0);
  const proxLiga      = LIGAS.find((l:any)=>l.min>(meuRank?.pontos||0));
  const ligaPct       = proxLiga ? Math.min(100,Math.round(((meuRank?.pontos||0)-liga.min)/(proxLiga.min-liga.min)*100)) : 100;
  const nome          = userData.name||user?.displayName||'Atleta';
  const initials      = nome.slice(0,2).toUpperCase();
  const primeiroNome  = nome.split(' ')[0];

  if(loading) return (
    <PageShell>
      <Spinner full />
    </PageShell>
  );

  if(!user) return (
    <PageShell>
      <div className="pt-10">
        <EmptyState
          icon={<Dumbbell size={40} strokeWidth={1.5} />}
          title="Bem-vindo ao DarkSet"
          subtitle="Faça login para ver seus treinos, streak e evolução."
          action={<Button onClick={()=>router.push('/login')}>Entrar</Button>}
        />
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Saudação + data + avatar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 mb-6"
      >
        <div className="min-w-0">
          <p className="eyebrow">
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <h1 className="font-display font-bold text-[1.7rem] leading-tight tracking-tight text-ink-1 mt-0.5 truncate">
            {primeiroNome ? `E aí, ${primeiroNome}!` : 'Bora treinar!'}
          </h1>
        </div>
        <button
          onClick={()=>router.push('/perfil')}
          aria-label="Perfil"
          className="w-11 h-11 rounded-full overflow-hidden border border-line bg-surface-3 flex items-center justify-center shrink-0"
        >
          {userData.photoURL
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={userData.photoURL} alt="" className="w-full h-full object-cover" />
            : <span className="font-display font-bold text-[0.8rem] text-ink-2">{initials}</span>}
        </button>
      </motion.div>

      {/* Hero de streak */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="card p-5 mb-6 shadow-card"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-baseline gap-2.5">
            <span className={`font-display font-bold text-[3.4rem] leading-none tnum ${streak>0?'text-accent':'text-ink-3'}`}>
              {streak}
            </span>
            <div>
              <div className={`flex items-center gap-1 font-display font-semibold text-[0.92rem] ${streak>0?'text-ink-1':'text-ink-3'}`}>
                <Flame size={14} className={streak>0?'text-accent':'text-ink-3'} />
                dias
              </div>
              <div className="eyebrow">streak</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="card-2 rounded-xl px-3 py-2 text-center">
              <div className="font-display font-bold text-[1.25rem] leading-none tnum text-ink-1">
                {thisWeek}<span className="text-[0.8rem] text-ink-3">/{userData.weeklyGoal}</span>
              </div>
              <div className="eyebrow mt-1">semana</div>
            </div>
            <div className="card-2 rounded-xl px-3 py-2 text-center">
              <div className="font-display font-bold text-[1.25rem] leading-none tnum text-ink-1">
                {fmtVol(weekVol)}
              </div>
              <div className="eyebrow mt-1">volume</div>
            </div>
          </div>
        </div>

        {/* Heatmap semanal */}
        <div className="flex justify-between items-end px-0.5">
          {weekDots.map(({trained,isTrainDay,label},i)=>(
            <div key={i} className={`flex flex-col items-center gap-1.5 ${isTrainDay?'':'opacity-35'}`}>
              <span
                className={`rounded-full transition-all ${
                  trained
                    ? 'w-3 h-3 bg-accent shadow-volt'
                    : isTrainDay
                      ? 'w-2 h-2 bg-surface-3 border border-line'
                      : 'w-2 h-2 border border-line'
                }`}
              />
              <span className={`text-[0.6rem] ${trained?'font-bold text-ink-2':'text-ink-3'}`}>{label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* CTA Modo Treino */}
      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        whileTap={{ scale: 0.97 }}
        onClick={()=>router.push('/modo-treino')}
        className="w-full mb-6 bg-accent text-accent-ink rounded-2xl shadow-volt px-5 py-4 flex items-center justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <div className="font-display font-bold text-[1.15rem] leading-tight tracking-tight">Modo Treino</div>
          <div className="text-[0.74rem] opacity-75 mt-0.5 truncate">
            {nextTreino
              ? `${nextTreino.day} · ${nextTreino.exs.slice(0,2).map((e:any)=>e.name||e.nome).join(', ')}${nextTreino.exs.length>2?'...':''}`
              : activeFicha ? activeFicha.name : 'Com ou sem ficha'}
          </div>
        </div>
        <span className="w-11 h-11 rounded-full bg-accent-ink/15 flex items-center justify-center shrink-0">
          <Play size={20} fill="currentColor" />
        </span>
      </motion.button>

      {/* Rank global — cores da liga são dinâmicas (exceção permitida) */}
      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        whileTap={{ scale: 0.97 }}
        onClick={()=>router.push('/darkrank')}
        className="w-full mb-6 rounded-2xl border px-4 py-4 flex items-center gap-3 text-left"
        style={{ background: liga.corBg, borderColor: liga.corBorder }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 eyebrow mb-0.5" style={{ color: liga.cor }}>
            <Globe size={11} />
            Rank global
          </div>
          <div className="font-display font-bold text-[1.35rem] leading-none tracking-tight mb-2.5" style={{ color: liga.cor }}>
            {liga.nome}
          </div>
          <div className="h-1 rounded-full bg-surface-3 mb-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${ligaPct}%`, background: liga.cor }} />
          </div>
          <div className="flex justify-between text-[0.62rem]">
            <span className="text-ink-3 tnum">{meuRank?.pontos||0} pts</span>
            <span className="font-semibold tnum" style={{ color: liga.cor }}>
              {proxLiga ? `${proxLiga.min-(meuRank?.pontos||0)} pts para ${proxLiga.nome}` : 'Rank máximo'}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-ink-3 shrink-0" />
      </motion.button>

      {/* Atalhos */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {ATALHOS.map(({icon:Icon,label,href},i)=>(
          <motion.button
            key={href}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(0.14 + i*0.04, 0.4) }}
            whileTap={{ scale: 0.97 }}
            onClick={()=>router.push(href)}
            className="card px-2 py-3.5 flex flex-col items-center gap-2 hover:bg-surface-3 transition-colors"
          >
            <Icon size={19} className="text-accent" strokeWidth={1.8} />
            <span className="text-[0.72rem] font-semibold text-ink-2">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Últimos treinos */}
      {ultimosTreinos.length>0 && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="eyebrow mb-2.5">Últimos treinos</p>
          <div className="grid gap-2.5">
            {ultimosTreinos.map(([date,entry],i)=>{
              const d = new Date(date+'T12:00:00');
              const hoje = new Date().toISOString().slice(0,10);
              const ontem = new Date(Date.now()-86400000).toISOString().slice(0,10);
              const label = date===hoje?'Hoje':date===ontem?'Ontem':d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
              const totalSets = (entry.entries||[]).reduce((s,e)=>s+(e.sets||[]).length,0);
              const vol = (entry.entries||[]).reduce((s,e)=>(e.sets||[]).reduce((s2:number,set:any)=>s2+parseFloat(String(set.w||0))*parseFloat(String(set.r||0)),s),0);
              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.22 + i*0.04, 0.4) }}
                  className="card px-4 py-3.5 flex items-center justify-between"
                >
                  <div>
                    <div className="eyebrow mb-0.5">{label}</div>
                    <div className="font-semibold text-[0.9rem] text-ink-1 tnum">{totalSets} séries</div>
                  </div>
                  <div className="font-display font-bold text-[1.05rem] text-accent tnum">
                    {fmtVol(vol)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Estado vazio */}
      {totalSessions===0 && (
        <EmptyState
          icon={<Dumbbell size={36} strokeWidth={1.5} />}
          title="Nenhum treino ainda"
          subtitle="Comece seu primeiro treino agora!"
          action={<Button onClick={()=>router.push('/modo-treino')}><Play size={16} fill="currentColor" />Iniciar Treino</Button>}
        />
      )}
    </PageShell>
  );
}
