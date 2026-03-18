'use client';
import { useState } from 'react';
import PageShell from '@/components/layout/PageShell';

const EXERCICIOS = [
  {nome:'Supino Reto',       grupo:'Peito',    equip:'Barra'},
  {nome:'Supino Inclinado',  grupo:'Peito',    equip:'Barra'},
  {nome:'Crucifixo',         grupo:'Peito',    equip:'Halteres'},
  {nome:'Peck Deck',         grupo:'Peito',    equip:'Máquina'},
  {nome:'Puxada Frontal',    grupo:'Costas',   equip:'Cabo'},
  {nome:'Remada Curvada',    grupo:'Costas',   equip:'Barra'},
  {nome:'Remada Unilateral', grupo:'Costas',   equip:'Halteres'},
  {nome:'Barra Fixa',        grupo:'Costas',   equip:'Barra'},
  {nome:'Desenvolvimento',   grupo:'Ombro',    equip:'Barra'},
  {nome:'Elevação Lateral',  grupo:'Ombro',    equip:'Halteres'},
  {nome:'Rosca Direta',      grupo:'Bíceps',   equip:'Barra'},
  {nome:'Rosca Alternada',   grupo:'Bíceps',   equip:'Halteres'},
  {nome:'Tríceps Pulley',    grupo:'Tríceps',  equip:'Cabo'},
  {nome:'Tríceps Testa',     grupo:'Tríceps',  equip:'Barra'},
  {nome:'Agachamento',       grupo:'Pernas',   equip:'Barra'},
  {nome:'Leg Press',         grupo:'Pernas',   equip:'Máquina'},
  {nome:'Cadeira Extensora', grupo:'Pernas',   equip:'Máquina'},
  {nome:'Cadeira Flexora',   grupo:'Pernas',   equip:'Máquina'},
  {nome:'Stiff',             grupo:'Pernas',   equip:'Barra'},
  {nome:'Hip Thrust',        grupo:'Glúteos',  equip:'Barra'},
  {nome:'Abdominal Crunch',  grupo:'Abdômen',  equip:'Peso Corpo'},
  {nome:'Prancha',           grupo:'Abdômen',  equip:'Peso Corpo'},
];

const DIAS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const GRUPOS = Array.from(new Set(EXERCICIOS.map(e=>e.grupo)));

type ExFicha = {nome:string; series:number; reps:string};
type Ficha = {id:string; nome:string; byDay:Record<string,ExFicha[]>};
type Aluno = {id:string; nome:string; avatar:string; ultimoTreino:string; fichas:Ficha[]};

const ALUNOS_MOCK: Aluno[] = [
  {id:'1', nome:'Lucas Ferreira',  avatar:'🔥', ultimoTreino:'Hoje',    fichas:[{id:'f1',nome:'Treino A — Peito',byDay:{Segunda:[{nome:'Supino Reto',series:4,reps:'8-12'},{nome:'Crucifixo',series:3,reps:'12'}],Quarta:[],Sexta:[]}}]},
  {id:'2', nome:'Ana Paula',       avatar:'⚡', ultimoTreino:'Ontem',   fichas:[]},
  {id:'3', nome:'Gabriel Souza',   avatar:'🏋️', ultimoTreino:'3d atrás', fichas:[]},
];

type Tab = 'alunos'|'fichas'|'graficos';

