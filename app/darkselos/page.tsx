'use client';
import { useState, useEffect } from 'react';
import PageShell from '@/components/layout/PageShell';

type Selo = {
  id: string;
  cat: string;
  title: string;
  icon: string;
  desc: string;
  desbloqueado: boolean;
  progresso?: number; // 0-100
  progressoLabel?: string;
  raridade: 'comum'|'raro'|'epico'|'lendario';
};

const CATS = [
  {id:'todos',      label:'Todos',      icon:'🏅'},
  {id:'assiduidade',label:'Assiduidade',icon:'🔥'},
  {id:'volume',     label:'Volume',     icon:'⚖️'},
  {id:'forca',      label:'Força',      icon:'💪'},
  {id:'cardio',     label:'Cardio',     icon:'🏃'},
  {id:'squad',      label:'Squad',      icon:'⚔️'},
  {id:'darkdiet',   label:'DarkDiet',   icon:'🥗'},
  {id:'darkzen',    label:'DarkZen',    icon:'🧘'},
  {id:'especial',   label:'Especial',   icon:'👑'},
];

const RARIDADE_COR: Record<string, string> = {
  comum:    '#9898a8',
  raro:     '#60a5fa',
  epico:    '#a78bfa',
  lendario: '#facc15',
};

const RARIDADE_BG: Record<string, string> = {
  comum:    'rgba(152,152,168,.1)',
  raro:     'rgba(96,165,250,.1)',
  epico:    'rgba(167,139,250,.12)',
  lendario: 'rgba(250,204,21,.12)',
};

