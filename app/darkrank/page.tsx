'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { getLiga, fmtPontos, LIGAS, type RankScore } from '@/lib/rankSystem';
import { useRankSync } from '@/lib/useRankSync';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, Crown, Medal, Dumbbell, Flame, TrendingUp, Globe, Users } from 'lucide-react';
import { ShieldStar, Skull, Sword, Lightning } from '@phosphor-icons/react';

// ── Rank de Selos ──────────────────────────────────────────────
const RANK_SELOS = [
  {label:'MORTAL',    minSelos:0,  cor:'#6b7280', Icon:Skull    },
  {label:'GUERREIRO', minSelos:5,  cor:'#cd7f32', Icon:Sword    },
  {label:'POSEIDON',  minSelos:12, cor:'#60a5fa', Icon:ShieldStar},
  {label:'HADES',     minSelos:20, cor:'#a78bfa', Icon:Skull    },
  {label:'CRONOS',    minSelos:25, cor:'#facc15', Icon:Crown    },
  {label:'DARKGOD',   minSelos:40, cor:'#e31b23', Icon:Lightning},
];

function Avatar({initials,size=36,cor='#e31b23'}:{initials:string;size?:number;cor?:string}) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:`${cor}22`,border:`1px solid ${cor}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:size*0.38,color:cor}}>
      {initials}
    </div>
  );
}

export default function DarkRankPage() {
  const [uid,          setUid]          = useState<string|null>(null);
  const [userName,     setUserName]     = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [selosCount,   setSelosCount]   = useState(0);
  const [meuRank,      setMeuRank]      = useState<RankScore|null>(null);
  const [globalRank,   setGlobalRank]   = useState<RankScore[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingGlobal,setLoadingGlobal]= useState(false);
  const [tab,          setTab]          = useState<'global'|'selos'>('global');

  useRankSync(uid, userName, userInitials);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const userSnap = await getDoc(doc(db,'users',u.uid));
        const d = userSnap.exists()?userSnap.data():{} as any;
        const name = (d.name||u.displayName||'Atleta').split(' ')[0];
        setUserName(name);
        setUserInitials(name.slice(0,2).toUpperCase());

        // Selos
        const selosSnap = await getDoc(doc(db,'users',u.uid,'data','selos'));
        if(selosSnap.exists()) setSelosCount(Object.values(selosSnap.data()).filter(Boolean).length);

        // Rank global do usuário
        const rSnap = await getDoc(doc(db,'globalRank',u.uid));
        if(rSnap.exists()) setMeuRank(rSnap.data() as RankScore);
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  // Carregar ranking global
  useEffect(()=>{
    if(tab!=='global') return;
    const load = async () => {
      setLoadingGlobal(true);
      try {
        const snap = await getDocs(query(collection(db,'globalRank'),orderBy('pontos','desc'),limit(50)));
        setGlobalRank(snap.docs.map((d,i)=>({...d.data() as RankScore,posicao:i+1})));
      } catch(e){ console.error(e); }
      setLoadingGlobal(false);
    };
    load();
  },[tab]);

  const rankSelo    = [...RANK_SELOS].reverse().find(n=>selosCount>=n.minSelos)||RANK_SELOS[0];
  const proxRankSelo= RANK_SELOS.find(n=>n.minSelos>selosCount);
  const rankSeloPct = proxRankSelo ? Math.round((selosCount-rankSelo.minSelos)/(proxRankSelo.minSelos-rankSelo.minSelos)*100) : 100;
  const liga        = meuRank ? getLiga(meuRank.pontos) : getLiga(0);
  const proxLiga    = LIGAS.find(l=>l.min>(meuRank?.pontos||0));

  const RankSeloIcon = rankSelo.Icon;

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Header */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{marginBottom:'1.25rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
          DARK<span style={{color:'#e31b23'}}>RANK</span>
        </div>
        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px',display:'flex',alignItems:'center',gap:'.4rem'}}>
          <Trophy size={11}/> Rankings e ligas do DarkSet
        </div>
      </motion.div>

      {/* Cards resumo do usuário */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.06}}
        style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem',marginBottom:'.75rem'}}>

        {/* Liga Global */}
        <Card style={{background:`linear-gradient(135deg,${liga.corBg},rgba(0,0,0,.3))`,border:`1px solid ${liga.corBorder}`,borderRadius:14,overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',top:-10,right:-10,opacity:.08,pointerEvents:'none'}}>
            <Globe size={70} color={liga.cor}/>
          </div>
          <CardContent style={{padding:'.85rem',position:'relative'}}>
            <div style={{fontSize:'.55rem',color:liga.cor,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,marginBottom:'.3rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
              <Globe size={10}/> Rank Global
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:liga.cor,textTransform:'uppercase',lineHeight:1}}>
              {liga.nome}
            </div>
            <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'.2rem'}}>
              {fmtPontos(meuRank?.pontos||0)} pts
              {meuRank?.posicao&&<span style={{color:liga.cor,marginLeft:'.3rem'}}>· #{meuRank.posicao}</span>}
            </div>
            {proxLiga&&(
              <>
                <div style={{background:'rgba(255,255,255,.06)',borderRadius:3,height:3,margin:'.5rem 0 .2rem',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:liga.cor,width:`${Math.min(100,Math.round(((meuRank?.pontos||0)-liga.min)/(proxLiga.min-liga.min)*100))}%`}}/>
                </div>
                <div style={{fontSize:'.5rem',color:'#484858'}}>{proxLiga.min-(meuRank?.pontos||0)} pts para {proxLiga.nome}</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rank Selos */}
        <Card style={{background:`${rankSelo.cor}15`,border:`1px solid ${rankSelo.cor}30`,borderRadius:14,overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',top:-10,right:-10,opacity:.08,pointerEvents:'none'}}>
            <RankSeloIcon size={70} color={rankSelo.cor} weight="fill"/>
          </div>
          <CardContent style={{padding:'.85rem',position:'relative'}}>
            <div style={{fontSize:'.55rem',color:rankSelo.cor,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,marginBottom:'.3rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
              <ShieldStar size={10} weight="fill" color={rankSelo.cor}/> Rank Selos
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:rankSelo.cor,textTransform:'uppercase',lineHeight:1}}>
              {rankSelo.label}
            </div>
            <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'.2rem'}}>{selosCount} selos</div>
            {proxRankSelo&&(
              <>
                <div style={{background:'rgba(255,255,255,.06)',borderRadius:3,height:3,margin:'.5rem 0 .2rem',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:rankSelo.cor,width:`${rankSeloPct}%`}}/>
                </div>
                <div style={{fontSize:'.5rem',color:'#484858'}}>{proxRankSelo.minSelos-selosCount} selos para {proxRankSelo.label}</div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1}}
        style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:12,padding:'3px',gap:'3px',marginBottom:'1rem'}}>
        {([['global','Ranking Global',Globe],['selos','Ligas de Selos',ShieldStar]] as const).map(([id,label,Icon])=>(
          <motion.button key={id} whileTap={{scale:.95}} onClick={()=>setTab(id)} style={{
            flex:1,padding:'.5rem',borderRadius:9,border:'none',cursor:'pointer',
            background:tab===id?'rgba(227,27,35,.15)':'transparent',
            color:tab===id?'#e31b23':'#484858',
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.75rem',
            letterSpacing:'.04em',textTransform:'uppercase',
            boxShadow:tab===id?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',
            outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.35rem',
          }}>
            <Icon size={14} color={tab===id?'#e31b23':'#484858'}/>{label}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

          {/* RANKING GLOBAL */}
          {tab==='global'&&(
            <div style={{display:'grid',gap:'.5rem'}}>
              {/* Legenda de ligas */}
              <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.25rem'}}>
                {LIGAS.map(l=>(
                  <div key={l.nome} style={{background:l.corBg,border:`1px solid ${l.corBorder}`,borderRadius:6,padding:'.2rem .55rem',fontSize:'.58rem',color:l.cor,fontWeight:700,textTransform:'uppercase'}}>
                    {l.nome}
                  </div>
                ))}
              </div>

              {loadingGlobal&&(
                <div style={{display:'flex',justifyContent:'center',padding:'2rem'}}>
                  <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
                    style={{width:28,height:28,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
                </div>
              )}

              {!loadingGlobal&&globalRank.length===0&&(
                <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:12}}>
                  <CardContent style={{padding:'2rem',textAlign:'center'}}>
                    <Globe size={36} color="#484858" style={{margin:'0 auto .5rem'}}/>
                    <div style={{fontSize:'.82rem',color:'#484858'}}>Nenhum atleta no ranking ainda</div>
                    <div style={{fontSize:'.72rem',color:'#484858',marginTop:'.25rem'}}>Complete treinos para aparecer aqui!</div>
                  </CardContent>
                </Card>
              )}

              {globalRank.map((r,i)=>{
                const rLiga = getLiga(r.pontos);
                const isMe  = r.uid===uid;
                return (
                  <motion.div key={r.uid} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*.03}}>
                    <Card style={{background:isMe?rLiga.corBg:'rgba(255,255,255,.02)',border:`1px solid ${isMe?rLiga.corBorder:'#1a1a20'}`,borderRadius:14,overflow:'hidden',position:'relative'}}>
                      <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:rLiga.cor,borderRadius:'14px 0 0 14px'}}/>
                      <CardContent style={{padding:'.85rem 1rem .85rem 1.25rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                        <div style={{width:24,textAlign:'center',flexShrink:0}}>
                          {i===0?<Crown size={18} color="#d97706" style={{margin:'0 auto'}}/>:
                           i===1?<Medal size={16} color="#9ca3af" style={{margin:'0 auto'}}/>:
                           i===2?<Medal size={16} color="#b45309" style={{margin:'0 auto'}}/>:
                           <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',color:'#484858'}}>#{i+1}</span>}
                        </div>
                        <Avatar initials={r.initials} size={36} cor={rLiga.cor}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',color:isMe?rLiga.cor:'#f0f0f2'}}>{r.nome}</span>
                            {isMe&&<Badge variant="outline" style={{borderColor:rLiga.corBorder,color:rLiga.cor,fontSize:'.48rem',padding:'0 4px'}}>você</Badge>}
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginTop:'2px'}}>
                            <div style={{fontSize:'.58rem',color:rLiga.cor,fontWeight:700,textTransform:'uppercase',background:rLiga.corBg,border:`1px solid ${rLiga.corBorder}`,borderRadius:4,padding:'1px 5px'}}>{rLiga.nome}</div>
                            <div style={{fontSize:'.6rem',color:'#484858',display:'flex',alignItems:'center',gap:'.2rem'}}><Dumbbell size={10}/>{r.treinos}</div>
                            <div style={{fontSize:'.6rem',color:'#484858',display:'flex',alignItems:'center',gap:'.2rem'}}><Flame size={10}/>{r.streak}d</div>
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:isMe?rLiga.cor:'#f0f0f2',lineHeight:1}}>{fmtPontos(r.pontos)}</div>
                          <div style={{fontSize:'.5rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>pontos</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* LIGAS DE SELOS */}
          {tab==='selos'&&(
            <div style={{display:'grid',gap:'.65rem'}}>
              <div style={{fontSize:'.65rem',color:'#7a7a8a',lineHeight:1.6,marginBottom:'.25rem'}}>
                Desbloqueie selos completando treinos, PRs, cardio e mais. Quanto mais selos, maior seu rank.
              </div>
              {RANK_SELOS.map((nivel,i)=>{
                const ativo = selosCount>=nivel.minSelos;
                const atual = rankSelo.label===nivel.label;
                const NIcon = nivel.Icon;
                const proxN = RANK_SELOS[i+1];
                const faltam = proxN ? proxN.minSelos-selosCount : 0;
                return (
                  <motion.div key={nivel.label} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
                    <Card style={{background:atual?`${nivel.cor}15`:ativo?'rgba(255,255,255,.03)':'rgba(255,255,255,.01)',border:`1px solid ${atual?nivel.cor+'44':ativo?nivel.cor+'22':'#2e2e38'}`,borderRadius:14,opacity:ativo?1:.5}}>
                      <CardContent style={{padding:'1rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                          <div style={{width:48,height:48,borderRadius:12,background:`${nivel.cor}${ativo?'22':'11'}`,border:`1px solid ${nivel.cor}${ativo?'44':'22'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <NIcon size={26} color={ativo?nivel.cor:'#484858'} weight="fill"/>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.2rem'}}>
                              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:ativo?nivel.cor:'#484858',textTransform:'uppercase'}}>{nivel.label}</div>
                              {atual&&<Badge style={{background:`${nivel.cor}22`,color:nivel.cor,border:`1px solid ${nivel.cor}44`,fontSize:'.52rem'}}>Atual</Badge>}
                              {ativo&&!atual&&<Badge style={{background:'rgba(34,197,94,.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,.2)',fontSize:'.52rem'}}>✓</Badge>}
                            </div>
                            <div style={{fontSize:'.65rem',color:'#7a7a8a'}}>
                              {nivel.minSelos} selos para desbloquear
                              {ativo&&atual&&proxN&&<span style={{color:nivel.cor,marginLeft:'.4rem'}}>· faltam {faltam} para {proxN.label}</span>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}
