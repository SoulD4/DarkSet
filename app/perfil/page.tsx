'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import PageHeader from '@/components/core/PageHeader';
import StatTile from '@/components/core/StatTile';
import EmptyState from '@/components/core/EmptyState';
import { useToast, ToastViewport } from '@/components/core/Toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getLiga, LIGAS } from '@/lib/rankSystem';
import {
  Settings, BarChart2, Crown, LogOut, Bell, Target, Weight,
  Smartphone, CheckCircle2, Flame, Dumbbell, TrendingUp,
  Edit2, Save, X, Loader2, Trophy, Zap, Globe, LogIn,
} from 'lucide-react';

type HistEntry = { entries:{name?:string;sets:{w:string;r:string}[]}[]; startTime?:string };

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function calcStats(hist:Record<string,HistEntry>, trainDays:number[]) {
  const n=(v:any)=>{const x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:0;};
  const totalTreinos=Object.keys(hist).length;
  let volTotal=0;
  const bestPR:Record<string,number>={};
  let prs=0;
  Object.entries(hist).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([,obj])=>{
    (obj.entries||[]).forEach(en=>{
      (en.sets||[]).forEach(s=>{
        const w=n(s.w),r=n(s.r);
        volTotal+=w*r;
        if(w&&r){const est=w*(1+r/30);if(!bestPR[en.name||""]||est>bestPR[en.name||""]+0.01){bestPR[en.name||""]=est;prs++;}}
      });
    });
  });
  let streak=0;
  const today=new Date();
  const todayKey=today.toISOString().slice(0,10);
  const d=new Date(today);
  if(trainDays.includes(today.getDay())&&!hist[todayKey]) d.setDate(d.getDate()-1);
  for(let i=0;i<365;i++){
    const k=d.toISOString().slice(0,10);
    const isTrain=trainDays.includes(d.getDay());
    if(!isTrain){d.setDate(d.getDate()-1);continue;}
    if(hist[k]){streak++;d.setDate(d.getDate()-1);}else break;
  }
  const topPRs=Object.entries(bestPR).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nome,est])=>({nome,est:Math.round(est)}));
  return {totalTreinos,volTotal,streak,prs,topPRs};
}

