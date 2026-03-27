'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getLiga, LIGAS } from '@/lib/rankSystem';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings, BarChart2, Crown, LogOut,
  Bell, Target, Weight, Moon, Smartphone,
  ChevronRight, CheckCircle2, Flame,
  Dumbbell, TrendingUp, Edit2, Camera,
  Save, X, Loader2, Trophy, Zap, Star
} from 'lucide-react';
import {
  UserCircle, Barbell, Lightning,
  ShieldStar, Medal, Crown as PCrown
} from '@phosphor-icons/react';

// ── Tipos ─────────────────────────────────────────────────────
type UserData = {
  name: string; photoURL: string|null;
  weeklyGoal: number; trainDays: number[];
  notifications: boolean; vibration: boolean;
  weightUnit: 'kg'|'lb'; planData?: { tier: string };
};
type HistEntry = { entries: {name?:string;sets:{w:string;r:string}[]}[]; startTime?: string };

const RANK_NIVEIS = [
  {label:'MORTAL',   minSelos:0,  cor:'#6b7280'},
  {label:'GUERREIRO',minSelos:5,  cor:'#cd7f32'},
  {label:'POSEIDON', minSelos:12, cor:'#60a5fa'},
  {label:'HADES',    minSelos:20, cor:'#a78bfa'},
  {label:'CRONOS',   minSelos:25, cor:'#facc15'},
  {label:'DARKGOD',  minSelos:40, cor:'#e31b23'},
];

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function calcStats(hist: Record<string,HistEntry>, trainDays: number[]) {
  const n = (v:any) => { const x=parseFloat(String(v).replace(',','.')); return isFinite(x)?x:0; };
  const totalTreinos = Object.keys(hist).length;
  let volTotal = 0;
  const bestPR: Record<string,number> = {};
  let prs = 0;
  Object.entries(hist).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([,obj])=>{
    (obj.entries||[]).forEach(en=>{
      (en.sets||[]).forEach(s=>{
        const w=n(s.w),r=n(s.r);
        volTotal+=w*r;
        if(w&&r){const est=w*(1+r/30);if(!bestPR[en.name||'']||est>bestPR[en.name||'']+0.01){bestPR[en.name||'']=est;prs++;}}
      });
    });
  });
  // Streak
  let streak=0;
  const today=new Date();
  const todayKey=today.toISOString().slice(0,10);
  const d=new Date(today);
  if(trainDays.includes(today.getDay())&&!hist[todayKey]) d.setDate(d.getDate()-1);
  for(let i=0;i<800;i++){
    const k=d.toISOString().slice(0,10);
    const isTrain=trainDays.includes(d.getDay());
    if(!isTrain){d.setDate(d.getDate()-1);continue;}
    if(hist[k]){streak++;d.setDate(d.getDate()-1);}else break;
  }
  // Top PRs
  const topPRs = Object.entries(bestPR).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nome,est])=>({nome,est:Math.round(est)}));
  return { totalTreinos, volTotal, streak, prs, topPRs };
}

