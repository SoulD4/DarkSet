'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  X, Play, Pause, ChevronRight, ChevronLeft,
  History, Clock, CheckCircle2, Flame,
  Volume2, VolumeX, Wind, Waves
} from 'lucide-react';
import {
  Brain, Leaf, PersonSimpleRun, Tree,
  SunHorizon, Moon, YinYang, Butterfly,
  MusicNote, Drop, SpeakerHigh, SpeakerSlash,
  ArrowsClockwise
} from '@phosphor-icons/react';

// ── Áudio zen ──────────────────────────────────────────────────
function playBell(freq = 528, dur = 1.2) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch(_){}
}

function vibrate(ms: number | number[] = 40) {
  try { navigator.vibrate?.(ms); } catch(_){}
}

// ── Tipos ──────────────────────────────────────────────────────
type ZenSession = {
  id: string; sessaoId: string; sessaoNome: string;
  modal: string; duracao: number; date: string; savedAt: number;
};

const MODALIDADES = [
  { id:'yoga',        nome:'Yoga',         Icon:YinYang,          cor:'#a78bfa', desc:'Equilíbrio corpo e mente'     },
  { id:'alongamento', nome:'Alongamento',  Icon:Butterfly,         cor:'#34d399', desc:'Flexibilidade e mobilidade'   },
  { id:'meditacao',   nome:'Meditação',    Icon:Brain,             cor:'#60a5fa', desc:'Foco e clareza mental'        },
  { id:'respiracao',  nome:'Respiração',   Icon:Wind,              cor:'#38bdf8', desc:'Controle e calma'             },
  { id:'pilates',     nome:'Pilates',      Icon:PersonSimpleRun,   cor:'#f472b6', desc:'Core e postura'               },
  { id:'mobilidade',  nome:'Mobilidade',   Icon:ArrowsClockwise,   cor:'#fb923c', desc:'Amplitude de movimento'       },
];

const SONS = [
  { id:'silencio', nome:'Silêncio',      Icon:SpeakerSlash  },
  { id:'chuva',    nome:'Chuva',         Icon:Drop          },
  { id:'floresta', nome:'Floresta',      Icon:Tree          },
  { id:'ondas',    nome:'Ondas',         Icon:Waves         },
  { id:'bowls',    nome:'Tibetan Bowls', Icon:MusicNote     },
  { id:'vento',    nome:'Vento',         Icon:Wind          },
];

