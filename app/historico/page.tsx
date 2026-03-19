'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const fmtVol  = (v: number) => v >= 1000 ? (v/1000).toFixed(1)+'t' : Math.round(v)+'kg';
const toBR    = (iso: string) => { const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };

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

const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

type SetEntry = { w: string; r: string };
type ExEntry  = { name: string; exId?: string; sets: SetEntry[] };
type Session  = { planId?:string; planName?:string; day?:string; entries:ExEntry[]; duration?:number; savedAt?:number; };
type History  = Record<string, Session>;

const parseNum = (v: string) => { const n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; };
const volSets  = (sets: SetEntry[]) => sets.reduce((a,s)=>a+parseNum(s.w)*parseNum(s.r),0);
const volSession = (s: Session) => (s.entries||[]).reduce((a,en)=>a+volSets(en.sets||[]),0);
const estRM    = (w: number, r: number) => w*(1+r/30);

export default function HistoricoPage() {
  const [uid,     setUid]     = useState<string|null>(null);
  const [history, setHistory] = useState<History>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [detalhe, setDetalhe] = useState<{date:string;session:Session}|null>(null);
  const [busca,   setBusca]   = useState('');
  const [filtDay, setFiltDay] = useState('');
  const [filtPlan,setFiltPlan]= useState('');
  const [toast,   setToast]   = useState('');

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db,'users',u.uid,'data','history'));
        if(snap.exists()) setHistory(JSON.parse(snap.data().payload||'{}'));
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  const saveHistory = async (newHist: History) => {
    if(!uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db,'users',uid,'data','history'),{payload:JSON.stringify(newHist),updatedAt:Date.now()});
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const deleteEntry = async (date: string) => {
    if(!confirm(`Excluir o treino de ${toBR(date)}?`)) return;
    const newHist = {...history};
    delete newHist[date];
    setHistory(newHist);
    await saveHistory(newHist);
    showToast('Treino excluído');
  };

  const exportCSV = () => {
    const rows: string[][] = [['Data','Dia','Ficha','Exercício','Série','Carga','Reps']];
    sorted.forEach(([date,obj])=>{
      (obj.entries||[]).forEach(en=>{
        (en.sets||[]).forEach((s,i)=>{
          rows.push([toBR(date),obj.day||'',obj.planName||'',en.name,String(i+1),s.w||'',s.r||'']);
        });
      });
    });
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
    a.download = 'darkset_historico_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    showToast('CSV exportado! 📊');
  };

  const sorted = useMemo(()=>
    Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0]))
  ,[history]);

  // Mapa de PRs (1RM estimado por exercício)
  const prMap = useMemo(()=>{
    const map: Record<string,number> = {};
    sorted.forEach(([,obj])=>{
      (obj.entries||[]).forEach(en=>{
        (en.sets||[]).forEach(s=>{
          const w=parseNum(s.w), r=parseNum(s.r);
          if(!w||!r) return;
          const est = estRM(w,r);
          if(!map[en.name]||est>map[en.name]) map[en.name]=est;
        });
      });
    });
    return map;
  },[sorted]);

  const hasPR = (session: Session) =>
    (session.entries||[]).some(en=>(en.sets||[]).some(s=>{
      const w=parseNum(s.w), r=parseNum(s.r);
      if(!w||!r) return false;
      return Math.abs(estRM(w,r)-(prMap[en.name]||0))<0.01;
    }));

  const planOptions = [...new Set(sorted.map(([,o])=>o.planName).filter(Boolean))] as string[];

  const filtered = sorted.filter(([date,o])=>{
    const matchDay  = !filtDay  || o.day===filtDay;
    const matchPlan = !filtPlan || o.planName===filtPlan;
    const matchDate = !busca    || toBR(date).includes(busca.trim()) || date.includes(busca.trim());
    return matchDay && matchPlan && matchDate;
  });

  const totalVol      = sorted.reduce((a,[,s])=>a+volSession(s),0);
  const melhorVol     = sorted.length ? Math.max(...sorted.map(([,s])=>volSession(s))) : 0;
  const uniqueExs     = new Set(sorted.flatMap(([,s])=>s.entries.map(e=>e.name))).size;

  const weekBuckets = (): number[] => {
    const buckets = Array(8).fill(0);
    const now = new Date();
    sorted.forEach(([date])=>{
      const diff = Math.floor((now.getTime()-new Date(date+'T12:00:00').getTime())/(7*24*3600*1000));
      if(diff>=0&&diff<8) buckets[7-diff]++;
    });
    return buckets;
  };
  const weeks   = weekBuckets();
  const maxWeek = Math.max(...weeks,1);

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
    const sessVol   = volSession(session);

    return (
      <PageShell>
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
          <div style={{display:'flex',gap:'.4rem',flexShrink:0}}>
            {session.day && (
              <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.6rem'}}>
                {session.day.slice(0,3)}
              </Badge>
            )}
            {hasPR(session) && (
              <Badge style={{background:'rgba(227,27,35,.15)',color:'#e31b23',border:'1px solid rgba(227,27,35,.3)',fontSize:'.6rem'}}>
                PR 🏆
              </Badge>
            )}
          </div>
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
            const bestW = valid.length?Math.max(0,...valid.map(s=>parseNum(s.w))):0;
            const vol   = volSets(en.sets);
            const isPR  = valid.some(s=>{
              const w=parseNum(s.w),r=parseNum(s.r);
              if(!w||!r) return false;
              return Math.abs(estRM(w,r)-(prMap[en.name]||0))<0.01;
            });
            return (
              <motion.div key={i} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}>
                <Card style={{background:'#1e1e24',border:`1px solid ${isPR?'rgba(227,27,35,.3)':'#2e2e38'}`,borderRadius:14,borderLeft:`3px solid ${isPR?'#e31b23':'rgba(227,27,35,.4)'}`}}>
                  <CardContent style={{padding:'.85rem'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.05rem',color:'#f0f0f2',lineHeight:1}}>{en.name}</div>
                      <div style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
                        {isPR && <Badge style={{background:'rgba(227,27,35,.15)',color:'#e31b23',border:'1px solid rgba(227,27,35,.3)',fontSize:'.52rem',padding:'1px 5px'}}>PR</Badge>}
                        <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.2)',color:'#e31b23',fontSize:'.55rem'}}>{valid.length} séries</Badge>
                      </div>
                    </div>

                    <div style={{display:'grid',gridTemplateColumns:'1.2rem 1fr 1fr 1fr',gap:'.4rem',padding:'0 .2rem .3rem'}}>
                      {['#','Kg','Reps','Vol'].map((h,j)=>(
                        <div key={j} style={{fontSize:'.48rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em',textAlign:j>0?'center':'left'}}>{h}</div>
                      ))}
                    </div>

                    {valid.map((s,si)=>(
                      <motion.div key={si} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:i*.05+si*.03}}
                        style={{display:'grid',gridTemplateColumns:'1.2rem 1fr 1fr 1fr',gap:'.4rem',alignItems:'center',background:'rgba(0,0,0,.2)',borderRadius:8,padding:'.35rem .2rem',marginBottom:'.3rem'}}>
                        <div style={{fontSize:'.72rem',color:'rgba(227,27,35,.6)',fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",textAlign:'center'}}>{si+1}</div>
                        <div style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',color:'#f0f0f2'}}>{parseNum(s.w)||0}kg</div>
                        <div style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',color:'#f0f0f2'}}>{s.r}</div>
                        <div style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',color:'#e31b23'}}>{Math.round(parseNum(s.w)*parseNum(s.r))}kg</div>
                      </motion.div>
                    ))}

                    {valid.length>0 && (
                      <>
                        <Separator style={{background:'rgba(255,255,255,.05)',margin:'.5rem 0'}}/>
                        <div style={{display:'flex',gap:'.75rem'}}>
                          {bestW>0 && <span style={{fontSize:'.65rem',color:'#7a7a8a'}}>Máx: <span style={{color:'#f0f0f2',fontWeight:700}}>{bestW}kg</span></span>}
                          {vol>0    && <span style={{fontSize:'.65rem',color:'#7a7a8a'}}>Vol: <span style={{color:'#e31b23',fontWeight:700}}>{fmtVol(vol)}</span></span>}
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
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)'}}>
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>Histórico</div>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px'}}>{sorted.length} treino(s){saving?' · salvando...':''}</div>
        </div>
        <motion.button whileTap={{scale:.95}} onClick={exportCSV} disabled={sorted.length===0}
          style={{background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .85rem',color:'#7a7a8a',fontSize:'.75rem',fontWeight:700,cursor:sorted.length===0?'not-allowed':'pointer',outline:'none',marginTop:'.25rem'}}>
          CSV ↓
        </motion.button>
      </motion.div>

      {/* Stats gerais */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
        style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'1rem'}}>
        {[
          [String(sorted.length),'🏋️','Treinos'],
          [fmtVol(totalVol),'⚡','Volume Total'],
          [String(uniqueExs),'💪','Exercícios'],
        ].map(([val,icon,lbl],i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1+i*.06}}>
            <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
              <CardContent style={{padding:'.75rem .5rem',textAlign:'center'}}>
                <div style={{fontSize:'1.1rem',marginBottom:'.2rem'}}>{icon}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:i===1?'#e31b23':'#f0f0f2',lineHeight:1}}>{val}</div>
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
              <span style={{fontSize:'.52rem',color:'#484858'}}>← 8 sem atrás</span>
              <span style={{fontSize:'.52rem',color:'#e31b23',fontWeight:700}}>Esta semana →</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filtros */}
      {sorted.length > 0 && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.25}}>
          <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'1rem'}}>
            <CardContent style={{padding:'.75rem',display:'grid',gap:'.5rem'}}>
              <input
                value={busca} onChange={e=>setBusca(e.target.value)}
                placeholder="Buscar por data (ex: 25/03)..."
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,padding:'9px 13px',fontSize:'.85rem',color:'#f0f0f2',outline:'none'}}/>
              <div style={{display:'flex',gap:'.4rem'}}>
                <select value={filtDay} onChange={e=>setFiltDay(e.target.value)}
                  style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .6rem',fontSize:'.78rem',color:filtDay?'#f0f0f2':'#7a7a8a',outline:'none'}}>
                  <option value="">Dia da semana</option>
                  {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <select value={filtPlan} onChange={e=>setFiltPlan(e.target.value)}
                  style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .6rem',fontSize:'.78rem',color:filtPlan?'#f0f0f2':'#7a7a8a',outline:'none'}}>
                  <option value="">Ficha</option>
                  {planOptions.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                {(busca||filtDay||filtPlan) && (
                  <motion.button whileTap={{scale:.93}} onClick={()=>{setBusca('');setFiltDay('');setFiltPlan('');}}
                    style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',borderRadius:8,padding:'.4rem .65rem',color:'#e31b23',fontSize:'.75rem',fontWeight:700,cursor:'pointer',outline:'none',flexShrink:0}}>✕</motion.button>
                )}
              </div>
              {(busca||filtDay||filtPlan) && (
                <div style={{fontSize:'.6rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>
                  {filtered.length} resultado(s)
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

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

      {/* Sem resultados no filtro */}
      {sorted.length > 0 && filtered.length === 0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}>
          <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
            <CardContent style={{padding:'2rem',textAlign:'center'}}>
              <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>🔍</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'1rem',color:'#484858'}}>Nenhum treino encontrado</div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Lista de treinos */}
      {filtered.length > 0 && (
        <div>
          <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>
            Treinos recentes
          </div>
          <div style={{display:'grid',gap:'.55rem'}}>
            {filtered.map(([date,session],i)=>{
              const sessVol   = volSession(session);
              const totalSets = session.entries.reduce((a,en)=>a+en.sets.filter(s=>s.r).length,0);
              const isMelhor  = Math.abs(sessVol-melhorVol)<0.01 && melhorVol>0;
              const isPRsess  = hasPR(session);
              const pct       = melhorVol>0?(sessVol/melhorVol)*100:0;

              return (
                <motion.div key={date}
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.25+i*.05}}>
                  <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,borderLeft:`3px solid ${isMelhor?'#facc15':isPRsess?'#e31b23':'rgba(227,27,35,.35)'}`,transition:'border-color .2s',cursor:'pointer'}}
                    onClick={()=>setDetalhe({date,session})}>
                    <CardContent style={{padding:'1rem 1.1rem'}}>

                      {/* Linha 1 */}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.4rem'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'2px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.04em'}}>{fmtData(date)}</span>
                            {session.day && (
                              <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.2)',color:'rgba(227,27,35,.7)',fontSize:'.48rem',padding:'0 4px',height:'auto'}}>
                                {session.day.slice(0,3)}
                              </Badge>
                            )}
                            {isPRsess && (
                              <Badge style={{background:'rgba(227,27,35,.12)',color:'#e31b23',border:'1px solid rgba(227,27,35,.25)',fontSize:'.48rem',padding:'0 4px',height:'auto'}}>PR</Badge>
                            )}
                          </div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.15rem',color:'#f0f0f2',lineHeight:1.1}}>
                            {session.planName||'Treino Livre'}
                          </div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.25rem',flexShrink:0,marginLeft:'.75rem'}}>
                          {session.duration && session.duration>0 && (
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#e31b23'}}>{fmtTime(session.duration)}</div>
                          )}
                          {isMelhor && <Badge style={{background:'rgba(250,204,21,.1)',color:'#facc15',border:'1px solid rgba(250,204,21,.25)',fontSize:'.5rem'}}>🏆 Recorde</Badge>}
                          {/* Botão deletar */}
                          <motion.button
                            whileTap={{scale:.9}}
                            onClick={e=>{e.stopPropagation();deleteEntry(date);}}
                            style={{background:'rgba(227,27,35,.07)',border:'1px solid rgba(227,27,35,.15)',borderRadius:6,color:'#e31b23',padding:'2px 8px',fontSize:'.65rem',fontWeight:700,cursor:'pointer',outline:'none',marginTop:'2px'}}>
                            ✕
                          </motion.button>
                        </div>
                      </div>

                      {/* Barra volume */}
                      <div style={{background:'rgba(255,255,255,.05)',borderRadius:3,height:3,marginBottom:4,overflow:'hidden'}}>
                        <motion.div
                          initial={{width:0}} animate={{width:`${pct}%`}}
                          transition={{delay:.4+i*.05,duration:.5,ease:'easeOut'}}
                          style={{height:'100%',borderRadius:3,background:isMelhor?'linear-gradient(90deg,#facc15,#f59e0b)':'linear-gradient(90deg,#e31b23,#ff4444)',boxShadow:isMelhor?'0 0 8px rgba(250,204,21,.4)':'0 0 8px rgba(227,27,35,.4)'}}/>
                      </div>

                      {/* Linha 2 */}
                      <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                        <span style={{fontSize:'.6rem',color:'#484858'}}>{session.entries.length} ex · {totalSets} séries</span>
                        {sessVol>0 && (
                          <>
                            <span style={{fontSize:'.5rem',color:'#2e2e38'}}>·</span>
                            <span style={{fontSize:'.6rem',color:'#e31b23',fontWeight:700}}>{fmtVol(sessVol)}</span>
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