const SELOS_DATA: Selo[] = [
  // ── Assiduidade ────────────────────────────────────────────
  {id:'ferro_1',       cat:'assiduidade', title:'Primeira Gota de Sangue', icon:'🩸', desc:'Primeiro treino registrado',                          desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'ferro_20',      cat:'assiduidade', title:'Iniciado',                icon:'⛓️', desc:'20 treinos — apenas o começo',                        desbloqueado:true,  progresso:100, progressoLabel:'20/20', raridade:'comum'},
  {id:'ferro_50',      cat:'assiduidade', title:'Meio Ano de Dor',         icon:'🔩', desc:'50 treinos sem parar',                                desbloqueado:true,  progresso:100, progressoLabel:'50/50', raridade:'raro'},
  {id:'ferro_150',     cat:'assiduidade', title:'Veterano de Ferro',       icon:'⚔️', desc:'150 treinos — isso é dedicação real',                 desbloqueado:false, progresso:85,  progressoLabel:'128/150', raridade:'raro'},
  {id:'ferro_365',     cat:'assiduidade', title:'Um Ano de Ferro',         icon:'🏴', desc:'365 treinos ao longo da vida',                        desbloqueado:false, progresso:35,  progressoLabel:'128/365', raridade:'epico'},
  {id:'streak_14',     cat:'assiduidade', title:'Chama Acesa',             icon:'🔥', desc:'14 dias consecutivos de treino',                      desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'streak_60',     cat:'assiduidade', title:'Fogo Que Não Apaga',      icon:'🌋', desc:'60 dias de streak — quase impossível',                desbloqueado:false, progresso:20,  progressoLabel:'12/60', raridade:'epico'},
  {id:'streak_180',    cat:'assiduidade', title:'Eterno',                  icon:'♾️', desc:'180 dias consecutivos. Você é diferente.',            desbloqueado:false, progresso:7,   progressoLabel:'12/180', raridade:'lendario'},
  {id:'mes_perfeito',  cat:'assiduidade', title:'Mês Inquebrável',         icon:'🔐', desc:'30 dias consecutivos sem falhar um dia de treino',     desbloqueado:false, progresso:40,  progressoLabel:'12/30', raridade:'epico'},
  {id:'2anos',         cat:'assiduidade', title:'O Ferro É Meu Lar',       icon:'🏠', desc:'730 treinos ao longo da vida — isso é estilo de vida', desbloqueado:false, progresso:18,  progressoLabel:'128/730', raridade:'lendario'},
  // ── Volume ────────────────────────────────────────────────
  {id:'vol_5t',        cat:'volume', title:'Primeiros Quilos',     icon:'⚖️', desc:'5 toneladas de volume acumulado',                     desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'vol_50t',       cat:'volume', title:'Carregador',           icon:'🏗️', desc:'50 toneladas — você literalmente move montanhas',    desbloqueado:true,  progresso:100, raridade:'raro'},
  {id:'vol_250t',      cat:'volume', title:'Máquina de Guerra',    icon:'⚙️', desc:'250 toneladas totais',                               desbloqueado:false, progresso:60,  progressoLabel:'150t/250t', raridade:'epico'},
  {id:'vol_1000t',     cat:'volume', title:'Colossus',             icon:'🗿', desc:'1.000 toneladas. Humano? Duvido.',                    desbloqueado:false, progresso:15,  progressoLabel:'150t/1000t', raridade:'lendario'},
  // ── Força ─────────────────────────────────────────────────
  {id:'pr_5',          cat:'forca', title:'Quebrador',             icon:'📍', desc:'5 PRs batidos',                                       desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'pr_25',         cat:'forca', title:'Obliterador',           icon:'💥', desc:'25 PRs ao longo da carreira',                         desbloqueado:true,  progresso:100, raridade:'raro'},
  {id:'pr_100',        cat:'forca', title:'Lenda do Ferro',        icon:'🏅', desc:'100 PRs — apenas os melhores chegam aqui',            desbloqueado:false, progresso:30,  progressoLabel:'30/100', raridade:'epico'},
  {id:'pr_300',        cat:'forca', title:'Imortal',               icon:'🔱', desc:'300 PRs. Você redefiniu seus limites 300 vezes.',      desbloqueado:false, progresso:10,  progressoLabel:'30/300', raridade:'lendario'},
  {id:'ex_15',         cat:'forca', title:'Explorador',            icon:'🗺️', desc:'15 exercícios diferentes treinados',                  desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'ex_40',         cat:'forca', title:'Arsenal Completo',      icon:'🧰', desc:'40 exercícios diferentes — você conhece o ferro',     desbloqueado:false, progresso:62,  progressoLabel:'25/40', raridade:'raro'},
  {id:'ex_80',         cat:'forca', title:'Mestre do Movimento',   icon:'🎯', desc:'80 exercícios únicos treinados',                      desbloqueado:false, progresso:31,  progressoLabel:'25/80', raridade:'epico'},
  // ── Cardio ────────────────────────────────────────────────
  {id:'run_first',     cat:'cardio', title:'Primeira Corrida',     icon:'👟', desc:'Primeira sessão de corrida registrada',               desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'run_10k',       cat:'cardio', title:'DarkRunner',           icon:'🏃', desc:'10 sessões de corrida completadas',                   desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'cardio_20',     cat:'cardio', title:'Pulmão de Aço',        icon:'💨', desc:'20 sessões de cardio registradas',                    desbloqueado:false, progresso:65,  progressoLabel:'13/20', raridade:'raro'},
  {id:'cardio_king',   cat:'cardio', title:'Cardio Intenso',       icon:'❤️‍🔥', desc:'50 sessões de cardio no total',                   desbloqueado:false, progresso:26,  progressoLabel:'13/50', raridade:'epico'},
  {id:'bike_first',    cat:'cardio', title:'DarkBiker',            icon:'🚴', desc:'Primeira sessão de ciclismo registrada',              desbloqueado:false, progresso:0,   raridade:'comum'},
  // ── Squad ─────────────────────────────────────────────────
  {id:'squad_win_1',   cat:'squad', title:'Conquistador',          icon:'🥉', desc:'Vença o ranking do squad 1 vez',                      desbloqueado:true,  progresso:100, raridade:'raro'},
  {id:'squad_win_6',   cat:'squad', title:'Dominador',             icon:'🥈', desc:'Vença o ranking do squad 6 vezes',                    desbloqueado:false, progresso:17,  progressoLabel:'1/6', raridade:'epico'},
  {id:'squad_win_12',  cat:'squad', title:'Rei do Squad',          icon:'🏆', desc:'Vença o ranking do squad 12 vezes',                   desbloqueado:false, progresso:8,   progressoLabel:'1/12', raridade:'lendario'},
  {id:'squad_win_24',  cat:'squad', title:'Lenda do Squad',        icon:'👑', desc:'Vença o ranking do squad 24 vezes',                   desbloqueado:false, progresso:4,   progressoLabel:'1/24', raridade:'lendario'},
  // ── DarkDiet ──────────────────────────────────────────────
  {id:'diet_first',    cat:'darkdiet', title:'Nutrição Ativada',      icon:'🥗', desc:'Primeiro registro de dieta no DarkDiet',            desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'diet_streak',   cat:'darkdiet', title:'Consistência Alimentar', icon:'🔋', desc:'7 dias consecutivos com dieta registrada',         desbloqueado:false, progresso:43,  progressoLabel:'3/7', raridade:'raro'},
  {id:'diet_iron_will',cat:'darkdiet', title:'Vontade de Ferro',       icon:'🥩', desc:'30 dias consecutivos dentro da meta calórica',     desbloqueado:false, progresso:10,  progressoLabel:'3/30', raridade:'epico'},
  {id:'diet_ascetic',  cat:'darkdiet', title:'Asceta da Fome',         icon:'💀', desc:'90 dias de dieta registrada sem interrupção',      desbloqueado:false, progresso:3,   progressoLabel:'3/90', raridade:'lendario'},
  // ── DarkZen ───────────────────────────────────────────────
  {id:'stretch_first', cat:'darkzen', title:'Corpo Preparado',         icon:'🧘', desc:'Primeira sessão de alongamento completa',          desbloqueado:true,  progresso:100, raridade:'comum'},
  {id:'stretch_zen',   cat:'darkzen', title:'Corpo Flexível',          icon:'🌸', desc:'10 sessões de DarkZen completadas',                desbloqueado:false, progresso:40,  progressoLabel:'4/10', raridade:'raro'},
  {id:'stretch_guardian',cat:'darkzen',title:'Guardião da Mobilidade', icon:'🦅', desc:'50 sessões de alongamento — disciplina absoluta',  desbloqueado:false, progresso:8,   progressoLabel:'4/50', raridade:'epico'},
  {id:'stretch_legend',cat:'darkzen', title:'Lenda da Flexibilidade',  icon:'🐉', desc:'100 sessões de alongamento — um entre mil',        desbloqueado:false, progresso:4,   progressoLabel:'4/100', raridade:'lendario'},
  // ── Especial ──────────────────────────────────────────────
  {id:'madrugador',    cat:'especial', title:'Enquanto o Mundo Dorme', icon:'🌅', desc:'5 treinos antes das 7h da manhã',                  desbloqueado:true,  progresso:100, raridade:'epico'},
  {id:'semana_full',   cat:'especial', title:'Semana Perfeita',        icon:'📅', desc:'Treinou todos os dias programados em uma semana',   desbloqueado:true,  progresso:100, raridade:'raro'},
  {id:'elite_badge',   cat:'especial', title:'DarkSet Elite',          icon:'⚡', desc:'Assinante Elite ativo',                            desbloqueado:false, progresso:0,   raridade:'epico'},
  {id:'darkgod_badge', cat:'especial', title:'DarkGod Founder',        icon:'👑', desc:'Fundador do DarkSet — edição limitada',            desbloqueado:false, progresso:0,   raridade:'lendario'},
];

