'use client';
import { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/layout/PageShell';

const MODALIDADES = [
  {id:'yoga',      nome:'Yoga',       icon:'🧘', cor:'#a78bfa', desc:'Equilíbrio corpo e mente'},
  {id:'alongamento',nome:'Alongamento',icon:'🤸', cor:'#34d399', desc:'Flexibilidade e mobilidade'},
  {id:'meditacao', nome:'Meditação',  icon:'🌙', cor:'#60a5fa', desc:'Foco e clareza mental'},
  {id:'respiracao',nome:'Respiração', icon:'💨', cor:'#38bdf8', desc:'Controle e calma'},
  {id:'pilates',   nome:'Pilates',    icon:'⚖️', cor:'#f472b6', desc:'Core e postura'},
  {id:'mobilidade',nome:'Mobilidade', icon:'🔄', cor:'#fb923c', desc:'Amplitude de movimento'},
];

const SESSOES = [
  {id:'1', modal:'yoga',       nome:'Saudação ao Sol',         duracao:15, nivel:'Iniciante', icon:'☀️', desc:'Sequência clássica para energizar o dia', passos:['Tadasana — posição da montanha','Urdhva Hastasana — braços ao alto','Uttanasana — flexão à frente','Plank — prancha','Chaturanga — flexão baixa','Urdhva Mukha — cachorro olhando pra cima','Adho Mukha — cachorro olhando pra baixo','Voltar ao início']},
  {id:'2', modal:'yoga',       nome:'Yoga Noturno',            duracao:20, nivel:'Iniciante', icon:'🌙', desc:'Relaxe antes de dormir com posturas restaurativas', passos:['Balasana — posição da criança','Supta Baddha Konasana','Viparita Karani — pernas na parede','Savasana — relaxamento final']},
  {id:'3', modal:'meditacao',  nome:'Meditação Mindfulness',   duracao:10, nivel:'Iniciante', icon:'🧠', desc:'Atenção plena no momento presente', passos:['Sente-se confortavelmente','Feche os olhos suavemente','Foque na respiração','Observe os pensamentos sem julgamento','Retorne ao presente','Abra os olhos lentamente']},
  {id:'4', modal:'meditacao',  nome:'Body Scan',               duracao:15, nivel:'Intermediário', icon:'🫀', desc:'Consciência corporal de pés à cabeça', passos:['Deite-se confortavelmente','Atenção nos pés','Suba pelos tornozelos e pernas','Pelve e abdômen','Peito e ombros','Pescoço e cabeça','Sensação do corpo inteiro']},
  {id:'5', modal:'respiracao', nome:'Respiração 4-7-8',        duracao:5,  nivel:'Iniciante', icon:'💨', desc:'Técnica para relaxamento imediato', passos:['Inspire pelo nariz por 4 segundos','Segure por 7 segundos','Expire pela boca por 8 segundos','Repita 4 vezes']},
  {id:'6', modal:'respiracao', nome:'Respiração Box',          duracao:8,  nivel:'Intermediário', icon:'🟦', desc:'4 tempos iguais para equilíbrio', passos:['Inspire por 4 segundos','Segure por 4 segundos','Expire por 4 segundos','Segure vazio por 4 segundos','Repita 6 vezes']},
  {id:'7', modal:'alongamento',nome:'Alongamento Pós-Treino',  duracao:10, nivel:'Iniciante', icon:'🏋️', desc:'Essencial após musculação', passos:['Alongamento de quadríceps — 30s cada','Flexão de isquiotibiais — 30s','Abertura de peito — 30s','Rotação de ombros — 20s cada','Alongamento de pescoço — 20s cada','Posição fetal — 30s']},
  {id:'8', modal:'alongamento',nome:'Mobilidade Matinal',      duracao:8,  nivel:'Iniciante', icon:'🌅', desc:'Acorde o corpo com leveza', passos:['Círculos de pescoço — 10x cada lado','Rotação de ombros — 10x','Torção de tronco sentado — 30s','Abertura de quadril — 30s cada','Agachamento profundo — 30s','Respiração final']},
  {id:'9', modal:'pilates',    nome:'Core Pilates',            duracao:20, nivel:'Intermediário', icon:'💪', desc:'Fortaleça o centro do corpo', passos:['The Hundred — ativação do core','Roll Up — 10 repetições','Single Leg Stretch — 10 cada','Double Leg Stretch — 10x','Criss Cross — 10 cada','Plank — 3x 30s']},
  {id:'10',modal:'mobilidade', nome:'Mobilidade de Quadril',   duracao:12, nivel:'Iniciante', icon:'🦵', desc:'Libere a tensão do quadril', passos:['Pigeon Pose direito — 1 min','Pigeon Pose esquerdo — 1 min','Frog Pose — 1 min','Hip Circles — 10x cada','Lateral lunge — 30s cada','Squat profundo — 1 min']},
  {id:'11',modal:'yoga',       nome:'Yoga para Atletas',       duracao:25, nivel:'Intermediário', icon:'🏆', desc:'Recuperação e performance', passos:['Downward Dog — 1 min','Warrior I — 30s cada','Warrior II — 30s cada','Triangle Pose — 30s cada','Pigeon Pose — 1 min cada','Savasana — 2 min']},
  {id:'12',modal:'meditacao',  nome:'Visualização Esportiva',  duracao:10, nivel:'Intermediário', icon:'🎯', desc:'Mental training para atletas', passos:['Respire fundo 3x','Visualize seu objetivo','Sinta o movimento perfeito','Veja-se alcançando a meta','Retorne ao presente','Afirmação final']},
];

const SONS = [
  {id:'silencio', nome:'Silêncio',    icon:'🔇'},
  {id:'chuva',    nome:'Chuva',       icon:'🌧️'},
  {id:'floresta', nome:'Floresta',    icon:'🌲'},
  {id:'ondas',    nome:'Ondas',       icon:'🌊'},
  {id:'bowls',    nome:'Tibetan Bowls',icon:'🔔'},
  {id:'vento',    nome:'Vento',       icon:'💨'},
];

const HISTORICO_MOCK = [
  {sessao:'Saudação ao Sol', modal:'yoga',       data:'Hoje',    duracao:15, icon:'☀️'},
  {sessao:'Respiração 4-7-8',modal:'respiracao', data:'Ontem',   duracao:5,  icon:'💨'},
  {sessao:'Core Pilates',    modal:'pilates',     data:'Terça',   duracao:20, icon:'💪'},
];

type Sessao = typeof SESSOES[0];

// ── Timer de respiração guiado ─────────────────────────────────────────────
function TimerRespiracao({sessao, onFim}:{sessao:Sessao; onFim:()=>void}) {
  const [fase,setFase]       = useState(0);
  const [conta,setConta]     = useState(0);
  const [ciclo,setCiclo]     = useState(0);
  const [concluido,setConcluido] = useState(false);
  const totalCiclos = 4;

  const FASES_478  = [{nome:'Inspire',cor:'#34d399',seg:4},{nome:'Segure',cor:'#60a5fa',seg:7},{nome:'Expire',cor:'#f472b6',seg:8}];
  const FASES_BOX  = [{nome:'Inspire',cor:'#34d399',seg:4},{nome:'Segure',cor:'#60a5fa',seg:4},{nome:'Expire',cor:'#f472b6',seg:4},{nome:'Segure',cor:'#a78bfa',seg:4}];
  const fases = sessao.id==='6' ? FASES_BOX : FASES_478;
  const faseAtual = fases[fase];
  const pct = faseAtual ? ((faseAtual.seg - conta) / faseAtual.seg) * 100 : 0;

  useEffect(()=>{
    if(concluido) return;
    if(conta<=0){
      const nextFase = (fase+1) % fases.length;
      if(nextFase===0){
        const nextCiclo = ciclo+1;
        if(nextCiclo>=totalCiclos){ setConcluido(true); return; }
        setCiclo(nextCiclo);
      }
      setFase(nextFase);
      setConta(fases[nextFase].seg);
      return;
    }
    const t = setTimeout(()=>setConta(c=>c-1),1000);
    return ()=>clearTimeout(t);
  },[conta,fase,ciclo,concluido]);

  useEffect(()=>{ setConta(fases[0].seg); },[]);

  if(concluido) return (
    <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(6,6,8,.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem',padding:'2rem',textAlign:'center'}}>
      <div style={{fontSize:'4rem'}}>✨</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#fff'}}>Sessão Concluída</div>
      <div style={{fontSize:'.88rem',color:'#9898a8'}}>Parabéns pela prática! 🧘</div>
      <button onClick={onFim} style={{background:'linear-gradient(135deg,#a78bfa,#7c3aed)',border:'none',borderRadius:'14px',padding:'14px 48px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.06em',cursor:'pointer'}}>Finalizar</button>
    </div>
  );

  return (
    <div style={{position:'fixed',inset:0,zIndex:100,background:'#060608',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem',padding:'2rem'}}>
      <div style={{fontSize:'.7rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.14em'}}>Ciclo {ciclo+1} de {totalCiclos}</div>
      <div style={{position:'relative',width:200,height:200}}>
        <svg width={200} height={200} style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
          <circle cx={100} cy={100} r={88} fill="none" stroke="#202028" strokeWidth={8}/>
          <circle cx={100} cy={100} r={88} fill="none" stroke={faseAtual?.cor||'#a78bfa'} strokeWidth={8}
            strokeDasharray={`${2*Math.PI*88}`}
            strokeDashoffset={`${2*Math.PI*88*(pct/100)}`}
            strokeLinecap="round"
            style={{transition:'stroke-dashoffset 1s linear, stroke .5s'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'4.5rem',color:faseAtual?.cor||'#fff',lineHeight:1,transition:'color .5s'}}>{conta}</div>
          <div style={{fontSize:'.75rem',color:'#9898a8',textTransform:'uppercase',letterSpacing:'.1em',marginTop:'.2rem'}}>{faseAtual?.nome}</div>
        </div>
      </div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#fff'}}>{sessao.nome}</div>
      <div style={{display:'flex',gap:'.4rem'}}>
        {fases.map((_,i)=>(
          <div key={i} style={{width: i===fase?'24px':'8px',height:'8px',borderRadius:'4px',background:i===fase?faseAtual?.cor:'#202028',transition:'all .3s'}}/>
        ))}
      </div>
      <button onClick={onFim} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'.5rem 1.25rem',color:'#9898a8',fontSize:'.8rem',fontWeight:700,cursor:'pointer'}}>Encerrar</button>
    </div>
  );
}

// ── Timer geral de sessão ─────────────────────────────────────────────────
function TimerSessao({sessao, somAtivo, onFim}:{sessao:Sessao; somAtivo:string; onFim:()=>void}) {
  const [passoAtual, setPassoAtual] = useState(0);
  const [elapsed, setElapsed]       = useState(0);
  const [running, setRunning]       = useState(true);
  const tsRef   = useRef<number>(Date.now());
  const timerRef= useRef<any>(null);
  const total   = sessao.duracao * 60;
  const pct     = Math.min(100,(elapsed/total)*100);
  const modal   = MODALIDADES.find(m=>m.id===sessao.modal);

  useEffect(()=>{
    if(running){
      timerRef.current=setInterval(()=>setElapsed(Math.floor((Date.now()-tsRef.current)/1000)),500);
    } else clearInterval(timerRef.current);
    return ()=>clearInterval(timerRef.current);
  },[running]);

  useEffect(()=>{ if(elapsed>=total){ setRunning(false); } },[elapsed,total]);

  const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{position:'fixed',inset:0,zIndex:100,background:'#060608',display:'flex',flexDirection:'column',overflowY:'auto'}}>
      {/* Header */}
      <div style={{padding:'1rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #202028',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
          <div style={{width:36,height:36,borderRadius:'10px',background:`${modal?.cor}22`,border:`1px solid ${modal?.cor}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>{sessao.icon}</div>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{sessao.nome}</div>
            <div style={{fontSize:'.62rem',color:'#5a5a6a',marginTop:'2px'}}>{sessao.duracao} min · {modal?.nome}</div>
          </div>
        </div>
        <button onClick={onFim} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.35rem .7rem',color:'#9898a8',fontSize:'.75rem',fontWeight:700,cursor:'pointer'}}>✕ Sair</button>
      </div>

      <div style={{flex:1,padding:'1.25rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
        {/* Timer + progresso */}
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'16px',padding:'1.5rem',textAlign:'center'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'4rem',color:modal?.cor||'#a78bfa',lineHeight:1,textShadow:`0 0 30px ${modal?.cor}44`}}>
            {fmt(elapsed)}
          </div>
          <div style={{fontSize:'.6rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.1em',marginTop:'.3rem'}}>de {fmt(total)}</div>
          <div style={{marginTop:'1rem',background:'#16161c',borderRadius:'4px',height:'4px'}}>
            <div style={{height:'100%',borderRadius:'4px',background:modal?.cor||'#a78bfa',width:`${pct}%`,transition:'width .5s',boxShadow:`0 0 10px ${modal?.cor}66`}}/>
          </div>
          <div style={{display:'flex',gap:'.6rem',marginTop:'1rem',justifyContent:'center'}}>
            <button onClick={()=>setRunning(r=>!r)} style={{
              background:running?'rgba(255,255,255,.06)':(modal?.cor||'#a78bfa'),
              border:`1px solid ${running?'#202028':modal?.cor||'#a78bfa'}`,
              borderRadius:'10px',padding:'.6rem 1.5rem',
              color:running?'#9898a8':'#fff',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,
              fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',
            }}>{running?'⏸ Pausar':'▶ Retomar'}</button>
          </div>
        </div>

        {/* Som ambiente */}
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.85rem'}}>
          <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem'}}>Som ambiente</div>
          <div style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.2rem'}}>
            {SONS.map(s=>(
              <div key={s.id} style={{flexShrink:0,padding:'.4rem .75rem',borderRadius:'8px',background:somAtivo===s.id?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',border:`1px solid ${somAtivo===s.id?'rgba(167,139,250,.4)':'#202028'}`,textAlign:'center',minWidth:60}}>
                <div style={{fontSize:'1.1rem'}}>{s.icon}</div>
                <div style={{fontSize:'.55rem',color:somAtivo===s.id?'#a78bfa':'#5a5a6a',marginTop:'2px',fontWeight:600}}>{s.nome}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Passos */}
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.85rem'}}>
          <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.65rem'}}>Sequência</div>
          <div style={{display:'grid',gap:'.4rem'}}>
            {sessao.passos.map((passo,i)=>(
              <button key={i} onClick={()=>setPassoAtual(i)} style={{
                display:'flex',alignItems:'center',gap:'.75rem',
                background:i===passoAtual?`${modal?.cor}15`:'rgba(0,0,0,.2)',
                border:`1px solid ${i===passoAtual?modal?.cor+'44':'#1a1a20'}`,
                borderRadius:'10px',padding:'.65rem .85rem',cursor:'pointer',textAlign:'left',
              }}>
                <div style={{
                  width:24,height:24,borderRadius:'50%',flexShrink:0,
                  background:i<passoAtual?'rgba(34,197,94,.2)':i===passoAtual?`${modal?.cor}33`:'rgba(255,255,255,.06)',
                  border:`1px solid ${i<passoAtual?'rgba(34,197,94,.4)':i===passoAtual?modal?.cor+'55':'#202028'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'.65rem',fontWeight:700,color:i<passoAtual?'#4ade80':i===passoAtual?modal?.cor:'#5a5a6a',
                }}>{i<passoAtual?'✓':i+1}</div>
                <div style={{fontSize:'.82rem',color:i===passoAtual?'#f0f0f2':i<passoAtual?'#5a5a6a':'#9898a8',fontWeight:i===passoAtual?600:400}}>{passo}</div>
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:'.5rem',marginTop:'.75rem'}}>
            <button onClick={()=>setPassoAtual(p=>Math.max(0,p-1))} disabled={passoAtual===0} style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid #202028',borderRadius:'10px',padding:'.6rem',color:passoAtual===0?'#323240':'#9898a8',fontSize:'.82rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>← Anterior</button>
            {passoAtual<sessao.passos.length-1
              ?<button onClick={()=>setPassoAtual(p=>p+1)} style={{flex:2,background:modal?.cor||'#a78bfa',border:'none',borderRadius:'10px',padding:'.6rem',color:'#fff',fontSize:'.82rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase',letterSpacing:'.04em'}}>Próximo →</button>
              :<button onClick={onFim} style={{flex:2,background:'linear-gradient(135deg,#22c55e,#16a34a)',border:'none',borderRadius:'10px',padding:'.6rem',color:'#fff',fontSize:'.82rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase',letterSpacing:'.04em'}}>✨ Concluir</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function DarkZenPage() {
  const [modalSel, setModalSel]   = useState<string|null>(null);
  const [sessaoAtiva, setSessaoAtiva] = useState<Sessao|null>(null);
  const [somAtivo, setSomAtivo]   = useState('silencio');
  const [view, setView]           = useState<'home'|'historico'>('home');
  const [timerResp, setTimerResp] = useState<Sessao|null>(null);

  const sessoesFiltradas = modalSel
    ? SESSOES.filter(s=>s.modal===modalSel)
    : SESSOES;

  const iniciarSessao = (s:Sessao) => {
    if(s.modal==='respiracao') { setTimerResp(s); return; }
    setSessaoAtiva(s);
  };

  if(timerResp) return <TimerRespiracao sessao={timerResp} onFim={()=>setTimerResp(null)}/>;
  if(sessaoAtiva) return <TimerSessao sessao={sessaoAtiva} somAtivo={somAtivo} onFim={()=>setSessaoAtiva(null)}/>;

  return (
    <PageShell>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
            DARK<span style={{color:'#a78bfa'}}>ZEN</span>
          </div>
          <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'3px',letterSpacing:'.06em'}}>Mente e corpo em equilíbrio</div>
        </div>
        <button onClick={()=>setView(v=>v==='home'?'historico':'home')} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'.45rem .9rem',color:'#9898a8',fontSize:'.75rem',fontWeight:700,cursor:'pointer'}}>
          {view==='home'?'Histórico':'← Voltar'}
        </button>
      </div>

      {view==='historico' ? (
        <>
          <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.6rem'}}>Práticas recentes</div>
          <div style={{display:'grid',gap:'.5rem'}}>
            {HISTORICO_MOCK.map((h,i)=>{
              const modal = MODALIDADES.find(m=>m.id===h.modal);
              return (
                <div key={i} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.9rem 1rem',display:'flex',alignItems:'center',gap:'.85rem'}}>
                  <div style={{width:40,height:40,borderRadius:'10px',background:`${modal?.cor}22`,border:`1px solid ${modal?.cor}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}>{h.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2',lineHeight:1}}>{h.sessao}</div>
                    <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>{h.data} · {modal?.nome}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:modal?.cor}}>{h.duracao} min</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Som ambiente */}
          <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'14px',padding:'1rem',marginBottom:'1.25rem'}}>
            <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>🎵 Som ambiente</div>
            <div style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.2rem'}}>
              {SONS.map(s=>(
                <button key={s.id} onClick={()=>setSomAtivo(s.id)} style={{
                  flexShrink:0,padding:'.45rem .75rem',borderRadius:'10px',cursor:'pointer',
                  background:somAtivo===s.id?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',
                  border:`1px solid ${somAtivo===s.id?'rgba(167,139,250,.4)':'#202028'}`,
                  display:'flex',flexDirection:'column',alignItems:'center',gap:'.2rem',
                }}>
                  <span style={{fontSize:'1.2rem'}}>{s.icon}</span>
                  <span style={{fontSize:'.58rem',color:somAtivo===s.id?'#a78bfa':'#5a5a6a',fontWeight:600,whiteSpace:'nowrap'}}>{s.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de modalidades */}
          <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.6rem'}}>Modalidades</div>
          <div style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.35rem',marginBottom:'1.25rem'}}>
            <button onClick={()=>setModalSel(null)} style={{
              flexShrink:0,padding:'.4rem .85rem',borderRadius:'999px',cursor:'pointer',
              background:!modalSel?'rgba(167,139,250,.18)':'rgba(255,255,255,.04)',
              border:`1px solid ${!modalSel?'rgba(167,139,250,.45)':'#202028'}`,
              color:!modalSel?'#a78bfa':'#9898a8',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',
            }}>Todos</button>
            {MODALIDADES.map(m=>(
              <button key={m.id} onClick={()=>setModalSel(m.id===modalSel?null:m.id)} style={{
                flexShrink:0,padding:'.4rem .85rem',borderRadius:'999px',cursor:'pointer',
                background:modalSel===m.id?`${m.cor}22`:'rgba(255,255,255,.04)',
                border:`1px solid ${modalSel===m.id?m.cor+'55':'#202028'}`,
                color:modalSel===m.id?m.cor:'#9898a8',
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',
                display:'flex',alignItems:'center',gap:'.35rem',
              }}>
                <span>{m.icon}</span>{m.nome}
              </button>
            ))}
          </div>

          {/* Grid de sessões */}
          <div style={{display:'grid',gap:'.65rem'}}>
            {sessoesFiltradas.map(s=>{
              const modal = MODALIDADES.find(m=>m.id===s.modal);
              return (
                <button key={s.id} onClick={()=>iniciarSessao(s)} style={{
                  background:'#0e0e11',
                  border:`1px solid ${modal?.cor}33`,
                  borderLeft:`3px solid ${modal?.cor}`,
                  borderRadius:'14px',padding:'1rem 1.1rem',
                  textAlign:'left',cursor:'pointer',width:'100%',
                  transition:'all .15s',
                }}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.5rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                      <span style={{fontSize:'1.5rem'}}>{s.icon}</span>
                      <div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{s.nome}</div>
                        <div style={{fontSize:'.62rem',color:modal?.cor,fontWeight:700,marginTop:'2px'}}>{modal?.nome}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,marginLeft:'.5rem'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:modal?.cor}}>{s.duracao} min</div>
                      <div style={{fontSize:'.58rem',color:'#5a5a6a',marginTop:'1px'}}>{s.nivel}</div>
                    </div>
                  </div>
                  <div style={{fontSize:'.75rem',color:'#9898a8',lineHeight:1.4}}>{s.desc}</div>
                  <div style={{marginTop:'.6rem',display:'flex',gap:'.3rem',flexWrap:'wrap'}}>
                    {s.passos.slice(0,3).map((p,i)=>(
                      <span key={i} style={{fontSize:'.58rem',color:'#5a5a6a',background:'rgba(255,255,255,.04)',borderRadius:'999px',padding:'.15rem .5rem',border:'1px solid #1a1a20'}}>{p.split(' — ')[0]}</span>
                    ))}
                    {s.passos.length>3&&<span style={{fontSize:'.58rem',color:'#323240',padding:'.15rem .35rem'}}>+{s.passos.length-3}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}
