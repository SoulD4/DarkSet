'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGifUrls } from '@/lib/exerciseGifs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
type SetLog = { w: string; r: string };
type Item   = { exId: string; name: string; setsPlanned: number; repsTarget: string };
type Plan   = { id: string; name: string; byDay: Record<string, Item[]> };

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const todayDayName = () => DAYS[(new Date().getDay()||7)-1];
const todayKey = () => new Date().toISOString().slice(0,10);

const ALL_EXS = [
  'Supino reto barra','Supino reto halteres','Supino inclinado barra','Supino inclinado halteres',
  'Crucifixo reto halteres','Crucifixo Máquina','Crossover polia alta','Flexão de braço',
  'Desenvolvimento barra','Desenvolvimento halteres','Elevação lateral halteres','Face Pull corda',
  'Arnold press halteres','Encolhimento barra','Barra fixa','Pulldown','Puxada alta aberta',
  'Remada curvada barra','Remada serrote halteres','Remada baixa polia','Levantamento terra',
  'Rosca direta barra','Rosca direta halteres','Rosca alternada halteres','Rosca martelo halteres',
  'Rosca concentrada halteres','Rosca Scott máquina','Tríceps pulley corda','Tríceps pulley barra reta',
  'Tríceps francês halteres','Tríceps testa barra W','Paralelas','Mergulho no banco',
  'Agachamento livre','Agachamento hack máquina','Leg press 45','Cadeira extensora',
  'Afundo com halteres','Stiff','Stiff com halteres','Cadeira flexora','Mesa flexora',
  'Hip Thrust barra','Elevação pélvica com barra','Cadeira abdutora',
  'Panturrilha em pé máquina','Panturrilha sentado','Abdominal crunch','Prancha',
];

function ExGif({name, size=64}:{name:string;size?:number}) {
  const urls = getGifUrls(name);
  const [frame, setFrame] = useState(0);
  const [img1Ok, setImg1Ok] = useState(true);
  useEffect(()=>{
    setFrame(0); setImg1Ok(true);
    if(!urls) return;
    const t = setInterval(()=>setFrame(f=>f===0?1:0), 900);
    return ()=>clearInterval(t);
  },[name]);
  if(!urls) return (
    <div style={{width:size,height:size,borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:size>50?'1.5rem':'1rem'}}>🏋️</div>
  );
  const src = frame===0 ? urls.url0 : (img1Ok ? urls.url1 : urls.url0);
  return <img src={src} alt={name} onError={()=>{if(frame===1)setImg1Ok(false);}} style={{width:size,height:size,borderRadius:8,objectFit:'cover',border:'1px solid #2e2e38',flexShrink:0}}/>;
}