// ── Animação de desbloqueio ───────────────────────────────────────────────
function AnimacaoDesbloqueio({selo, onClose}:{selo:Selo; onClose:()=>void}) {
  const [fase, setFase] = useState(0);
  useEffect(()=>{
    const t1 = setTimeout(()=>setFase(1), 300);
    const t2 = setTimeout(()=>setFase(2), 800);
    const t3 = setTimeout(()=>setFase(3), 1500);
    return ()=>{ clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  },[]);

  const cor = RARIDADE_COR[selo.raridade];

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:200,
      background:'rgba(6,6,8,.96)',
      display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      padding:'2rem',
    }} onClick={onClose}>
      {/* Partículas */}
      {fase>=2 && Array.from({length:16}).map((_,i)=>(
        <div key={i} style={{
          position:'absolute',
          left:`${20+Math.random()*60}%`,
          top:`${20+Math.random()*60}%`,
          width: Math.random()*8+3,
          height: Math.random()*8+3,
          borderRadius:'50%',
          background: [cor,'#e31b23','#facc15','#fff'][i%4],
          opacity: fase>=3?0:0.8,
          transform:`translateY(${fase>=3?-80:0}px) scale(${fase>=3?0:1})`,
          transition:'all 1s ease',
          pointerEvents:'none',
        }}/>
      ))}

      {/* Card do selo */}
      <div style={{
        textAlign:'center',zIndex:1,
        transform: fase>=1?'scale(1)':'scale(0.5)',
        opacity: fase>=1?1:0,
        transition:'all .5s cubic-bezier(.34,1.56,.64,1)',
      }}>
        {/* Anel brilhante */}
        <div style={{
          width:120,height:120,borderRadius:'50%',
          background:`radial-gradient(circle,${RARIDADE_BG[selo.raridade]} 0%,transparent 70%)`,
          border:`2px solid ${cor}`,
          display:'flex',alignItems:'center',justifyContent:'center',
          margin:'0 auto 1.5rem',
          boxShadow:`0 0 40px ${cor}55, 0 0 80px ${cor}22`,
          fontSize:'3.5rem',
          transition:'all .5s',
        }}>
          {selo.icon}
        </div>

        <div style={{
          fontSize:'.7rem',color:cor,textTransform:'uppercase',
          letterSpacing:'.2em',fontWeight:700,marginBottom:'.5rem',
          opacity:fase>=2?1:0,transition:'opacity .4s .3s',
        }}>
          Selo Desbloqueado!
        </div>

        <div style={{
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
          fontSize:'2.2rem',textTransform:'uppercase',color:'#fff',
          lineHeight:1,marginBottom:'.5rem',letterSpacing:'.04em',
          opacity:fase>=2?1:0,transition:'opacity .4s .4s',
        }}>{selo.title}</div>

        <div style={{
          fontSize:'.85rem',color:'#9898a8',maxWidth:260,
          lineHeight:1.5,marginBottom:'2rem',
          opacity:fase>=2?1:0,transition:'opacity .4s .5s',
        }}>{selo.desc}</div>

        <div style={{
          display:'inline-flex',alignItems:'center',gap:'.4rem',
          background:`${cor}22`,border:`1px solid ${cor}55`,
          borderRadius:'999px',padding:'.4rem 1rem',
          fontSize:'.72rem',fontWeight:700,color:cor,
          textTransform:'uppercase',letterSpacing:'.08em',
          opacity:fase>=3?1:0,transition:'opacity .4s .6s',
        }}>
          {selo.raridade}
        </div>

        <div style={{
          marginTop:'2rem',fontSize:'.72rem',color:'#323240',
          opacity:fase>=3?1:0,transition:'opacity .4s .8s',
        }}>Toque para fechar</div>
      </div>
    </div>
  );
}