export default function PersonalPage() {
  const [unlocked, setUnlocked]     = useState(false);
  const [pin, setPin]               = useState('');
  const [pinSalvo, setPinSalvo]     = useState('');
  const [cref, setCref]             = useState('');
  const [crefSalvo, setCrefSalvo]   = useState('');
  const [step, setStep]             = useState<'pin'|'cref'|'ok'>('pin');
  const [erro, setErro]             = useState('');
  const [tab, setTab]               = useState<Tab>('alunos');
  const [alunos, setAlunos]         = useState<Aluno[]>(ALUNOS_MOCK);
  const [alunoSel, setAlunoSel]     = useState<Aluno|null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  // Ficha builder
  const [nomeAluno, setNomeAluno]   = useState('');
  const [nomeFicha, setNomeFicha]   = useState('');
  const [diaAtivo, setDiaAtivo]     = useState('Segunda');
  const [byDay, setByDay]           = useState<Record<string,ExFicha[]>>(
    Object.fromEntries(DIAS.map(d=>[d,[]]))
  );
  const [busca, setBusca]           = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [fichaView, setFichaView]   = useState<'builder'|'lista'>('lista');

  const validarCref = (v:string) => /^\d{6}-[GPTR]\/[A-Z]{2}$/.test(v.trim().toUpperCase());

  const entrarPin = () => {
    if(!pin.trim()) { setErro('Digite seu PIN'); return; }
    if(pinSalvo && pin !== pinSalvo) { setErro('PIN incorreto'); return; }
    if(!pinSalvo) setPinSalvo(pin);
    setErro(''); setPin('');
    if(!crefSalvo) setStep('cref'); else { setStep('ok'); setUnlocked(true); }
  };

  const salvarCref = () => {
    const v = cref.trim().toUpperCase();
    if(!validarCref(v)) { setErro('Formato inválido. Ex: 123456-G/SP'); return; }
    setCrefSalvo(v); setErro(''); setStep('ok'); setUnlocked(true);
  };

  const gerarConvite = () => {
    const code = 'PT-' + Math.random().toString(36).slice(2,7).toUpperCase();
    setInviteCode(code); setShowInvite(true);
  };

  const addEx = (exNome:string) => {
    setByDay(prev=>{
      const d = {...prev};
      if(!d[diaAtivo].find(e=>e.nome===exNome))
        d[diaAtivo] = [...d[diaAtivo], {nome:exNome, series:3, reps:'10-12'}];
      return d;
    });
  };

  const removeEx = (idx:number) => {
    setByDay(prev=>({...prev,[diaAtivo]:prev[diaAtivo].filter((_,i)=>i!==idx)}));
  };

  const salvarFicha = () => {
    if(!nomeAluno) { setErro('Selecione um aluno'); return; }
    if(!nomeFicha.trim()) { setErro('Dê um nome à ficha'); return; }
    const totalEx = Object.values(byDay).flat().length;
    if(totalEx===0) { setErro('Adicione ao menos um exercício'); return; }
    const ficha:Ficha = {id:'f'+Date.now(), nome:nomeFicha, byDay};
    setAlunos(prev=>prev.map(a=>a.id===nomeAluno?{...a,fichas:[...a.fichas,ficha]}:a));
    setNomeFicha(''); setByDay(Object.fromEntries(DIAS.map(d=>[d,[]]))); setFichaView('lista'); setErro('');
  };

  const exFiltrados = EXERCICIOS.filter(e=>
    e.nome.toLowerCase().includes(busca.toLowerCase()) &&
    (!grupoFiltro || e.grupo===grupoFiltro)
  );

  // ── LOGIN PIN ──────────────────────────────────────────────────────────
  if(!unlocked) return (
    <PageShell>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',padding:'1.5rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#fff',lineHeight:1,marginBottom:'.25rem',textAlign:'center'}}>
          DARK<span style={{color:'#e31b23'}}>SET</span>
        </div>
        <div style={{fontSize:'.65rem',color:'#5a5a6a',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'2rem',textAlign:'center'}}>Modo Personal Trainer</div>

        <div style={{width:'100%',maxWidth:320,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'16px',padding:'1.75rem'}}>
          {step==='pin' && (
            <>
              <div style={{fontSize:'.78rem',color:'#9898a8',textAlign:'center',lineHeight:1.5,marginBottom:'1rem'}}>
                {pinSalvo ? 'Digite seu PIN para acessar o modo Personal' : 'Crie um PIN de acesso para o modo Personal'}
              </div>
              <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setErro('');}}
                onKeyDown={e=>e.key==='Enter'&&entrarPin()}
                placeholder={pinSalvo?'PIN':'Criar PIN (mín. 4 caracteres)'}
                style={{width:'100%',background:'rgba(0,0,0,.35)',border:`1px solid ${erro?'#e31b23':'rgba(255,255,255,.08)'}`,borderRadius:'10px',padding:'.8rem',color:'#fff',fontSize:'1rem',textAlign:'center',outline:'none',marginBottom:'.7rem'}}/>
              {erro&&<div style={{fontSize:'.75rem',color:'#e31b23',textAlign:'center',background:'rgba(227,27,35,.08)',borderRadius:'8px',padding:'.4rem .6rem',marginBottom:'.7rem'}}>{erro}</div>}
              <button onClick={entrarPin} style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'.8rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.95rem',textTransform:'uppercase',letterSpacing:'.06em',cursor:'pointer'}}>
                {pinSalvo?'Entrar':'Criar PIN'}
              </button>
            </>
          )}
          {step==='cref' && (
            <>
              <div style={{textAlign:'center',marginBottom:'.75rem'}}>
                <div style={{fontSize:'1.6rem',marginBottom:'.3rem'}}>🪪</div>
                <div style={{fontWeight:700,fontSize:'1rem',color:'#f0f0f2',marginBottom:'.3rem'}}>Registro CREF</div>
                <div style={{fontSize:'.72rem',color:'#9898a8',lineHeight:1.5,marginBottom:'.75rem'}}>Digite seu número de registro no Conselho Regional de Educação Física</div>
              </div>
              <div style={{background:'rgba(0,0,0,.25)',borderRadius:'8px',padding:'.5rem .85rem',textAlign:'center',marginBottom:'.7rem'}}>
                <div style={{fontFamily:'monospace',fontSize:'.9rem',color:'#555',marginBottom:'.1rem'}}>123456-G/SP</div>
                <div style={{fontSize:'.62rem',color:'#333'}}>G=Graduado · P=Especialista · T=Mestre · R=Doutor</div>
              </div>
              <input type="text" value={cref} onChange={e=>{setCref(e.target.value.toUpperCase());setErro('');}}
                onKeyDown={e=>e.key==='Enter'&&salvarCref()}
                placeholder="000000-G/UF" maxLength={11}
                style={{width:'100%',background:'rgba(0,0,0,.35)',border:`1px solid ${erro?'#e31b23':'rgba(255,255,255,.08)'}`,borderRadius:'10px',padding:'.8rem',color:'#fff',fontSize:'1rem',textAlign:'center',outline:'none',letterSpacing:'.12em',fontFamily:'monospace',marginBottom:'.7rem'}}/>
              {erro&&<div style={{fontSize:'.75rem',color:'#e31b23',textAlign:'center',background:'rgba(227,27,35,.08)',borderRadius:'8px',padding:'.4rem .6rem',marginBottom:'.7rem'}}>{erro}</div>}
              <button onClick={salvarCref} style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'.8rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.95rem',textTransform:'uppercase',letterSpacing:'.06em',cursor:'pointer'}}>
                Ativar Modo Personal
              </button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );

  // ── DETALHE DO ALUNO ──────────────────────────────────────────────────
  if(alunoSel) return (
    <PageShell>
      <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
        <button onClick={()=>setAlunoSel(null)} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.4rem .8rem',color:'#9898a8',fontSize:'.8rem',fontWeight:700,cursor:'pointer'}}>← Voltar</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{alunoSel.nome}</div>
          <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>Último treino: {alunoSel.ultimoTreino}</div>
        </div>
      </div>

      <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.6rem'}}>Fichas enviadas</div>
      {alunoSel.fichas.length===0 ? (
        <div style={{textAlign:'center',padding:'2rem',border:'1px dashed #202028',borderRadius:'12px'}}>
          <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>📋</div>
          <div style={{fontSize:'.85rem',color:'#5a5a6a'}}>Nenhuma ficha enviada ainda</div>
        </div>
      ) : (
        <div style={{display:'grid',gap:'.6rem'}}>
          {alunoSel.fichas.map(f=>(
            <div key={f.id} style={{background:'#0e0e11',border:'1px solid #202028',borderLeft:'2px solid #e31b23',borderRadius:'12px',padding:'.9rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{f.nome}</div>
                <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>{Object.values(f.byDay).flat().length} exercícios</div>
              </div>
              <button onClick={()=>setAlunos(prev=>prev.map(a=>a.id===alunoSel.id?{...a,fichas:a.fichas.filter(x=>x.id!==f.id)}:a))}
                style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'8px',padding:'.35rem .6rem',color:'#e31b23',fontSize:'.8rem',cursor:'pointer'}}>✕</button>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );

  // ── PAINEL PRINCIPAL ───────────────────────────────────────────────────
  const TABS: {id:Tab; label:string}[] = [
    {id:'alunos', label:'👥 Alunos'},
    {id:'fichas', label:'📋 Fichas'},
    {id:'graficos',label:'📊 Gráficos'},
  ];

  return (
    <PageShell>
      {/* Modal código convite */}
      {showInvite && (
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
          <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'20px',padding:'1.5rem',width:'100%',maxWidth:340,textAlign:'center'}}>
            <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>🔗</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.25rem'}}>Código de Convite</div>
            <div style={{fontSize:'.75rem',color:'#9898a8',marginBottom:'1rem'}}>Válido por 7 dias · compartilhe com seu aluno</div>
            <div style={{fontFamily:'monospace',fontWeight:900,fontSize:'2rem',letterSpacing:'.2em',color:'#e31b23',background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>{inviteCode}</div>
            <div style={{display:'flex',gap:'.5rem'}}>
              <button onClick={()=>{navigator.clipboard?.writeText('Código DarkSet Personal: '+inviteCode);}} style={{flex:1,background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:'10px',padding:'10px',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer'}}>Copiar</button>
              <button onClick={()=>setShowInvite(false)} style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'10px',color:'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer'}}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header Personal */}
      <div style={{background:'linear-gradient(135deg,rgba(227,27,35,.1),rgba(227,27,35,.03))',border:'1px solid rgba(227,27,35,.18)',borderRadius:'16px',padding:'1rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.85rem'}}>
        <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#e31b23,#8b0000)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}>👨‍💼</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',letterSpacing:'.04em'}}>Modo Personal</div>
          {crefSalvo&&<div style={{fontSize:'.72rem',color:'#e31b23',fontWeight:700,marginTop:'1px'}}>CREF {crefSalvo}</div>}
          <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'1px'}}>{alunos.length}/20 alunos</div>
        </div>
        <button onClick={()=>setUnlocked(false)} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.18)',borderRadius:'8px',padding:'.35rem .7rem',color:'#e31b23',fontSize:'.72rem',fontWeight:700,cursor:'pointer'}}>Sair</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #202028',borderRadius:'12px',padding:'3px',gap:'3px',marginBottom:'1rem'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'.46rem .25rem',borderRadius:'9px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.75rem',letterSpacing:'.04em',textTransform:'uppercase',background:tab===t.id?'rgba(227,27,35,.15)':'transparent',color:tab===t.id?'#e31b23':'#5a5a6a',boxShadow:tab===t.id?'inset 0 0 0 1px rgba(227,27,35,.3)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ABA ALUNOS */}
      {tab==='alunos'&&(
        <div>
          <div style={{marginBottom:'1rem'}}>
            {alunos.length<20 ? (
              <button onClick={gerarConvite} style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'12px',padding:'.75rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.92rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.28)'}}>
                + Gerar Código de Convite
              </button>
            ) : (
              <div style={{textAlign:'center',padding:'.75rem',background:'rgba(255,255,255,.04)',borderRadius:'12px',fontSize:'.8rem',color:'#5a5a6a'}}>Limite de 20 alunos atingido</div>
            )}
          </div>

          <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.6rem'}}>Seus Alunos</div>
          {alunos.length===0 ? (
            <div style={{textAlign:'center',padding:'2.5rem',border:'1px dashed #202028',borderRadius:'12px'}}>
              <div style={{fontSize:'2.5rem',marginBottom:'.6rem'}}>👥</div>
              <div style={{fontSize:'.85rem',color:'#5a5a6a',fontWeight:600}}>Nenhum aluno ainda</div>
              <div style={{fontSize:'.75rem',color:'#323240',marginTop:'.3rem'}}>Gere um código e compartilhe</div>
            </div>
          ) : (
            <div style={{display:'grid',gap:'.5rem'}}>
              {alunos.map(a=>(
                <div key={a.id} style={{background:'rgba(255,255,255,.02)',border:'1px solid #131313',borderRadius:'12px',padding:'.85rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0}}>{a.avatar}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'.9rem',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.nome}</div>
                    <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'1px'}}>Último: {a.ultimoTreino} · {a.fichas.length} fichas</div>
                  </div>
                  <div style={{display:'flex',gap:'.35rem',flexShrink:0}}>
                    <button onClick={()=>setAlunoSel(a)} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.35rem .65rem',color:'#9898a8',fontSize:'.75rem',fontWeight:700,cursor:'pointer'}}>Ver</button>
                    <button onClick={()=>setAlunos(prev=>prev.filter(x=>x.id!==a.id))} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'8px',padding:'.35rem .55rem',color:'#e31b23',fontSize:'.75rem',cursor:'pointer'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA FICHAS */}
      {tab==='fichas'&&(
        <div>
          <div style={{display:'flex',gap:'.4rem',marginBottom:'1rem'}}>
            {(['lista','builder'] as const).map(v=>(
              <button key={v} onClick={()=>setFichaView(v)} style={{flex:1,background:fichaView===v?'rgba(227,27,35,.15)':'rgba(255,255,255,.04)',border:`1px solid ${fichaView===v?'rgba(227,27,35,.3)':'#202028'}`,borderRadius:'10px',padding:'.55rem',color:fichaView===v?'#e31b23':'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer'}}>
                {v==='lista'?'📋 Fichas Enviadas':'➕ Nova Ficha'}
              </button>
            ))}
          </div>

          {fichaView==='lista' ? (
            <div style={{display:'grid',gap:'.5rem'}}>
              {alunos.flatMap(a=>a.fichas.map(f=>({...f,alunoNome:a.nome,alunoId:a.id}))).length===0 ? (
                <div style={{textAlign:'center',padding:'2rem',border:'1px dashed #202028',borderRadius:'12px'}}>
                  <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>📋</div>
                  <div style={{fontSize:'.85rem',color:'#5a5a6a'}}>Nenhuma ficha criada ainda</div>
                </div>
              ) : alunos.flatMap(a=>a.fichas.map(f=>({...f,alunoNome:a.nome,alunoId:a.id}))).map(f=>(
                <div key={f.id} style={{background:'#0e0e11',border:'1px solid #202028',borderLeft:'2px solid #e31b23',borderRadius:'12px',padding:'.9rem 1rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{f.nome}</div>
                      <div style={{fontSize:'.65rem',color:'#e31b23',fontWeight:700,marginTop:'2px'}}>👤 {f.alunoNome}</div>
                      <div style={{fontSize:'.62rem',color:'#5a5a6a',marginTop:'1px'}}>{Object.values(f.byDay).flat().length} exercícios</div>
                    </div>
                    <button onClick={()=>setAlunos(prev=>prev.map(a=>a.id===f.alunoId?{...a,fichas:a.fichas.filter(x=>x.id!==f.id)}:a))}
                      style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'8px',padding:'.35rem .6rem',color:'#e31b23',fontSize:'.8rem',cursor:'pointer'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{display:'grid',gap:'.75rem'}}>
              {/* Selecionar aluno */}
              <div>
                <label style={{fontSize:'.65rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:'5px'}}>Aluno</label>
                <select value={nomeAluno} onChange={e=>setNomeAluno(e.target.value)}
                  style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'10px',color:nomeAluno?'#eaeaea':'#5a5a6a',padding:'10px 13px',fontSize:'.9rem',outline:'none'}}>
                  <option value="">Selecione um aluno...</option>
                  {alunos.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              {/* Nome da ficha */}
              <div>
                <label style={{fontSize:'.65rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:'5px'}}>Nome da ficha</label>
                <input value={nomeFicha} onChange={e=>setNomeFicha(e.target.value)}
                  placeholder="Ex: Treino A — Peito e Tríceps"
                  style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'10px',color:'#eaeaea',padding:'10px 13px',fontSize:'.9rem',outline:'none'}}/>
              </div>

              {/* Seletor de dia */}
              <div>
                <label style={{fontSize:'.65rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:'5px'}}>Dia da semana</label>
                <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap'}}>
                  {DIAS.map(d=>(
                    <button key={d} onClick={()=>setDiaAtivo(d)} style={{padding:'.32rem .65rem',borderRadius:'8px',cursor:'pointer',border:`1px solid ${diaAtivo===d?'rgba(227,27,35,.4)':'#202028'}`,background:diaAtivo===d?'rgba(227,27,35,.15)':'rgba(255,255,255,.04)',color:diaAtivo===d?'#e31b23':'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.75rem'}}>
                      {d.slice(0,3)} {byDay[d].length>0&&`(${byDay[d].length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercícios do dia */}
              {byDay[diaAtivo].length>0&&(
                <div style={{background:'rgba(227,27,35,.05)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'12px',padding:'.85rem'}}>
                  <div style={{fontSize:'.62rem',color:'#e31b23',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.5rem'}}>Exercícios — {diaAtivo}</div>
                  {byDay[diaAtivo].map((ex,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.4rem'}}>
                      <span style={{flex:1,fontSize:'.85rem',color:'#f0f0f2'}}>{ex.nome}</span>
                      <input type="number" value={ex.series} onChange={e=>setByDay(prev=>({...prev,[diaAtivo]:prev[diaAtivo].map((x,j)=>j===i?{...x,series:parseInt(e.target.value)||3}:x)}))}
                        style={{width:38,background:'#111115',border:'1px solid #222227',borderRadius:'6px',color:'#fff',padding:'4px',fontSize:'.78rem',textAlign:'center',outline:'none'}}/>
                      <span style={{fontSize:'.62rem',color:'#5a5a6a'}}>x</span>
                      <input type="text" value={ex.reps} onChange={e=>setByDay(prev=>({...prev,[diaAtivo]:prev[diaAtivo].map((x,j)=>j===i?{...x,reps:e.target.value}:x)}))}
                        style={{width:48,background:'#111115',border:'1px solid #222227',borderRadius:'6px',color:'#fff',padding:'4px',fontSize:'.78rem',textAlign:'center',outline:'none'}}/>
                      <button onClick={()=>removeEx(i)} style={{background:'none',border:'none',color:'#323240',cursor:'pointer',fontSize:'1rem'}}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Busca exercício */}
              <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.85rem'}}>
                <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.5rem'}}>Adicionar exercício</div>
                <input value={busca} onChange={e=>setBusca(e.target.value)}
                  placeholder="Buscar..."
                  style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'8px',color:'#eaeaea',padding:'8px 12px',fontSize:'.88rem',outline:'none',marginBottom:'.5rem'}}/>
                <div style={{display:'flex',gap:'.3rem',overflowX:'auto',paddingBottom:'.25rem',marginBottom:'.5rem'}}>
                  <button onClick={()=>setGrupoFiltro('')} style={{flexShrink:0,padding:'.28rem .65rem',borderRadius:'999px',cursor:'pointer',border:`1px solid ${!grupoFiltro?'rgba(227,27,35,.4)':'#202028'}`,background:!grupoFiltro?'rgba(227,27,35,.15)':'transparent',color:!grupoFiltro?'#e31b23':'#9898a8',fontSize:'.7rem',fontWeight:700}}>Todos</button>
                  {GRUPOS.map(g=>(
                    <button key={g} onClick={()=>setGrupoFiltro(g===grupoFiltro?'':g)} style={{flexShrink:0,padding:'.28rem .65rem',borderRadius:'999px',cursor:'pointer',border:`1px solid ${grupoFiltro===g?'rgba(227,27,35,.4)':'#202028'}`,background:grupoFiltro===g?'rgba(227,27,35,.15)':'transparent',color:grupoFiltro===g?'#e31b23':'#9898a8',fontSize:'.7rem',fontWeight:700}}>{g}</button>
                  ))}
                </div>
                <div style={{maxHeight:200,overflowY:'auto',display:'grid',gap:'.3rem'}}>
                  {exFiltrados.map((ex,i)=>(
                    <button key={i} onClick={()=>addEx(ex.nome)} style={{background:byDay[diaAtivo].find(e=>e.nome===ex.nome)?'rgba(34,197,94,.06)':'rgba(255,255,255,.03)',border:`1px solid ${byDay[diaAtivo].find(e=>e.nome===ex.nome)?'rgba(34,197,94,.2)':'#202028'}`,borderRadius:'8px',padding:'.55rem .85rem',textAlign:'left',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'.85rem',color:'#f0f0f2'}}>{ex.nome}</span>
                      <span style={{fontSize:'.62rem',color:'#5a5a6a'}}>{ex.grupo}</span>
                    </button>
                  ))}
                </div>
              </div>

              {erro&&<div style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:'8px',padding:'9px 12px',fontSize:'.78rem',color:'#f87171'}}>{erro}</div>}

              <button onClick={salvarFicha} style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'12px',padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.3)'}}>
                Enviar Ficha para Aluno ✓
              </button>
            </div>
          )}
        </div>
      )}

      {/* ABA GRÁFICOS */}
      {tab==='graficos'&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'40vh',textAlign:'center',gap:'1rem'}}>
          <div style={{fontSize:'3rem'}}>📊</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2'}}>Gráficos do Aluno</div>
          <div style={{fontSize:'.82rem',color:'#5a5a6a',maxWidth:260}}>Selecione um aluno na aba Alunos para ver seus gráficos de evolução</div>
          <button onClick={()=>setTab('alunos')} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'.6rem 1.5rem',color:'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer'}}>Ver Alunos</button>
        </div>
      )}
    </PageShell>
  );
}