const SESSOES = [
  { id:'1',  modal:'yoga',        nome:'Saudação ao Sol',        duracao:15, nivel:'Iniciante',    Icon:SunHorizon,     cor:'#f59e0b',
    desc:'Sequência clássica para energizar o dia',
    passos:['Tadasana — posição da montanha','Urdhva Hastasana — braços ao alto','Uttanasana — flexão à frente','Plank — prancha','Chaturanga — flexão baixa','Urdhva Mukha — cachorro olhando pra cima','Adho Mukha — cachorro olhando pra baixo','Voltar ao início'] },
  { id:'2',  modal:'yoga',        nome:'Yoga Noturno',           duracao:20, nivel:'Iniciante',    Icon:Moon,           cor:'#6366f1',
    desc:'Relaxe antes de dormir com posturas restaurativas',
    passos:['Balasana — posição da criança','Supta Baddha Konasana','Viparita Karani — pernas na parede','Savasana — relaxamento final'] },
  { id:'3',  modal:'meditacao',   nome:'Meditação Mindfulness',  duracao:10, nivel:'Iniciante',    Icon:Brain,          cor:'#60a5fa',
    desc:'Atenção plena no momento presente',
    passos:['Sente-se confortavelmente','Feche os olhos suavemente','Foque na respiração','Observe os pensamentos sem julgamento','Retorne ao presente','Abra os olhos lentamente'] },
  { id:'4',  modal:'meditacao',   nome:'Body Scan',              duracao:15, nivel:'Intermediário', Icon:YinYang,        cor:'#a78bfa',
    desc:'Consciência corporal de pés à cabeça',
    passos:['Deite-se confortavelmente','Atenção nos pés','Suba pelos tornozelos e pernas','Pelve e abdômen','Peito e ombros','Pescoço e cabeça','Sensação do corpo inteiro'] },
  { id:'5',  modal:'respiracao',  nome:'Respiração 4-7-8',       duracao:5,  nivel:'Iniciante',    Icon:Wind,           cor:'#38bdf8',
    desc:'Técnica para relaxamento imediato',
    passos:['Inspire pelo nariz por 4 segundos','Segure por 7 segundos','Expire pela boca por 8 segundos','Repita 4 vezes'] },
  { id:'6',  modal:'respiracao',  nome:'Respiração Box',         duracao:8,  nivel:'Intermediário', Icon:Drop,           cor:'#06b6d4',
    desc:'4 tempos iguais para equilíbrio',
    passos:['Inspire por 4 segundos','Segure por 4 segundos','Expire por 4 segundos','Segure vazio por 4 segundos','Repita 6 vezes'] },
  { id:'7',  modal:'alongamento', nome:'Alongamento Pós-Treino', duracao:10, nivel:'Iniciante',    Icon:Butterfly,      cor:'#34d399',
    desc:'Essencial após musculação',
    passos:['Alongamento de quadríceps — 30s cada','Flexão de isquiotibiais — 30s','Abertura de peito — 30s','Rotação de ombros — 20s cada','Alongamento de pescoço — 20s cada','Posição fetal — 30s'] },
  { id:'8',  modal:'alongamento', nome:'Mobilidade Matinal',     duracao:8,  nivel:'Iniciante',    Icon:SunHorizon,     cor:'#f97316',
    desc:'Acorde o corpo com leveza',
    passos:['Círculos de pescoço — 10x cada lado','Rotação de ombros — 10x','Torção de tronco sentado — 30s','Abertura de quadril — 30s cada','Agachamento profundo — 30s','Respiração final'] },
  { id:'9',  modal:'pilates',     nome:'Core Pilates',           duracao:20, nivel:'Intermediário', Icon:PersonSimpleRun,cor:'#f472b6',
    desc:'Fortaleça o centro do corpo',
    passos:['The Hundred — ativação do core','Roll Up — 10 repetições','Single Leg Stretch — 10 cada','Double Leg Stretch — 10x','Criss Cross — 10 cada','Plank — 3x 30s'] },
  { id:'10', modal:'mobilidade',  nome:'Mobilidade de Quadril',  duracao:12, nivel:'Iniciante',    Icon:ArrowsClockwise,cor:'#fb923c',
    desc:'Libere a tensão do quadril',
    passos:['Pigeon Pose direito — 1 min','Pigeon Pose esquerdo — 1 min','Frog Pose — 1 min','Hip Circles — 10x cada','Lateral lunge — 30s cada','Squat profundo — 1 min'] },
  { id:'11', modal:'yoga',        nome:'Yoga para Atletas',      duracao:25, nivel:'Intermediário', Icon:Leaf,           cor:'#22c55e',
    desc:'Recuperação e performance',
    passos:['Downward Dog — 1 min','Warrior I — 30s cada','Warrior II — 30s cada','Triangle Pose — 30s cada','Pigeon Pose — 1 min cada','Savasana — 2 min'] },
  { id:'12', modal:'meditacao',   nome:'Visualização Esportiva', duracao:10, nivel:'Intermediário', Icon:Brain,          cor:'#8b5cf6',
    desc:'Mental training para atletas',
    passos:['Respire fundo 3x','Visualize seu objetivo','Sinta o movimento perfeito','Veja-se alcançando a meta','Retorne ao presente','Afirmação final'] },
];

