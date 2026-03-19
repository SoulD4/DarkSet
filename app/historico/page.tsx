'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const fmtVol  = (v: number) => v >= 1000 ? (v/1000).toFixed(1)+'t' : v+'kg';

const fmtData = (iso: string) => {
  const d = new Date(iso+'T12:00:00');
  const hoje  = new Date();
  const ontem = new Date(); ontem.setDate(ontem.getDate()-1);
  if(d.toDateString()===hoje.toDateString())  return 'Hoje';
  if(d.toDateString()===ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
};

const fmtDataLonga = (iso: string) =>
  new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

type SetEntry = { w: string; r: string };
type ExEntry  = { name: string; exId?: string; sets: SetEntry[] };
type Session  = { planId?: string; planName?: string; day?: string; entries: ExEntry[]; duration?: number; savedAt?: number; };
type History  = Record<string, Session>;

export default function HistoricoPage() {
  const [history,  setHistory]  = useState<History>({});
  const [loading,  setLoading]  = useState(true);
  const [detalhe,  setDetalhe]  = useState<{date:string;session:Session}|null>(null);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db,'users',u.uid,'data','history'));
        if(snap.exists()) setHistory(JSON.parse(snap.data().payload||'{}'));
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const sorted = Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0]));
  const totalTreinos = sorted.length;
  const totalVol = sorted.reduce((acc,[,s])=>
    acc+s.entries.reduce((a,en)=>a+en.sets.reduce((b,st)=>b+(parseFloat(st.w)||0)*(parseFloat(st.r)||0),0),0),0);
  const melhorVol = sorted.length ? Math.max(...sorted.map(([,s])=>
    s.entries.reduce((a,en)=>a+en.sets.reduce((b,st)=>b+(parseFloat(st.w)||0)*(parseFloat(st.r)||0),0),0))) : 0;

  const weekBuckets = (): number[] => {
    const buckets = Array(8).fill(0);
    const now = new Date();
    sorted.forEach(([date])=>{
      const diff = Math.floor((now.getTime()-new Date(date+'T12:00:00').getTime())/(7*24*3600*1000));
      if(diff>=0 && diff<8) buckets[7-diff]++;
    });
    return buckets;
  };
  const weeks   = weekBuckets();
  const maxWeek = Math.max(...weeks, 1);

  // ── LOADING ───────────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  // ── DETALHE ───────────────────────────────────────────────────────
  if(detalhe) {
    const { date, session } = detalhe;
    const totalSets = session.entries.reduce((a,en)=>a+en.sets.filter(s=>s.r).length,0);
    const sessVol   = session.entries.reduce((a,en)=>a+en.sets.reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0),0);

    return (
      <PageShell>
        {/* Header */}
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
          <motion.button whileTap={{scale:.95}} onClick={()=>setDetalhe(null)}
            style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .8rem',color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
            ← Voltar
          </motion.button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {session.planName||'Treino Livre'}
            </div>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'2px'}}>
              {fmtDataLonga(date)}{session.duration?` · ${fmtTime(session.duration)}`:''}
            </div>
          </div>
          {session.day && (
            <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.6rem',flexShrink:0}}>
              {session.day.slice(0,3)}
            </Badge>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
          style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'1rem'}}>
          {[
            [String(session.entries.length),'Exercícios'],
            [String(totalSets),'Séries'],
            [fmtVol(sessVol),'Volume'],
          ].map(([val,lbl],i)=>(
            <Card key={i} style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
              <CardContent style={{padding:'.75rem .5rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',color:i===2?'#e31b23':'#f0f0f2',lineHeight:1}}>{val}</div>
                <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'3px'}}>{lbl}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Exercícios */}
        <div style={{display:'grid',gap:'.55rem'}}>
          {session.entries.map((en,i)=>{
            const valid = en.sets.filter(s=>s.r);
            const bestW = valid.length ? Math.max(0,...valid.map(s=>parseFloat(s.w)||0)) : 0;
            const vol   = valid.reduce((a,s)=>a+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0);
            return (
              <motion.div key={i}
                initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}>
                <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,borderLeft:'3px solid rgba(227,27,35,.5)'}}>
                  <CardContent style={{padding:'.85rem'}}>
                    {/* Nome */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.05rem',color:'#f0f0f2',lineHeight:1}}>{en.name}</div>
                      <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.25)',color:'#e31b23',fontSize:'.55rem',flexShrink:0}}>
                        {valid.length} séries
                      </Badge>
                    </div>

                    {/* Header colunas */}
                    <div style={{display:'grid',gridTemplateColumns:'1.2rem 1fr 1fr 1fr',gap:'.4rem',padding:'0 .2rem .3rem'}}>
                      {['#','Kg','Reps','Vol'].map((h,j)=>(
                        <div key={j} style={{fontSize:'.48rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em',textAlign:j>0?'center':'left'}}>{h}</div>
                      ))}
                    </div>

                    {/* Séries */}
                    {valid.map((s,si)=>(
                      <motion.div key={si}
                        initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:i*.05+si*.03}}
                        style={{display:'grid',gridTemplateColumns:'1.2rem 1fr 1fr 1fr',gap:'.4rem',alignItems:'center',background:'rgba(0,0,0,.2)',borderRadius:8,padding:'.35rem .2rem',marginBottom:'.3rem'}}>
                        <div style={{fontSize:'.72rem',color:'rgba(227,27,35,.6)',fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",textAlign:'center'}}>{si+1}</div>
                        <div style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',color:'#f0f0f2'}}>{parseFloat(s.w)||0}kg</div>
                        <div style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',color:'#f0f0f2'}}>{s.r}</div>
                        <div style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',color:'#e31b23'}}>{Math.round((parseFloat(s.w)||0)*(parseFloat(s.r)||0))}kg</div>
                      </motion.div>
                    ))}

                    {/* Resumo */}
                    {valid.length > 0 && (
                      <>
                        <Separator style={{background:'rgba(255,255,255,.05)',margin:'.5rem 0'}}/>
                        <div style={{display:'flex',gap:'.75rem'}}>
                          {bestW>0 && <span style={{fontSize:'.65rem',color:'#7a7a8a'}}>Máx: <span style={{color:'#f0f0f2',fontWeight:700}}>{bestW}kg</span></span>}
                          {vol>0 && <span style={{fontSize:'.65rem',color:'#7a7a8a'}}>Vol: <span style={{color:'#e31b23',fontWeight:700}}>{Math.round(vol)}kg</span></span>}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </PageShell>
    );
  }

  // ── LISTA ─────────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* Header */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{marginBottom:'1.25rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>Histórico</div>
        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px'}}>{totalTreinos} treino(s) registrado(s)</div>
      </motion.div>

      {/* Stats gerais */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'1rem'}}>
        {[
          [String(totalTreinos),'🏋️','Treinos'],
          [fmtVol(totalVol),'⚡','Volume Total'],
          [fmtVol(melhorVol),'🏆','Melhor Sessão'],
        ].map(([val,icon,lbl],i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1+i*.06}}>
            <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
              <CardContent style={{padding:'.75rem .5rem',textAlign:'center'}}>
                <div style={{fontSize:'1.2rem',marginBottom:'.2rem'}}>{icon}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:i===2?'#e31b23':'#f0f0f2',lineHeight:1}}>{val}</div>
                <div style={{fontSize:'.5rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'2px'}}>{lbl}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Frequência semanal */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.2}}>
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'1rem'}}>
          <CardContent style={{padding:'1rem'}}>
            <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.75rem'}}>
              Frequência — últimas 8 semanas
            </div>
            <div style={{display:'flex',gap:'.3rem',alignItems:'flex-end',height:52}}>
              {weeks.map((n,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'.2rem'}}>
                  <motion.div
                    initial={{height:0}} animate={{height:`${Math.max((n/maxWeek)*44,n>0?6:2)}px`}}
                    transition={{delay:.3+i*.04,ease:'easeOut'}}
                    style={{width:'100%',background:i===7?'#e31b23':n>0?'rgba(227,27,35,.35)':'rgba(255,255,255,.06)',borderRadius:'3px 3px 0 0'}}/>
                  <div style={{fontSize:'.45rem',color:'#484858'}}>{n>0?n:''}</div>
                </div>
              ))}
            </div>
            <Separator style={{background:'rgba(255,255,255,.05)',margin:'.5rem 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <div style={{fontSize:'.52rem',color:'#484858'}}>← 8 sem atrás</div>
              <div style={{fontSize:'.52rem',color:'#e31b23',fontWeight:700}}>Esta semana →</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lista vazia */}
      {sorted.length === 0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.3}}>
          <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14}}>
            <CardContent style={{padding:'3rem 1rem',textAlign:'center'}}>
              <div style={{fontSize:'3rem',marginBottom:'.75rem'}}>📋</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#484858',marginBottom:'.4rem'}}>Nenhum treino ainda</div>
              <div style={{fontSize:'.82rem',color:'#484858'}}>Complete um treino no Modo Treino para ver aqui</div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Lista de treinos */}
      {sorted.length > 0 && (
        <div>
          <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>
            Treinos recentes
          </div>
          <div style={{display:'grid',gap:'.55rem'}}>
            {sorted.map(([date,session],i)=>{
              const sessVol   = session.entries.reduce((a,en)=>a+en.sets.reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0),0);
              const totalSets = session.entries.reduce((a,en)=>a+en.sets.filter(s=>s.r).length,0);
              const isMelhor  = sessVol===melhorVol && melhorVol>0;
              const pct       = melhorVol>0?(sessVol/melhorVol)*100:0;

              return (
                <motion.div key={date}
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.25+i*.05}}
                  whileTap={{scale:.98}}>
                  <Card
                    onClick={()=>setDetalhe({date,session})}
                    style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,cursor:'pointer',borderLeft:`3px solid ${isMelhor?'#facc15':'rgba(227,27,35,.4)'}`,transition:'border-color .2s'}}>
                    <CardContent style={{padding:'1rem 1.1rem'}}>
                      {/* Linha 1 */}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.4rem'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'2px'}}>
                            <span style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.04em'}}>{fmtData(date)}</span>
                            {session.day && (
                              <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.2)',color:'rgba(227,27,35,.7)',fontSize:'.48rem',padding:'0 4px',height:'auto'}}>
                                {session.day.slice(0,3)}
                              </Badge>
                            )}
                          </div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.15rem',color:'#f0f0f2',lineHeight:1.1}}>
                            {session.planName||'Treino Livre'}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0,marginLeft:'.75rem'}}>
                          {session.duration && session.duration>0 && (
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.05rem',color:'#e31b23'}}>{fmtTime(session.duration)}</div>
                          )}
                          {isMelhor && <Badge style={{background:'rgba(250,204,21,.12)',color:'#facc15',border:'1px solid rgba(250,204,21,.25)',fontSize:'.5rem',marginTop:'2px'}}>🏆 Recorde</Badge>}
                        </div>
                      </div>

                      {/* Barra volume */}
                      <Progress
                        value={pct}
                        className="h-[3px] mb-1 [&>div]:transition-all [&>div]:duration-500"
                        style={{background:'rgba(255,255,255,.05)',borderRadius:3,height:3,marginBottom:4}}/>

                      {/* Linha 2 */}
                      <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                        <span style={{fontSize:'.6rem',color:'#484858'}}>{session.entries.length} ex · {totalSets} séries</span>
                        {sessVol>0 && (
                          <>
                            <span style={{fontSize:'.5rem',color:'#2e2e38'}}>·</span>
                            <span style={{fontSize:'.6rem',color:'#e31b23',fontWeight:700}}>{fmtVol(sessVol)} vol</span>
                          </>
                        )}
                        <span style={{marginLeft:'auto',fontSize:'.6rem',color:'#484858'}}>Ver →</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