function RestTimer({seconds, onDone}:{seconds:number;onDone:()=>void}) {
  const [left, setLeft] = useState(seconds);
  useEffect(()=>{
    if(left<=0){onDone();return;}
    const t = setTimeout(()=>setLeft(l=>l-1),1000);
    return ()=>clearTimeout(t);
  },[left]);
  const pct = (left/seconds)*100;
  const color = left<=5?'#e31b23':left<=10?'#facc15':'#22c55e';
  return (
    <div style={{position:'fixed',inset:0,zIndex:150,background:'rgba(0,0,0,.94)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem',padding:'2rem'}}>
      <Badge variant="outline" style={{borderColor:'rgba(255,255,255,.1)',color:'#7a7a8a',letterSpacing:'.15em',fontSize:'.65rem'}}>DESCANSO</Badge>
      <div style={{position:'relative',width:170,height:170}}>
        <svg width="170" height="170" style={{transform:'rotate(-90deg)'}}>
          <circle cx="85" cy="85" r="75" fill="none" stroke="#2e2e38" strokeWidth="8"/>
          <circle cx="85" cy="85" r="75" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${2*Math.PI*75}`}
            strokeDashoffset={`${2*Math.PI*75*(1-pct/100)}`}
            style={{transition:'stroke-dashoffset .9s linear,stroke .3s'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3.2rem',color:'#fff',lineHeight:1}}>{fmtTime(left)}</div>
          <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px',textTransform:'uppercase',letterSpacing:'.08em'}}>restante</div>
        </div>
      </div>
      <Button variant="outline" onClick={onDone} style={{borderColor:'#2e2e38',color:'#7a7a8a',borderRadius:'999px',paddingLeft:'2rem',paddingRight:'2rem'}}>
        Pular descanso
      </Button>
    </div>
  );
}

function FinishScreen({elapsed,exerciseCount,setCount,onClose}:{elapsed:number;exerciseCount:number;setCount:number;onClose:()=>void}) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:160,background:'#0a0a0e',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem',padding:'2rem',animation:'fadeUp .4s ease'}}>
      <div style={{fontSize:'4.5rem'}}>💪</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2.8rem',textTransform:'uppercase',color:'#fff',textAlign:'center',lineHeight:1}}>
        Treino<br/><span style={{color:'#e31b23'}}>Concluído!</span>
      </div>
      <Card style={{background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:16,width:'100%',maxWidth:320}}>
        <CardContent style={{padding:'1.25rem',display:'flex',justifyContent:'space-around'}}>
          {[['⏱',fmtTime(elapsed),'Duração'],['🏋️',String(exerciseCount),'Exercícios'],['📊',String(setCount),'Séries']].map(([icon,val,lbl])=>(
            <div key={lbl} style={{textAlign:'center'}}>
              <div style={{fontSize:'1.4rem'}}>{icon}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',color:'#f0f0f2',lineHeight:1}}>{val}</div>
              <div style={{fontSize:'.58rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginTop:'2px'}}>{lbl}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Button onClick={onClose} style={{width:'100%',maxWidth:320,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:14,padding:'15px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.05em',boxShadow:'0 4px 20px rgba(227,27,35,.4)',height:'auto'}}>
        Ver Histórico
      </Button>
    </div>
  );
}

export default function ModoTreino() {
  const router = useRouter();
  const [uid, setUid]           = useState<string|null>(null);
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [activeId, setActiveId] = useState<string|null>(null);
  const [loading, setLoading]   = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string|null>(null);
  const [day, setDay]           = useState(todayDayName());
  const [mode, setMode]         = useState<'plan'|'livre'>('plan');
  const [started, setStarted]   = useState(false);
  const [cursor, setCursor]     = useState(0);
  const [allSets, setAllSets]   = useState<Record<number,SetLog[]>>({});
  const [elapsed, setElapsed]   = useState(0);
  const elapsedRef              = useRef(0);
  const timerRef                = useRef<NodeJS.Timeout|null>(null);
  const [restSecs, setRestSecs] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [restPreset, setRestPreset] = useState(60);
  const [livreExs, setLivreExs] = useState<{name:string;sets:SetLog[]}[]>([]);
  const [livreBusca, setLivreBusca] = useState('');
  const [showGif, setShowGif]   = useState<string|null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [finishData, setFinishData] = useState({elapsed:0,exerciseCount:0,setCount:0});
  const [toast, setToast]       = useState('');

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){setLoading(false);return;}
      setUid(u.uid);
      try {
        const d = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(d.exists()){
          const p = d.data().payload ? JSON.parse(d.data().payload) : {list:[],activeId:null};
          setPlans(p.list||[]);
          setActiveId(p.activeId||null);
          setSelectedPlanId(p.activeId||null);
        }
      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  const showToast = (msg:string) => {setToast(msg);setTimeout(()=>setToast(''),2500);};

  useEffect(()=>{
    if(started){
      timerRef.current = setInterval(()=>{elapsedRef.current+=1;setElapsed(elapsedRef.current);},1000);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
      elapsedRef.current=0; setElapsed(0);
    }
    return ()=>{if(timerRef.current) clearInterval(timerRef.current);};
  },[started]);

  const resolvedPlan = plans.find(p=>p.id===(selectedPlanId||activeId))||plans[0]||null;
  const planItems    = resolvedPlan?.byDay?.[day]||[];
  const currentEx    = planItems[cursor]||null;
  const currentSets  = allSets[cursor]||[];

  useEffect(()=>{
    if(!started||mode!=='plan'||!currentEx) return;
    if(allSets[cursor]&&allSets[cursor].length>0) return;
    const n = currentEx.setsPlanned||3;
    setAllSets(prev=>({...prev,[cursor]:Array.from({length:n},()=>({w:'',r:''}))}));
  },[cursor,started,mode,currentEx]);

  const updateSet = (si:number,field:'w'|'r',val:string) => {
    setAllSets(prev=>{const cur=[...(prev[cursor]||[])];cur[si]={...cur[si],[field]:val};return{...prev,[cursor]:cur};});
  };

  const handleSetDone = (si:number) => {
    if(!currentSets[si]?.r) return;
    setRestSecs(restPreset); setShowRest(true);
  };

  const saveSession = async () => {
    const entries:any[] = [];
    let totalSetCount = 0;
    planItems.forEach((ex,ci)=>{
      const sets=(allSets[ci]||[]).filter(s=>s.r.trim());
      if(!sets.length) return;
      totalSetCount+=sets.length;
      entries.push({name:ex.name,exId:ex.exId,sets});
    });
    if(!entries.length){showToast('Nenhuma série registrada');return;}
    if(uid){
      try {
        const histRef = doc(db,'users',uid,'data','history');
        const histSnap = await getDoc(histRef);
        const hist = histSnap.exists()?JSON.parse(histSnap.data().payload||'{}'):{};
        hist[todayKey()]={planId:resolvedPlan?.id,planName:resolvedPlan?.name,day,entries,duration:elapsed,savedAt:Date.now()};
        await setDoc(histRef,{payload:JSON.stringify(hist),updatedAt:Date.now()});
      } catch(e){console.error(e);}
    }
    setFinishData({elapsed,exerciseCount:entries.length,setCount:totalSetCount});
    setShowFinish(true); setStarted(false); setAllSets({}); setCursor(0);
  };

  const saveLivre = async () => {
    const valid = livreExs.filter(ex=>ex.sets.some(s=>s.r.trim()));
    if(!valid.length){showToast('Adicione ao menos uma série');return;}
    if(uid){
      try {
        const histRef = doc(db,'users',uid,'data','history');
        const histSnap = await getDoc(histRef);
        const hist = histSnap.exists()?JSON.parse(histSnap.data().payload||'{}'):{};
        hist[todayKey()]={planName:'Treino Livre',day,entries:valid.map(ex=>({name:ex.name,sets:ex.sets.filter(s=>s.r.trim())})),duration:elapsed,savedAt:Date.now()};
        await setDoc(histRef,{payload:JSON.stringify(hist),updatedAt:Date.now()});
      } catch(e){console.error(e);}
    }
    const totalSetCount=valid.reduce((a,ex)=>a+ex.sets.filter(s=>s.r.trim()).length,0);
    setFinishData({elapsed,exerciseCount:valid.length,setCount:totalSetCount});
    setShowFinish(true); setStarted(false); setLivreExs([]);
  };

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <div style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%',animation:'spinCw .65s linear infinite'}}/>
      </div>
    </PageShell>
  );

  if(showGif) return (
    <div onClick={()=>setShowGif(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.95)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1rem',padding:'2rem'}}>
      <ExGif name={showGif} size={260}/>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',textAlign:'center'}}>{showGif}</div>
      <div style={{fontSize:'.75rem',color:'#484858'}}>Toque para fechar</div>
    </div>
  );

  if(showFinish) return <FinishScreen elapsed={finishData.elapsed} exerciseCount={finishData.exerciseCount} setCount={finishData.setCount} onClose={()=>{setShowFinish(false);router.push('/historico');}}/>;
  if(showRest) return <RestTimer seconds={restSecs} onDone={()=>setShowRest(false)}/>;

  // ── PRÉ-INÍCIO ────────────────────────────────────────────────────────
  if(!started) return (
    <PageShell>
      {toast && (
        <div style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',animation:'fadeUp .2s ease',backdropFilter:'blur(8px)'}}>
          ✓ {toast}
        </div>
      )}

      <div style={{marginBottom:'1.25rem',animation:'fadeUp .3s ease'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>Modo Treino</div>
        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px'}}>Registre suas séries em tempo real</div>
      </div>

      {/* Toggle modo */}
      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'3px',gap:'3px',marginBottom:'.75rem',animation:'fadeUp .35s ease'}}>
        <button onClick={()=>setMode('plan')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',background:mode==='plan'?'rgba(227,27,35,.15)':'transparent',color:mode==='plan'?'#e31b23':'#7a7a8a',boxShadow:mode==='plan'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',transition:'all .15s'}}>
          Com Ficha
        </button>
        <button onClick={()=>setMode('livre')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',background:mode==='livre'?'rgba(227,27,35,.15)':'transparent',color:mode==='livre'?'#e31b23':'#7a7a8a',boxShadow:mode==='livre'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',transition:'all .15s'}}>
          Treino Livre
        </button>
      </div>

      {/* COM FICHA */}
      {mode==='plan' && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,animation:'fadeUp .4s ease'}}>
          <CardContent style={{padding:'1rem',display:'grid',gap:'.85rem'}}>
            {plans.length===0 ? (
              <div style={{textAlign:'center',padding:'1.5rem 0'}}>
                <div style={{fontSize:'2.5rem',marginBottom:'.5rem'}}>📋</div>
                <div style={{fontSize:'.85rem',color:'#7a7a8a',marginBottom:'1rem'}}>Nenhuma ficha criada ainda.</div>
                <Button onClick={()=>router.push('/treino')} style={{background:'#e31b23',border:'none',borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,textTransform:'uppercase',letterSpacing:'.04em'}}>
                  Criar Ficha
                </Button>
              </div>
            ) : (
              <>
                {/* Seletor de ficha */}
                {plans.length>1 && (
                  <div>
                    <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.35rem'}}>Ficha</div>
                    <Select value={selectedPlanId||activeId||''} onValueChange={v=>setSelectedPlanId(v)}>
                      <SelectTrigger style={{background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',height:44}}>
                        <SelectValue placeholder="Selecione uma ficha"/>
                      </SelectTrigger>
                      <SelectContent style={{background:'#1e1e24',border:'1px solid #2e2e38'}}>
                        {plans.map(p=><SelectItem key={p.id} value={p.id} style={{color:'#f0f0f2'}}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Seletor de dia */}
                <div>
                  <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.35rem'}}>Dia da semana</div>
                  <Select value={day} onValueChange={v=>setDay(v)}>
                    <SelectTrigger style={{background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',height:44}}>
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent style={{background:'#1e1e24',border:'1px solid #2e2e38'}}>
                      {DAYS.map(d=><SelectItem key={d} value={d} style={{color:'#f0f0f2'}}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview exercícios */}
                {planItems.length>0 && (
                  <div style={{background:'rgba(0,0,0,.2)',borderRadius:10,padding:'.75rem',display:'grid',gap:'.4rem'}}>
                    <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.1rem'}}>
                      {planItems.length} exercício(s) hoje
                    </div>
                    {planItems.slice(0,4).map((ex,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                        <ExGif name={ex.name} size={32}/>
                        <span style={{fontSize:'.82rem',color:'#b0b0be',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ex.name}</span>
                        <Badge variant="outline" style={{borderColor:'#2e2e38',color:'#484858',fontSize:'.6rem',flexShrink:0}}>
                          {ex.setsPlanned}x
                        </Badge>
                      </div>
                    ))}
                    {planItems.length>4 && (
                      <div style={{fontSize:'.7rem',color:'#484858',textAlign:'center'}}>+{planItems.length-4} exercícios</div>
                    )}
                  </div>
                )}

                {planItems.length===0 && (
                  <div style={{textAlign:'center',padding:'.75rem',color:'#484858',fontSize:'.82rem'}}>
                    Nenhum exercício para {day}. Selecione outro dia.
                  </div>
                )}

                {/* Timer descanso */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.6rem .75rem',background:'rgba(0,0,0,.2)',borderRadius:10}}>
                  <div style={{fontSize:'.75rem',color:'#7a7a8a'}}>⏱ Descanso</div>
                  <div style={{display:'flex',gap:'.35rem'}}>
                    {[30,60,90,120].map(s=>(
                      <button key={s} onClick={()=>setRestPreset(s)} style={{padding:'.25rem .5rem',borderRadius:6,border:'1px solid '+(restPreset===s?'#e31b23':'#2e2e38'),background:restPreset===s?'rgba(227,27,35,.15)':'transparent',color:restPreset===s?'#e31b23':'#7a7a8a',fontSize:'.7rem',fontWeight:700,cursor:'pointer',transition:'all .15s'}}>
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={()=>{setCursor(0);setAllSets({});setStarted(true);}}
                  disabled={planItems.length===0}
                  style={{width:'100%',background:planItems.length===0?'rgba(227,27,35,.3)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.05em',height:52,boxShadow:planItems.length===0?'none':'0 4px 20px rgba(227,27,35,.35)',transition:'all .2s'}}>
                  Iniciar Treino →
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* TREINO LIVRE */}
      {mode==='livre' && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,animation:'fadeUp .4s ease'}}>
          <CardContent style={{padding:'1.75rem',textAlign:'center',display:'grid',gap:'1rem'}}>
            <div style={{fontSize:'3.5rem'}}>🏋️</div>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
                Treino <span style={{color:'#e31b23'}}>Livre</span>
              </div>
              <div style={{fontSize:'.82rem',color:'#7a7a8a',marginTop:'.5rem',lineHeight:1.6}}>
                Sem ficha? Sem problema. Adicione exercícios conforme vai treinando.
              </div>
            </div>
            <Button onClick={()=>setStarted(true)} style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.05em',height:52,boxShadow:'0 4px 20px rgba(227,27,35,.35)'}}>
              Começar →
            </Button>
          </CardContent>
        </Card>
      )}
      <style>{`@keyframes spinCw{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </PageShell>
  );

  // ── SESSÃO ATIVA — COM FICHA ─────────────────────────────────────────
  if(mode==='plan') return (
    <PageShell>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',animation:'fadeUp .3s ease'}}>
        <div>
          <div style={{fontSize:'.58rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em'}}>Em andamento</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{resolvedPlan?.name}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'.65rem'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',color:'#e31b23',lineHeight:1}}>{fmtTime(elapsed)}</div>
            <div style={{fontSize:'.55rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>duração</div>
          </div>
          <Button variant="outline" onClick={()=>{if(confirm('Encerrar sem salvar?')) setStarted(false);}} style={{borderColor:'#2e2e38',color:'#7a7a8a',borderRadius:8,padding:'0 .65rem',height:34,fontSize:'.75rem',fontWeight:700}}>
            ✕
          </Button>
        </div>
      </div>

      {/* Progress geral */}
      <div style={{marginBottom:'.75rem'}}>
        <Progress value={((cursor+1)/planItems.length)*100} style={{height:4,background:'#2e2e38',borderRadius:2}} className="[&>div]:bg-red-600"/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'4px'}}>
          <div style={{fontSize:'.6rem',color:'#484858'}}>{cursor+1} de {planItems.length} exercícios</div>
          <div style={{fontSize:'.6rem',color:'#484858'}}>{Object.values(allSets).flat().length} séries registradas</div>
        </div>
      </div>

      {/* Nav exercícios */}
      <div style={{display:'flex',gap:'.3rem',overflowX:'auto',marginBottom:'.75rem',paddingBottom:'.25rem',scrollbarWidth:'none'}}>
        {planItems.map((ex,i)=>{
          const done=(allSets[i]||[]).some(s=>s.r.trim());
          const active=cursor===i;
          return (
            <button key={i} onClick={()=>setCursor(i)} style={{flexShrink:0,width:36,height:36,borderRadius:8,border:'1px solid '+(active?'#e31b23':done?'rgba(34,197,94,.3)':'#2e2e38'),background:active?'rgba(227,27,35,.15)':done?'rgba(34,197,94,.08)':'rgba(255,255,255,.03)',color:active?'#e31b23':done?'#4ade80':'#484858',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.8rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>
              {done?'✓':i+1}
            </button>
          );
        })}
      </div>

      {/* Card exercício atual */}
      {currentEx && (
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,marginBottom:'.75rem',animation:'fadeUp .25s ease'}}>
          <CardContent style={{padding:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1rem'}}>
              <button onClick={()=>setShowGif(currentEx.name)} style={{background:'none',border:'none',cursor:'pointer',padding:0,borderRadius:10,overflow:'hidden',flexShrink:0}}>
                <ExGif name={currentEx.name} size={72}/>
              </button>
              <div style={{flex:1,minWidth:0}}>
                <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.58rem',marginBottom:'4px'}}>
                  {cursor+1}/{planItems.length}
                </Badge>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1.1,marginTop:'2px'}}>{currentEx.name}</div>
                <div style={{fontSize:'.62rem',color:'#484858',marginTop:'3px'}}>{currentEx.setsPlanned} séries · {currentEx.repsTarget} reps</div>
              </div>
            </div>

            {/* Header colunas */}
            <div style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2rem',gap:'.5rem',padding:'0 .25rem .3rem'}}>
              {['#','Kg','Reps',''].map((h,i)=>(
                <div key={i} style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em',textAlign:i>0?'center':'left'}}>{h}</div>
              ))}
            </div>

            {/* Séries */}
            <div style={{display:'grid',gap:'.35rem',marginBottom:'.75rem'}}>
              {currentSets.map((s,si)=>(
                <div key={si} style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2rem',gap:'.5rem',alignItems:'center',background:'rgba(0,0,0,.25)',border:'1px solid #2e2e38',borderRadius:10,padding:'.45rem .35rem',transition:'border-color .15s',borderColor:s.r?'rgba(34,197,94,.2)':'#2e2e38'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',color:'#484858',textAlign:'center'}}>{si+1}</div>
                  <Input type="number" min="0" step="0.5" placeholder="0" value={s.w}
                    onChange={e=>updateSet(si,'w',e.target.value)}
                    style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.9rem',color:'#fff',height:36,padding:'0 .2rem'}}/>
                  <Input type="number" min="0" placeholder="0" value={s.r}
                    onChange={e=>updateSet(si,'r',e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&handleSetDone(si)}
                    style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.9rem',color:'#fff',height:36,padding:'0 .2rem'}}/>
                  <button onClick={()=>handleSetDone(si)}
                    style={{width:28,height:28,borderRadius:'50%',border:'1px solid '+(s.r?'rgba(34,197,94,.5)':'#2e2e38'),background:s.r?'rgba(34,197,94,.15)':'transparent',color:s.r?'#4ade80':'#484858',fontSize:'.85rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>
                    ✓
                  </button>
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:'.5rem'}}>
              <Button variant="outline" onClick={()=>setAllSets(prev=>{const cur=[...(prev[cursor]||[])];cur.push({w:'',r:''});return{...prev,[cursor]:cur};})}
                style={{flex:1,borderColor:'#2e2e38',color:'#7a7a8a',borderRadius:8,fontSize:'.78rem',fontWeight:700,height:36}}>
                + Série
              </Button>
              {currentSets.length>1 && (
                <Button variant="outline" onClick={()=>setAllSets(prev=>{const cur=(prev[cursor]||[]).slice(0,-1);return{...prev,[cursor]:cur};})}
                  style={{borderColor:'rgba(227,27,35,.2)',color:'#e31b23',background:'rgba(227,27,35,.06)',borderRadius:8,fontSize:'.78rem',fontWeight:700,height:36,padding:'0 .75rem'}}>
                  − Série
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegação */}
      <div style={{display:'flex',gap:'.5rem',marginBottom:'.75rem'}}>
        <Button variant="outline" onClick={()=>setCursor(c=>Math.max(0,c-1))} disabled={cursor===0}
          style={{flex:1,borderColor:'#2e2e38',color:cursor===0?'#2e2e38':'#7a7a8a',borderRadius:10,height:46,fontSize:'.85rem',fontWeight:700}}>
          ← Anterior
        </Button>
        {cursor<planItems.length-1 ? (
          <Button onClick={()=>setCursor(c=>c+1)}
            style={{flex:2,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',height:46,boxShadow:'0 2px 12px rgba(227,27,35,.3)'}}>
            Próximo →
          </Button>
        ) : (
          <Button onClick={saveSession}
            style={{flex:2,background:'linear-gradient(135deg,#22c55e,#15803d)',border:'none',borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',height:46,boxShadow:'0 2px 12px rgba(34,197,94,.3)'}}>
            Finalizar 💪
          </Button>
        )}
      </div>
      <style>{`@keyframes spinCw{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </PageShell>
  );

  // ── SESSÃO ATIVA — TREINO LIVRE ─────────────────────────────────────
  return (
    <PageShell>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',animation:'fadeUp .3s ease'}}>
        <div>
          <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.6rem',marginBottom:'3px'}}>TREINO LIVRE</Badge>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:'#e31b23',lineHeight:1}}>{fmtTime(elapsed)}</div>
        </div>
        <div style={{display:'flex',gap:'.5rem'}}>
          <Button variant="outline" onClick={()=>{if(confirm('Encerrar sem salvar?')) setStarted(false);}}
            style={{borderColor:'#2e2e38',color:'#7a7a8a',borderRadius:8,padding:'0 .65rem',height:36,fontSize:'.75rem',fontWeight:700}}>✕</Button>
          <Button onClick={saveLivre}
            style={{background:'linear-gradient(135deg,#22c55e,#15803d)',border:'none',borderRadius:8,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.78rem',textTransform:'uppercase',height:36,padding:'0 .9rem',boxShadow:'0 2px 10px rgba(34,197,94,.25)'}}>
            Salvar 💪
          </Button>
        </div>
      </div>

      {/* Busca */}
      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'.75rem'}}>
        <CardContent style={{padding:'.75rem'}}>
          <Input value={livreBusca} onChange={e=>setLivreBusca(e.target.value)} placeholder="🔍 Adicionar exercício…"
            style={{background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',height:42,fontSize:'.9rem'}}/>
          {livreBusca.length>=1 && (
            <div style={{marginTop:'.5rem',maxHeight:220,overflowY:'auto',display:'grid',gap:'.3rem'}}>
              {ALL_EXS.filter(n=>n.toLowerCase().includes(livreBusca.toLowerCase())).slice(0,8).map(n=>(
                <button key={n} onClick={()=>{setLivreExs(prev=>[{name:n,sets:[{w:'',r:''}]},...prev]);setLivreBusca('');}}
                  style={{display:'flex',alignItems:'center',gap:'.6rem',background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:8,padding:'.45rem .65rem',textAlign:'left',cursor:'pointer',transition:'background .15s'}}>
                  <ExGif name={n} size={40}/>
                  <span style={{fontSize:'.85rem',color:'#f0f0f2',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n}</span>
                  <span style={{color:'#e31b23',fontWeight:700,fontSize:'1rem',flexShrink:0}}>+</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {livreExs.length===0 && (
        <div style={{textAlign:'center',padding:'2rem 1rem',border:'1px dashed #2e2e38',borderRadius:12,color:'#484858',fontSize:'.85rem'}}>
          Use a busca acima para adicionar exercícios
        </div>
      )}

      {/* Exercícios */}
      <div style={{display:'grid',gap:'.65rem'}}>
        {livreExs.map((ex,ei)=>(
          <Card key={ei} style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,animation:'fadeUp .2s ease'}}>
            <CardContent style={{padding:'.85rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'.75rem'}}>
                <button onClick={()=>setShowGif(ex.name)} style={{background:'none',border:'none',cursor:'pointer',padding:0,borderRadius:8,overflow:'hidden',flexShrink:0}}>
                  <ExGif name={ex.name} size={52}/>
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ex.name}</div>
                  <div style={{fontSize:'.62rem',color:'#484858',marginTop:'1px'}}>{ex.sets.length} série(s)</div>
                </div>
                <Button variant="outline" onClick={()=>setLivreExs(prev=>prev.filter((_,i)=>i!==ei))}
                  style={{borderColor:'rgba(227,27,35,.2)',color:'#e31b23',background:'rgba(227,27,35,.06)',borderRadius:6,padding:'0 .4rem',height:30,fontSize:'.75rem',fontWeight:700,flexShrink:0}}>✕</Button>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2rem',gap:'.5rem',padding:'0 .25rem .2rem'}}>
                {['#','Kg','Reps',''].map((h,i)=>(
                  <div key={i} style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em',textAlign:i>0?'center':'left'}}>{h}</div>
                ))}
              </div>

              <div style={{display:'grid',gap:'.3rem',marginBottom:'.5rem'}}>
                {ex.sets.map((s,si)=>(
                  <div key={si} style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 1fr 2rem',gap:'.5rem',alignItems:'center',background:'rgba(0,0,0,.25)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .3rem'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.85rem',color:'#484858',textAlign:'center'}}>{si+1}</div>
                    <Input type="number" min="0" step="0.5" placeholder="0" value={s.w}
                      onChange={e=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,w:e.target.value})}))}
                      style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.88rem',color:'#fff',height:34,padding:'0 .2rem'}}/>
                    <Input type="number" min="0" placeholder="0" value={s.r}
                      onChange={e=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.map((s2,j)=>j!==si?s2:{...s2,r:e.target.value})}))}
                      style={{textAlign:'center',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:6,fontSize:'.88rem',color:'#fff',height:34,padding:'0 .2rem'}}/>
                    <button onClick={()=>{if(s.r){setRestSecs(restPreset);setShowRest(true);}}}
                      style={{width:28,height:28,borderRadius:'50%',border:'1px solid '+(s.r?'rgba(34,197,94,.4)':'#2e2e38'),background:s.r?'rgba(34,197,94,.12)':'transparent',color:s.r?'#4ade80':'#484858',fontSize:'.8rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>
                      ✓
                    </button>
                  </div>
                ))}
              </div>

              <div style={{display:'flex',gap:'.4rem'}}>
                <Button variant="outline" onClick={()=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:[...ex2.sets,{w:'',r:''}]}))}
                  style={{flex:1,borderColor:'#2e2e38',color:'#7a7a8a',borderRadius:7,fontSize:'.75rem',fontWeight:700,height:32}}>
                  + Série
                </Button>
                {ex.sets.length>1 && (
                  <Button variant="outline" onClick={()=>setLivreExs(prev=>prev.map((ex2,i)=>i!==ei?ex2:{...ex2,sets:ex2.sets.slice(0,-1)}))}
                    style={{borderColor:'rgba(227,27,35,.2)',color:'#e31b23',background:'rgba(227,27,35,.06)',borderRadius:7,fontSize:'.75rem',fontWeight:700,height:32,padding:'0 .65rem'}}>
                    − Série
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {livreExs.length>0 && (
        <Button onClick={saveLivre}
          style={{width:'100%',marginTop:'.85rem',background:'linear-gradient(135deg,#22c55e,#15803d)',border:'none',borderRadius:14,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',height:50,boxShadow:'0 4px 20px rgba(34,197,94,.3)'}}>
          Finalizar Treino 💪
        </Button>
      )}
      <style>{`@keyframes spinCw{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </PageShell>
  );
}