export default function PerfilPage() {
  const router=useRouter();
  const [user,setUser]=useState<any>(null);
  const [userData,setUserData]=useState({name:'',weeklyGoal:5,trainDays:[1,2,3,4,5,6],notifications:true,vibration:true,weightUnit:'kg',planData:{tier:'free'}});
  const [history,setHistory]=useState<Record<string,HistEntry>>({});
  const [selos,setSelos]=useState<Record<string,boolean>>({});
  const [meuRank,setMeuRank]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState<'config'|'stats'|'plano'>('config');
  const [editName,setEditName]=useState(false);
  const [nameInput,setNameInput]=useState('');
  const { toast, show } = useToast();

  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      if(!u){setLoading(false);return;}
      setUser(u);
      try {
        const userSnap=await getDoc(doc(db,'users',u.uid));
        if(userSnap.exists()){
          const d=userSnap.data();
          setUserData({name:d.name||u.displayName||'Atleta',weeklyGoal:d.weeklyGoal||5,trainDays:d.trainDays||[1,2,3,4,5,6],notifications:d.notifications!==false,vibration:d.vibration!==false,weightUnit:d.weightUnit||'kg',planData:d.planData||{tier:'free'}});
          setNameInput(d.name||u.displayName||'Atleta');
        }
        const histSnap=await getDoc(doc(db,'users',u.uid,'data','history'));
        if(histSnap.exists()) setHistory(JSON.parse(histSnap.data().payload||'{}'));
        const selosSnap=await getDoc(doc(db,'users',u.uid,'data','selos'));
        if(selosSnap.exists()) setSelos(selosSnap.data() as Record<string,boolean>);
        const rankSnap=await getDoc(doc(db,'globalRank',u.uid));
        if(rankSnap.exists()) setMeuRank(rankSnap.data());
      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  const salvarNome=async()=>{
    if(!nameInput.trim()||!user) return;
    setSaving(true);
    try {
      await updateProfile(user,{displayName:nameInput.trim()});
      await setDoc(doc(db,'users',user.uid),{name:nameInput.trim()},{merge:true});
      setUserData(d=>({...d,name:nameInput.trim()}));
      setEditName(false);
      show('Nome atualizado!');
    } catch(e){console.error(e);}
    setSaving(false);
  };

  const salvarConfig=async(campo:string,valor:any)=>{
    if(!user) return;
    setUserData((d:any)=>({...d,[campo]:valor}));
    try { await setDoc(doc(db,'users',user.uid),{[campo]:valor},{merge:true}); } catch(e){console.error(e);}
  };

  const handleLogout=async()=>{ await signOut(auth); router.push('/login'); };

  const stats=calcStats(history,(userData as any).trainDays||[1,2,3,4,5,6]);
  const selosCount=Object.values(selos).filter(Boolean).length;
  const tier=(userData as any).planData?.tier||'free';
  const liga=getLiga(meuRank?.pontos||0);
  const proxLiga=LIGAS.find((l:any)=>l.min>(meuRank?.pontos||0));
  const ligaPct=proxLiga?Math.min(100,Math.round(((meuRank?.pontos||0)-liga.min)/(proxLiga.min-liga.min)*100)):100;
  const initials=(userData.name||user?.displayName||'DS').slice(0,2).toUpperCase();

  const tierLabel = tier==='darkgod'?'DarkGod':tier==='elite'?'Elite':'Gratuito';
  const tierChip =
    tier==='darkgod' ? 'border-accent/30 bg-accent-soft text-accent' :
    tier==='elite'   ? 'border-warn/30 bg-warn-soft text-warn' :
                       'border-line bg-surface-2 text-ink-3';

  // ── LOADING ──────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  // ── NÃO LOGADO ───────────────────────────────────────────
  if(!user) return (
    <PageShell>
      <PageHeader title="Perfil" subtitle="Sua conta e preferências"/>
      <EmptyState
        icon={<LogIn size={40}/>}
        title="Entre para ver seu perfil"
        subtitle="Faça login para acessar suas configurações, stats e plano."
        action={<Button onClick={()=>router.push('/login')}>Entrar</Button>}
      />
    </PageShell>
  );

  return (
    <PageShell>
      <ToastViewport toast={toast}/>

      <PageHeader title="Perfil" subtitle="Sua conta e preferências"/>

      {/* Card de identidade + rank */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
        className="card p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-br from-accent-soft to-transparent pointer-events-none"/>
        <div className="relative flex items-center gap-4">
          {user.photoURL
            ? <img src={user.photoURL} alt="avatar"
                className="w-16 h-16 rounded-full border-2 border-line object-cover shrink-0"/>
            : <div className="w-16 h-16 rounded-full bg-accent text-accent-ink font-display font-bold text-2xl flex items-center justify-center shrink-0">
                {initials}
              </div>
          }
          <div className="flex-1 min-w-0">
            {editName?(
              <div className="flex items-center gap-1.5 mb-1">
                <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&salvarNome()} autoFocus
                  className="field flex-1 min-w-0 font-display font-bold"/>
                <motion.button whileTap={{scale:.9}} onClick={salvarNome} disabled={saving}
                  aria-label="Salvar nome"
                  className="shrink-0 inline-flex items-center rounded-lg border border-ok/30 bg-ok-soft text-ok p-2 disabled:opacity-40">
                  {saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}
                </motion.button>
                <motion.button whileTap={{scale:.9}} onClick={()=>setEditName(false)}
                  aria-label="Cancelar edição"
                  className="shrink-0 inline-flex items-center rounded-lg border border-line bg-surface-2 text-ink-3 p-2">
                  <X size={14}/>
                </motion.button>
              </div>
            ):(
              <div className="flex items-center gap-2 mb-0.5">
                <div className="font-display font-bold text-[1.35rem] leading-none tracking-tight text-ink-1 truncate">
                  {userData.name||'Atleta'}
                </div>
                <motion.button whileTap={{scale:.9}} onClick={()=>setEditName(true)}
                  aria-label="Editar nome" className="text-ink-3 shrink-0">
                  <Edit2 size={13}/>
                </motion.button>
              </div>
            )}
            <div className="text-[0.68rem] text-ink-3 mb-1.5 truncate">{user.email}</div>
            <div className="flex gap-1.5 flex-wrap">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold ${tierChip}`}>
                {tierLabel}
              </span>
              {/* Cores dinâmicas da liga (lib/rankSystem) */}
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold"
                style={{background:liga.corBg,color:liga.cor,borderColor:liga.corBorder}}>
                <Globe size={10}/>{liga.nome}
              </span>
            </div>
          </div>
        </div>

        {/* Progresso de rank global */}
        <div className="relative mt-4">
          <div className="flex justify-between text-[0.58rem] text-ink-3 mb-1.5">
            <span className="font-bold" style={{color:liga.cor}}>{liga.nome}</span>
            <span className="tnum">{proxLiga?`${proxLiga.min-(meuRank?.pontos||0)} pts para ${proxLiga.nome}`:'Rank máximo'}</span>
          </div>
          <div className="bg-surface-3 rounded-full h-1 overflow-hidden">
            <motion.div animate={{width:`${ligaPct}%`}} transition={{duration:.6,ease:'easeOut'}}
              className="h-full rounded-full"
              style={{background:liga.cor,boxShadow:`0 0 8px ${liga.cor}88`}}/>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.06}}
        className="flex bg-surface-2 border border-line rounded-xl p-1 gap-1 mb-6">
        {(['config','stats','plano'] as const).map((id)=>{
          const labels={config:'Config',stats:'Stats',plano:'Plano'};
          const Icons={config:Settings,stats:BarChart2,plano:Crown};
          const Icon=Icons[id];
          const active=tab===id;
          return (
            <motion.button key={id} whileTap={{scale:.95}} onClick={()=>setTab(id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[0.75rem] font-semibold transition-colors
                ${active?'bg-accent-soft text-accent border border-accent/30':'text-ink-3 border border-transparent'}`}>
              <Icon size={13}/>{labels[id]}
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

          {/* ── CONFIG ─────────────────────────────────────── */}
          {tab==='config'&&(
            <div className="grid gap-2.5">
              {/* Meta semanal */}
              <div className="card px-4 py-3.5">
                <div className="eyebrow mb-3 flex items-center gap-1.5">
                  <Target size={12}/> Meta semanal
                </div>
                <div className="flex gap-1.5">
                  {[3,4,5,6,7].map(n=>{
                    const active=(userData as any).weeklyGoal===n;
                    return (
                      <motion.button key={n} whileTap={{scale:.9}} onClick={()=>salvarConfig('weeklyGoal',n)}
                        className={`flex-1 rounded-lg border py-1.5 font-display font-bold text-[0.88rem] tnum transition-colors
                          ${active?'border-accent/30 bg-accent-soft text-accent':'border-line text-ink-3'}`}>
                        {n}x
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Dias de treino */}
              <div className="card px-4 py-3.5">
                <div className="eyebrow mb-3 flex items-center gap-1.5">
                  <Dumbbell size={12}/> Dias de treino
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {DIAS_SEMANA.map((dia,i)=>{
                    const ativo=(userData as any).trainDays?.includes(i);
                    return (
                      <motion.button key={i} whileTap={{scale:.9}}
                        onClick={()=>{const novo=ativo?(userData as any).trainDays.filter((d:number)=>d!==i):[...(userData as any).trainDays,i].sort();salvarConfig('trainDays',novo);}}
                        className={`rounded-lg border px-2.5 py-1 text-[0.72rem] font-semibold transition-colors
                          ${ativo?'border-accent/30 bg-accent-soft text-accent':'border-line text-ink-3'}`}>
                        {dia}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              {([{campo:'notifications',label:'Notificações',desc:'Lembretes de treino',Icon:Bell},{campo:'vibration',label:'Vibração',desc:'Feedback tátil',Icon:Smartphone}] as const).map(({campo,label,desc,Icon})=>{
                const on=(userData as any)[campo];
                return (
                  <div key={campo} className="card px-4 py-3.5 flex items-center gap-3">
                    <Icon size={16} className="text-ink-3 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.88rem] font-semibold text-ink-1">{label}</div>
                      <div className="text-[0.65rem] text-ink-3">{desc}</div>
                    </div>
                    <motion.button whileTap={{scale:.9}} onClick={()=>salvarConfig(campo,!on)}
                      role="switch" aria-checked={on} aria-label={label}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${on?'bg-accent':'bg-surface-3'}`}>
                      <motion.div animate={{x:on?22:2}} transition={{type:'spring',stiffness:500,damping:32}}
                        className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow-card"/>
                    </motion.button>
                  </div>
                );
              })}

              {/* Unidade de peso */}
              <div className="card px-4 py-3.5 flex items-center gap-3">
                <Weight size={16} className="text-ink-3 shrink-0"/>
                <div className="flex-1 text-[0.88rem] font-semibold text-ink-1">Unidade de peso</div>
                <div className="flex gap-1.5">
                  {(['kg','lb'] as const).map(u=>{
                    const active=(userData as any).weightUnit===u;
                    return (
                      <motion.button key={u} whileTap={{scale:.9}} onClick={()=>salvarConfig('weightUnit',u)}
                        className={`rounded-lg border px-3 py-1 text-[0.78rem] font-semibold transition-colors
                          ${active?'border-accent/30 bg-accent-soft text-accent':'border-line text-ink-3'}`}>
                        {u}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STATS ──────────────────────────────────────── */}
          {tab==='stats'&&(
            <div className="grid gap-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <StatTile value={stats.totalTreinos} label="Total Treinos" tone="accent" icon={<Dumbbell size={16}/>}/>
                <StatTile value={stats.streak} label="Streak Atual" tone="warn" icon={<Flame size={16}/>}/>
                <StatTile value={stats.prs} label="PRs Totais" tone="info" icon={<TrendingUp size={16}/>}/>
                <StatTile value={selosCount} label="Selos" tone="ok" icon={<Trophy size={16}/>}/>
              </div>

              <div className="card px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink-2 text-[0.82rem]">
                  <Dumbbell size={16} className="text-ink-3"/> Volume total
                </div>
                <div className="font-display font-bold text-[1.2rem] text-ink-1 tnum">
                  {stats.volTotal>=1000000?(stats.volTotal/1000000).toFixed(1)+'t':stats.volTotal>=1000?(stats.volTotal/1000).toFixed(1)+'t':Math.round(stats.volTotal)+'kg'}
                </div>
              </div>

              {stats.topPRs.length>0&&(
                <div className="card px-4 py-3.5">
                  <div className="eyebrow mb-2 flex items-center gap-1.5">
                    <Trophy size={12}/> Top PRs
                  </div>
                  {stats.topPRs.map((pr,i)=>(
                    <div key={i}>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-[0.82rem] text-ink-2 truncate mr-3">{pr.nome}</span>
                        <span className="font-display font-bold text-[1.05rem] text-accent tnum shrink-0">{pr.est}kg</span>
                      </div>
                      {i<stats.topPRs.length-1&&<div className="border-t border-line"/>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PLANO ──────────────────────────────────────── */}
          {tab==='plano'&&(
            <div className="grid gap-3">
              <div className={`card p-4 text-center ${tier!=='free'?'border-accent/30 bg-accent-soft':''}`}>
                <div className="eyebrow mb-1.5">Plano atual</div>
                <div className={`font-display font-bold text-[1.5rem] tracking-tight ${tier==='free'?'text-ink-1':'text-accent'}`}>
                  {tier==='darkgod'?'DarkGod Founder':tier==='elite'?'Elite':'Gratuito'}
                </div>
                {tier!=='free'&&(
                  <span className="inline-flex items-center gap-1 rounded-full border border-ok/30 bg-ok-soft text-ok text-[0.6rem] font-semibold px-2 py-0.5 mt-2">
                    <CheckCircle2 size={10}/> Ativo
                  </span>
                )}
              </div>

              {tier==='free'&&(
                <div className="card p-5 border-accent/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={20} className="text-accent"/>
                    <div className="font-display font-bold text-[1.25rem] tracking-tight text-ink-1">
                      DarkSet <span className="text-accent">Elite</span>
                    </div>
                  </div>
                  {['Gráficos avançados','Backup automático','Cardio GPS ilimitado','DarkSquad + ranking global','DarkDiet completo'].map((feat,i)=>(
                    <div key={i} className="flex items-center gap-2.5 py-1.5">
                      <CheckCircle2 size={14} className="text-ok shrink-0"/>
                      <span className="text-[0.85rem] text-ink-1">{feat}</span>
                    </div>
                  ))}
                  <Button full className="mt-4">
                    Assinar Elite — R$ 14,90/mês
                  </Button>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      <div className="mt-6">
        <Button variant="danger" full onClick={handleLogout}>
          <LogOut size={16}/> Sair da conta
        </Button>
      </div>
    </PageShell>
  );
}
