'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Flame, Zap, ChevronRight, Play,
  History, Medal, Dumbbell, Salad,
  Users, Wind, TrendingUp, Trophy,
  CalendarCheck, BarChart2,
  Globe
} from 'lucide-react';
import {
  PersonSimpleRun, Sword, Skull,
  Crown, Hourglass, ShieldStar,
  SunHorizon
} from '@phosphor-icons/react';

// ── Tipos ─────────────────────────────────────────────────────
type UserData    = { name:string; photoURL:string|null; weeklyGoal:number; trainDays:number[] };
type HistEntry   = { entries:{sets:{w:string;r:string}[]}[] };
type Ficha       = { id:string; name:string; byDay:Record<string,{name:string}[]> };

const DIAS_NOME  = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DIAS_LABEL = ['S','T','Q','Q','S','S','D'];

const RANK_NIVEIS = [
  { label:'MORTAL',    minSelos:0,  cor:'#7a7a8a', Icon:Skull      },
  { label:'GUERREIRO', minSelos:3,  cor:'#cd7f32', Icon:Sword      },
  { label:'POSEIDON',  minSelos:8,  cor:'#60a5fa', Icon:ShieldStar },
  { label:'HADES',     minSelos:15, cor:'#a78bfa', Icon:Skull      },
  { label:'CRONOS',    minSelos:25, cor:'#facc15', Icon:Hourglass  },
  { label:'DARKGOD',   minSelos:40, cor:'#e31b23', Icon:Crown      },
];

const ATALHOS = [
  { Icon:History,         label:'Histórico',  href:'/historico'  },
  { Icon:Medal,           label:'Selos',      href:'/darkselos'  },
  { Icon:PersonSimpleRun, label:'Cardio',     href:'/cardio'     },
  { Icon:Salad,           label:'DarkDiet',   href:'/darkdiet'   },
  { Icon:Users,           label:'Squad',      href:'/darksquad'  },
  { Icon:Wind,            label:'DarkZen',    href:'/darkzen'    },
];

// ── Helpers ───────────────────────────────────────────────────
const num = (v: string) => { const n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; };

function calcStreak(history: Record<string,HistEntry>, trainDays: number[]): number {
  let streak=0;
  const today=new Date(), todayKey=today.toISOString().slice(0,10);
  const d=new Date(today);
  if(trainDays.includes(today.getDay())&&!history[todayKey]) d.setDate(d.getDate()-1);
  for(let i=0;i<800;i++){
    const k=d.toISOString().slice(0,10);
    if(!trainDays.includes(d.getDay())){ d.setDate(d.getDate()-1); continue; }
    if(history[k]){ streak++; d.setDate(d.getDate()-1); } else break;
  }
  return streak;
}

function calcWeekVol(history: Record<string,HistEntry>): number {
  const today=new Date();
  const ws=new Date(today); ws.setDate(today.getDate()-((today.getDay()||7)-1));
  const wsStr=ws.toISOString().slice(0,10);
  let vol=0;
  Object.entries(history).forEach(([iso,entry])=>{
    if(iso>=wsStr) (entry.entries||[]).forEach(e=>(e.sets||[]).forEach(s=>{ vol+=num(s.w)*num(s.r); }));
  });
  return Math.round(vol);
}

function getWeekDots(history: Record<string,HistEntry>, trainDays: number[]) {
  const today=new Date();
  const ws=new Date(today); ws.setDate(today.getDate()-((today.getDay()||7)-1));
  return Array.from({length:7},(_,i)=>{
    const d=new Date(ws); d.setDate(ws.getDate()+i);
    return { trained:!!history[d.toISOString().slice(0,10)], isTrainDay:trainDays.includes(d.getDay()), label:DIAS_LABEL[i] };
  });
}

function getNextTrainDay(ficha: Ficha|null): {day:string;exs:{name:string}[]}|null {
  if(!ficha) return null;
  const todayIdx=(new Date().getDay()+6)%7;
  const todayNome=DIAS_NOME[todayIdx];
  if(ficha.byDay[todayNome]?.length>0) return {day:'Hoje',exs:ficha.byDay[todayNome]};
  for(let i=1;i<=7;i++){
    const d=DIAS_NOME[(todayIdx+i)%7];
    if(ficha.byDay[d]?.length>0) return {day:d,exs:ficha.byDay[d]};
  }
  return null;
}

