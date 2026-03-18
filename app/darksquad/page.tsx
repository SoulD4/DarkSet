'use client';
import { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/layout/PageShell';

const SQUAD_MOCK = {
  id: 'squad_001',
  nome: 'Dark Warriors',
  tag: '#DARKWAR',
  descricao: 'Treinamos juntos, evoluímos juntos.',
  membros: 8,
  maxMembros: 20,
  dono: 'Ryan',
  codigo: 'DWAR2026',
};

const MEMBROS_MOCK = [
  {id:'1', nome:'Ryan',      avatar:'💪', treinos:18, checkinHoje:true,  ultimo:'Hoje'},
  {id:'2', nome:'Lucas',     avatar:'🔥', treinos:15, checkinHoje:true,  ultimo:'Hoje'},
  {id:'3', nome:'Fernanda',  avatar:'⚡', treinos:14, checkinHoje:false, ultimo:'Ontem'},
  {id:'4', nome:'Gabriel',   avatar:'🏋️', treinos:12, checkinHoje:true,  ultimo:'Hoje'},
  {id:'5', nome:'Ana Paula', avatar:'🧘', treinos:11, checkinHoje:false, ultimo:'2d atrás'},
  {id:'6', nome:'Marcos',    avatar:'🦁', treinos:9,  checkinHoje:false, ultimo:'3d atrás'},
  {id:'7', nome:'Julia',     avatar:'🌟', treinos:8,  checkinHoje:true,  ultimo:'Hoje'},
  {id:'8', nome:'Pedro',     avatar:'🎯', treinos:6,  checkinHoje:false, ultimo:'5d atrás'},
];

const FEED_MOCK = [
  {id:'1', membro:'Ryan',     avatar:'💪', acao:'fez check-in',     detalhe:'Treino A — Peito',  tempo:'2min',  icon:'💪'},
  {id:'2', membro:'Lucas',    avatar:'🔥', acao:'bateu um PR',       detalhe:'Supino 85kg! 🎉',   tempo:'15min', icon:'🏆'},
  {id:'3', membro:'Gabriel',  avatar:'🏋️', acao:'fez check-in',     detalhe:'Treino C — Pernas', tempo:'1h',    icon:'💪'},
  {id:'4', membro:'Julia',    avatar:'🌟', acao:'completou desafio', detalhe:'7 dias seguidos 🔥', tempo:'3h',    icon:'🏅'},
  {id:'5', membro:'Ryan',     avatar:'💪', acao:'correu',            detalhe:'5.2km em 28:42',    tempo:'5h',    icon:'🏃'},
  {id:'6', membro:'Fernanda', avatar:'⚡', acao:'fez check-in',     detalhe:'Yoga matinal',      tempo:'8h',    icon:'🧘'},
];

const CHAT_MOCK = [
  {id:'1', membro:'Lucas',   avatar:'🔥', msg:'Bora galera! Treino pesado hoje 💪',          tempo:'08:12', meu:false},
  {id:'2', membro:'Ryan',    avatar:'💪', msg:'Vou mais tarde, reunião cedo',                tempo:'08:35', meu:true},
  {id:'3', membro:'Gabriel', avatar:'🏋️', msg:'Batei PR no agachamento hoje! 120kg 🎉',      tempo:'10:22', meu:false},
  {id:'4', membro:'Julia',   avatar:'🌟', msg:'Isso demais!! Arrasou',                       tempo:'10:25', meu:false},
  {id:'5', membro:'Ryan',    avatar:'💪', msg:'Monstro! Fui hoje cedo, peito voando 🔥',     tempo:'12:01', meu:true},
  {id:'6', membro:'Lucas',   avatar:'🔥', msg:'Semana que vem desafio: quem treina mais dias',tempo:'18:44', meu:false},
];

const DESAFIOS_MOCK = [
  {id:'1', nome:'Rei da Semana',    desc:'Mais treinos em 7 dias',    premio:'👑', ativo:true,  fim:'Dom',    lider:'Ryan (5 treinos)'},
  {id:'2', nome:'Corrida do Mês',   desc:'Mais km rodados em março',  premio:'🏃', ativo:true,  fim:'31 Mar', lider:'Lucas (47km)'},
  {id:'3', nome:'Sequência de Fogo',desc:'Maior streak do grupo',     premio:'🔥', ativo:true,  fim:'Aberto', lider:'Ryan (12 dias)'},
  {id:'4', nome:'PR Hunter',        desc:'Mais PRs batidos no mês',   premio:'🏆', ativo:false, fim:'Encerrado',lider:'Gabriel venceu'},
];

type Tab = 'feed'|'ranking'|'chat'|'desafios'|'membros';

export default function DarkSquadPage() {
  const [temSquad, setTemSquad]   = useState(true);
  const [tab, setTab]             = useState<Tab>('feed');
  const [checkinFeito, setCheckin]= useState(false);
  const [msg, setMsg]             = useState('');
  const [chatMsgs, setChatMsgs]   = useState(CHAT_MOCK);
  const [showCodigo, setShowCodigo] = useState(false);
  const [showEntrar, setShowEntrar] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(tab==='chat' && chatRef.current){
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  },[tab, chatMsgs]);

  const enviarMsg = () => {
    if(!msg.trim()) return;
    const nova = {id:Date.now().toString(), membro:'Ryan', avatar:'💪', msg:msg.trim(), tempo:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), meu:true};
    setChatMsgs(m=>[...m,nova]);
    setMsg('');
  };

  const doCheckin = () => {
    setCheckin(true);
    setTab('feed');
  };

  // ── SEM SQUAD ─────────────────────────────────────────────────────────
  if(!temSquad) return (
    <PageShell>
      {showEntrar && (
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'#0e0e11',borderTop:'1px solid #202028',borderRadius:'20px 20px 0 0',width:'100%',padding:'1.5rem'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'1rem'}}>Entrar com código</div>
            <input value={codigoInput} onChange={e=>setCodigoInput(e.target.value.toUpperCase())}
              placeholder="Ex: DWAR2026"
              style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'10px',color:'#eaeaea',padding:'12px 13px',fontSize:'1.1rem',outline:'none',fontFamily:'monospace',letterSpacing:'.15em',marginBottom:'1rem'}}/>
            <div style={{display:'flex',gap:'.5rem'}}>
              <button onClick={()=>setShowEntrar(false)} style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'12px',color:'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer'}}>Cancelar</button>
              <button onClick={()=>{setTemSquad(true);setShowEntrar(false);}} style={{flex:2,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.28)'}}>Entrar no Squad</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center',gap:'1.25rem',padding:'1rem'}}>
        <div style={{fontSize:'4rem'}}>⚔️</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
          DARK<span style={{color:'#e31b23'}}>SQUAD</span>
        </div>
        <div style={{fontSize:'.88rem',color:'#9898a8',maxWidth:280,lineHeight:1.6}}>
          Treine em grupo, compita no ranking e motive uns aos outros
        </div>
        <div style={{display:'grid',gap:'.6rem',width:'100%',maxWidth:300}}>
          <button onClick={()=>setTemSquad(true)} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'14px',padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.3)'}}>
            ⚔️ Criar Squad
          </button>
          <button onClick={()=>setShowEntrar(true)} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'14px',padding:'14px',color:'#f0f0f2',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer'}}>
            🔗 Entrar com código
          </button>
        </div>
      </div>
    </PageShell>
  );

  // ── COM SQUAD ─────────────────────────────────────────────────────────
  const TABS: {id:Tab; label:string; badge?:number}[] = [
    {id:'feed',     label:'FEED'},
    {id:'ranking',  label:'RANK'},
    {id:'chat',     label:'CHAT', badge:3},
    {id:'desafios', label:'DESA'},
    {id:'membros',  label:'TIME'},
  ];

  const checkinHoje = checkinFeito ? MEMBROS_MOCK.filter(m=>m.checkinHoje).length + 1 : MEMBROS_MOCK.filter(m=>m.checkinHoje).length;

  return (
    <PageShell>
      {/* Modal código convite */}
      {showCodigo&&(
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
          <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'20px',padding:'1.5rem',width:'100%',maxWidth:340,textAlign:'center'}}>
            <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>🔗</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.25rem'}}>Código do Squad</div>
            <div style={{fontSize:'.78rem',color:'#9898a8',marginBottom:'1.25rem'}}>Compartilhe com seus amigos</div>
            <div style={{fontFamily:'monospace',fontWeight:900,fontSize:'2rem',letterSpacing:'.2em',color:'#e31b23',background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
              {SQUAD_MOCK.codigo}
            </div>
            <button onClick={()=>setShowCodigo(false)} style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'12px',color:'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer'}}>Fechar</button>
          </div>
        </div>
      )}

      {/* Header do squad */}
      <div style={{background:'linear-gradient(135deg,rgba(227,27,35,.12),rgba(227,27,35,.04))',border:'1px solid rgba(227,27,35,.2)',borderRadius:'16px',padding:'1rem 1.1rem',marginBottom:'.75rem'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.6rem'}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#fff',lineHeight:1}}>{SQUAD_MOCK.nome}</div>
            <div style={{fontSize:'.65rem',color:'rgba(227,27,35,.7)',fontWeight:700,marginTop:'2px'}}>{SQUAD_MOCK.tag}</div>
          </div>
          <button onClick={()=>setShowCodigo(true)} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'8px',padding:'.35rem .7rem',color:'#9898a8',fontSize:'.72rem',fontWeight:700,cursor:'pointer'}}>
            🔗 Convidar
          </button>
        </div>
        <div style={{fontSize:'.75rem',color:'rgba(255,255,255,.45)',marginBottom:'.75rem'}}>{SQUAD_MOCK.descricao}</div>
        <div style={{display:'flex',gap:'.75rem',alignItems:'center'}}>
          <div style={{fontSize:'.7rem',color:'#9898a8'}}>👥 {SQUAD_MOCK.membros}/{SQUAD_MOCK.maxMembros}</div>
          <div style={{fontSize:'.7rem',color:'#9898a8'}}>💪 {checkinHoje} check-ins hoje</div>
        </div>
      </div>

      {/* Check-in */}
      <button onClick={()=>!checkinFeito&&doCheckin()} style={{
        width:'100%',marginBottom:'.75rem',
        background:checkinFeito?'rgba(34,197,94,.06)':'linear-gradient(135deg,#e31b23,#8b0000)',
        border:checkinFeito?'1px solid rgba(34,197,94,.25)':'none',
        borderRadius:'14px',padding:'1rem 1.2rem',cursor:checkinFeito?'default':'pointer',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        boxShadow:checkinFeito?'none':'0 0 30px rgba(227,27,35,.2)',
      }}>
        <div style={{textAlign:'left'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:checkinFeito?'#4ade80':'#fff',letterSpacing:'.04em'}}>
            {checkinFeito?'✓ Presença marcada':'📍 Marcar presença'}
          </div>
          <div style={{fontSize:'.68rem',color:checkinFeito?'rgba(74,222,128,.5)':'rgba(255,255,255,.5)',marginTop:'2px'}}>
            {checkinFeito?'Você apareceu hoje!':'Mostre pro squad que você foi'}
          </div>
        </div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',color:checkinFeito?'#4ade80':'#fff',lineHeight:1}}>{checkinHoje}</div>
      </button>

      {/* Tabs */}
      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #202028',borderRadius:'12px',padding:'3px',gap:'3px',marginBottom:'1rem'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:'.44rem .2rem',borderRadius:'9px',border:'none',cursor:'pointer',
            background:tab===t.id?'rgba(227,27,35,.15)':'transparent',
            color:tab===t.id?'#e31b23':'#5a5a6a',
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
            fontSize:'.72rem',letterSpacing:'.05em',position:'relative',
            boxShadow:tab===t.id?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',
          }}>
            {t.label}
            {t.badge&&<span style={{position:'absolute',top:2,right:3,background:'#e31b23',color:'#fff',borderRadius:'999px',fontSize:'.48rem',fontWeight:900,padding:'1px 4px',minWidth:14,textAlign:'center'}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* FEED */}
      {tab==='feed'&&(
        <div style={{display:'grid',gap:'.5rem'}}>
          {checkinFeito&&(
            <div style={{display:'flex',alignItems:'center',gap:'.75rem',background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.2)',borderRadius:'12px',padding:'.75rem 1rem',animation:'fadeUp .3s ease'}}>
              <span style={{fontSize:'1.4rem'}}>💪</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',color:'#f0f0f2'}}>Ryan fez check-in</div>
                <div style={{fontSize:'.65rem',color:'#5a5a6a'}}>agora mesmo</div>
              </div>
              <span style={{fontSize:'.7rem',color:'#4ade80',fontWeight:700}}>NOVO</span>
            </div>
          )}
          {FEED_MOCK.map(f=>(
            <div key={f.id} style={{display:'flex',alignItems:'center',gap:'.75rem',background:'rgba(255,255,255,.02)',border:'1px solid #131313',borderRadius:'12px',padding:'.75rem 1rem'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0}}>{f.avatar}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',color:'#f0f0f2'}}>{f.membro}</div>
                <div style={{fontSize:'.7rem',color:'#5a5a6a',marginTop:'1px'}}>
                  <span style={{color:'#e31b23'}}>{f.acao}</span> · {f.detalhe}
                </div>
              </div>
              <div style={{fontSize:'.62rem',color:'#323240',flexShrink:0}}>{f.tempo}</div>
            </div>
          ))}
        </div>
      )}

      {/* RANKING */}
      {tab==='ranking'&&(
        <div style={{display:'grid',gap:'.5rem'}}>
          <div style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'12px',padding:'.75rem 1rem',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.25rem'}}>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',color:'#fff'}}>Março 2026</div>
              <div style={{fontSize:'.62rem',color:'#5a5a6a',marginTop:'1px'}}>Vence por mais treinos</div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.82rem',color:'#facc15'}}>12 dias restantes</div>
          </div>
          {[...MEMBROS_MOCK].sort((a,b)=>b.treinos-a.treinos).map((m,i)=>{
            const medals=['🥇','🥈','🥉'];
            const isMe = m.nome==='Ryan';
            const max  = MEMBROS_MOCK[0].treinos;
            const barW = Math.max(4,Math.round((m.treinos/max)*100));
            return(
              <div key={m.id} style={{background:isMe?'rgba(227,27,35,.06)':i===0?'rgba(250,204,21,.04)':'rgba(255,255,255,.015)',border:isMe?'1px solid rgba(227,27,35,.25)':i===0?'1px solid rgba(250,204,21,.15)':'1px solid #131313',borderRadius:'14px',padding:'.85rem 1rem',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',left:0,top:0,bottom:0,width:barW+'%',background:i===0?'rgba(250,204,21,.05)':isMe?'rgba(227,27,35,.06)':'rgba(255,255,255,.02)',borderRadius:'14px 0 0 14px'}}/>
                <div style={{position:'relative',display:'flex',alignItems:'center',gap:'.75rem'}}>
                  <div style={{width:26,textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',flexShrink:0}}>{medals[i]||<span style={{color:'#323240'}}>{i+1}</span>}</div>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>{m.avatar}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:isMe?'#e31b23':i===0?'#facc15':'#fff'}}>{m.nome}{isMe?' ◀':''}</div>
                    <div style={{fontSize:'.62rem',color:'#5a5a6a',marginTop:'1px'}}>{m.checkinHoje||isMe&&checkinFeito?'✅ Treinou hoje':'Não treinou hoje'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:isMe?'#e31b23':i===0?'#facc15':'#fff',lineHeight:1}}>{m.treinos}</div>
                    <div style={{fontSize:'.52rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em'}}>treinos</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CHAT */}
      {tab==='chat'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
          <div ref={chatRef} style={{display:'grid',gap:'.5rem',maxHeight:'55vh',overflowY:'auto'}}>
            {chatMsgs.map(c=>(
              <div key={c.id} style={{display:'flex',alignItems:'flex-end',gap:'.5rem',flexDirection:c.meu?'row-reverse':'row'}}>
                {!c.meu&&<div style={{width:30,height:30,borderRadius:'50%',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.9rem',flexShrink:0}}>{c.avatar}</div>}
                <div style={{maxWidth:'75%'}}>
                  {!c.meu&&<div style={{fontSize:'.58rem',color:'#5a5a6a',marginBottom:'2px',marginLeft:'4px'}}>{c.membro}</div>}
                  <div style={{background:c.meu?'rgba(227,27,35,.15)':'rgba(255,255,255,.06)',border:`1px solid ${c.meu?'rgba(227,27,35,.25)':'#202028'}`,borderRadius:c.meu?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'.6rem .85rem'}}>
                    <div style={{fontSize:'.85rem',color:'#f0f0f2',lineHeight:1.4}}>{c.msg}</div>
                    <div style={{fontSize:'.55rem',color:'#5a5a6a',marginTop:'3px',textAlign:'right'}}>{c.tempo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:'.5rem',position:'sticky',bottom:0,background:'#060608',paddingTop:'.5rem'}}>
            <input value={msg} onChange={e=>setMsg(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&enviarMsg()}
              placeholder="Mensagem..."
              style={{flex:1,background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',color:'#eaeaea',padding:'10px 13px',fontSize:'.9rem',outline:'none'}}/>
            <button onClick={enviarMsg} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'12px',padding:'10px 14px',color:'#fff',fontSize:'1rem',cursor:'pointer'}}>➤</button>
          </div>
        </div>
      )}

      {/* DESAFIOS */}
      {tab==='desafios'&&(
        <div style={{display:'grid',gap:'.65rem'}}>
          {DESAFIOS_MOCK.map(d=>(
            <div key={d.id} style={{background:'#0e0e11',border:`1px solid ${d.ativo?'rgba(227,27,35,.2)':'#202028'}`,borderRadius:'14px',padding:'1rem 1.1rem',opacity:d.ativo?1:.6}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.5rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                  <span style={{fontSize:'1.5rem'}}>{d.premio}</span>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{d.nome}</div>
                    <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>{d.desc}</div>
                  </div>
                </div>
                <span style={{fontSize:'.6rem',fontWeight:700,padding:'.2rem .6rem',borderRadius:'999px',background:d.ativo?'rgba(34,197,94,.1)':'rgba(255,255,255,.05)',border:`1px solid ${d.ativo?'rgba(34,197,94,.3)':'#202028'}`,color:d.ativo?'#4ade80':'#5a5a6a',flexShrink:0,marginLeft:'.5rem'}}>
                  {d.ativo?'ATIVO':'FIM'}
                </span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.5rem .65rem',background:'rgba(0,0,0,.25)',borderRadius:'8px'}}>
                <div style={{fontSize:'.7rem',color:'#9898a8'}}>🏆 Líder: <span style={{color:'#facc15',fontWeight:700}}>{d.lider}</span></div>
                <div style={{fontSize:'.65rem',color:'#5a5a6a'}}>⏳ {d.fim}</div>
              </div>
            </div>
          ))}
          <button style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px dashed #202028',borderRadius:'14px',padding:'1rem',color:'#5a5a6a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer'}}>
            + Criar Desafio
          </button>
        </div>
      )}

      {/* MEMBROS */}
      {tab==='membros'&&(
        <div style={{display:'grid',gap:'.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.25rem'}}>
            <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em'}}>{SQUAD_MOCK.membros}/{SQUAD_MOCK.maxMembros} membros</div>
            <button onClick={()=>setShowCodigo(true)} style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:'8px',padding:'.3rem .7rem',color:'#e31b23',fontSize:'.72rem',fontWeight:700,cursor:'pointer'}}>🔗 Convidar</button>
          </div>
          {MEMBROS_MOCK.map((m,i)=>(
            <div key={m.id} style={{display:'flex',alignItems:'center',gap:'.75rem',background:'rgba(255,255,255,.02)',border:'1px solid #131313',borderRadius:'12px',padding:'.75rem 1rem'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0}}>{m.avatar}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{m.nome}</span>
                  {i===0&&<span style={{fontSize:'.58rem',background:'rgba(250,204,21,.1)',border:'1px solid rgba(250,204,21,.3)',borderRadius:'999px',padding:'.1rem .4rem',color:'#facc15',fontWeight:700}}>DONO</span>}
                </div>
                <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'1px'}}>Último treino: {m.ultimo}</div>
              </div>
              <div style={{textAlign:'right'}}>
                {(m.checkinHoje||(m.nome==='Ryan'&&checkinFeito))
                  ?<span style={{fontSize:'.7rem',color:'#4ade80',fontWeight:700}}>✅ Hoje</span>
                  :<span style={{fontSize:'.7rem',color:'#5a5a6a'}}>😴</span>
                }
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',color:'#9898a8',marginTop:'1px'}}>{m.treinos} treinos</div>
              </div>
            </div>
          ))}
          <button onClick={()=>setTemSquad(false)} style={{width:'100%',marginTop:'.5rem',background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'12px',padding:'.75rem',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer'}}>
            Sair do Squad
          </button>
        </div>
      )}
    </PageShell>
  );
}
