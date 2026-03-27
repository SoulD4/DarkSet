'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { getLiga, fmtPontos, LIGAS, type RankScore } from '@/lib/rankSystem';
import { useRankSync } from '@/lib/useRankSync';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Flame, ChevronRight, Play,
  History, Dumbbell, Globe,
  Users, TrendingUp, Trophy,
  CalendarCheck, BarChart2, Zap
} from 'lucide-react';
import {
  PersonSimpleRun, Sword, Skull,
  Crown, ShieldStar, SunHorizon,
  ForkKnife, Heartbeat, Lightning
} from '@phosphor-icons/react';

// ── Tipos ─────────────────────────────────────────────────────
type UserData    = { name:string; photoURL:string|null; weeklyGoal:number; trainDays:number[] };
type HistEntry   = { entries:{sets:{w:string;r:string}[]}[] };
type Ficha       = { id:string; name:string; byDay:Record<string,{name:string}[]> };

const DIAS_NOME  = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DIAS_LABEL = ['S','T','Q','Q','S','S','D'];

const ATALHOS = [
  {Icon:History,          label:'Histórico', href:'/historico'  },
  {Icon:ShieldStar,       label:'Selos',     href:'/darkselos'  },
  {Icon:PersonSimpleRun,  label:'Cardio',    href:'/cardio'     },
  {Icon:ForkKnife,        label:'DarkDiet',  href:'/darkdiet'   },
  {Icon:Sword,            label:'Squad',     href:'/darksquad'  },
  {Icon:Trophy,           label:'DarkRank',  href:'/darkrank'   },
  {Icon:Heartbeat,        label:'DarkZen',   href:'/darkzen'    },
];

// ── Helpers ────────────────────────────────────────────────────
function calcStreak(history: Record<string,HistEntry>, trainDays: number[]): number {
  let streak = 0;
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const todayIsTrainDay = trainDays.includes(today.getDay());
  const d = new Date(today);
  if(todayIsTrainDay && !history[todayKey]) d.setDate(d.getDate()-1);
  for(let i=0; i<800; i++){
    const k = d.toISOString().slice(0,10);
    const isTrainDay = trainDays.includes(d.getDay());
    if(!isTrainDay){ d.setDate(d.getDate()-1); continue; }
    if(history[k]){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function calcWeekVol(history: Record<string,HistEntry>): number {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate()-((today.getDay()||7)-1));
  const wsStr = weekStart.toISOString().slice(0,10);
  let vol = 0;
  Object.entries(history).forEach(([iso,entry])=>{
    if(iso>=wsStr){
      (entry.entries||[]).forEach(e=>{
        (e.sets||[]).forEach(s=>{
          const w=parseFloat(String(s.w).replace(',','.'));
          const r=parseFloat(String(s.r).replace(',','.'));
          if(isFinite(w)&&isFinite(r)) vol+=w*r;
        });
      });
    }
  });
  return Math.round(vol);
}

function getWeekDots(history: Record<string,HistEntry>, trainDays: number[]) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate()-((today.getDay()||7)-1));
  return Array.from({length:7},(_,i)=>{
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate()+i);
    return {
      trained:    !!history[d.toISOString().slice(0,10)],
      isTrainDay: trainDays.includes(d.getDay()),
      label:      DIAS_LABEL[i],
    };
  });
}

function getNextTrainDay(ficha: Ficha|null): {day:string;exs:{name:string}[]}|null {
  if(!ficha) return null;
  const today = new Date();
  const todayIdx = (today.getDay()+6)%7;
  const todayNome = DIAS_NOME[todayIdx];
  if(ficha.byDay[todayNome]?.length>0) return {day:'Hoje',exs:ficha.byDay[todayNome]};
  for(let i=1;i<=7;i++){
    const d = DIAS_NOME[(todayIdx+i)%7];
    if(ficha.byDay[d]?.length>0) return {day:d,exs:ficha.byDay[d]};
  }
  return null;
}