type Sessao = typeof SESSOES[0];
const fmt = (s:number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const todayKey = () => new Date().toISOString().slice(0,10);

// ── Timer Respiração ───────────────────────────────────────────
function TimerRespiracao({ sessao, onFim }: { sessao:Sessao; onFim:()=>void }) {
  const FASES_478 = [
    {nome:'Inspire', cor:'#34d399', seg:4},
    {nome:'Segure',  cor:'#60a5fa', seg:7},
    {nome:'Expire',  cor:'#f472b6', seg:8},
  ];
  const FASES_BOX = [
    {nome:'Inspire', cor:'#34d399', seg:4},
    {nome:'Segure',  cor:'#60a5fa', seg:4},
    {nome:'Expire',  cor:'#f472b6', seg:4},
    {nome:'Vazio',   cor:'#a78bfa', seg:4},
  ];
  const fases       = sessao.id==='6' ? FASES_BOX : FASES_478;
  const totalCiclos = sessao.id==='6' ? 6 : 4;

  const [fase,     setFase]     = useState(0);
  const [conta,    setConta]    = useState(fases[0].seg);
  const [ciclo,    setCiclo]    = useState(0);
  const [concluido,setConcluido]= useState(false);
  const faseAtual = fases[fase];
  const pct = faseAtual ? ((faseAtual.seg - conta) / faseAtual.seg) * 100 : 0;

  // Usando useCallback para evitar o warning de deps
  const tick = useCallback(()=>{
    setConta(c=>{
      if(c > 1) return c-1;
      // Troca de fase
      playBell(faseAtual.nome==='Inspire'?528:faseAtual.nome==='Expire'?396:440, .6);
      vibrate(30);
      const nextFase = (fase+1) % fases.length;
      setFase(nextFase);
      if(nextFase===0){
        const nextCiclo = ciclo+1;
        if(nextCiclo >= totalCiclos){ setConcluido(true); return 0; }
        setCiclo(nextCiclo);
      }
      return fases[nextFase].seg;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fase, ciclo, faseAtual]);

  useEffect(()=>{
    if(concluido) return;
    const t = setInterval(tick, 1000);
    return ()=>clearInterval(t);
  },[tick, concluido]);

  if(concluido) return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(6,6,8,.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem',padding:'2rem',textAlign:'center'}}>
      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:200,delay:.1}}>
        <CheckCircle2 size={64} color="#a78bfa"/>
      </motion.div>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.2}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#fff',lineHeight:1}}>Sessão Concluída</div>
        <div style={{fontSize:'.88rem',color:'#7a7a8a',marginTop:'.5rem'}}>Parabéns pela prática!</div>
      </motion.div>
      <motion.button initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.35}}
        whileTap={{scale:.97}} onClick={onFim}
        style={{background:'linear-gradient(135deg,#a78bfa,#7c3aed)',border:'none',borderRadius:14,padding:'14px 48px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.06em',cursor:'pointer',outline:'none'}}>
        Finalizar
      </motion.button>
    </motion.div>
  );

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'#060608',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem',padding:'2rem'}}>
      <div style={{fontSize:'.7rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.14em',display:'flex',alignItems:'center',gap:'.4rem'}}>
        <Wind size={12} color="#7a7a8a"/> Ciclo {ciclo+1} de {totalCiclos}
      </div>

      {/* Círculo SVG */}
      <div style={{position:'relative',width:220,height:220}}>
        <svg width={220} height={220} style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
          <circle cx={110} cy={110} r={96} fill="none" stroke="#1e1e24" strokeWidth={10}/>
          <motion.circle cx={110} cy={110} r={96} fill="none" stroke={faseAtual?.cor} strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*96}`}
            animate={{strokeDashoffset:`${2*Math.PI*96*(pct/100)}`, stroke:faseAtual?.cor}}
            transition={{duration:.9, ease:'linear'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <motion.div key={`${fase}-${conta}`} initial={{scale:1.1,opacity:.7}} animate={{scale:1,opacity:1}} transition={{duration:.25}}
            style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'4.5rem',color:faseAtual?.cor,lineHeight:1}}>
            {conta}
          </motion.div>
          <div style={{fontSize:'.75rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em',marginTop:'.25rem'}}>{faseAtual?.nome}</div>
        </div>
      </div>

      {/* Nome sessão */}
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#fff'}}>{sessao.nome}</div>

      {/* Indicadores de fase */}
      <div style={{display:'flex',gap:'.4rem'}}>
        {fases.map((_,i)=>(
          <motion.div key={i} animate={{width:i===fase?'24px':'8px',background:i===fase?faseAtual?.cor:'#2e2e38'}}
            style={{height:8,borderRadius:4,transition:'all .3s'}}/>
        ))}
      </div>

      <motion.button whileTap={{scale:.95}} onClick={onFim}
        style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'.5rem 1.25rem',color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.35rem'}}>
        <X size={14}/> Encerrar
      </motion.button>
    </div>
  );
}

// ── Timer Sessão ───────────────────────────────────────────────
function TimerSessao({ sessao, somAtivo, onFim, onSalvar }: {
  sessao:Sessao; somAtivo:string; onFim:()=>void; onSalvar:(dur:number)=>void;
}) {
  const [passoAtual, setPassoAtual] = useState(0);
  const [elapsed,    setElapsed]    = useState(0);
  const [running,    setRunning]    = useState(true);
  const [concluido,  setConcluido]  = useState(false);
  const tsRef    = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout|null>(null);
  const total    = sessao.duracao * 60;
  const pct      = Math.min(100,(elapsed/total)*100);
  const modal    = MODALIDADES.find(m=>m.id===sessao.modal);
  const SessIcon = sessao.Icon;

  useEffect(()=>{
    if(running){
      if(!tsRef.current) tsRef.current = Date.now();
      timerRef.current = setInterval(()=>setElapsed(Math.floor((Date.now()-tsRef.current)/1000)),500);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
    }
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[running]);

  useEffect(()=>{ if(elapsed>=total){ setRunning(false); } },[elapsed, total]);

  const concluir = () => {
    setConcluido(true);
    playBell(528, 2);
    vibrate([100,50,100,50,200]);
    onSalvar(elapsed);
  };

  if(concluido) return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(6,6,8,.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem',padding:'2rem',textAlign:'center'}}>
      <motion.div initial={{scale:0,rotate:-20}} animate={{scale:1,rotate:0}} transition={{type:'spring',stiffness:200,delay:.1}}>
        <SessIcon size={64} color={sessao.cor} weight="fill"/>
      </motion.div>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.25}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#fff',lineHeight:1}}>Sessão Concluída</div>
        <div style={{fontSize:'.88rem',color:'#7a7a8a',marginTop:'.5rem'}}>{fmt(elapsed)} de prática</div>
      </motion.div>
      <motion.button initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.4}}
        whileTap={{scale:.97}} onClick={onFim}
        style={{background:`linear-gradient(135deg,${sessao.cor},${sessao.cor}99)`,border:'none',borderRadius:14,padding:'14px 48px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',letterSpacing:'.06em',cursor:'pointer',outline:'none'}}>
        Finalizar
      </motion.button>
    </motion.div>
  );

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'#060608',display:'flex',flexDirection:'column',overflowY:'auto'}}>
      {/* Header */}
      <div style={{padding:'1rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #1e1e24',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${sessao.cor}22`,border:`1px solid ${sessao.cor}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <SessIcon size={20} color={sessao.cor} weight="fill"/>
          </div>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{sessao.nome}</div>
            <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px'}}>{sessao.duracao} min · {modal?.nome}</div>
          </div>
        </div>
        <motion.button whileTap={{scale:.95}} onClick={onFim}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.35rem .7rem',color:'#7a7a8a',fontSize:'.75rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem'}}>
          <X size={13}/> Sair
        </motion.button>
      </div>

      <div style={{flex:1,padding:'1.25rem',display:'flex',flexDirection:'column',gap:'.85rem'}}>
        {/* Timer + progresso */}
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 0%,${sessao.cor}10,transparent 60%)`,pointerEvents:'none'}}/>
          <CardContent style={{padding:'1.5rem',textAlign:'center',position:'relative'}}>
            <motion.div key={Math.floor(elapsed/60)} initial={{scale:1.05}} animate={{scale:1}}
              style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'4rem',color:sessao.cor,lineHeight:1,textShadow:`0 0 30px ${sessao.cor}44`}}>
              {fmt(elapsed)}
            </motion.div>
            <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em',marginTop:'.3rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
              <Clock size={10}/> de {fmt(total)}
            </div>
            <div style={{marginTop:'1rem',background:'rgba(255,255,255,.06)',borderRadius:4,height:4,overflow:'hidden'}}>
              <motion.div animate={{width:`${pct}%`}} transition={{duration:.5,ease:'easeOut'}}
                style={{height:'100%',borderRadius:4,background:sessao.cor,boxShadow:`0 0 10px ${sessao.cor}66`}}/>
            </div>
            <div style={{display:'flex',gap:'.6rem',marginTop:'1rem',justifyContent:'center'}}>
              <motion.button whileTap={{scale:.95}} onClick={()=>setRunning(r=>!r)} style={{
                background:running?'rgba(255,255,255,.06)':sessao.cor,
                border:`1px solid ${running?'#2e2e38':sessao.cor}`,
                borderRadius:10,padding:'.6rem 1.5rem',
                color:running?'#7a7a8a':'#fff',
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,
                fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',outline:'none',
                display:'flex',alignItems:'center',gap:'.4rem',
              }}>
                {running ? <><Pause size={16}/> Pausar</> : <><Play size={16}/> Retomar</>}
              </motion.button>
            </div>
          </CardContent>
        </Card>

        {/* Som ambiente */}
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
          <CardContent style={{padding:'.85rem'}}>
            <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
              <SpeakerHigh size={12} color="#7a7a8a" weight="fill"/> Som ambiente
            </div>
            <div style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.2rem',scrollbarWidth:'none'}}>
              {SONS.map(s=>{
                const SIcon = s.Icon;
                return (
                  <div key={s.id} style={{flexShrink:0,padding:'.4rem .75rem',borderRadius:8,
                    background:somAtivo===s.id?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',
                    border:`1px solid ${somAtivo===s.id?'rgba(167,139,250,.4)':'#2e2e38'}`,
                    textAlign:'center',minWidth:60,display:'flex',flexDirection:'column',alignItems:'center',gap:'.25rem'}}>
                    <SIcon size={18} color={somAtivo===s.id?'#a78bfa':'#484858'} weight={somAtivo===s.id?'fill':'regular'}/>
                    <div style={{fontSize:'.55rem',color:somAtivo===s.id?'#a78bfa':'#484858',fontWeight:600}}>{s.nome}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Passos */}
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
          <CardContent style={{padding:'.85rem'}}>
            <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.65rem'}}>Sequência</div>
            <div style={{display:'grid',gap:'.4rem'}}>
              {sessao.passos.map((passo,i)=>(
                <motion.button key={i} whileTap={{scale:.98}} onClick={()=>{setPassoAtual(i);vibrate(20);}} style={{
                  display:'flex',alignItems:'center',gap:'.75rem',
                  background:i===passoAtual?`${sessao.cor}15`:'rgba(0,0,0,.2)',
                  border:`1px solid ${i===passoAtual?sessao.cor+'44':'#1a1a20'}`,
                  borderRadius:10,padding:'.65rem .85rem',cursor:'pointer',textAlign:'left',outline:'none',
                }}>
                  <div style={{
                    width:24,height:24,borderRadius:'50%',flexShrink:0,
                    background:i<passoAtual?'rgba(34,197,94,.2)':i===passoAtual?`${sessao.cor}33`:'rgba(255,255,255,.06)',
                    border:`1px solid ${i<passoAtual?'rgba(34,197,94,.4)':i===passoAtual?sessao.cor+'55':'#2e2e38'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'.65rem',fontWeight:700,color:i<passoAtual?'#4ade80':i===passoAtual?sessao.cor:'#484858',
                  }}>
                    {i<passoAtual ? <CheckCircle2 size={13}/> : i+1}
                  </div>
                  <div style={{fontSize:'.82rem',color:i===passoAtual?'#f0f0f2':i<passoAtual?'#484858':'#9898a8',fontWeight:i===passoAtual?600:400}}>{passo}</div>
                </motion.button>
              ))}
            </div>
            <div style={{display:'flex',gap:'.5rem',marginTop:'.75rem'}}>
              <motion.button whileTap={{scale:.97}} onClick={()=>{setPassoAtual(p=>Math.max(0,p-1));vibrate(20);}}
                disabled={passoAtual===0}
                style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:10,padding:'.6rem',color:passoAtual===0?'#2e2e38':'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',cursor:passoAtual===0?'not-allowed':'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
                <ChevronLeft size={15}/> Ant.
              </motion.button>
              {passoAtual < sessao.passos.length-1 ? (
                <motion.button whileTap={{scale:.97}} onClick={()=>{setPassoAtual(p=>p+1);vibrate(20);}}
                  style={{flex:2,background:sessao.cor,border:'none',borderRadius:10,padding:'.6rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.82rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
                  Próximo <ChevronRight size={15}/>
                </motion.button>
              ) : (
                <motion.button whileTap={{scale:.97}} onClick={concluir}
                  style={{flex:2,background:'linear-gradient(135deg,#22c55e,#16a34a)',border:'none',borderRadius:10,padding:'.6rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.82rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
                  <CheckCircle2 size={15}/> Concluir
                </motion.button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function DarkZenPage() {
  const [uid,          setUid]         = useState<string|null>(null);
  const [sessions,     setSessions]    = useState<ZenSession[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [modalSel,     setModalSel]    = useState<string|null>(null);
  const [sessaoAtiva,  setSessaoAtiva] = useState<Sessao|null>(null);
  const [somAtivo,     setSomAtivo]    = useState('silencio');
  const [view,         setView]        = useState<'home'|'historico'>('home');
  const [timerResp,    setTimerResp]   = useState<Sessao|null>(null);
  const [toast,        setToast]       = useState('');

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db,'users',u.uid,'data','darkzen'));
        if(snap.exists()) setSessions(JSON.parse(snap.data().payload||'[]'));
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  const salvarSessao = async (sessao:Sessao, dur:number) => {
    const s: ZenSession = {
      id: String(Date.now()),
      sessaoId: sessao.id, sessaoNome: sessao.nome,
      modal: sessao.modal, duracao: Math.round(dur/60),
      date: todayKey(), savedAt: Date.now(),
    };
    const newSessions = [s, ...sessions];
    setSessions(newSessions);
    if(uid){
      try {
        await setDoc(doc(db,'users',uid,'data','darkzen'),{payload:JSON.stringify(newSessions),updatedAt:Date.now()});
      } catch(e){ console.error(e); }
    }
    showToast('Prática registrada!');
  };

  // Streak
  const streak = (() => {
    const dates = Array.from(new Set(sessions.map(s=>s.date))).sort().reverse();
    let count=0; let expect=todayKey();
    for(const d of dates){
      if(d===expect){ count++; const dt=new Date(d+'T12:00:00'); dt.setDate(dt.getDate()-1); expect=dt.toISOString().slice(0,10); }
      else break;
    }
    return count;
  })();

  const totalMin   = sessions.reduce((a,s)=>a+s.duracao,0);
  const thisMonth  = sessions.filter(s=>s.date.slice(0,7)===todayKey().slice(0,7)).length;

  const sessoesFiltradas = modalSel ? SESSOES.filter(s=>s.modal===modalSel) : SESSOES;

  const iniciar = (s:Sessao) => {
    if(s.modal==='respiracao'){ setTimerResp(s); return; }
    setSessaoAtiva(s);
  };

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#a78bfa',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  if(timerResp) return <TimerRespiracao sessao={timerResp} onFim={()=>{ salvarSessao(timerResp,timerResp.duracao*60); setTimerResp(null); }}/>;

  if(sessaoAtiva) return (
    <TimerSessao sessao={sessaoAtiva} somAtivo={somAtivo}
      onFim={()=>setSessaoAtiva(null)}
      onSalvar={(dur)=>salvarSessao(sessaoAtiva,dur)}/>
  );

  return (
    <PageShell>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(167,139,250,.12)',border:'1px solid rgba(167,139,250,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#a78bfa',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'.4rem'}}>
            <CheckCircle2 size={14}/>{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
            DARK<span style={{color:'#a78bfa'}}>ZEN</span>
          </div>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:'.3rem'}}>
            <YinYang size={11} color="#7a7a8a" weight="fill"/> Mente e corpo em equilíbrio
          </div>
        </div>
        <motion.button whileTap={{scale:.95}} onClick={()=>setView(v=>v==='home'?'historico':'home')}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'.45rem .9rem',color:'#9898a8',fontSize:'.75rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.35rem'}}>
          {view==='home' ? <><History size={14}/> Histórico</> : <><ChevronLeft size={14}/> Voltar</>}
        </motion.button>
      </motion.div>

      <AnimatePresence mode="wait">
        {view==='historico' ? (
          <motion.div key="hist" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
            {sessions.length===0 ? (
              <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14}}>
                <CardContent style={{padding:'3rem 1rem',textAlign:'center'}}>
                  <YinYang size={44} color="#484858" style={{margin:'0 auto .75rem'}} weight="fill"/>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#484858',textTransform:'uppercase'}}>Nenhuma prática ainda</div>
                  <div style={{fontSize:'.78rem',color:'#484858',marginTop:'.4rem'}}>Complete uma sessão para ver o histórico</div>
                </CardContent>
              </Card>
            ) : (
              <div style={{display:'grid',gap:'.5rem'}}>
                {sessions.map((s,i)=>{
                  const modal = MODALIDADES.find(m=>m.id===s.modal);
                  const MIcon = modal?.Icon || YinYang;
                  return (
                    <motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                      <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
                        <CardContent style={{padding:'.9rem 1rem',display:'flex',alignItems:'center',gap:'.85rem'}}>
                          <div style={{width:40,height:40,borderRadius:10,background:`${modal?.cor}22`,border:`1px solid ${modal?.cor}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <MIcon size={20} color={modal?.cor} weight="fill"/>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2',lineHeight:1}}>{s.sessaoNome}</div>
                            <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px',display:'flex',alignItems:'center',gap:'.3rem'}}>
                              <Clock size={10}/>{s.date} · {modal?.nome}
                            </div>
                          </div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:modal?.cor}}>{s.duracao} min</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="home" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}>

            {/* Stats */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}
              style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'1.25rem'}}>
              {[
                [String(streak),     <Flame key="f" size={18} color={streak>0?'#a78bfa':'#484858'}/>,   'Streak dias',   streak>0?'#a78bfa':'#484858'],
                [String(thisMonth),  <YinYang key="y" size={18} color="#a78bfa" weight="fill"/>,         'Este mês',      '#a78bfa'],
                [`${totalMin}min`,   <Clock key="c" size={18} color="#7a7a8a"/>,                          'Tempo total',   '#7a7a8a'],
              ].map(([val,icon,lbl,color],i)=>(
                <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1+i*.06}}>
                  <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
                    <CardContent style={{padding:'.85rem .5rem',textAlign:'center'}}>
                      <div style={{display:'flex',justifyContent:'center',marginBottom:'.3rem'}}>{icon as any}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:color as string,lineHeight:1}}>{val as string}</div>
                      <div style={{fontSize:'.48rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'2px'}}>{lbl as string}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Som ambiente */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15}}>
              <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'1.25rem'}}>
                <CardContent style={{padding:'1rem'}}>
                  <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <SpeakerHigh size={12} color="#7a7a8a" weight="fill"/> Som ambiente
                  </div>
                  <div style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.2rem',scrollbarWidth:'none'}}>
                    {SONS.map(s=>{
                      const SIcon = s.Icon;
                      return (
                        <motion.button key={s.id} whileTap={{scale:.93}} onClick={()=>setSomAtivo(s.id)} style={{
                          flexShrink:0,padding:'.45rem .75rem',borderRadius:10,cursor:'pointer',
                          background:somAtivo===s.id?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',
                          border:`1px solid ${somAtivo===s.id?'rgba(167,139,250,.4)':'#2e2e38'}`,
                          display:'flex',flexDirection:'column',alignItems:'center',gap:'.25rem',outline:'none',
                        }}>
                          <SIcon size={20} color={somAtivo===s.id?'#a78bfa':'#484858'} weight={somAtivo===s.id?'fill':'regular'}/>
                          <span style={{fontSize:'.58rem',color:somAtivo===s.id?'#a78bfa':'#484858',fontWeight:600,whiteSpace:'nowrap'}}>{s.nome}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Filtro modalidades */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.2}}>
              <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7a7a8a',marginBottom:'.6rem'}}>Modalidades</div>
              <div style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.35rem',marginBottom:'1.25rem',scrollbarWidth:'none'}}>
                <motion.button whileTap={{scale:.95}} onClick={()=>setModalSel(null)} style={{
                  flexShrink:0,padding:'.4rem .85rem',borderRadius:999,cursor:'pointer',
                  background:!modalSel?'rgba(167,139,250,.18)':'rgba(255,255,255,.04)',
                  border:`1px solid ${!modalSel?'rgba(167,139,250,.45)':'#2e2e38'}`,
                  color:!modalSel?'#a78bfa':'#7a7a8a',
                  fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',outline:'none',
                }}>Todos</motion.button>
                {MODALIDADES.map(m=>{
                  const MIcon = m.Icon;
                  return (
                    <motion.button key={m.id} whileTap={{scale:.95}} onClick={()=>setModalSel(m.id===modalSel?null:m.id)} style={{
                      flexShrink:0,padding:'.4rem .85rem',borderRadius:999,cursor:'pointer',
                      background:modalSel===m.id?`${m.cor}22`:'rgba(255,255,255,.04)',
                      border:`1px solid ${modalSel===m.id?m.cor+'55':'#2e2e38'}`,
                      color:modalSel===m.id?m.cor:'#7a7a8a',
                      fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',
                      display:'flex',alignItems:'center',gap:'.35rem',outline:'none',
                    }}>
                      <MIcon size={14} color={modalSel===m.id?m.cor:'#7a7a8a'} weight={modalSel===m.id?'fill':'regular'}/>{m.nome}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Grid sessões */}
            <div style={{display:'grid',gap:'.65rem'}}>
              {sessoesFiltradas.map((s,i)=>{
                const modal = MODALIDADES.find(m=>m.id===s.modal);
                const SIcon = s.Icon;
                return (
                  <motion.div key={s.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.22+i*.04}}
                    whileTap={{scale:.98}}>
                    <Card onClick={()=>iniciar(s)} style={{
                      background:'#1e1e24',
                      border:`1px solid ${modal?.cor}33`,
                      borderLeft:`3px solid ${modal?.cor}`,
                      borderRadius:14,cursor:'pointer',
                    }}>
                      <CardContent style={{padding:'1rem 1.1rem'}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.5rem'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                            <div style={{width:42,height:42,borderRadius:10,background:`${s.cor}22`,border:`1px solid ${s.cor}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <SIcon size={22} color={s.cor} weight="fill"/>
                            </div>
                            <div>
                              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{s.nome}</div>
                              <div style={{fontSize:'.62rem',color:modal?.cor,fontWeight:700,marginTop:'2px',display:'flex',alignItems:'center',gap:'.25rem'}}>
                                <modal.Icon size={10} weight="fill"/>{modal?.nome}
                              </div>
                            </div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0,marginLeft:'.5rem'}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:modal?.cor,display:'flex',alignItems:'center',gap:'.3rem',justifyContent:'flex-end'}}>
                              <Clock size={12}/>{s.duracao} min
                            </div>
                            <Badge variant="outline" style={{borderColor:`${modal?.cor}44`,color:modal?.cor,fontSize:'.5rem',marginTop:'2px'}}>{s.nivel}</Badge>
                          </div>
                        </div>
                        <div style={{fontSize:'.75rem',color:'#9898a8',lineHeight:1.4,marginBottom:'.6rem'}}>{s.desc}</div>
                        <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',alignItems:'center'}}>
                          {s.passos.slice(0,3).map((p,pi)=>(
                            <span key={pi} style={{fontSize:'.58rem',color:'#484858',background:'rgba(255,255,255,.04)',borderRadius:999,padding:'.15rem .5rem',border:'1px solid #1a1a20'}}>
                              {p.split(' — ')[0]}
                            </span>
                          ))}
                          {s.passos.length>3&&<span style={{fontSize:'.58rem',color:'#2e2e38'}}>+{s.passos.length-3}</span>}
                          <ChevronRight size={14} color="#484858" style={{marginLeft:'auto'}}/>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