// ── Card do selo ──────────────────────────────────────────────────────────
function SeloCard({selo, onClick}:{selo:Selo; onClick:()=>void}) {
  const cor = RARIDADE_COR[selo.raridade];
  const bg  = RARIDADE_BG[selo.raridade];

  return (
    <button onClick={onClick} style={{
      background: selo.desbloqueado ? bg : 'rgba(255,255,255,.03)',
      border: `1px solid ${selo.desbloqueado ? cor+'55' : '#202028'}`,
      borderRadius:'14px',padding:'1rem',
      textAlign:'left',cursor:'pointer',
      position:'relative',overflow:'hidden',
      transition:'all .15s',
      opacity: selo.desbloqueado ? 1 : 0.6,
    }}>
      {/* Brilho no topo */}
      {selo.desbloqueado && (
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${cor}55,transparent)`,pointerEvents:'none'}}/>
      )}

      {/* Ícone */}
      <div style={{
        width:48,height:48,borderRadius:'12px',
        background: selo.desbloqueado ? `${cor}22` : 'rgba(255,255,255,.06)',
        border: `1px solid ${selo.desbloqueado ? cor+'44' : '#202028'}`,
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:'1.5rem',marginBottom:'.65rem',
        filter: selo.desbloqueado ? 'none' : 'grayscale(1)',
      }}>
        {selo.desbloqueado ? selo.icon : '🔒'}
      </div>

      {/* Raridade badge */}
      <div style={{
        position:'absolute',top:'.6rem',right:'.6rem',
        fontSize:'.52rem',fontWeight:700,
        padding:'.15rem .45rem',borderRadius:'999px',
        background:`${cor}22`,color:cor,
        textTransform:'uppercase',letterSpacing:'.06em',
        border:`1px solid ${cor}33`,
      }}>{selo.raridade}</div>

      {/* Título */}
      <div style={{
        fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
        fontSize:'.95rem',textTransform:'uppercase',
        color: selo.desbloqueado ? '#f0f0f2' : '#5a5a6a',
        lineHeight:1,marginBottom:'.3rem',
        letterSpacing:'.03em',
      }}>{selo.title}</div>

      {/* Descrição */}
      <div style={{fontSize:'.65rem',color:'#5a5a6a',lineHeight:1.4,marginBottom:'.6rem'}}>{selo.desc}</div>

      {/* Barra de progresso */}
      {!selo.desbloqueado && selo.progresso !== undefined && (
        <div>
          <div style={{background:'#16161c',borderRadius:'3px',height:'3px',marginBottom:'3px'}}>
            <div style={{height:'100%',borderRadius:'3px',background:cor,width:`${selo.progresso}%`,boxShadow:`0 0 6px ${cor}66`}}/>
          </div>
          <div style={{fontSize:'.55rem',color:'#323240'}}>{selo.progressoLabel||`${selo.progresso}%`}</div>
        </div>
      )}

      {/* Check desbloqueado */}
      {selo.desbloqueado && (
        <div style={{fontSize:'.65rem',color:cor,fontWeight:700}}>✓ Desbloqueado</div>
      )}
    </button>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function DarkSelosPage() {
  const [catSel, setCatSel]       = useState('todos');
  const [animSelo, setAnimSelo]   = useState<Selo|null>(null);
  const [detalhe, setDetalhe]     = useState<Selo|null>(null);
  const [busca, setBusca]         = useState('');

  const total        = SELOS_DATA.length;
  const desbloqueados= SELOS_DATA.filter(s=>s.desbloqueado).length;
  const pct          = Math.round((desbloqueados/total)*100);

  const selosFiltrados = SELOS_DATA.filter(s=>{
    const catOk  = catSel==='todos' || s.cat===catSel;
    const buscaOk= !busca || s.title.toLowerCase().includes(busca.toLowerCase()) || s.desc.toLowerCase().includes(busca.toLowerCase());
    return catOk && buscaOk;
  });

  // Ordena: desbloqueados primeiro, depois por progresso
  const selosOrdenados = [...selosFiltrados].sort((a,b)=>{
    if(a.desbloqueado && !b.desbloqueado) return -1;
    if(!a.desbloqueado && b.desbloqueado) return 1;
    return (b.progresso||0) - (a.progresso||0);
  });

  const handleClick = (selo:Selo) => {
    if(selo.desbloqueado) setAnimSelo(selo);
    else setDetalhe(selo);
  };

  return (
    <>
      {animSelo && <AnimacaoDesbloqueio selo={animSelo} onClose={()=>setAnimSelo(null)}/>}

      {/* Modal detalhe (bloqueado) */}
      {detalhe && (
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end'}} onClick={()=>setDetalhe(null)}>
          <div style={{background:'#0e0e11',borderTop:'1px solid #202028',borderRadius:'20px 20px 0 0',width:'100%',padding:'1.5rem'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1rem'}}>
              <div style={{width:56,height:56,borderRadius:'14px',background:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.8rem',filter:'grayscale(1)'}}>🔒</div>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{detalhe.title}</div>
                <div style={{fontSize:'.65rem',color:RARIDADE_COR[detalhe.raridade],fontWeight:700,marginTop:'2px',textTransform:'uppercase',letterSpacing:'.06em'}}>{detalhe.raridade}</div>
              </div>
            </div>
            <div style={{fontSize:'.85rem',color:'#9898a8',lineHeight:1.5,marginBottom:'1rem'}}>{detalhe.desc}</div>
            {detalhe.progresso !== undefined && detalhe.progresso > 0 && (
              <div style={{marginBottom:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'.65rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.07em'}}>Progresso</span>
                  <span style={{fontSize:'.65rem',color:RARIDADE_COR[detalhe.raridade],fontWeight:700}}>{detalhe.progressoLabel||`${detalhe.progresso}%`}</span>
                </div>
                <div style={{background:'#16161c',borderRadius:'4px',height:'6px'}}>
                  <div style={{height:'100%',borderRadius:'4px',background:RARIDADE_COR[detalhe.raridade],width:`${detalhe.progresso}%`,boxShadow:`0 0 10px ${RARIDADE_COR[detalhe.raridade]}66`}}/>
                </div>
              </div>
            )}
            <button onClick={()=>setDetalhe(null)} style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'12px',padding:'12px',color:'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer'}}>Fechar</button>
          </div>
        </div>
      )}

      <PageShell>
        {/* Header */}
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
            DARK<span style={{color:'#facc15'}}>SELOS</span>
          </div>
          <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'3px',letterSpacing:'.06em'}}>Suas conquistas</div>
        </div>

        {/* Progresso geral */}
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'16px',padding:'1.1rem',marginBottom:'1.25rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'.75rem'}}>
            <div>
              <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'2px'}}>Progresso geral</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',color:'#facc15',lineHeight:1}}>
                {desbloqueados}<span style={{fontSize:'1rem',color:'#5a5a6a',marginLeft:'4px'}}>/ {total}</span>
              </div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',color:'#facc15'}}>{pct}%</div>
          </div>
          <div style={{background:'#16161c',borderRadius:'4px',height:'6px',marginBottom:'.75rem'}}>
            <div style={{height:'100%',borderRadius:'4px',background:'linear-gradient(90deg,#facc15,#f59e0b)',width:`${pct}%`,transition:'width .6s',boxShadow:'0 0 12px rgba(250,204,21,.4)'}}/>
          </div>
          {/* Contagem por raridade */}
          <div style={{display:'flex',gap:'.5rem'}}>
            {(['comum','raro','epico','lendario'] as const).map(r=>{
              const count = SELOS_DATA.filter(s=>s.raridade===r&&s.desbloqueado).length;
              const total = SELOS_DATA.filter(s=>s.raridade===r).length;
              return(
                <div key={r} style={{flex:1,textAlign:'center',background:RARIDADE_BG[r],border:`1px solid ${RARIDADE_COR[r]}33`,borderRadius:'8px',padding:'.4rem .2rem'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',color:RARIDADE_COR[r],lineHeight:1}}>{count}</div>
                  <div style={{fontSize:'.48rem',color:RARIDADE_COR[r],textTransform:'uppercase',letterSpacing:'.05em',marginTop:'2px',opacity:.7}}>{r}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Busca */}
        <input value={busca} onChange={e=>setBusca(e.target.value)}
          placeholder="Buscar selo..."
          style={{width:'100%',background:'#0e0e11',border:'1px solid #202028',borderRadius:'10px',color:'#eaeaea',padding:'9px 13px',fontSize:'.88rem',outline:'none',marginBottom:'.75rem'}}/>

        {/* Filtro categorias */}
        <div style={{display:'flex',gap:'.35rem',overflowX:'auto',paddingBottom:'.35rem',marginBottom:'1rem'}}>
          {CATS.map(c=>(
            <button key={c.id} onClick={()=>setCatSel(c.id)} style={{
              flexShrink:0,padding:'.38rem .75rem',borderRadius:'999px',cursor:'pointer',
              background:catSel===c.id?'rgba(250,204,21,.15)':'rgba(255,255,255,.04)',
              border:`1px solid ${catSel===c.id?'rgba(250,204,21,.45)':'#202028'}`,
              color:catSel===c.id?'#facc15':'#9898a8',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.75rem',
              display:'flex',alignItems:'center',gap:'.3rem',
            }}>
              <span>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>

        {/* Contagem filtrada */}
        <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>
          {selosOrdenados.filter(s=>s.desbloqueado).length} desbloqueados de {selosOrdenados.length}
        </div>

        {/* Grade de selos */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem'}}>
          {selosOrdenados.map(s=>(
            <SeloCard key={s.id} selo={s} onClick={()=>handleClick(s)}/>
          ))}
        </div>

        <div style={{fontSize:'.62rem',color:'#323240',textAlign:'center',marginTop:'1rem'}}>
          Toque em um selo desbloqueado para ver a animação ✨
        </div>
      </PageShell>
    </>
  );
}
