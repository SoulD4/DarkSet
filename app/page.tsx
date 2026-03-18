'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const DIAS_NOME = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DIAS_LABEL = ['S','T','Q','Q','S','S','D'];

const RANK_NIVEIS = [
  {label:'MORTAL',    minSelos:0,  cor:'#7a7a8a', icon:'💀'},
  {label:'GUERREIRO', minSelos:3,  cor:'#cd7f32', icon:'⚔️'},
  {label:'POSEIDON',  minSelos:8,  cor:'#60a5fa', icon:'🔱'},
  {label:'HADES',     minSelos:15, cor:'#a78bfa', icon:'💀'},
  {label:'CRONOS',    minSelos:25, cor:'#facc15', icon:'⏳'},
  {label:'DARKGOD',   minSelos:40, cor:'#e31b23', icon:'👑'},
];

const ATALHOS = [
  {icon:'📋', label:'Histórico', href:'/historico'},
  {icon:'🏅', label:'Selos',     href:'/darkselos'},
  {icon:'🏃', label:'Cardio',    href:'/cardio'},
  {icon:'🥗', label:'DarkDiet',  href:'/darkdiet'},
  {icon:'⚔️', label:'Squad',     href:'/darksquad'},
  {icon:'🧘', label:'DarkZen',   href:'/darkzen'},
];

