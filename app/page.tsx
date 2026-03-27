'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getLiga, LIGAS } from '@/lib/rankSystem';

type UserData = { name: string; photoURL: string | null; weeklyGoal: number; trainDays: number[]; };
type HistoryEntry = { date: string; entries: {sets:{w:string;r:string}[]}[]; };
type Ficha = { id: string; name: string; byDay: Record<string, {name:string}[]>; };

const DIAS_NOME  = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DIAS_LABEL = ['S','T','Q','Q','S','S','D'];

const ATALHOS = [
  {icon:'📋', label:'Histórico', href:'/historico'},
  {icon:'🏅', label:'Selos',     href:'/darkselos'},
  {icon:'🏃', label:'Cardio',    href:'/cardio'},
  {icon:'🥗', label:'DarkDiet',  href:'/darkdiet'},
  {icon:'⚔️', label:'Squad',     href:'/darksquad'},
  {icon:'🧘', label:'DarkZen',   href:'/darkzen'},
];

function calcStreak(history: Record<string,HistoryEntry>, trainDays: number[]): number {
  let streak = 0;
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const d = new Date(today);
  if (trainDays.includes(today.getDay()) && !history[todayKey]) d.setDate(d.getDate()-1);
  for (let i=0; i<800; i++) {
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
        if(histDoc.exists()) setHistory(JSON.parse(histDoc.data().payload||'{}'));
        const plansDoc = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(plansDoc.exists()){
          const p = JSON.parse(plansDoc.data().payload||'{"list":[],"activeId":null}');
          setFichas(p.list||[]);
          setActiveId(p.activeId||null);
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
        <div style={{fontSize:'3rem'}}>🏋️</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',textTransform:'uppercase',color:'#f0f0f2'}}>DARK<span style={{color:'#e31b23'}}>SET</span></div>
        <div style={{fontSize:'.88rem',color:'#7a7a8a'}}>Faça login para ver seus treinos</div>
        <button onClick={()=>router.push('/login')} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'12px',padding:'13px 32px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',cursor:'pointer'}}>
          Entrar
        </button>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div>
          <p style={{fontSize:'.65rem',textTransform:'uppercase',letterSpacing:'.12em',color:'#7a7a8a',margin:0}}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.9rem',textTransform:'uppercase',color:'#f0f0f2',margin:0,lineHeight:1,marginTop:2}}>
            {nome.split(' ')[0]?`E aí, ${nome.split(' ')[0]}!`:'Bora Treinar!'}
          </h1>
        </div>
        <button onClick={()=>router.push('/perfil')} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
          {userData.photoURL
            ?<img src={userData.photoURL} style={{width:44,height:44,borderRadius:'50%',border:'2px solid #2e2e38',objectFit:'cover'}} alt="avatar"/>
            :<div style={{width:44,height:44,borderRadius:'50%',border:'2px solid #2e2e38',background:'linear-gradient(135deg,#e31b23,#6b0a0e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',color:'#fff'}}>{initials}</div>
          }
        </button>
      </div>

      {/* Streak Hero */}
      <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'16px',padding:'1.1rem',marginBottom:'.75rem',position:'relative',overflow:'hidden'}}>
        {streak>0&&<div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(227,27,35,.15),transparent 70%)',pointerEvents:'none'}}/>}
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
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',padding:'0 .1rem'}}>
          {weekDots.map(({trained,isTrainDay,label},i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.25rem',opacity:isTrainDay?1:0.35}}>
              <div style={{width:trained?12:8,height:trained?12:8,borderRadius:'50%',background:trained?'#e31b23':isTrainDay?'#2e2e38':'transparent',border:trained?'none':`1px solid ${isTrainDay?'#3e3e48':'#2e2e38'}`,boxShadow:trained?'0 0 8px rgba(227,27,35,.5)':'none',transition:'all .2s'}}/>
              <span style={{fontSize:'.58rem',color:trained?'#b0b0be':'#484858',fontWeight:trained?700:400}}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modo Treino */}
      <button onClick={()=>router.push('/modo-treino')} style={{width:'100%',marginBottom:'.75rem',background:'linear-gradient(135deg,#e31b23,#8b0000)',border:'none',borderRadius:'14px',padding:'1.1rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',position:'relative',overflow:'hidden',boxShadow:'0 4px 24px rgba(227,27,35,.25)'}}>
        <div style={{position:'absolute',right:-10,top:-10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'5.5rem',fontWeight:900,color:'rgba(0,0,0,.12)',lineHeight:1,pointerEvents:'none'}}>▶</div>
        <div style={{textAlign:'left'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.4rem',fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:'.04em',lineHeight:1}}>Modo Treino</div>
          <div style={{fontSize:'.72rem',color:'rgba(255,255,255,.6)',marginTop:'.25rem'}}>
            {nextTreino?`${nextTreino.day} · ${nextTreino.exs.slice(0,2).map((e:any)=>e.name||e.nome).join(', ')}${nextTreino.exs.length>2?'...':''}`:activeFicha?activeFicha.name:'Com ou sem ficha'}
          </div>
        </div>
        <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <div style={{width:0,height:0,borderTop:'9px solid transparent',borderBottom:'9px solid transparent',borderLeft:'15px solid #fff',marginLeft:3}}/>
        </div>
      </button>

      {/* Card Rank Global */}
      <button onClick={()=>router.push('/darkrank')} style={{width:'100%',marginBottom:'.75rem',background:liga.corBg,border:`1px solid ${liga.corBorder}`,borderRadius:'16px',padding:'.9rem 1.1rem',display:'flex',alignItems:'center',gap:'1rem',cursor:'pointer',position:'relative',overflow:'hidden',textAlign:'left'}}>
        <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 0% 50%,${liga.cor}12 0%,transparent 60%)`,pointerEvents:'none'}}/>
        <div style={{flex:1,minWidth:0,position:'relative'}}>
          <div style={{fontSize:'.52rem',color:liga.cor,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,marginBottom:'2px'}}>🌐 RANK GLOBAL</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',textTransform:'uppercase',letterSpacing:'.05em',lineHeight:1,color:liga.cor,marginBottom:'.4rem'}}>{liga.nome}</div>
          <div style={{background:'rgba(255,255,255,.08)',borderRadius:'3px',height:'4px',marginBottom:'3px'}}>
            <div style={{height:'100%',borderRadius:'3px',background:liga.cor,width:`${ligaPct}%`,boxShadow:`0 0 8px ${liga.cor}66`}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <div style={{fontSize:'.52rem',color:'#7a7a8a'}}>{liga.nome}</div>
            <div style={{fontSize:'.52rem',color:liga.cor,fontWeight:700}}>{proxLiga?`${proxLiga.min-(meuRank?.pontos||0)} pts para ${proxLiga.nome}`:'Rank máximo'}</div>
          </div>
        </div>
        <span style={{color:'#484858',fontSize:'.9rem',position:'relative'}}>›</span>
      </button>

      {/* Atalhos */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'.75rem'}}>
        {ATALHOS.map(a=>(
          <button key={a.href} onClick={()=>router.push(a.href)} style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'12px',padding:'.75rem .5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'.3rem',cursor:'pointer'}}>
            <span style={{fontSize:'1.3rem'}}>{a.icon}</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#b0b0be'}}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Últimos treinos */}
      {ultimosTreinos.length>0&&(
        <>
          <p style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7a7a8a',margin:'0 0 .5rem'}}>Últimos treinos</p>
          <div style={{display:'grid',gap:'.45rem'}}>
            {ultimosTreinos.map(([date,entry])=>{
              const d = new Date(date+'T12:00:00');
              const hoje = new Date().toISOString().slice(0,10);
              const ontem = new Date(Date.now()-86400000).toISOString().slice(0,10);
              const label = date===hoje?'Hoje':date===ontem?'Ontem':d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
              const totalSets = (entry.entries||[]).reduce((s,e)=>s+(e.sets||[]).length,0);
              const vol = (entry.entries||[]).reduce((s,e)=>(e.sets||[]).reduce((s2:number,set:any)=>s2+parseFloat(String(set.w||0))*parseFloat(String(set.r||0)),s),0);
              return (
                <div key={date} style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'12px',padding:'.85rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:'.65rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#7a7a8a',marginBottom:'2px'}}>{label}</div>
                    <div style={{fontWeight:600,fontSize:'.9rem',color:'#f0f0f2'}}>{totalSets} séries</div>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:'#e31b23'}}>
                    {vol>=1000?(vol/1000).toFixed(1)+'t':Math.round(vol)+'kg'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Estado vazio */}
      {totalSessions===0&&(
        <div style={{textAlign:'center',padding:'2rem',border:'1px dashed #2e2e38',borderRadius:'12px',marginTop:'.5rem'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'.75rem'}}>💪</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.4rem'}}>Nenhum treino ainda</div>
          <div style={{fontSize:'.82rem',color:'#7a7a8a',marginBottom:'1rem'}}>Comece seu primeiro treino agora!</div>
          <button onClick={()=>router.push('/modo-treino')} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'.65rem 1.5rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer'}}>
            Iniciar Treino
          </button>
        </div>
      )}
    </PageShell>
  );
}
