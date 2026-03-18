'use client';
import { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/layout/PageShell';

// ── Dados mock ────────────────────────────────────────────────────────────
const FICHAS_MOCK = [
  {
    id:'1', nome:'Treino A — Peito', dia:'Segunda',
    exercicios:[
      {nome:'Supino Reto',     series:4, reps:'8-12', cargaAnterior:'77.5'},
      {nome:'Crucifixo',       series:3, reps:'12',   cargaAnterior:'14'},
      {nome:'Peck Deck',       series:3, reps:'12',   cargaAnterior:'40'},
      {nome:'Supino Inclinado',series:3, reps:'10',   cargaAnterior:'70'},
    ],
  },
  {
    id:'2', nome:'Treino B — Costas', dia:'Quarta',
    exercicios:[
      {nome:'Puxada Frontal', series:4, reps:'10', cargaAnterior:'60'},
      {nome:'Remada Curvada', series:3, reps:'10', cargaAnterior:'68'},
      {nome:'Barra Fixa',     series:3, reps:'8',  cargaAnterior:'0'},
    ],
  },
  {
    id:'3', nome:'Treino C — Pernas', dia:'Sexta',
    exercicios:[
      {nome:'Agachamento',       series:5, reps:'8',  cargaAnterior:'95'},
      {nome:'Leg Press',         series:4, reps:'12', cargaAnterior:'150'},
      {nome:'Cadeira Extensora', series:3, reps:'15', cargaAnterior:'50'},
      {nome:'Stiff',             series:3, reps:'12', cargaAnterior:'58'},
    ],
  },
];

const EXERCICIOS_LIVRE = [
  'Supino Reto','Supino Inclinado','Crucifixo','Peck Deck',
  'Puxada Frontal','Remada Curvada','Barra Fixa','Remada Unilateral',
  'Desenvolvimento','Elevação Lateral','Rosca Direta','Rosca Martelo',
  'Tríceps Pulley','Tríceps Testa','Agachamento','Leg Press',
  'Cadeira Extensora','Cadeira Flexora','Stiff','Hip Thrust',
];

const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

type Serie = {carga:string; reps:string; feita:boolean};
type ExAtivo = {nome:string; seriesPlanned:number; reps:string; cargaAnterior:string; series:Serie[]};

// ── Tela de conclusão ─────────────────────────────────────────────────────
function TelaConclusao({duracao, totalSeries, onClose}:{duracao:number;totalSeries:number;onClose:()=>void}) {
  const [frame, setFrame] = useState(0);
  useEffect(()=>{
    const t = setInterval(()=>setFrame(f=>f+1), 80);
    setTimeout(()=>clearInterval(t), 3000);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:200,
      background:'#060608',
      display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      padding:'2rem',
    }}>
      {/* Partículas */}
      <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
        {Array.from({length:20}).map((_,i)=>(
          <div key={i} style={{
            position:'absolute',
            left:`${Math.random()*100}%`,
            top:`${Math.random()*100}%`,
            width:Math.random()*8+4,
            height:Math.random()*8+4,
            borderRadius:'50%',
            background:['#e31b23','#facc15','#22c55e','#38bdf8'][i%4],
            opacity: frame>5?0:1,
            transform:`translateY(${-frame*3}px)`,
            transition:'all .08s',
          }}/>
        ))}
      </div>

      <div style={{textAlign:'center',zIndex:1}}>
        <div style={{fontSize:'5rem',marginBottom:'1rem',animation:'checkPop .4s ease'}}>🏆</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#fff',lineHeight:1,marginBottom:'.5rem'}}>
          TREINO<br/><span style={{color:'#e31b23'}}>CONCLUÍDO!</span>
        </div>
        <div style={{fontSize:'.88rem',color:'#9898a8',marginBottom:'2rem'}}>Excelente trabalho! 💪</div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem',marginBottom:'2rem',maxWidth:280,margin:'0 auto 2rem'}}>
          {[
            {val:fmt(duracao), label:'Duração',   icon:'⏱'},
            {val:String(totalSeries), label:'Séries feitas', icon:'✅'},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.05)',border:'1px solid #202028',borderRadius:'14px',padding:'1rem',textAlign:'center'}}>
              <div style={{fontSize:'1.4rem',marginBottom:'.25rem'}}>{s.icon}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:'#e31b23',lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:'.6rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.07em',marginTop:'3px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          background:'linear-gradient(135deg,#e31b23,#b31217)',
          border:'none',borderRadius:'14px',padding:'14px 48px',color:'#fff',
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',
          textTransform:'uppercase',letterSpacing:'.06em',cursor:'pointer',
          boxShadow:'0 4px 28px rgba(227,27,35,.4)',
        }}>Finalizar</button>
      </div>
    </div>
  );
}