function calcStreak(history: Record<string,any>, trainDays: number[]) {
  let streak = 0;
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const d = new Date(today);
  if (trainDays.includes(today.getDay()) && !history[todayKey])
    d.setDate(d.getDate()-1);
  for (let i=0; i<800; i++) {
    const k = d.toISOString().slice(0,10);
    const isTrainDay = trainDays.includes(d.getDay());
    if (!isTrainDay) { d.setDate(d.getDate()-1); continue; }
    if (history[k]) { streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function getWeekDots(history: Record<string,any>, trainDays: number[]) {
  const today = new Date();
  const ws = new Date(today);
  ws.setDate(today.getDate()-((today.getDay()||7)-1));
  return Array.from({length:7},(_,i)=>{
    const d = new Date(ws); d.setDate(ws.getDate()+i);
    return {
      trained: !!history[d.toISOString().slice(0,10)],
      isTrainDay: trainDays.includes(d.getDay()),
      label: DIAS_LABEL[i],
    };
  });
}

function calcWeekStats(history: Record<string,any>) {
  const today = new Date();
  const ws = new Date(today);
  ws.setDate(today.getDate()-((today.getDay()||7)-1));
  const wsStr = ws.toISOString().slice(0,10);
  let treinos=0, vol=0;
  Object.entries(history).forEach(([iso,entry]:any)=>{
    if(iso>=wsStr){
      treinos++;
      (entry.entries||[]).forEach((e:any)=>(e.sets||[]).forEach((s:any)=>{
        const w=parseFloat(String(s.w||0).replace(',','.'));
        const r=parseFloat(String(s.r||0).replace(',','.'));
        if(isFinite(w)&&isFinite(r)) vol+=w*r;
      }));
    }
  });
  return {treinos, vol:Math.round(vol)};
}

function getNextTreino(ficha:any) {
  if(!ficha) return null;
  const today = new Date();
  const todayIdx = (today.getDay()+6)%7;
  const todayNome = DIAS_NOME[todayIdx];
  if(ficha.byDay?.[todayNome]?.length>0)
    return {day:'Hoje', exs:ficha.byDay[todayNome]};
  for(let i=1;i<=7;i++){
    const d=DIAS_NOME[(todayIdx+i)%7];
    if(ficha.byDay?.[d]?.length>0) return {day:d,exs:ficha.byDay[d]};
  }
  return null;
}

export default function HomePage() {
  const router = useRouter();
  const [user,    setUser]    = useState<any>(null);
  const [prefs,   setPrefs]   = useState({name:'',photoURL:'',weeklyGoal:5,trainDays:[1,2,3,4,5,6]});
  const [history, setHistory] = useState<Record<string,any>>({});
  const [fichas,  setFichas]  = useState<any[]>([]);
  const [activeId,setActiveId]= useState<string|null>(null);
  const [selos,   setSelos]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    return onAuthStateChanged(auth, async(u)=>{
      if(!u){ setLoading(false); return; }
      setUser(u);
      try{
        const ud = await getDoc(doc(db,'users',u.uid));
        if(ud.exists()){
          const d=ud.data();
          setPrefs({
            name:       d.name||u.displayName||'',
            photoURL:   d.photoURL||u.photoURL||'',
            weeklyGoal: d.weeklyGoal||5,
            trainDays:  d.trainDays||[1,2,3,4,5,6],
          });
        } else {
          setPrefs(p=>({...p,name:u.displayName||'',photoURL:u.photoURL||''}));
        }
        const hd = await getDoc(doc(db,'users',u.uid,'data','history'));
        if(hd.exists()){ const p=hd.data().payload; if(p) setHistory(JSON.parse(p)); }
        const pd = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(pd.exists()){ const p=pd.data().payload; if(p){ const parsed=JSON.parse(p); setFichas(parsed.list||[]); setActiveId(parsed.activeId||null); } }
        const sd = await getDoc(doc(db,'users',u.uid,'data','selos'));
        if(sd.exists()) setSelos(Object.values(sd.data()).filter(Boolean).length);
      }catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const trainDays   = prefs.trainDays;
  const streak      = calcStreak(history, trainDays);
  const weekDots    = getWeekDots(history, trainDays);
  const {treinos:thisWeek, vol:weekVol} = calcWeekStats(history);
  const totalSess   = Object.keys(history).length;
  const activeFicha = fichas.find(f=>f.id===activeId)||fichas[0]||null;
  const nextTreino  = getNextTreino(activeFicha);
  const ultimos     = Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,3);
  const rank        = [...RANK_NIVEIS].reverse().find(n=>selos>=n.minSelos)||RANK_NIVEIS[0];
  const nextRank    = RANK_NIVEIS.find(n=>n.minSelos>selos);
  const rankPct     = nextRank ? Math.round((selos-rank.minSelos)/(nextRank.minSelos-rank.minSelos)*100) : 100;
  const nome        = prefs.name||user?.displayName||'Atleta';

  if(loading) return (
    <PageShell>
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-[3px] border-white/10 border-t-red-600 rounded-full animate-spin"/>
      </div>
    </PageShell>
  );

  if(!user) return (
    <PageShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <span className="text-5xl">🏋️</span>
        <h1 className="font-condensed font-black text-3xl uppercase tracking-wide text-white">
          DARK<span className="text-red-600">SET</span>
        </h1>
        <p className="text-sm text-muted-foreground">Faça login para ver seus treinos</p>
        <Button onClick={()=>router.push('/login')} className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide px-8">
          Entrar
        </Button>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <h1 className="font-condensed font-black text-3xl uppercase tracking-wide text-foreground leading-none mt-0.5">
            {nome.split(' ')[0] ? `E aí, ${nome.split(' ')[0]}!` : 'Bora Treinar!'}
          </h1>
        </div>

      </div>

      {/* ── Streak Hero ───────────────────────────────────── */}
      <Card className="mb-3 border-border overflow-hidden relative">
        {streak>0 && (
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{background:'radial-gradient(circle,rgba(227,27,35,.15),transparent 70%)',transform:'translate(20%,-20%)'}}/>
        )}
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <span className="font-condensed font-black text-6xl leading-none"
                style={{color: streak>0?'#e31b23':'#484858'}}>{streak}</span>
              <div>
                <p className="font-condensed font-bold text-base uppercase text-foreground/80">dias</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">streak</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="text-center">
                <p className="font-condensed font-black text-2xl text-foreground leading-none">
                  {thisWeek}<span className="text-base text-muted-foreground">/{prefs.weeklyGoal}</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">semana</p>
              </div>
              <div className="text-center">
                <p className="font-condensed font-black text-xl text-foreground leading-none">
                  {weekVol>=1000?(weekVol/1000).toFixed(1)+'t':weekVol+'kg'}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">volume</p>
              </div>
            </div>
          </div>
          {/* Dots semana */}
          <div className="flex justify-between items-end px-0.5">
            {weekDots.map(({trained,isTrainDay,label},i)=>(
              <div key={i} className="flex flex-col items-center gap-1" style={{opacity:isTrainDay?1:0.3}}>
                <div className="rounded-full transition-all duration-200" style={{
                  width: trained?12:8, height: trained?12:8,
                  background: trained?'#e31b23':(isTrainDay?'#2e2e38':'transparent'),
                  border: trained?'none':`1px solid ${isTrainDay?'#3e3e48':'#2e2e38'}`,
                  boxShadow: trained?'0 0 8px rgba(227,27,35,.5)':'none',
                }}/>
                <span className="text-[10px]" style={{color:trained?'#b0b0be':'#484858',fontWeight:trained?700:400}}>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Botão Modo Treino ──────────────────────────────── */}
      <button onClick={()=>router.push('/modo-treino')} className="w-full mb-3 rounded-2xl p-4 flex items-center justify-between cursor-pointer relative overflow-hidden text-left"
        style={{background:'linear-gradient(135deg,#e31b23,#8b0000)',boxShadow:'0 4px 24px rgba(227,27,35,.25)'}}>
        <div className="absolute right-[-10px] top-[-10px] font-condensed font-black text-[88px] leading-none pointer-events-none"
          style={{color:'rgba(0,0,0,.12)'}}>▶</div>
        <div>
          <p className="font-condensed font-black text-2xl uppercase tracking-wide text-white leading-none">
            Modo Treino
          </p>
          <p className="text-xs mt-1" style={{color:'rgba(255,255,255,.6)'}}>
            {nextTreino
              ? `${nextTreino.day} · ${nextTreino.exs.slice(0,2).map((e:any)=>e.name||e.nome).join(', ')}${nextTreino.exs.length>2?'...':''}`
              : activeFicha ? activeFicha.name : 'Com ou sem ficha'
            }
          </p>
        </div>
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{background:'rgba(0,0,0,.2)'}}>
          <div style={{width:0,height:0,borderTop:'8px solid transparent',borderBottom:'8px solid transparent',borderLeft:'14px solid white',marginLeft:3}}/>
        </div>
      </button>

      {/* ── Card Rank ─────────────────────────────────────── */}
      <Card className="mb-3 border-border cursor-pointer hover:border-border/80 transition-colors relative overflow-hidden"
        onClick={()=>router.push('/darkselos')}
        style={{borderColor:`${rank.cor}33`}}>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:`radial-gradient(ellipse at 0% 50%,${rank.cor}12 0%,transparent 60%)`}}/>
        <CardContent className="p-4 flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{background:`${rank.cor}22`,border:`1px solid ${rank.cor}44`}}>
            {rank.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Seu rank</p>
            <p className="font-condensed font-black text-2xl uppercase tracking-wide leading-none mb-2"
              style={{color:rank.cor}}>{rank.label}</p>
            <Progress value={rankPct} className="h-1 mb-1" style={{'--progress-bg':rank.cor} as any}/>
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">{nextRank?`→ ${nextRank.label}`:'⚡ Máximo'}</span>
              <span className="text-[10px] font-bold" style={{color:rank.cor}}>{selos}{nextRank?`/${nextRank.minSelos}`:''} selos</span>
            </div>
          </div>
          <span className="text-muted-foreground/50 text-lg relative">›</span>
        </CardContent>
      </Card>

      {/* ── Grid atalhos ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {ATALHOS.map(a=>(
          <button key={a.href} onClick={()=>router.push(a.href)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-card hover:bg-card/80 transition-colors cursor-pointer">
            <span className="text-xl leading-none">{a.icon}</span>
            <span className="font-condensed font-bold text-[11px] uppercase tracking-wide text-muted-foreground">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Últimos treinos ───────────────────────────────── */}
      {ultimos.length>0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Últimos treinos
          </p>
          <div className="flex flex-col gap-2">
            {ultimos.map(([date,entry]:any)=>{
              const d=new Date(date+'T12:00:00');
              const hoje=new Date().toISOString().slice(0,10);
              const ontem=new Date(Date.now()-86400000).toISOString().slice(0,10);
              const lbl=date===hoje?'Hoje':date===ontem?'Ontem':d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
              const sets=(entry.entries||[]).reduce((s:number,e:any)=>s+(e.sets||[]).length,0);
              const vol=(entry.entries||[]).reduce((s:number,e:any)=>(e.sets||[]).reduce((s2:number,st:any)=>s2+parseFloat(String(st.w||0))*parseFloat(String(st.r||0)),s),0);
              return(
                <Card key={date} className="border-border">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{lbl}</p>
                      <p className="font-semibold text-sm text-foreground">{sets} séries</p>
                    </div>
                    <p className="font-condensed font-black text-xl text-red-500">
                      {vol>=1000?(vol/1000).toFixed(1)+'t':Math.round(vol)+'kg'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Estado vazio ─────────────────────────────────── */}
      {totalSess===0 && (
        <Card className="border-dashed border-border mt-2">
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <span className="text-4xl">💪</span>
            <p className="font-condensed font-black text-xl uppercase text-foreground">Nenhum treino ainda</p>
            <p className="text-sm text-muted-foreground">Comece seu primeiro treino agora!</p>
            <Button onClick={()=>router.push('/modo-treino')} className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide">
              Iniciar Treino
            </Button>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