// ── Componente ────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [user,       setUser]       = useState<any>(null);
  const [userData,   setUserData]   = useState<UserData>({name:'',photoURL:null,weeklyGoal:5,trainDays:[1,2,3,4,5,6]});
  const [history,    setHistory]    = useState<Record<string,HistEntry>>({});
  const [fichas,     setFichas]     = useState<Ficha[]>([]);
  const [activeId,   setActiveId]   = useState<string|null>(null);
  const [selosCount, setSelosCount] = useState(0);
  const [loading,    setLoading]    = useState(true);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUser(u);
      try {
        const [userSnap, histSnap, plansSnap, selosSnap] = await Promise.all([
          getDoc(doc(db,'users',u.uid)),
          getDoc(doc(db,'users',u.uid,'data','history')),
          getDoc(doc(db,'users',u.uid,'data','plans')),
          getDoc(doc(db,'users',u.uid,'data','selos')),
        ]);
        if(userSnap.exists()){
          const d=userSnap.data();
          setUserData({name:d.name||u.displayName||'',photoURL:d.photoURL||u.photoURL||null,weeklyGoal:d.weeklyGoal||5,trainDays:d.trainDays||[1,2,3,4,5,6]});
        } else {
          setUserData(p=>({...p,name:u.displayName||'',photoURL:u.photoURL||null}));
        }
        if(histSnap.exists())  setHistory(JSON.parse(histSnap.data().payload||'{}'));
        if(plansSnap.exists()){ const p=JSON.parse(plansSnap.data().payload||'{}'); setFichas(p.list||[]); setActiveId(p.activeId||null); }
        if(selosSnap.exists()) setSelosCount(Object.values(selosSnap.data()).filter(Boolean).length);
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const trainDays    = userData.trainDays;
  const streak       = calcStreak(history, trainDays);
  const weekVol      = calcWeekVol(history);
  const weekDots     = getWeekDots(history, trainDays);
  const thisWeek     = weekDots.filter(d=>d.trained&&d.isTrainDay).length;
  const totalSess    = Object.keys(history).length;
  const activeFicha  = fichas.find(f=>f.id===activeId)||fichas[0]||null;
  const nextTreino   = getNextTrainDay(activeFicha);
  const ultimosTreinos = Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,3);
  const rank         = [...RANK_NIVEIS].reverse().find(n=>selosCount>=n.minSelos)||RANK_NIVEIS[0];
  const nextRank     = RANK_NIVEIS.find(n=>n.minSelos>selosCount);
  const rankPct      = nextRank ? Math.round((selosCount-rank.minSelos)/(nextRank.minSelos-rank.minSelos)*100) : 100;
  const nome         = userData.name||user?.displayName||'Atleta';
  const initials     = nome.slice(0,2).toUpperCase();
  const RankIcon     = rank.Icon;

  // ── Loading ──────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  // ── Não logado ────────────────────────────────────────────
  if(!user) return (
    <PageShell>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:'1rem',textAlign:'center'}}>
        <motion.div initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:200}}>
          <Dumbbell size={56} color="#e31b23"/>
        </motion.div>
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.15}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
            DARK<span style={{color:'#e31b23'}}>SET</span>
          </div>
          <div style={{fontSize:'.88rem',color:'#7a7a8a',marginTop:'.5rem'}}>Faça login para ver seus treinos</div>
        </motion.div>
        <motion.button initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.3}}
          whileTap={{scale:.97}} onClick={()=>router.push('/login')}
          style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'13px 32px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.3)',outline:'none'}}>
          Entrar
        </motion.button>
      </div>
    </PageShell>
  );

  return (
    <PageShell>

      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div>
          <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'#7a7a8a',display:'flex',alignItems:'center',gap:'.3rem'}}>
            <SunHorizon size={12} color="#7a7a8a"/>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.9rem',textTransform:'uppercase',color:'#f0f0f2',margin:0,lineHeight:1,marginTop:2}}>
            {nome.split(' ')[0] ? `E aí, ${nome.split(' ')[0]}!` : 'Bora Treinar!'}
          </h1>
        </div>
        <motion.button whileTap={{scale:.93}} onClick={()=>router.push('/perfil')}
          style={{background:'none',border:'none',padding:0,cursor:'pointer',outline:'none'}}>
          {userData.photoURL
            ? <img src={userData.photoURL} style={{width:44,height:44,borderRadius:'50%',border:'2px solid #2e2e38',objectFit:'cover'}} alt="avatar"/>
            : <div style={{width:44,height:44,borderRadius:'50%',border:'2px solid #2e2e38',background:'linear-gradient(135deg,#e31b23,#6b0a0e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',color:'#fff'}}>
                {initials}
              </div>
          }
        </motion.button>
      </motion.div>

      {/* ── Streak Hero ────────────────────────────────────── */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.06}}>
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,marginBottom:'.75rem',overflow:'hidden',position:'relative'}}>
          {streak>0 && (
            <div style={{position:'absolute',top:-30,right:-30,width:130,height:130,borderRadius:'50%',background:'radial-gradient(circle,rgba(227,27,35,.15),transparent 70%)',pointerEvents:'none'}}/>
          )}
          <CardContent style={{padding:'1.1rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              {/* Streak */}
              <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                <motion.div animate={streak>0?{scale:[1,1.15,1]}:{}} transition={{duration:.6,repeat:Infinity,repeatDelay:2}}>
                  <Flame size={32} color={streak>0?'#e31b23':'#484858'}/>
                </motion.div>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3rem',lineHeight:1,color:streak>0?'#e31b23':'#484858'}}>{streak}</div>
                  <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em'}}>dias streak</div>
                </div>
              </div>

              {/* Stats semana */}
              <div style={{display:'flex',gap:'1.25rem'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.25rem',marginBottom:'1px'}}>
                    <CalendarCheck size={12} color="#7a7a8a"/>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',color:'#f0f0f2',lineHeight:1}}>
                    {thisWeek}<span style={{fontSize:'.85rem',color:'#484858'}}>/{userData.weeklyGoal}</span>
                  </div>
                  <div style={{fontSize:'.5rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.07em'}}>semana</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.25rem',marginBottom:'1px'}}>
                    <Zap size={12} color="#7a7a8a"/>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',color:'#f0f0f2',lineHeight:1}}>
                    {weekVol>=1000?(weekVol/1000).toFixed(1)+'t':weekVol+'kg'}
                  </div>
                  <div style={{fontSize:'.5rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.07em'}}>volume</div>
                </div>
              </div>
            </div>

            <Separator style={{background:'rgba(255,255,255,.05)',marginBottom:'.85rem'}}/>

            {/* Dots da semana */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',padding:'0 .1rem'}}>
              {weekDots.map(({trained,isTrainDay,label},i)=>(
                <motion.div key={i} initial={{opacity:0,scale:.8}} animate={{opacity:isTrainDay?1:.35,scale:1}} transition={{delay:.3+i*.04}}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.25rem'}}>
                  <motion.div
                    animate={trained?{boxShadow:['0 0 0px rgba(227,27,35,0)','0 0 10px rgba(227,27,35,.6)','0 0 0px rgba(227,27,35,0)']}:{}}
                    transition={{duration:2,repeat:Infinity,repeatDelay:1}}
                    style={{
                      width:trained?12:8, height:trained?12:8,
                      borderRadius:'50%',
                      background:trained?'#e31b23':(isTrainDay?'#2e2e38':'transparent'),
                      border:trained?'none':`1px solid ${isTrainDay?'#3e3e48':'#2e2e38'}`,
                      transition:'all .2s',
                    }}/>
                  <span style={{fontSize:'.58rem',color:trained?'#b0b0be':'#484858',fontWeight:trained?700:400}}>{label}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Botão Modo Treino ──────────────────────────────── */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.12}}>
        <motion.button whileTap={{scale:.98}} onClick={()=>router.push('/modo-treino')} style={{
          width:'100%',marginBottom:'.75rem',
          background:'linear-gradient(135deg,#e31b23,#8b0000)',
          border:'none',borderRadius:14,padding:'1.1rem 1.25rem',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          cursor:'pointer',position:'relative',overflow:'hidden',
          boxShadow:'0 4px 24px rgba(227,27,35,.25)',outline:'none',
        }}>
          <div style={{position:'absolute',right:-8,top:'50%',transform:'translateY(-50%)',opacity:.08}}>
            <Dumbbell size={96} color="#fff"/>
          </div>
          <div style={{textAlign:'left',position:'relative'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.4rem',fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:'.04em',lineHeight:1}}>
              Modo Treino
            </div>
            <div style={{fontSize:'.72rem',color:'rgba(255,255,255,.6)',marginTop:'.25rem'}}>
              {nextTreino
                ? `${nextTreino.day} · ${nextTreino.exs.slice(0,2).map((e:any)=>e.name||e.nome).join(', ')}${nextTreino.exs.length>2?'…':''}`
                : activeFicha ? activeFicha.name : 'Com ou sem ficha'
              }
            </div>
          </div>
          <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
            <Play size={20} color="#fff" fill="#fff"/>
          </div>
        </motion.button>
      </motion.div>

      {/* ── Card de Rank ──────────────────────────────────── */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.18}}>
        <motion.button whileTap={{scale:.98}} onClick={()=>router.push('/darkselos')} style={{
          width:'100%',marginBottom:'.75rem',
          background:'#1e1e24',border:`1px solid ${rank.cor}33`,
          borderRadius:16,padding:'.9rem 1.1rem',
          display:'flex',alignItems:'center',gap:'1rem',
          cursor:'pointer',position:'relative',overflow:'hidden',textAlign:'left',outline:'none',
        }}>
          <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 0% 50%,${rank.cor}10 0%,transparent 60%)`,pointerEvents:'none'}}/>
          <div style={{width:52,height:52,borderRadius:12,background:`${rank.cor}22`,border:`1px solid ${rank.cor}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
            <RankIcon size={28} color={rank.cor} weight="fill"/>
          </div>
          <div style={{flex:1,minWidth:0,position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'2px'}}>
              <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700}}>Seu rank</div>
              <Badge style={{background:`${rank.cor}22`,color:rank.cor,border:`1px solid ${rank.cor}44`,fontSize:'.48rem',padding:'1px 5px'}}>{selosCount} selos</Badge>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',letterSpacing:'.05em',lineHeight:1,color:rank.cor,marginBottom:'.4rem'}}>
              {rank.label}
            </div>
            <div style={{background:'rgba(255,255,255,.06)',borderRadius:3,height:4,marginBottom:3,overflow:'hidden'}}>
              <motion.div initial={{width:0}} animate={{width:`${rankPct}%`}} transition={{delay:.5,duration:.8,ease:'easeOut'}}
                style={{height:'100%',borderRadius:3,background:rank.cor,boxShadow:`0 0 8px ${rank.cor}66`}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <div style={{fontSize:'.52rem',color:'#7a7a8a',display:'flex',alignItems:'center',gap:'.2rem'}}>
                {nextRank ? <><TrendingUp size={9}/> {nextRank.label}</> : <><Trophy size={9}/> Máximo</>}
              </div>
              <div style={{fontSize:'.52rem',color:rank.cor,fontWeight:700}}>{selosCount}{nextRank?`/${nextRank.minSelos}`:''}</div>
            </div>
          </div>
          <ChevronRight size={18} color="#484858" style={{position:'relative',flexShrink:0}}/>
        </motion.button>
      </motion.div>

      {/* ── Grid de atalhos ───────────────────────────────── */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.24}}
        style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'.75rem'}}>
        {ATALHOS.map((a,i)=>{
          const AIcon = a.Icon;
          return (
            <motion.button key={a.href} whileTap={{scale:.95}} onClick={()=>router.push(a.href)} style={{
              background:'#1e1e24',border:'1px solid #2e2e38',
              borderRadius:12,padding:'.75rem .5rem',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'.35rem',
              cursor:'pointer',outline:'none',
            }}>
              {'size' in AIcon
                ? <AIcon size={20} color="#b0b0be"/>
                : <AIcon size={20} color="#b0b0be" weight="fill"/>
              }
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#b0b0be'}}>{a.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Últimos treinos ───────────────────────────────── */}
      {ultimosTreinos.length > 0 && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.3}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.5rem'}}>
            <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7a7a8a',display:'flex',alignItems:'center',gap:'.3rem'}}>
              <BarChart2 size={12} color="#7a7a8a"/> Últimos treinos
            </div>
            <motion.button whileTap={{scale:.95}} onClick={()=>router.push('/historico')}
              style={{background:'none',border:'none',cursor:'pointer',fontSize:'.62rem',color:'#e31b23',fontWeight:700,display:'flex',alignItems:'center',gap:'.2rem',outline:'none',padding:0}}>
              Ver todos <ChevronRight size={12}/>
            </motion.button>
          </div>
          <div style={{display:'grid',gap:'.45rem'}}>
            {ultimosTreinos.map(([date,entry],i)=>{
              const d=new Date(date+'T12:00:00');
              const hoje=new Date().toISOString().slice(0,10);
              const ontem=new Date(Date.now()-86400000).toISOString().slice(0,10);
              const label=date===hoje?'Hoje':date===ontem?'Ontem':d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
              const totalSets=(entry.entries||[]).reduce((s,e)=>s+(e.sets||[]).length,0);
              const vol=(entry.entries||[]).reduce((s,e)=>(e.sets||[]).reduce((s2,st)=>s2+num(st.w)*num(st.r),s),0);
              return (
                <motion.div key={date} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.3+i*.06}}>
                  <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12,cursor:'pointer'}}
                    onClick={()=>router.push('/historico')}>
                    <CardContent style={{padding:'.85rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'.65rem'}}>
                        <div style={{width:36,height:36,borderRadius:9,background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Dumbbell size={18} color="#e31b23"/>
                        </div>
                        <div>
                          <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#7a7a8a',marginBottom:'1px'}}>{label}</div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.95rem',color:'#f0f0f2'}}>{totalSets} séries · {(entry.entries||[]).length} ex</div>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:'#e31b23'}}>
                          {vol>=1000?(vol/1000).toFixed(1)+'t':Math.round(vol)+'kg'}
                        </div>
                        <ChevronRight size={14} color="#484858"/>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Estado vazio ──────────────────────────────────── */}
      {totalSess === 0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.35}}>
          <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14,marginTop:'.5rem'}}>
            <CardContent style={{padding:'2.5rem 1rem',textAlign:'center'}}>
              <motion.div animate={{y:[0,-6,0]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}} style={{marginBottom:'.75rem'}}>
                <Dumbbell size={44} color="#484858" style={{margin:'0 auto'}}/>
              </motion.div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.4rem'}}>Nenhum treino ainda</div>
              <div style={{fontSize:'.82rem',color:'#7a7a8a',marginBottom:'1rem'}}>Comece seu primeiro treino agora!</div>
              <motion.button whileTap={{scale:.97}} onClick={()=>router.push('/modo-treino')}
                style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:10,padding:'.65rem 1.5rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'inline-flex',alignItems:'center',gap:'.5rem'}}>
                <Play size={16} fill="#fff" color="#fff"/> Iniciar Treino
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>
      )}


        {/* Card Rank Global */}
        {meuRank && (() => {
          const liga = getLiga(meuRank.pontos);
          const proximaLiga = LIGAS.find(l=>l.min>meuRank.pontos);
          const pctProxima = proximaLiga
            ? Math.round(((meuRank.pontos-liga.min)/(proximaLiga.min-liga.min))*100)
            : 100;
          return (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginBottom:'.75rem'}}>
              <div onClick={()=>window.location.href='/darksquad'}
                style={{background:`linear-gradient(135deg,${liga.corBg},rgba(0,0,0,.2))`,border:`1px solid ${liga.corBorder}`,borderRadius:16,padding:'1rem 1.1rem',cursor:'pointer',position:'relative',overflow:'hidden'}}>
                {/* Glow de fundo */}
                <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:liga.cor,opacity:.06,pointerEvents:'none'}}/>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.65rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                    <Globe size={14} color={liga.cor}/>
                    <div style={{fontSize:'.58rem',color:liga.cor,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700}}>Rank Global</div>
                  </div>
                  <div style={{fontSize:'.62rem',color:'#484858',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <TrendingUp size={12}/> {fmtPontos(meuRank.pontos)} pts
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.65rem'}}>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:liga.cor,lineHeight:1,textTransform:'uppercase'}}>{liga.nome}</div>
                    {meuRank.posicao&&<div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'2px'}}>#{meuRank.posicao} no ranking global</div>}
                  </div>
                  {/* Top 3 avatares */}
                  <div style={{display:'flex',gap:'.25rem',alignItems:'center'}}>
                    {top3.slice(0,3).map((r,i)=>{
                      const cores=['#d97706','#9ca3af','#b45309'];
                      return (
                        <div key={r.uid} style={{width:28,height:28,borderRadius:'50%',background:`${cores[i]}22`,border:`1px solid ${cores[i]}55`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.62rem',color:cores[i]}}>
                          {r.initials}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Barra de progresso para próxima liga */}
                {proximaLiga && (
                  <div>
                    <div style={{background:'rgba(255,255,255,.06)',borderRadius:4,height:5,overflow:'hidden',marginBottom:'.3rem'}}>
                      <motion.div animate={{width:`${pctProxima}%`}} transition={{duration:.6,ease:'easeOut'}}
                        style={{height:'100%',borderRadius:4,background:liga.cor,boxShadow:`0 0 8px ${liga.cor}88`}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'.55rem',color:'#484858'}}>
                      <span>{liga.nome}</span>
                      <span>{proximaLiga.min - meuRank.pontos} pts para {proximaLiga.nome}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}


        {/* Card Rank Global */}
        {meuRank && (() => {
          const liga = getLiga(meuRank.pontos);
          const proximaLiga = LIGAS.find(l=>l.min>meuRank.pontos);
          const pctProxima = proximaLiga
            ? Math.round(((meuRank.pontos-liga.min)/(proximaLiga.min-liga.min))*100)
            : 100;
          return (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginBottom:'.75rem'}}>
              <div onClick={()=>window.location.href='/darksquad'}
                style={{background:`linear-gradient(135deg,${liga.corBg},rgba(0,0,0,.2))`,border:`1px solid ${liga.corBorder}`,borderRadius:16,padding:'1rem 1.1rem',cursor:'pointer',position:'relative',overflow:'hidden'}}>
                {/* Glow de fundo */}
                <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:liga.cor,opacity:.06,pointerEvents:'none'}}/>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.65rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                    <Globe size={14} color={liga.cor}/>
                    <div style={{fontSize:'.58rem',color:liga.cor,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700}}>Rank Global</div>
                  </div>
                  <div style={{fontSize:'.62rem',color:'#484858',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <TrendingUp size={12}/> {fmtPontos(meuRank.pontos)} pts
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.65rem'}}>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:liga.cor,lineHeight:1,textTransform:'uppercase'}}>{liga.nome}</div>
                    {meuRank.posicao&&<div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'2px'}}>#{meuRank.posicao} no ranking global</div>}
                  </div>
                  {/* Top 3 avatares */}
                  <div style={{display:'flex',gap:'.25rem',alignItems:'center'}}>
                    {top3.slice(0,3).map((r,i)=>{
                      const cores=['#d97706','#9ca3af','#b45309'];
                      return (
                        <div key={r.uid} style={{width:28,height:28,borderRadius:'50%',background:`${cores[i]}22`,border:`1px solid ${cores[i]}55`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.62rem',color:cores[i]}}>
                          {r.initials}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Barra de progresso para próxima liga */}
                {proximaLiga && (
                  <div>
                    <div style={{background:'rgba(255,255,255,.06)',borderRadius:4,height:5,overflow:'hidden',marginBottom:'.3rem'}}>
                      <motion.div animate={{width:`${pctProxima}%`}} transition={{duration:.6,ease:'easeOut'}}
                        style={{height:'100%',borderRadius:4,background:liga.cor,boxShadow:`0 0 8px ${liga.cor}88`}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'.55rem',color:'#484858'}}>
                      <span>{liga.nome}</span>
                      <span>{proximaLiga.min - meuRank.pontos} pts para {proximaLiga.nome}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}

    </PageShell>
  );
}