export default function PerfilPage() {
  const router = useRouter();
  const [user,      setUser]      = useState<any>(null);
  const [userData,  setUserData]  = useState<UserData>({name:'',photoURL:null,weeklyGoal:5,trainDays:[1,2,3,4,5,6],notifications:true,vibration:true,weightUnit:'kg'});
  const [history,   setHistory]   = useState<Record<string,HistEntry>>({});
  const [selos,     setSelos]     = useState<Record<string,boolean>>({});
  const [meuRank,   setMeuRank]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState<'config'|'stats'|'plano'>('config');
  const [editName,  setEditName]  = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [toast,     setToast]     = useState('');

  const showToast = (m:string) => { setToast(m); setTimeout(()=>setToast(''),2500); };

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUser(u);
      try {
        const userSnap = await getDoc(doc(db,'users',u.uid));
        if(userSnap.exists()){
          const d = userSnap.data();
          setUserData({
            name: d.name||u.displayName||'Atleta',
            photoURL: d.photoURL||u.photoURL||null,
            weeklyGoal: d.weeklyGoal||5,
            trainDays: d.trainDays||[1,2,3,4,5,6],
            notifications: d.notifications!==false,
            vibration: d.vibration!==false,
            weightUnit: d.weightUnit||'kg',
            planData: d.planData,
          });
          setNameInput(d.name||u.displayName||'Atleta');
        }
        const histSnap = await getDoc(doc(db,'users',u.uid,'data','history'));
        if(histSnap.exists()) setHistory(JSON.parse(histSnap.data().payload||'{}'));
        // Rank global
        const rankSnap = await getDoc(doc(db,'globalRank',u.uid));
        if(rankSnap.exists()) setMeuRank(rankSnap.data());

        const selosSnap = await getDoc(doc(db,'users',u.uid,'data','selos'));
        if(selosSnap.exists()) setSelos(selosSnap.data() as Record<string,boolean>);
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const salvarNome = async () => {
    if(!nameInput.trim()||!user) return;
    setSaving(true);
    try {
      await updateProfile(user,{displayName:nameInput.trim()});
      await setDoc(doc(db,'users',user.uid),{name:nameInput.trim()},{merge:true});
      setUserData(d=>({...d,name:nameInput.trim()}));
      setEditName(false);
      showToast('Nome atualizado!');
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const salvarConfig = async (campo: string, valor: any) => {
    if(!user) return;
    setUserData(d=>({...d,[campo]:valor}));
    try {
      await setDoc(doc(db,'users',user.uid),{[campo]:valor},{merge:true});
    } catch(e){ console.error(e); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const stats = calcStats(history, userData.trainDays);
  const selosCount = Object.values(selos).filter(Boolean).length;
  const rank = [...RANK_NIVEIS].reverse().find(n=>selosCount>=n.minSelos)||RANK_NIVEIS[0];
  const proxRank = RANK_NIVEIS.find(n=>n.minSelos>selosCount);
  const rankPct = proxRank ? Math.round((selosCount-rank.minSelos)/(proxRank.minSelos-rank.minSelos)*100) : 100;
  const tier = userData.planData?.tier||'free';
  const initials = (userData.name||user?.displayName||user?.email||'DS').slice(0,2).toUpperCase();

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  if(!user) return (
    <PageShell>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
        style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:'1rem',textAlign:'center'}}>
        <UserCircle size={64} color="#484858" weight="fill"/>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2'}}>
          Faça login para ver seu perfil
        </div>
        <motion.button whileTap={{scale:.97}} onClick={()=>router.push('/login')}
          style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'13px 32px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
          Entrar
        </motion.button>
      </motion.div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Toast */}
      <AnimatePresence>
        {toast&&(
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'.4rem',pointerEvents:'none'}}>
            <CheckCircle2 size={14}/>{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}>
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,marginBottom:'.75rem',overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:60,background:'linear-gradient(135deg,rgba(227,27,35,.15),rgba(0,0,0,0))',pointerEvents:'none'}}/>
          <CardContent style={{padding:'1.25rem',position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
              {/* Avatar */}
              <div style={{position:'relative',flexShrink:0}}>
                {userData.photoURL
                  ?<img src={userData.photoURL} style={{width:64,height:64,borderRadius:'50%',border:'2px solid #2e2e38',objectFit:'cover'}} alt="avatar"/>
                  :<div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#e31b23,#6b0a0e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',color:'#fff',border:'2px solid rgba(227,27,35,.3)'}}>
                    {initials}
                  </div>
                }
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                {editName?(
                  <div style={{display:'flex',gap:'.4rem',alignItems:'center',marginBottom:'.3rem'}}>
                    <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&salvarNome()}
                      autoFocus
                      style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:8,color:'#f0f0f2',padding:'6px 10px',fontSize:'1rem',outline:'none',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800}}/>
                    <motion.button whileTap={{scale:.9}} onClick={salvarNome} disabled={saving}
                      style={{background:'rgba(34,197,94,.15)',border:'1px solid rgba(34,197,94,.3)',borderRadius:7,padding:'5px 8px',color:'#4ade80',cursor:'pointer',outline:'none',display:'flex',alignItems:'center'}}>
                      {saving?<Loader2 size={14}/>:<Save size={14}/>}
                    </motion.button>
                    <motion.button whileTap={{scale:.9}} onClick={()=>setEditName(false)}
                      style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:7,padding:'5px 8px',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center'}}>
                      <X size={14}/>
                    </motion.button>
                  </div>
                ):(
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.2rem'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {userData.name||'Atleta'}
                    </div>
                    <motion.button whileTap={{scale:.9}} onClick={()=>setEditName(true)}
                      style={{background:'none',border:'none',color:'#484858',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',padding:0,flexShrink:0}}>
                      <Edit2 size={13}/>
                    </motion.button>
                  </div>
                )}
                <div style={{fontSize:'.68rem',color:'#7a7a8a',marginBottom:'.4rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
                <div style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
                  <Badge style={{
                    background:tier==='darkgod'?'rgba(227,27,35,.15)':tier==='elite'?'rgba(250,204,21,.1)':'rgba(255,255,255,.06)',
                    color:tier==='darkgod'?'#e31b23':tier==='elite'?'#facc15':'#7a7a8a',
                    border:`1px solid ${tier==='darkgod'?'rgba(227,27,35,.3)':tier==='elite'?'rgba(250,204,21,.2)':'#2e2e38'}`,
                    fontSize:'.58rem',display:'flex',alignItems:'center',gap:'.3rem'
                  }}>
                    {tier==='darkgod'?<Lightning size={10} weight="fill"/>:tier==='elite'?<Zap size={10}/>:<Star size={10}/>}
                    {tier==='darkgod'?'DarkGod':tier==='elite'?'Elite':'Gratuito'}
                  </Badge>
                  <Badge style={{background:`${getLiga(meuRank?.pontos||0).corBg}`,color:getLiga(meuRank?.pontos||0).cor,border:`1px solid ${getLiga(meuRank?.pontos||0).corBorder}`,fontSize:'.58rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <Globe size={10}/>
                    {getLiga(meuRank?.pontos||0).nome}
                  </Badge>
                </div>
              </div>
            </div>
            {/* Barra rank global */}
            {(() => {
              const liga = getLiga(meuRank?.pontos||0);
              const proxLiga = LIGAS.find((l:any)=>l.min>(meuRank?.pontos||0));
              const pct = proxLiga ? Math.min(100,Math.round(((meuRank?.pontos||0)-liga.min)/(proxLiga.min-liga.min)*100)) : 100;
              return (
                <div style={{marginTop:'.85rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'.55rem',color:'#484858',marginBottom:'.3rem'}}>
                    <span style={{color:liga.cor,fontWeight:700}}>{liga.nome}</span>
                    <span>{proxLiga?`${proxLiga.min-(meuRank?.pontos||0)} pts para ${proxLiga.nome}`:'Rank máximo'}</span>
                  </div>
                  <div style={{background:'rgba(255,255,255,.06)',borderRadius:4,height:4,overflow:'hidden'}}>
                    <motion.div animate={{width:`${pct}%`}} transition={{duration:.6,ease:'easeOut'}}
                      style={{height:'100%',borderRadius:4,background:liga.cor,boxShadow:`0 0 8px ${liga.cor}88`}}/>
                  </div>
                </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.06}}
        style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:12,padding:'3px',gap:'3px',marginBottom:'1rem'}}>
        {([
          ['config','Config',Settings],
          ['stats','Stats',BarChart2],
          ['plano','Plano',Crown],
        ] as const).map(([id,label,Icon])=>(
          <motion.button key={id} whileTap={{scale:.95}} onClick={()=>setTab(id as any)} style={{
            flex:1,padding:'.46rem',borderRadius:9,border:'none',cursor:'pointer',
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.75rem',
            textTransform:'uppercase',letterSpacing:'.04em',
            background:tab===id?'rgba(227,27,35,.15)':'transparent',
            color:tab===id?'#e31b23':'#484858',
            boxShadow:tab===id?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',
            outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem',
          }}>
            <Icon size={13}/>{label}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

          {/* CONFIG */}
          {tab==='config'&&(
            <div style={{display:'grid',gap:'.55rem'}}>
              {/* Meta semanal */}
              <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                <CardContent style={{padding:'.85rem 1rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.75rem'}}>
                    <Target size={14} color="#7a7a8a"/>
                    <span style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Meta semanal</span>
                  </div>
                  <div style={{display:'flex',gap:'.4rem'}}>
                    {[3,4,5,6,7].map(n=>(
                      <motion.button key={n} whileTap={{scale:.9}} onClick={()=>salvarConfig('weeklyGoal',n)}
                        style={{flex:1,padding:'.4rem',borderRadius:8,border:`1px solid ${userData.weeklyGoal===n?'#e31b23':'#2e2e38'}`,background:userData.weeklyGoal===n?'rgba(227,27,35,.15)':'transparent',color:userData.weeklyGoal===n?'#e31b23':'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.88rem',cursor:'pointer',outline:'none'}}>
                        {n}x
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dias de treino */}
              <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                <CardContent style={{padding:'.85rem 1rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.75rem'}}>
                    <Dumbbell size={14} color="#7a7a8a"/>
                    <span style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Dias de treino</span>
                  </div>
                  <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap'}}>
                    {DIAS_SEMANA.map((dia,i)=>{
                      const ativo = userData.trainDays.includes(i);
                      return (
                        <motion.button key={i} whileTap={{scale:.9}}
                          onClick={()=>{
                            const novo = ativo ? userData.trainDays.filter(d=>d!==i) : [...userData.trainDays,i].sort();
                            salvarConfig('trainDays',novo);
                          }}
                          style={{padding:'.3rem .55rem',borderRadius:7,border:`1px solid ${ativo?'#e31b23':'#2e2e38'}`,background:ativo?'rgba(227,27,35,.15)':'transparent',color:ativo?'#e31b23':'#484858',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.72rem',cursor:'pointer',outline:'none'}}>
                          {dia}
                        </motion.button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Toggles */}
              {[
                {campo:'notifications',label:'Notificações',desc:'Lembretes de treino',Icon:Bell},
                {campo:'vibration',    label:'Vibração',    desc:'Feedback tátil',   Icon:Smartphone},
              ].map(({campo,label,desc,Icon})=>(
                <Card key={campo} style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                  <CardContent style={{padding:'.85rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                    <Icon size={16} color="#7a7a8a"/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'.88rem',fontWeight:600,color:'#f0f0f2'}}>{label}</div>
                      <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'1px'}}>{desc}</div>
                    </div>
                    <motion.button whileTap={{scale:.9}}
                      onClick={()=>salvarConfig(campo,!(userData as any)[campo])}
                      style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',outline:'none',background:(userData as any)[campo]?'#e31b23':'rgba(255,255,255,.1)',position:'relative',transition:'background .2s',flexShrink:0}}>
                      <motion.div animate={{x:(userData as any)[campo]?20:2}}
                        style={{width:20,height:20,borderRadius:'50%',background:'#fff',position:'absolute',top:2,boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
                    </motion.button>
                  </CardContent>
                </Card>
              ))}

              {/* Unidade de peso */}
              <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                <CardContent style={{padding:'.85rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                  <Weight size={16} color="#7a7a8a"/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'.88rem',fontWeight:600,color:'#f0f0f2'}}>Unidade de peso</div>
                  </div>
                  <div style={{display:'flex',gap:'.3rem'}}>
                    {(['kg','lb'] as const).map(u=>(
                      <motion.button key={u} whileTap={{scale:.9}} onClick={()=>salvarConfig('weightUnit',u)}
                        style={{padding:'.3rem .7rem',borderRadius:7,border:`1px solid ${userData.weightUnit===u?'#e31b23':'#2e2e38'}`,background:userData.weightUnit===u?'rgba(227,27,35,.15)':'transparent',color:userData.weightUnit===u?'#e31b23':'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',cursor:'pointer',outline:'none'}}>
                        {u}
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STATS */}
          {tab==='stats'&&(
            <div style={{display:'grid',gap:'.55rem'}}>
              {/* Grid de stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'.5rem'}}>
                {[
                  {val:stats.totalTreinos, lbl:'Total Treinos', cor:'#e31b23',  Icon:Dumbbell  },
                  {val:stats.streak,       lbl:'Streak Atual',  cor:'#f97316',  Icon:Flame     },
                  {val:stats.prs,          lbl:'PRs Totais',    cor:'#a78bfa',  Icon:TrendingUp},
                  {val:selosCount,         lbl:'Selos',         cor:'#facc15',  Icon:Trophy    },
                ].map((s,i)=>(
                  <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                    <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
                      <CardContent style={{padding:'.85rem',textAlign:'center'}}>
                        <s.Icon size={18} color={s.cor} style={{margin:'0 auto .3rem'}}/>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',color:s.cor,lineHeight:1}}>{s.val}</div>
                        <div style={{fontSize:'.55rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'.2rem'}}>{s.lbl}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Volume total */}
              <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                <CardContent style={{padding:'.85rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                    <Barbell size={16} color="#7a7a8a" weight="fill"/>
                    <span style={{fontSize:'.82rem',color:'#7a7a8a'}}>Volume total levantado</span>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#f0f0f2'}}>
                    {stats.volTotal>=1000000?(stats.volTotal/1000000).toFixed(1)+'t':
                     stats.volTotal>=1000?(stats.volTotal/1000).toFixed(1)+'t':
                     Math.round(stats.volTotal)+'kg'}
                  </div>
                </CardContent>
              </Card>

              {/* Top PRs */}
              {stats.topPRs.length>0&&(
                <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                  <CardContent style={{padding:'.85rem 1rem'}}>
                    <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.65rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                      <Trophy size={12}/> Top PRs (1RM estimado)
                    </div>
                    {stats.topPRs.map((pr,i)=>(
                      <div key={i}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.5rem 0'}}>
                          <span style={{fontSize:'.82rem',color:'#9898a8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{pr.nome}</span>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:'#e31b23',flexShrink:0,marginLeft:'.5rem'}}>{pr.est}kg</span>
                        </div>
                        {i<stats.topPRs.length-1&&<Separator style={{background:'rgba(255,255,255,.05)'}}/>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {stats.totalTreinos===0&&(
                <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14}}>
                  <CardContent style={{padding:'2rem',textAlign:'center'}}>
                    <Dumbbell size={36} color="#484858" style={{margin:'0 auto .5rem'}}/>
                    <div style={{fontSize:'.82rem',color:'#484858'}}>Nenhum treino registrado ainda</div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* PLANO */}
          {tab==='plano'&&(
            <div style={{display:'grid',gap:'.75rem'}}>
              {/* Plano atual */}
              <Card style={{background:tier==='free'?'#1e1e24':'linear-gradient(135deg,rgba(227,27,35,.12),rgba(0,0,0,.3))',border:`1px solid ${tier==='free'?'#2e2e38':'rgba(227,27,35,.3)'}`,borderRadius:16}}>
                <CardContent style={{padding:'1rem',textAlign:'center'}}>
                  <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'.4rem'}}>Plano atual</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',textTransform:'uppercase',color:tier==='free'?'#f0f0f2':'#e31b23',lineHeight:1,marginBottom:'.3rem'}}>
                    {tier==='darkgod'?'DarkGod Founder':tier==='elite'?'Elite':'Gratuito'}
                  </div>
                  {tier!=='free'&&<Badge style={{background:'rgba(34,197,94,.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,.2)',fontSize:'.6rem'}}>Ativo</Badge>}
                </CardContent>
              </Card>

              {/* Features Elite */}
              {tier==='free'&&(
                <Card style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.2)',borderRadius:16}}>
                  <CardContent style={{padding:'1.25rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'1rem'}}>
                      <Lightning size={20} color="#e31b23" weight="fill"/>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#fff'}}>
                        DARK<span style={{color:'#e31b23'}}>SET</span> ELITE
                      </div>
                    </div>
                    {[
                      'Gráficos avançados e evolução',
                      'Backup automático na nuvem',
                      'Cardio GPS ilimitado',
                      'DarkSquad + ranking global',
                      'DarkDiet completo',
                      'Suporte prioritário',
                    ].map((feat,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.4rem 0'}}>
                        <CheckCircle2 size={14} color="#4ade80"/>
                        <span style={{fontSize:'.85rem',color:'#f0f0f2'}}>{feat}</span>
                      </div>
                    ))}
                    <motion.button whileTap={{scale:.97}}
                      style={{width:'100%',marginTop:'1rem',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',cursor:'pointer',outline:'none',boxShadow:'0 4px 20px rgba(227,27,35,.3)'}}>
                      Assinar Elite — R$ 14,90/mês
                    </motion.button>
                    <div style={{textAlign:'center',marginTop:'.6rem',fontSize:'.65rem',color:'#484858'}}>
                      ou R$ 249,99 vitalício (DarkGod)
                    </div>
                  </CardContent>
                </Card>
              )}

              {tier!=='free'&&(
                <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                  <CardContent style={{padding:'1rem',textAlign:'center'}}>
                    <CheckCircle2 size={32} color="#4ade80" style={{margin:'0 auto .5rem'}}/>
                    <div style={{fontSize:'.88rem',color:'#4ade80',fontWeight:600}}>Todos os recursos desbloqueados</div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Logout */}
      <motion.button whileTap={{scale:.97}} onClick={handleLogout}
        style={{width:'100%',marginTop:'1.25rem',background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:12,padding:'13px',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
        <LogOut size={16}/> Sair da conta
      </motion.button>
    </PageShell>
  );
}
