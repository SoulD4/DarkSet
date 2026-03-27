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
import { Trophy, Crown, Medal, Dumbbell, Flame, Globe, Zap } from 'lucide-react';

export default function DarkRankPage() {
  const [uid,           setUid]           = useState<string|null>(null);
  const [userName,      setUserName]      = useState('');
  const [userInitials,  setUserInitials]  = useState('');
  const [meuRank,       setMeuRank]       = useState<RankScore|null>(null);
  const [globalRank,    setGlobalRank]    = useState<(RankScore&{posicao:number})[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingRanking,setLoadingRanking]= useState(false);

  useRankSync(uid, userName, userInitials);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){setLoading(false);return;}
      setUid(u.uid);
      try {
        const userSnap = await getDoc(doc(db,'users',u.uid));
        const d = userSnap.exists()?userSnap.data():{} as any;
        const name = (d.name||u.displayName||'Atleta').split(' ')[0];
        setUserName(name);
        setUserInitials(name.slice(0,2).toUpperCase());
        const rSnap = await getDoc(doc(db,'globalRank',u.uid));
        if(rSnap.exists()) setMeuRank(rSnap.data() as RankScore);
      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  useEffect(()=>{
    const load = async()=>{
      setLoadingRanking(true);
      try {
        const snap = await getDocs(query(collection(db,'globalRank'),orderBy('pontos','desc'),limit(50)));
        setGlobalRank(snap.docs.map((d,i)=>({...d.data() as RankScore,posicao:i+1})));
      } catch(e){console.error(e);}
      setLoadingRanking(false);
    };
    load();
  },[]);

  const liga     = getLiga(meuRank?.pontos||0);
  const proxLiga = LIGAS.find((l:any)=>l.min>(meuRank?.pontos||0));
  const ligaPct  = proxLiga
    ? Math.min(100,Math.round(((meuRank?.pontos||0)-liga.min)/(proxLiga.min-liga.min)*100))
    : 100;

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
          <Globe size={11}/> Ranking global de atletas DarkSet
        </div>
      </motion.div>

      {/* Card do seu rank */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.06}} style={{marginBottom:'.75rem'}}>
        <Card style={{background:liga.corBg,border:`1px solid ${liga.corBorder}`,borderRadius:16,overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',top:-20,right:-20,opacity:.06,pointerEvents:'none'}}>
            <Globe size={110} color={liga.cor}/>
          </div>
          <CardContent style={{padding:'1rem',position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
              <div>
                <div style={{fontSize:'.55rem',color:liga.cor,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,marginBottom:'.25rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                  <Globe size={10}/> Seu Rank Global
                </div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',color:liga.cor,textTransform:'uppercase',lineHeight:1}}>
                  {liga.nome}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',color:liga.cor,lineHeight:1}}>
                  {fmtPontos(meuRank?.pontos||0)}
                </div>
                <div style={{fontSize:'.55rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em'}}>pontos</div>
                {meuRank?.posicao&&(
                  <div style={{fontSize:'.7rem',color:liga.cor,fontWeight:700,marginTop:'.2rem'}}>#{meuRank.posicao} no ranking</div>
                )}
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,.06)',borderRadius:4,height:5,overflow:'hidden',marginBottom:'.3rem'}}>
              <motion.div animate={{width:`${ligaPct}%`}} transition={{duration:.8,ease:'easeOut'}}
                style={{height:'100%',borderRadius:4,background:liga.cor,boxShadow:`0 0 10px ${liga.cor}88`}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.55rem',color:'#484858'}}>
              <span style={{color:liga.cor,fontWeight:700}}>{liga.nome}</span>
              <span>{proxLiga?`${proxLiga.min-(meuRank?.pontos||0)} pts para ${proxLiga.nome}`:'Liga máxima atingida!'}</span>
            </div>
            {/* Stats do usuário */}
            {meuRank&&(
              <div style={{display:'flex',gap:'1rem',marginTop:'.85rem',paddingTop:'.85rem',borderTop:'1px solid rgba(255,255,255,.06)'}}>
                {[
                  {val:meuRank.treinos, lbl:'Treinos',  Icon:Dumbbell},
                  {val:meuRank.streak+'d', lbl:'Streak', Icon:Flame  },
                  {val:fmtPontos(meuRank.volumeKg||0), lbl:'Volume', Icon:Zap},
                ].map((s,i)=>(
                  <div key={i} style={{flex:1,textAlign:'center'}}>
                    <s.Icon size={14} color={liga.cor} style={{margin:'0 auto .2rem'}}/>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:liga.cor,lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:'.5rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Legenda de ligas */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1}}
        style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.75rem'}}>
        {LIGAS.map((l:any)=>(
          <div key={l.nome} style={{background:l.corBg,border:`1px solid ${l.corBorder}`,borderRadius:6,padding:'.2rem .55rem',fontSize:'.58rem',color:l.cor,fontWeight:700,textTransform:'uppercase'}}>
            {l.nome}
          </div>
        ))}
      </motion.div>

      {/* Ranking */}
      <div style={{display:'grid',gap:'.45rem'}}>
        {loadingRanking&&(
          <div style={{display:'flex',justifyContent:'center',padding:'2rem'}}>
            <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
              style={{width:28,height:28,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
          </div>
        )}

        {!loadingRanking&&globalRank.length===0&&(
          <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:12}}>
            <CardContent style={{padding:'2.5rem 1rem',textAlign:'center'}}>
              <Globe size={40} color="#484858" style={{margin:'0 auto .75rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#484858',textTransform:'uppercase'}}>Nenhum atleta ainda</div>
              <div style={{fontSize:'.75rem',color:'#484858',marginTop:'.3rem'}}>Complete treinos para aparecer no ranking!</div>
            </CardContent>
          </Card>
        )}

        {globalRank.map((r,i)=>{
          const rLiga = getLiga(r.pontos);
          const isMe  = r.uid===uid;
          return (
            <motion.div key={r.uid} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:Math.min(i*.03,.4)}}>
              <Card style={{background:isMe?rLiga.corBg:'rgba(255,255,255,.02)',border:`1px solid ${isMe?rLiga.corBorder:'#1a1a20'}`,borderRadius:13,overflow:'hidden',position:'relative'}}>
                <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:rLiga.cor}}/>
                <CardContent style={{padding:'.75rem 1rem .75rem 1.25rem',display:'flex',alignItems:'center',gap:'.65rem'}}>
                  {/* Posição */}
                  <div style={{width:24,textAlign:'center',flexShrink:0}}>
                    {i===0?<Crown size={18} color="#d97706"/>:
                     i===1?<Medal size={16} color="#9ca3af"/>:
                     i===2?<Medal size={16} color="#b45309"/>:
                     <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.88rem',color:'#484858'}}>#{i+1}</span>}
                  </div>
                  {/* Avatar */}
                  <div style={{width:34,height:34,borderRadius:'50%',background:`${rLiga.cor}22`,border:`1px solid ${rLiga.cor}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.82rem',color:rLiga.cor}}>
                    {r.initials}
                  </div>
                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.92rem',color:isMe?rLiga.cor:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.nome}</span>
                      {isMe&&<Badge variant="outline" style={{borderColor:rLiga.corBorder,color:rLiga.cor,fontSize:'.45rem',padding:'0 4px',flexShrink:0}}>você</Badge>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'.4rem',marginTop:'2px'}}>
                      <span style={{fontSize:'.55rem',color:rLiga.cor,fontWeight:700,background:rLiga.corBg,border:`1px solid ${rLiga.corBorder}`,borderRadius:4,padding:'1px 5px',textTransform:'uppercase'}}>{rLiga.nome}</span>
                      <span style={{fontSize:'.55rem',color:'#484858',display:'flex',alignItems:'center',gap:'.15rem'}}><Dumbbell size={9}/>{r.treinos}</span>
                      <span style={{fontSize:'.55rem',color:'#484858',display:'flex',alignItems:'center',gap:'.15rem'}}><Flame size={9}/>{r.streak}d</span>
                    </div>
                  </div>
                  {/* Pontos */}
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:isMe?rLiga.cor:'#f0f0f2',lineHeight:1}}>{fmtPontos(r.pontos)}</div>
                    <div style={{fontSize:'.48rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>pts</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