// ── Timer de descanso ─────────────────────────────────────────────────────
function TimerDescanso({segundos, onEnd}:{segundos:number;onEnd:()=>void}) {
  const [restante, setRestante] = useState(segundos);
  useEffect(()=>{
    if(restante<=0){onEnd();return;}
    const t = setTimeout(()=>setRestante(r=>r-1),1000);
    return ()=>clearTimeout(t);
  },[restante]);

  const pct = (restante/segundos)*100;
  return (
    <div style={{
      position:'fixed',inset:0,zIndex:100,
      background:'rgba(6,6,8,.96)',
      display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      gap:'1.5rem',
    }}>
      <div style={{fontSize:'.72rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.14em'}}>Descanso</div>

      {/* Círculo */}
      <div style={{position:'relative',width:180,height:180}}>
        <svg width={180} height={180} style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
          <circle cx={90} cy={90} r={80} fill="none" stroke="#202028" strokeWidth={8}/>
          <circle cx={90} cy={90} r={80} fill="none" stroke="#e31b23" strokeWidth={8}
            strokeDasharray={`${2*Math.PI*80}`}
            strokeDashoffset={`${2*Math.PI*80*(1-pct/100)}`}
            strokeLinecap="round"
            style={{transition:'stroke-dashoffset .9s linear'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'4rem',color:restante<=5?'#e31b23':'#fff',lineHeight:1,transition:'color .3s'}}>
            {restante}
          </div>
          <div style={{fontSize:'.6rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.1em'}}>segundos</div>
        </div>
      </div>

      <div style={{display:'flex',gap:'.6rem'}}>
        {[30,60,90].map(s=>(
          <button key={s} onClick={()=>setRestante(r=>r+s)} style={{
            background:'rgba(255,255,255,.06)',border:'1px solid #202028',
            borderRadius:'10px',padding:'.45rem .85rem',color:'#9898a8',
            fontSize:'.8rem',fontWeight:700,cursor:'pointer',
          }}>+{s}s</button>
        ))}
        <button onClick={onEnd} style={{
          background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',
          borderRadius:'10px',padding:'.45rem .85rem',color:'#e31b23',
          fontSize:'.8rem',fontWeight:700,cursor:'pointer',
        }}>Pular</button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ModoTreinoPage() {
  const [view, setView]               = useState<'escolha'|'selFicha'|'treino'|'fim'>('escolha');
  const [exercicios, setExercicios]   = useState<ExAtivo[]>([]);
  const [exIdx, setExIdx]             = useState(0);
  const [elapsed, setElapsed]         = useState(0);
  const [running, setRunning]         = useState(false);
  const [descansando, setDescansando] = useState(false);
  const [tempoDescanso, setTempoDescanso] = useState(60);
  const [showTrocar, setShowTrocar]   = useState(false);
  const [buscaTroca, setBuscaTroca]   = useState('');
  const tsRef   = useRef<number|null>(null);
  const timerRef= useRef<any>(null);

  // Timer geral
  useEffect(()=>{
    if(running){
      if(!tsRef.current) tsRef.current = Date.now()-elapsed*1000;
      timerRef.current = setInterval(()=>setElapsed(Math.floor((Date.now()-tsRef.current!)/1000)),500);
    } else clearInterval(timerRef.current);
    return ()=>clearInterval(timerRef.current);
  },[running]);

  const exAtual = exercicios[exIdx] ?? null;
  const totalFeitas = exercicios.reduce((s,e)=>s+e.series.filter(s=>s.feita).length,0);
  const totalSeries  = exercicios.reduce((s,e)=>s+e.series.length,0);
  const progresso   = totalSeries>0?(totalFeitas/totalSeries)*100:0;

  // Inicia com ficha
  const iniciarFicha = (ficha: typeof FICHAS_MOCK[0]) => {
    const exs: ExAtivo[] = ficha.exercicios.map(ex=>({
      nome: ex.nome,
      seriesPlanned: ex.series,
      reps: ex.reps,
      cargaAnterior: ex.cargaAnterior,
      series: Array.from({length:ex.series},()=>({carga:ex.cargaAnterior,reps:ex.reps,feita:false})),
    }));
    setExercicios(exs); setExIdx(0); setElapsed(0);
    tsRef.current=null; setRunning(true);
    setView('treino');
  };

  // Inicia livre
  const iniciarLivre = () => {
    setExercicios([]); setExIdx(0); setElapsed(0);
    tsRef.current=null; setRunning(true);
    setView('treino');
  };

  // Marcar série
  const marcarSerie = (serieIdx: number) => {
    setExercicios(prev=>{
      const novo = [...prev];
      const ex   = {...novo[exIdx]};
      const sers = [...ex.series];
      sers[serieIdx] = {...sers[serieIdx], feita:!sers[serieIdx].feita};
      ex.series = sers;
      novo[exIdx] = ex;
      return novo;
    });
    // Inicia descanso ao marcar
    setDescansando(true);
  };

  // Atualiza campo da série
  const updateSerie = (serieIdx:number, field:'carga'|'reps', val:string) => {
    setExercicios(prev=>{
      const novo=[...prev];
      const ex={...novo[exIdx]};
      const sers=[...ex.series];
      sers[serieIdx]={...sers[serieIdx],[field]:val};
      ex.series=sers; novo[exIdx]=ex;
      return novo;
    });
  };

  // Trocar exercício
  const trocarEx = (nome:string) => {
    setExercicios(prev=>{
      const novo=[...prev];
      novo[exIdx]={...novo[exIdx],nome,series:novo[exIdx].series.map(s=>({...s,feita:false}))};
      return novo;
    });
    setShowTrocar(false); setBuscaTroca('');
  };

  // Adicionar exercício livre
  const adicionarEx = (nome:string) => {
    const novo:ExAtivo={nome,seriesPlanned:3,reps:'10-12',cargaAnterior:'',series:Array.from({length:3},()=>({carga:'',reps:'10-12',feita:false}))};
    setExercicios(prev=>[...prev,novo]);
    setExIdx(exercicios.length);
    setShowTrocar(false); setBuscaTroca('');
  };

  // Finalizar
  const finalizar = () => { setRunning(false); setView('fim'); };

  // ── TELA DE CONCLUSÃO ───────────────────────────────────────────────
  if(view==='fim') return (
    <TelaConclusao duracao={elapsed} totalSeries={totalFeitas} onClose={()=>{ setView('escolha'); setExercicios([]); setElapsed(0); }}/>
  );

  // ── SELEÇÃO DE FICHA ────────────────────────────────────────────────
  if(view==='selFicha') return (
    <PageShell>
      <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
        <button onClick={()=>setView('escolha')} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.4rem .8rem',color:'#9898a8',fontSize:'.8rem',fontWeight:700,cursor:'pointer'}}>← Voltar</button>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2'}}>Escolha a ficha</div>
      </div>
      <div style={{display:'grid',gap:'.65rem'}}>
        {FICHAS_MOCK.map(f=>(
          <button key={f.id} onClick={()=>iniciarFicha(f)} style={{
            background:'#0e0e11',border:'1px solid #202028',borderLeft:'2px solid #e31b23',
            borderRadius:'14px',padding:'1.1rem 1rem',textAlign:'left',cursor:'pointer',width:'100%',
          }}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{f.nome}</div>
            <div style={{fontSize:'.7rem',color:'#5a5a6a',marginTop:'3px'}}>{f.dia} · {f.exercicios.length} exercícios</div>
            <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap',marginTop:'.6rem'}}>
              {f.exercicios.slice(0,3).map((ex,i)=>(
                <span key={i} style={{fontSize:'.62rem',color:'#9898a8',background:'rgba(255,255,255,.05)',borderRadius:'999px',padding:'.18rem .55rem',border:'1px solid #202028'}}>{ex.nome}</span>
              ))}
              {f.exercicios.length>3&&<span style={{fontSize:'.62rem',color:'#5a5a6a',padding:'.18rem .35rem'}}>+{f.exercicios.length-3}</span>}
            </div>
          </button>
        ))}
      </div>
    </PageShell>
  );

  // ── TELA DE ESCOLHA ─────────────────────────────────────────────────
  if(view==='escolha') return (
    <PageShell>
      <div style={{marginBottom:'1.5rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
          MODO <span style={{color:'#e31b23'}}>TREINO</span>
        </div>
        <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'3px',letterSpacing:'.06em'}}>Inicie sua sessão</div>
      </div>

      <div style={{display:'grid',gap:'.75rem'}}>
        {/* Ficha */}
        <button onClick={()=>setView('selFicha')} style={{
          background:'linear-gradient(135deg,rgba(227,27,35,.15),rgba(227,27,35,.05))',
          border:'1px solid rgba(227,27,35,.3)',borderRadius:'18px',
          padding:'1.5rem',textAlign:'left',cursor:'pointer',
          position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:'-15px',right:'-15px',fontSize:'5rem',opacity:.08}}>📋</div>
          <div style={{fontSize:'2.2rem',marginBottom:'.6rem'}}>📋</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#fff',letterSpacing:'.04em',lineHeight:1}}>Usar Ficha</div>
          <div style={{fontSize:'.75rem',color:'rgba(255,255,255,.5)',marginTop:'.3rem'}}>Execute uma ficha criada com exercícios e séries predefinidas</div>
          <div style={{marginTop:'.85rem',display:'inline-flex',alignItems:'center',gap:'.4rem',background:'rgba(227,27,35,.2)',borderRadius:'8px',padding:'.3rem .75rem'}}>
            <span style={{fontSize:'.72rem',color:'#e31b23',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>Selecionar ficha →</span>
          </div>
        </button>

        {/* Livre */}
        <button onClick={iniciarLivre} style={{
          background:'linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
          border:'1px solid #202028',borderRadius:'18px',
          padding:'1.5rem',textAlign:'left',cursor:'pointer',
          position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:'-15px',right:'-15px',fontSize:'5rem',opacity:.06}}>💪</div>
          <div style={{fontSize:'2.2rem',marginBottom:'.6rem'}}>💪</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#fff',letterSpacing:'.04em',lineHeight:1}}>Treino Livre</div>
          <div style={{fontSize:'.75rem',color:'rgba(255,255,255,.35)',marginTop:'.3rem'}}>Monte sua sessão na hora adicionando exercícios conforme treina</div>
          <div style={{marginTop:'.85rem',display:'inline-flex',alignItems:'center',gap:'.4rem',background:'rgba(255,255,255,.08)',borderRadius:'8px',padding:'.3rem .75rem'}}>
            <span style={{fontSize:'.72rem',color:'#9898a8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>Começar agora →</span>
          </div>
        </button>
      </div>
    </PageShell>
  );

  // ── MODO TREINO ATIVO ───────────────────────────────────────────────
  return (
    <>
      {/* Timer de descanso */}
      {descansando&&<TimerDescanso segundos={tempoDescanso} onEnd={()=>setDescansando(false)}/>}

      {/* Modal trocar exercício */}
      {showTrocar&&(
        <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(0,0,0,.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'#0e0e11',borderTop:'1px solid #202028',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'75vh',display:'flex',flexDirection:'column',padding:'1.25rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2'}}>
                {exercicios.length===0||exIdx>=exercicios.length?'Adicionar Exercício':'Trocar Exercício'}
              </div>
              <button onClick={()=>{setShowTrocar(false);setBuscaTroca('');}} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',color:'#9898a8',fontSize:'1rem',cursor:'pointer'}}>✕</button>
            </div>
            <input value={buscaTroca} onChange={e=>setBuscaTroca(e.target.value)}
              placeholder="Buscar exercício..."
              style={{background:'#111115',border:'1px solid #222227',borderRadius:'10px',color:'#eaeaea',padding:'10px 13px',fontSize:'.9rem',outline:'none',marginBottom:'.75rem'}}/>
            <div style={{overflowY:'auto',display:'grid',gap:'.4rem'}}>
              {EXERCICIOS_LIVRE.filter(e=>e.toLowerCase().includes(buscaTroca.toLowerCase())).map((ex,i)=>(
                <button key={i} onClick={()=>exercicios.length===0?adicionarEx(ex):trocarEx(ex)} style={{
                  background:'rgba(255,255,255,.03)',border:'1px solid #202028',
                  borderRadius:'10px',padding:'.7rem 1rem',textAlign:'left',cursor:'pointer',
                  color:'#f0f0f2',fontSize:'.9rem',fontWeight:600,
                }}>{ex}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <PageShell>
        {/* Header do treino */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
              {exercicios.length>0?`${exIdx+1}/${exercicios.length} exercícios`:'Treino Livre'}
            </div>
            <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>⏱ {fmt(elapsed)}</div>
          </div>
          <button onClick={finalizar} style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:'10px',padding:'.45rem .85rem',color:'#e31b23',fontSize:'.78rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif"}}>
            Finalizar
          </button>
        </div>

        {/* Barra de progresso geral */}
        <div style={{marginBottom:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
            <span style={{fontSize:'.6rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.07em'}}>Progresso geral</span>
            <span style={{fontSize:'.6rem',color:'#e31b23',fontWeight:700}}>{totalFeitas}/{totalSeries} séries</span>
          </div>
          <div style={{background:'#16161c',borderRadius:'4px',height:'4px'}}>
            <div style={{height:'100%',borderRadius:'4px',background:'linear-gradient(90deg,#e31b23,#ff4444)',width:`${progresso}%`,transition:'width .4s',boxShadow:'0 0 10px rgba(227,27,35,.4)'}}/>
          </div>
        </div>

        {/* Navegação entre exercícios */}
        {exercicios.length>0&&(
          <div style={{display:'flex',gap:'.4rem',overflowX:'auto',marginBottom:'1rem',paddingBottom:'.25rem'}}>
            {exercicios.map((ex,i)=>{
              const todasFeitas = ex.series.every(s=>s.feita);
              const alguma      = ex.series.some(s=>s.feita);
              return (
                <button key={i} onClick={()=>setExIdx(i)} style={{
                  flexShrink:0,padding:'.35rem .75rem',borderRadius:'10px',cursor:'pointer',
                  border:`1px solid ${i===exIdx?'#e31b23':todasFeitas?'rgba(34,197,94,.3)':alguma?'rgba(227,27,35,.2)':'#202028'}`,
                  background: i===exIdx?'rgba(227,27,35,.15)':todasFeitas?'rgba(34,197,94,.08)':'rgba(255,255,255,.04)',
                  color: i===exIdx?'#e31b23':todasFeitas?'#4ade80':'#9898a8',
                  fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.75rem',
                  textTransform:'uppercase',letterSpacing:'.03em',
                  display:'flex',alignItems:'center',gap:'.35rem',
                }}>
                  {todasFeitas&&<span style={{fontSize:'.7rem'}}>✅</span>}
                  {ex.nome.split(' ').slice(0,2).join(' ')}
                </button>
              );
            })}
            <button onClick={()=>{setExIdx(exercicios.length);setShowTrocar(true);}} style={{
              flexShrink:0,padding:'.35rem .75rem',borderRadius:'10px',cursor:'pointer',
              border:'1px dashed #202028',background:'transparent',
              color:'#5a5a6a',fontFamily:"'Barlow Condensed',sans-serif",
              fontWeight:700,fontSize:'.75rem',textTransform:'uppercase',
            }}>+ Add</button>
          </div>
        )}

        {/* Card do exercício atual */}
        {exAtual ? (
          <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'16px',padding:'1.1rem',marginBottom:'.75rem'}}>
            {/* Nome + trocar */}
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.75rem'}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{exAtual.nome}</div>
                {exAtual.cargaAnterior&&exAtual.cargaAnterior!=='0'&&(
                  <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'3px'}}>
                    📊 Última vez: <span style={{color:'#e31b23',fontWeight:700}}>{exAtual.cargaAnterior}kg</span>
                  </div>
                )}
              </div>
              <button onClick={()=>setShowTrocar(true)} style={{
                background:'rgba(255,255,255,.06)',border:'1px solid #202028',
                borderRadius:'8px',padding:'.35rem .65rem',color:'#9898a8',
                fontSize:'.72rem',fontWeight:700,cursor:'pointer',flexShrink:0,marginLeft:'.5rem',
              }}>🔄 Trocar</button>
            </div>

            {/* Config descanso */}
            <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.85rem',padding:'.5rem .75rem',background:'rgba(0,0,0,.3)',borderRadius:'10px'}}>
              <span style={{fontSize:'.65rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em',flex:1}}>⏱ Descanso</span>
              {[30,45,60,90,120].map(s=>(
                <button key={s} onClick={()=>setTempoDescanso(s)} style={{
                  padding:'.2rem .5rem',borderRadius:'6px',cursor:'pointer',
                  border:`1px solid ${tempoDescanso===s?'rgba(227,27,35,.4)':'#202028'}`,
                  background:tempoDescanso===s?'rgba(227,27,35,.15)':'transparent',
                  color:tempoDescanso===s?'#e31b23':'#5a5a6a',
                  fontSize:'.65rem',fontWeight:700,
                }}>{s}s</button>
              ))}
            </div>

            {/* Header das séries */}
            <div style={{display:'grid',gridTemplateColumns:'32px 1fr 1fr 42px',gap:'.5rem',marginBottom:'.4rem',padding:'0 .25rem'}}>
              {['SÉRIE','CARGA (kg)','REPS',''].map((h,i)=>(
                <div key={i} style={{fontSize:'.55rem',color:'#323240',textTransform:'uppercase',letterSpacing:'.07em',textAlign:i===3?'center':'left'}}>{h}</div>
              ))}
            </div>

            {/* Séries */}
            <div style={{display:'grid',gap:'.4rem'}}>
              {exAtual.series.map((serie,si)=>(
                <div key={si} style={{
                  display:'grid',gridTemplateColumns:'32px 1fr 1fr 42px',gap:'.5rem',
                  alignItems:'center',
                  background:serie.feita?'rgba(34,197,94,.06)':'rgba(0,0,0,.2)',
                  border:`1px solid ${serie.feita?'rgba(34,197,94,.2)':'#1a1a20'}`,
                  borderRadius:'10px',padding:'.5rem .6rem',
                  transition:'all .2s',
                }}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:serie.feita?'#4ade80':'#5a5a6a',textAlign:'center'}}>{si+1}</div>
                  <input type="number" step="0.5" value={serie.carga} onChange={e=>updateSerie(si,'carga',e.target.value)}
                    placeholder={exAtual.cargaAnterior||'0'}
                    style={{background:'rgba(0,0,0,.3)',border:'1px solid #202028',borderRadius:'7px',color:serie.feita?'#4ade80':'#f0f0f2',padding:'.45rem .6rem',fontSize:'.9rem',outline:'none',width:'100%',fontWeight:600}}/>
                  <input type="text" value={serie.reps} onChange={e=>updateSerie(si,'reps',e.target.value)}
                    style={{background:'rgba(0,0,0,.3)',border:'1px solid #202028',borderRadius:'7px',color:serie.feita?'#4ade80':'#f0f0f2',padding:'.45rem .6rem',fontSize:'.9rem',outline:'none',width:'100%',fontWeight:600}}/>
                  <button onClick={()=>marcarSerie(si)} style={{
                    width:38,height:38,borderRadius:'10px',border:'none',cursor:'pointer',
                    background:serie.feita?'rgba(34,197,94,.2)':'rgba(255,255,255,.06)',
                    fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'all .15s',
                  }}>
                    {serie.feita?'✅':'⭕'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Treino livre sem exercícios */
          <div style={{textAlign:'center',padding:'2rem',border:'1px dashed #202028',borderRadius:'16px',marginBottom:'.75rem'}}>
            <div style={{fontSize:'2.5rem',marginBottom:'.75rem'}}>💪</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.4rem'}}>Adicione o primeiro exercício</div>
            <div style={{fontSize:'.8rem',color:'#5a5a6a'}}>Toque em "+ Add" acima para buscar e adicionar exercícios</div>
          </div>
        )}

        {/* Botões de navegação */}
        {exercicios.length>0&&(
          <div style={{display:'flex',gap:'.6rem',marginBottom:'1rem'}}>
            <button onClick={()=>setExIdx(i=>Math.max(0,i-1))} disabled={exIdx===0} style={{
              flex:1,background:'rgba(255,255,255,.04)',border:'1px solid #202028',
              borderRadius:'12px',padding:'.85rem',color:exIdx===0?'#323240':'#9898a8',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',
              textTransform:'uppercase',cursor:exIdx===0?'not-allowed':'pointer',
            }}>← Anterior</button>
            {exIdx<exercicios.length-1 ? (
              <button onClick={()=>setExIdx(i=>i+1)} style={{
                flex:2,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',
                borderRadius:'12px',padding:'.85rem',color:'#fff',
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',
                textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',
                boxShadow:'0 4px 20px rgba(227,27,35,.28)',
              }}>Próximo →</button>
            ) : (
              <button onClick={finalizar} style={{
                flex:2,background:'linear-gradient(135deg,#22c55e,#16a34a)',border:'none',
                borderRadius:'12px',padding:'.85rem',color:'#fff',
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',
                textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',
                boxShadow:'0 4px 20px rgba(34,197,94,.28)',
              }}>🏆 Concluir Treino</button>
            )}
          </div>
        )}

        {/* Adicionar exercício (treino livre) */}
        {exercicios.length===0&&(
          <button onClick={()=>setShowTrocar(true)} style={{
            width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',
            borderRadius:'12px',padding:'14px',color:'#fff',
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',
            textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',
            boxShadow:'0 4px 20px rgba(227,27,35,.3)',
          }}>+ Adicionar Exercício</button>
        )}
      </PageShell>
    </>
  );
}