// ── Página ─────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [user,       setUser]       = useState<any>(null);
  const [userData,   setUserData]   = useState<UserData>({name:'',photoURL:null,weeklyGoal:5,trainDays:[1,2,3,4,5,6]});
  const [history,    setHistory]    = useState<Record<string,HistEntry>>({});
  const [fichas,     setFichas]     = useState<Ficha[]>([]);
  const [activeId,   setActiveId]   = useState<string|null>(null);
  const [selosCount, setSelosCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [meuRank,    setMeuRank]    = useState<RankScore|null>(null);
  const [top3,       setTop3]       = useState<RankScore[]>([]);
  const [userName,   setUserName]   = useState('');
  const [userInitials,setUserInitials]= useState('');

  // Sync rank global em background
  useRankSync(user?.uid??null, userName, userInitials);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUser(u);
      try {
        const userDoc = await getDoc(doc(db,'users',u.uid));
        if(userDoc.exists()){
          const d = userDoc.data();
          const name = d.name||u.displayName||'Atleta';
          const firstName = name.split(' ')[0];
          setUserName(firstName);
          setUserInitials(firstName.slice(0,2).toUpperCase());
          setUserData({
            name,
            photoURL: d.photoURL||u.photoURL||null,
            weeklyGoal: d.weeklyGoal||5,
            trainDays:  d.trainDays||[1,2,3,4,5,6],
          });
        } else {
          const name = u.displayName||'Atleta';
          const firstName = name.split(' ')[0];
          setUserName(firstName);
          setUserInitials(firstName.slice(0,2).toUpperCase());
          setUserData(prev=>({...prev,name,photoURL:u.photoURL||null}));
        }

        // Histórico
        const histDoc = await getDoc(doc(db,'users',u.uid,'data','history'));
        if(histDoc.exists()){
          const parsed = JSON.parse(histDoc.data().payload||'{}');
          setHistory(parsed);
        }

        // Fichas
        const plansDoc = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(plansDoc.exists()){
          const parsed = JSON.parse(plansDoc.data().payload||'{"list":[],"activeId":null}');
          setFichas(parsed.list||[]);
          setActiveId(parsed.activeId||null);
        }

        // Selos
        const selosDoc = await getDoc(doc(db,'users',u.uid,'data','selos'));
        if(selosDoc.exists()){
          setSelosCount(Object.values(selosDoc.data()).filter(Boolean).length);
        }

        // Rank global
        try {
          const rSnap = await getDoc(doc(db,'globalRank',u.uid));
          if(rSnap.exists()) setMeuRank(rSnap.data() as RankScore);
          const tSnap = await getDocs(query(collection(db,'globalRank'),orderBy('pontos','desc'),limit(3)));
          setTop3(tSnap.docs.map(d=>d.data() as RankScore));
        } catch(_){}

      } catch(e){ console.error(e); }
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  const trainDays   = userData.trainDays;
  const streak      = calcStreak(history,trainDays);
  const weekVol     = calcWeekVol(history);
  const weekDots    = getWeekDots(history,trainDays);
  const thisWeek    = weekDots.filter(d=>d.trained&&d.isTrainDay).length;
  const activeFicha = fichas.find(f=>f.id===activeId)||fichas[0]||null;
  const nextTreino  = getNextTrainDay(activeFicha);
  const ultimosTreinos = Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,3);
  const rank     = [...RANK_NIVEIS].reverse().find(n=>selosCount>=n.minSelos)||RANK_NIVEIS[0];
  const nextRank = RANK_NIVEIS.find(n=>n.minSelos>selosCount);
  const rankPct  = nextRank ? Math.round((selosCount-rank.minSelos)/(nextRank.minSelos-rank.minSelos)*100) : 100;
  const nome     = userData.name||user?.displayName||'Atleta';
  const initials = nome.slice(0,2).toUpperCase();

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <div style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%',animation:'spinCw .65s linear infinite'}}/>
      </div>
    </PageShell>
  );

  if(!user) return (
    <PageShell>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:'1rem',textAlign:'center'}}>
        <Dumbbell size={52} color="#484858"/>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',textTransform:'uppercase',color:'#f0f0f2'}}>
          DARK<span style={{color:'#e31b23'}}>SET</span>
        </div>
        <div style={{fontSize:'.88rem',color:'#7a7a8a'}}>Faça login para ver seus treinos</div>
        <motion.button whileTap={{scale:.97}} onClick={()=>router.push('/login')}
          style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'13px 32px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.3)',outline:'none'}}>
          Entrar
        </motion.button>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Header */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div>
          <p style={{fontSize:'.65rem',textTransform:'uppercase',letterSpacing:'.12em',color:'#7a7a8a',margin:0}}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.9rem',textTransform:'uppercase',color:'#f0f0f2',margin:0,lineHeight:1,marginTop:2}}>
            {nome.split(' ')[0]?`E aí, ${nome.split(' ')[0]}!`:'Bora Treinar!'}
          </h1>
        </div>
        <motion.button whileTap={{scale:.95}} onClick={()=>router.push('/perfil')}
          style={{background:'none',border:'none',padding:0,cursor:'pointer',outline:'none'}}>
          {userData.photoURL
            ? <img src={userData.photoURL} style={{width:44,height:44,borderRadius:'50%',border:'2px solid #2e2e38',objectFit:'cover'}} alt="avatar"/>
            : <div style={{width:44,height:44,borderRadius:'50%',border:'2px solid #2e2e38',background:'linear-gradient(135deg,#e31b23,#6b0a0e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',color:'#fff'}}>
                {initials}
              </div>
          }
        </motion.button>
      </motion.div>

      {/* Streak Hero */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.06}}>
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,marginBottom:'.75rem',overflow:'hidden',position:'relative'}}>
          {streak>0&&<div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(227,27,35,.15),transparent 70%)',pointerEvents:'none'}}/>}
          <CardContent style={{padding:'1.1rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              <div style={{display:'flex',alignItems:'baseline',gap:'.4rem'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3.5rem',lineHeight:1,color:streak>0?'#e31b23':'#484858'}}>{streak}</div>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',textTransform:'uppercase',color:streak>0?'#f0f0f2':'#484858'}}>dias</div>
                  <div style={{fontSize:'.55rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em'}}>streak</div>
                </div>
              </div>
              <div style={{display:'flex',gap:'1.2rem'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:'#f0f0f2',lineHeight:1}}>
                    {thisWeek}<span style={{fontSize:'.9rem',color:'#484858'}}>/{userData.weeklyGoal}</span>
                  </div>
                  <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.07em',marginTop:'.1rem'}}>semana</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:'#f0f0f2',lineHeight:1}}>
                    {weekVol>=1000?(weekVol/1000).toFixed(1)+'t':weekVol+'kg'}
                  </div>
                  <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.07em',marginTop:'.1rem'}}>volume</div>
                </div>
              </div>
            </div>
            {/* Dots semana */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',padding:'0 .1rem'}}>
              {weekDots.map(({trained,isTrainDay,label},i)=>(
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.25rem',opacity:isTrainDay?1:0.35}}>
                  <div style={{width:trained?12:8,height:trained?12:8,borderRadius:'50%',background:trained?'#e31b23':(isTrainDay?'#2e2e38':'transparent'),border:trained?'none':`1px solid ${isTrainDay?'#3e3e48':'#2e2e38'}`,boxShadow:trained?'0 0 8px rgba(227,27,35,.5)':'none',transition:'all .2s'}}/>
                  <span style={{fontSize:'.58rem',color:trained?'#b0b0be':'#484858',fontWeight:trained?700:400}}>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Botão Modo Treino */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1}}>
        <motion.button whileTap={{scale:.98}} onClick={()=>router.push('/modo-treino')} style={{
          width:'100%',marginBottom:'.75rem',
          background:'linear-gradient(135deg,#e31b23,#8b0000)',
          border:'none',borderRadius:14,padding:'1.1rem 1.25rem',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          boxShadow:'0 0 40px rgba(227,27,35,.18)',cursor:'pointer',outline:'none',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
            <div style={{width:42,height:42,borderRadius:10,background:'rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Play size={22} color="#fff" fill="#fff"/>
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.15rem',textTransform:'uppercase',color:'#fff',letterSpacing:'.04em'}}>
                {nextTreino?`Treino — ${nextTreino.day}`:'Iniciar Treino'}
              </div>
              <div style={{fontSize:'.68rem',color:'rgba(255,255,255,.55)',marginTop:'2px'}}>
                {nextTreino?`${nextTreino.exs.slice(0,3).map(e=>e.name).join(', ')}${nextTreino.exs.length>3?'...':''}`:activeFicha?.name||'Sem ficha ativa'}
              </div>
            </div>
          </div>
          <ChevronRight size={22} color="rgba(255,255,255,.6)"/>
        </motion.button>
      </motion.div>

      {/* Card Rank Global — mostra sempre se tiver histórico */}
      {(meuRank || Object.keys(history).length > 0) && (()=>{
        const pontosLocal = meuRank?.pontos ?? (Object.keys(history).length * 10);
        const rankLocal: RankScore = meuRank ?? {
          uid: user?.uid??'', nome: userName, initials: userInitials,
          pontos: pontosLocal, treinos: Object.keys(history).length,
          volumeKg: 0, streak: streak, desafios: 0,
          liga: getLiga(pontosLocal).nome,
          ligaCor: getLiga(pontosLocal).cor,
          updatedAt: Date.now(),
        };
        const liga = getLiga(rankLocal.pontos);
        const proximaLiga = LIGAS.find(l=>l.min>rankLocal.pontos);
        const pctProxima = proximaLiga
          ? Math.round(((rankLocal.pontos-liga.min)/(proximaLiga.min-liga.min))*100)
          : 100;
        return (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.13}}
            style={{marginBottom:'.75rem'}}>
            <div onClick={()=>router.push('/darksquad')}
              style={{background:`linear-gradient(135deg,${liga.corBg},rgba(0,0,0,.2))`,border:`1px solid ${liga.corBorder}`,borderRadius:16,padding:'1rem 1.1rem',cursor:'pointer',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-30,right:-30,width:100,height:100,borderRadius:'50%',background:liga.cor,opacity:.06,pointerEvents:'none'}}/>
              {/* Header */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                  <Globe size={13} color={liga.cor}/>
                  <span style={{fontSize:'.58rem',color:liga.cor,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700}}>Rank Global</span>
                </div>
                <div style={{fontSize:'.62rem',color:'#484858',display:'flex',alignItems:'center',gap:'.3rem'}}>
                  <TrendingUp size={11}/> {fmtPontos(rankLocal.pontos)} pts
                </div>
              </div>
              {/* Liga + top3 */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:liga.cor,lineHeight:1,textTransform:'uppercase'}}>{liga.nome}</div>
                  {rankLocal.posicao&&<div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px'}}>#{rankLocal.posicao} no ranking global</div>}
                </div>
                {/* Top 3 avatares ou posição */}
                <div style={{textAlign:'right'}}>
                  {top3.length>0?(
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
                  ):(
                    <div style={{fontSize:'.65rem',color:'#484858',display:'flex',alignItems:'center',gap:'.3rem'}}>
                      <Globe size={12}/> #{rankLocal.posicao||'—'}
                    </div>
                  )}
                </div>
              </div>
              {/* Barra progresso */}
              {proximaLiga&&(
                <div>
                  <div style={{background:'rgba(255,255,255,.06)',borderRadius:4,height:5,overflow:'hidden',marginBottom:'.3rem'}}>
                    <motion.div animate={{width:`${pctProxima}%`}} transition={{duration:.6,ease:'easeOut'}}
                      style={{height:'100%',borderRadius:4,background:liga.cor,boxShadow:`0 0 8px ${liga.cor}88`}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'.55rem',color:'#484858'}}>
                    <span>{liga.nome}</span>
                    <span>{proximaLiga.min-rankLocal.pontos} pts para {proximaLiga.nome}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* Rank de selos (interno DarkSet) */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.16}}>
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'.75rem'}}>
          <CardContent style={{padding:'.85rem 1rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                <ShieldStar size={16} color={rank.cor} weight="fill"/>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',color:rank.cor,textTransform:'uppercase'}}>{rank.label}</div>
              </div>
              <div style={{fontSize:'.62rem',color:'#7a7a8a',display:'flex',alignItems:'center',gap:'.3rem'}}>
                <Trophy size={12}/> {selosCount} selos
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,.06)',borderRadius:4,height:5,overflow:'hidden',marginBottom:'.3rem'}}>
              <motion.div animate={{width:`${rankPct}%`}} transition={{duration:.6,ease:'easeOut'}}
                style={{height:'100%',borderRadius:4,background:rank.cor,boxShadow:`0 0 8px ${rank.cor}88`}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.55rem',color:'#484858'}}>
              <span>{rank.label}</span>
              {nextRank&&<span>{nextRank.minSelos-selosCount} selos para {nextRank.label}</span>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Atalhos */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.2}}
        style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'.75rem'}}>
        {ATALHOS.map(({Icon,label,href},i)=>(
          <motion.button key={i} whileTap={{scale:.95}} onClick={()=>router.push(href)}
            style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12,padding:'.7rem .5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'.35rem',cursor:'pointer',outline:'none'}}>
            <Icon size={22} color="#7a7a8a" weight="fill"/>
            <span style={{fontSize:'.65rem',color:'#9898a8',fontWeight:600}}>{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Próximo treino */}
      {nextTreino&&(
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.24}}>
          <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'.75rem'}}>
            <CardContent style={{padding:'.85rem 1rem'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                  <CalendarCheck size={15} color="#7a7a8a"/>
                  <span style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Próximo Treino</span>
                </div>
                <Badge style={{background:'rgba(227,27,35,.1)',color:'#e31b23',border:'1px solid rgba(227,27,35,.2)',fontSize:'.55rem'}}>{nextTreino.day}</Badge>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'.3rem'}}>
                {nextTreino.exs.slice(0,4).map((e,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.8rem',color:i===0?'#f0f0f2':'#7a7a8a'}}>
                    <div style={{width:4,height:4,borderRadius:'50%',background:i===0?'#e31b23':'#2e2e38',flexShrink:0}}/>
                    {e.name}
                  </div>
                ))}
                {nextTreino.exs.length>4&&<div style={{fontSize:'.72rem',color:'#484858'}}>+{nextTreino.exs.length-4} exercícios</div>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Últimos treinos */}
      {ultimosTreinos.length>0&&(
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.28}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.5rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
              <History size={14} color="#7a7a8a"/>
              <span style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Últimos Treinos</span>
            </div>
            <motion.button whileTap={{scale:.95}} onClick={()=>router.push('/historico')}
              style={{background:'none',border:'none',color:'#e31b23',fontSize:'.68rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.2rem'}}>
              Ver todos <ChevronRight size={13}/>
            </motion.button>
          </div>
          <div style={{display:'grid',gap:'.4rem'}}>
            {ultimosTreinos.map(([date,entry],i)=>{
              const d = new Date(date+'T12:00:00');
              const isHoje = date===new Date().toISOString().slice(0,10);
              const label = isHoje?'Hoje':d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
              const sets = (entry.entries||[]).flatMap(e=>e.sets||[]);
              const vol  = sets.reduce((acc,s)=>{
                const w=parseFloat(String(s.w).replace(',','.'));
                const r=parseFloat(String(s.r).replace(',','.'));
                return acc+(isFinite(w)&&isFinite(r)?w*r:0);
              },0);
              return (
                <motion.div key={date} whileTap={{scale:.98}} onClick={()=>router.push('/historico')}
                  style={{background:'rgba(255,255,255,.02)',border:'1px solid #1a1a20',borderRadius:12,padding:'.65rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                    <div style={{width:34,height:34,borderRadius:9,background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Dumbbell size={16} color="#e31b23"/>
                    </div>
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',color:'#f0f0f2'}}>{label}</div>
                      <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'1px'}}>{(entry.entries||[]).length} exercícios</div>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',color:'#f0f0f2'}}>{vol>=1000?(vol/1000).toFixed(1)+'t':Math.round(vol)+'kg'}</div>
                    <div style={{fontSize:'.55rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>volume</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

    </PageShell>
  );
}
