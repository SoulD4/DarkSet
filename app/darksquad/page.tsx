'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users, Link2, Copy, Check, LogOut,
  Send, Plus, X, Trophy, Flame,
  Swords, MessageCircle, Star,
  ChevronRight, Clock, Dumbbell,
  CheckCircle2, UserPlus, Medal,
  Target, Crown, Activity
} from 'lucide-react';
import {
  Sword, Skull, ShieldStar, UsersThree,
  ChatCircle, RocketLaunch, Flag
} from '@phosphor-icons/react';

// ── Tipos ─────────────────────────────────────────────────────
type Membro = {
  id: string; nome: string; initials: string;
  treinos: number; checkinHoje: boolean; ultimo: string; dono?: boolean;
};
type FeedItem = {
  id: string; membroNome: string; initials: string;
  acao: string; detalhe: string; tempo: string;
};
type ChatMsg = {
  id: string; membroNome: string; initials: string;
  msg: string; tempo: string; meu: boolean;
};
type Desafio = {
  id: string; nome: string; desc: string;
  ativo: boolean; fim: string; lider: string; tipo: string;
};
type Squad = {
  id: string; nome: string; tag: string; descricao: string;
  membros: number; maxMembros: number; dono: string; codigo: string;
};
type Tab = 'feed'|'ranking'|'chat'|'desafios'|'membros';

// ── Mock data (squad não tem Firebase multi-user real ainda) ──
const SQUAD: Squad = {
  id:'squad_001', nome:'Dark Warriors', tag:'#DARKWAR',
  descricao:'Treinamos juntos, evoluímos juntos.',
  membros:8, maxMembros:20, dono:'Ryan', codigo:'DWAR2026',
};
const MEMBROS: Membro[] = [
  {id:'1',nome:'Ryan',     initials:'RY',treinos:18,checkinHoje:true, ultimo:'Hoje',  dono:true},
  {id:'2',nome:'Lucas',    initials:'LC',treinos:15,checkinHoje:true, ultimo:'Hoje'  },
  {id:'3',nome:'Fernanda', initials:'FE',treinos:14,checkinHoje:false,ultimo:'Ontem' },
  {id:'4',nome:'Gabriel',  initials:'GB',treinos:12,checkinHoje:true, ultimo:'Hoje'  },
  {id:'5',nome:'Ana Paula',initials:'AP',treinos:11,checkinHoje:false,ultimo:'2d atrás'},
  {id:'6',nome:'Marcos',   initials:'MR',treinos:9, checkinHoje:false,ultimo:'3d atrás'},
  {id:'7',nome:'Julia',    initials:'JU',treinos:8, checkinHoje:true, ultimo:'Hoje'  },
  {id:'8',nome:'Pedro',    initials:'PE',treinos:6, checkinHoje:false,ultimo:'5d atrás'},
];
const FEED_INICIAL: FeedItem[] = [
  {id:'1',membroNome:'Ryan',    initials:'RY',acao:'fez check-in',    detalhe:'Treino A — Peito',  tempo:'2min' },
  {id:'2',membroNome:'Lucas',   initials:'LC',acao:'bateu um PR',      detalhe:'Supino 85kg!',      tempo:'15min'},
  {id:'3',membroNome:'Gabriel', initials:'GB',acao:'fez check-in',    detalhe:'Treino C — Pernas', tempo:'1h'   },
  {id:'4',membroNome:'Julia',   initials:'JU',acao:'completou desafio',detalhe:'7 dias seguidos',   tempo:'3h'   },
  {id:'5',membroNome:'Ryan',    initials:'RY',acao:'correu',           detalhe:'5.2km em 28:42',    tempo:'5h'   },
  {id:'6',membroNome:'Fernanda',initials:'FE',acao:'fez check-in',    detalhe:'Yoga matinal',      tempo:'8h'   },
];
const CHAT_INICIAL: ChatMsg[] = [
  {id:'1',membroNome:'Lucas',  initials:'LC',msg:'Bora galera! Treino pesado hoje',        tempo:'08:12',meu:false},
  {id:'2',membroNome:'Ryan',   initials:'RY',msg:'Vou mais tarde, reunião cedo',           tempo:'08:35',meu:true },
  {id:'3',membroNome:'Gabriel',initials:'GB',msg:'Batei PR no agachamento! 120kg',         tempo:'10:22',meu:false},
  {id:'4',membroNome:'Julia',  initials:'JU',msg:'Isso demais!! Arrasou',                  tempo:'10:25',meu:false},
  {id:'5',membroNome:'Ryan',   initials:'RY',msg:'Monstro! Fui hoje cedo, peito voando',   tempo:'12:01',meu:true },
  {id:'6',membroNome:'Lucas',  initials:'LC',msg:'Semana que vem desafio: quem treina mais',tempo:'18:44',meu:false},
];
const DESAFIOS: Desafio[] = [
  {id:'1',nome:'Rei da Semana',     desc:'Mais treinos em 7 dias',   ativo:true, fim:'Dom',     lider:'Ryan (5 treinos)',  tipo:'treino'  },
  {id:'2',nome:'Corrida do Mês',    desc:'Mais km rodados em março', ativo:true, fim:'31 Mar',  lider:'Lucas (47km)',      tipo:'cardio'  },
  {id:'3',nome:'Sequência de Fogo', desc:'Maior streak do grupo',    ativo:true, fim:'Aberto',  lider:'Ryan (12 dias)',    tipo:'streak'  },
  {id:'4',nome:'PR Hunter',         desc:'Mais PRs batidos no mês',  ativo:false,fim:'Encerrado',lider:'Gabriel venceu',  tipo:'pr'      },
];

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({initials,size=36,cor='#e31b23'}:{initials:string;size?:number;cor?:string}) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:`${cor}22`,border:`1px solid ${cor}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:size*0.38,color:cor}}>
      {initials}
    </div>
  );
}

// ── Ícone por tipo de desafio ──────────────────────────────────
function DesafioIcon({tipo}:{tipo:string}) {
  if(tipo==='treino')  return <Dumbbell size={22} color="#e31b23"/>;
  if(tipo==='cardio')  return <Activity size={22} color="#f97316"/>;
  if(tipo==='streak')  return <Flame size={22} color="#facc15"/>;
  if(tipo==='pr')      return <Trophy size={22} color="#a78bfa"/>;
  return <Target size={22} color="#7a7a8a"/>;
}

// ── Página ─────────────────────────────────────────────────────
export default function DarkSquadPage() {
  const [uid,         setUid]        = useState<string|null>(null);
  const [userName,    setUserName]   = useState('');
  const [userInitials,setUserInitials]= useState('');
  const [loading,     setLoading]    = useState(true);
  const [temSquad,    setTemSquad]   = useState(false);
  const [squadData,   setSquadData]  = useState<Squad>(SQUAD);
  const [tab,         setTab]        = useState<Tab>('feed');
  const [checkinFeito,setCheckin]    = useState(false);
  const [msg,         setMsg]        = useState('');
  const [chatMsgs,    setChatMsgs]   = useState<ChatMsg[]>(CHAT_INICIAL);
  const [feedItems,   setFeedItems]  = useState<FeedItem[]>(FEED_INICIAL);
  const [showCodigo,  setShowCodigo] = useState(false);
  const [showEntrar,  setShowEntrar] = useState(false);
  const [showCriar,   setShowCriar]  = useState(false);
  const [codigoInput, setCodigoInput]= useState('');
  const [nomeSquadInput,setNomeSquadInput]= useState('');
  const [erroCodigo,  setErroCodigo] = useState('');
  const [copiado,     setCopiado]    = useState(false);
  const [salvando,    setSalvando]   = useState(false);
  const [toast,       setToast]      = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        // Nome do usuário
        const userSnap = await getDoc(doc(db,'users',u.uid));
        let name = u.displayName||'Atleta';
        if(userSnap.exists()){
          const d = userSnap.data();
          name = d.name||d.displayName||u.displayName||'Atleta';
        }
        // pega só o primeiro nome
        const firstName = name.split(' ')[0];
        setUserName(firstName);
        setUserInitials(firstName.slice(0,2).toUpperCase());

        // Verifica squad no Firebase
        const squadSnap = await getDoc(doc(db,'users',u.uid,'data','squad'));
        if(squadSnap.exists()){
          const sd = squadSnap.data();
          if(sd.squadId){
            // tem squad — carrega dados
            setTemSquad(true);
            if(sd.squadData) setSquadData(sd.squadData);
            // Atualiza membros mock com nome real do usuário
          }
        }
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  useEffect(()=>{
    if(tab==='chat'&&chatRef.current)
      chatRef.current.scrollTop=chatRef.current.scrollHeight;
  },[tab,chatMsgs]);

  const gerarCodigo = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  };

  const criarSquad = async () => {
    if(!nomeSquadInput.trim()||!uid) return;
    setSalvando(true);
    try {
      const codigo = gerarCodigo();
      const tag = '#'+nomeSquadInput.trim().toUpperCase().replace(/\s+/g,'').slice(0,8);
      const novoSquad: Squad = {
        id: uid+'_squad',
        nome: nomeSquadInput.trim().toUpperCase(),
        tag,
        descricao: 'Treinamos juntos, evoluímos juntos.',
        membros: 1,
        maxMembros: 20,
        dono: userName,
        codigo,
      };
      await setDoc(doc(db,'users',uid,'data','squad'),{
        squadId: novoSquad.id,
        squadData: novoSquad,
        entrou: Date.now(),
        dono: true,
      });
      setSquadData(novoSquad);
      setTemSquad(true);
      setShowCriar(false);
      setNomeSquadInput('');
      showToast('Squad criado!');
    } catch(e){ console.error(e); }
    setSalvando(false);
  };

  const entrarSquad = async () => {
    const code = codigoInput.trim().toUpperCase();
    if(!code||!uid){ setErroCodigo('Digite um código válido'); return; }
    // Código correto = DWAR2026 (demo) ou qualquer código de 8 chars
    if(code.length < 4){ setErroCodigo('Código muito curto'); return; }
    setSalvando(true);
    try {
      // Em produção buscaria o squad pelo código no Firestore
      // Por ora usa o squad demo se código for DWAR2026, ou cria entry genérica
      const squadEntrado = code === 'DWAR2026' ? SQUAD : {
        ...SQUAD,
        nome: 'SQUAD '+code,
        tag: '#'+code.slice(0,6),
        codigo: code,
        dono: '',
      };
      await setDoc(doc(db,'users',uid,'data','squad'),{
        squadId: squadEntrado.id,
        squadData: squadEntrado,
        entrou: Date.now(),
        dono: false,
      });
      setSquadData(squadEntrado);
      setTemSquad(true);
      setShowEntrar(false);
      setCodigoInput('');
      setErroCodigo('');
      showToast('Entrou no squad!');
    } catch(e){ setErroCodigo('Erro ao entrar. Tente novamente.'); }
    setSalvando(false);
  };

  const sairDoSquad = async () => {
    if(!uid) return;
    try {
      await setDoc(doc(db,'users',uid,'data','squad'),{squadId:null});
    } catch(e){}
    setTemSquad(false);
    setSquadData(SQUAD);
    showToast('Saiu do squad');
  };

  const copiarCodigo = () => {
    navigator.clipboard?.writeText(squadData.codigo).catch(()=>{});
    setCopiado(true);
    setTimeout(()=>setCopiado(false),2000);
    showToast('Código copiado!');
  };

  const enviarMsg = () => {
    if(!msg.trim()) return;
    const nova: ChatMsg = {
      id: Date.now().toString(), membroNome:userName, initials:userInitials,
      msg:msg.trim(), tempo:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), meu:true,
    };
    setChatMsgs(m=>[...m,nova]);
    setMsg('');
  };

  const doCheckin = () => {
    setCheckin(true);
    const novoItem: FeedItem = {
      id:Date.now().toString(), membroNome:userName, initials:userInitials,
      acao:'fez check-in', detalhe:'Treino de hoje', tempo:'agora',
    };
    setFeedItems(f=>[novoItem,...f]);
    showToast('Check-in marcado!');
    setTab('feed');
  };

  const membrosOrdenados = useMemo(()=>
    [...MEMBROS].sort((a,b)=>b.treinos-a.treinos)
  ,[]);

  const checkinCount = checkinFeito
    ? MEMBROS.filter(m=>m.checkinHoje).length + 1
    : MEMBROS.filter(m=>m.checkinHoje).length;

  const TABS: {id:Tab;label:string;Icon:any;badge?:number}[] = [
    {id:'feed',     label:'Feed',     Icon:RocketLaunch },
    {id:'ranking',  label:'Rank',     Icon:Trophy       },
    {id:'chat',     label:'Chat',     Icon:ChatCircle, badge:3},
    {id:'desafios', label:'Desafios', Icon:Flag         },
    {id:'membros',  label:'Time',     Icon:UsersThree   },
  ];

  // ── LOADING ──────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  // ── SEM SQUAD ────────────────────────────────────────────
  if(!temSquad) return (
    <PageShell>
      <AnimatePresence>
        {showEntrar && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.88)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}}
            onClick={e=>{if(e.target===e.currentTarget)setShowEntrar(false);}}>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:300,damping:32}}
              style={{background:'#0f0f13',borderTop:'1px solid #2e2e38',borderRadius:'24px 24px 0 0',width:'100%',padding:'1.5rem'}}>
              <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2,margin:'0 auto .85rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.5rem'}}>
                <Link2 size={18} color="#e31b23"/> Entrar com código
              </div>
              <input value={codigoInput} onChange={e=>setCodigoInput(e.target.value.toUpperCase())}
                placeholder="Ex: DWAR2026"
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:`1px solid ${erroCodigo?'rgba(227,27,35,.5)':'#2e2e38'}`,borderRadius:10,color:'#f0f0f2',padding:'12px 13px',fontSize:'1.2rem',outline:'none',fontFamily:'monospace',letterSpacing:'.15em',marginBottom:erroCodigo?'.4rem':'1rem'}}/>
              {erroCodigo&&<div style={{fontSize:'.72rem',color:'#e31b23',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'.3rem'}}><X size={13}/>{erroCodigo}</div>}
              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.97}} onClick={()=>setShowEntrar(false)}
                  style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
                  Cancelar
                </motion.button>
                <motion.button whileTap={{scale:.97}} onClick={entrarSquad} disabled={salvando}
                  style={{flex:2,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:10,padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',outline:'none',boxShadow:'0 4px 16px rgba(227,27,35,.28)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  <UserPlus size={16}/> Entrar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal criar squad */}
        {showCriar && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.88)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}}
            onClick={e=>{if(e.target===e.currentTarget)setShowCriar(false);}}>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:300,damping:32}}
              style={{background:'#0f0f13',borderTop:'1px solid #2e2e38',borderRadius:'24px 24px 0 0',width:'100%',padding:'1.5rem'}}>
              <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2,margin:'0 auto .85rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.5rem'}}>
                <Sword size={18} color="#e31b23" weight="fill"/> Criar Squad
              </div>
              <label style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:5}}>Nome do Squad</label>
              <input value={nomeSquadInput} onChange={e=>setNomeSquadInput(e.target.value)}
                placeholder="Ex: Dark Warriors"
                maxLength={24}
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'12px 13px',fontSize:'1.1rem',outline:'none',marginBottom:'1rem'}}/>
              <div style={{background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:10,padding:'.75rem',marginBottom:'1rem',fontSize:'.72rem',color:'#7a7a8a',lineHeight:1.6}}>
                Um código de convite será gerado automaticamente para você compartilhar com seu grupo.
              </div>
              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.97}} onClick={()=>setShowCriar(false)}
                  style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
                  Cancelar
                </motion.button>
                <motion.button whileTap={{scale:.97}} onClick={criarSquad} disabled={!nomeSquadInput.trim()||salvando}
                  style={{flex:2,background:nomeSquadInput.trim()?'linear-gradient(135deg,#e31b23,#b31217)':'rgba(227,27,35,.2)',border:'none',borderRadius:10,padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:nomeSquadInput.trim()?'pointer':'not-allowed',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  {salvando?<motion.div animate={{rotate:360}} transition={{duration:.6,repeat:Infinity,ease:'linear'}} style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%'}}/>:<><Sword size={16} weight="fill"/> Criar</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
        style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'65vh',textAlign:'center',gap:'1.25rem',padding:'1rem'}}>
        <motion.div animate={{scale:[1,1.08,1]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}>
          <Sword size={64} color="#e31b23" weight="fill"/>
        </motion.div>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2.2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
            DARK<span style={{color:'#e31b23'}}>SQUAD</span>
          </div>
          <div style={{fontSize:'.88rem',color:'#7a7a8a',maxWidth:280,lineHeight:1.6,marginTop:'.5rem'}}>
            Treine em grupo, compita no ranking e motive uns aos outros
          </div>
        </div>
        <div style={{display:'grid',gap:'.6rem',width:'100%',maxWidth:300}}>
          <motion.button whileTap={{scale:.97}} onClick={()=>setShowCriar(true)}
            style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',outline:'none',boxShadow:'0 4px 20px rgba(227,27,35,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
            <Sword size={18} weight="fill"/> Criar Squad
          </motion.button>
          <motion.button whileTap={{scale:.97}} onClick={()=>setShowEntrar(true)}
            style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:14,padding:'14px',color:'#f0f0f2',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
            <Link2 size={18}/> Entrar com código
          </motion.button>
        </div>
      </motion.div>
    </PageShell>
  );

  // ── COM SQUAD ─────────────────────────────────────────────
  return (
    <PageShell>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'.4rem'}}>
            <CheckCircle2 size={14}/>{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal código */}
      <AnimatePresence>
        {showCodigo && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.88)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}
            onClick={e=>{if(e.target===e.currentTarget)setShowCodigo(false);}}>
            <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.9,opacity:0}}
              style={{background:'#0f0f13',border:'1px solid #2e2e38',borderRadius:20,padding:'1.5rem',width:'100%',maxWidth:340,textAlign:'center'}}>
              <Link2 size={32} color="#e31b23" style={{margin:'0 auto .75rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.25rem'}}>Código do Squad</div>
              <div style={{fontSize:'.78rem',color:'#7a7a8a',marginBottom:'1.25rem'}}>Compartilhe com seus amigos</div>
              <div style={{fontFamily:'monospace',fontWeight:900,fontSize:'2rem',letterSpacing:'.2em',color:'#e31b23',background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:12,padding:'1rem',marginBottom:'1rem'}}>
                {squadData.codigo}
              </div>
              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.95}} onClick={copiarCodigo}
                  style={{flex:1,background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:10,padding:'11px',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  {copiado?<><Check size={15}/> Copiado!</>:<><Copy size={15}/> Copiar</>}
                </motion.button>
                <motion.button whileTap={{scale:.95}} onClick={()=>setShowCodigo(false)}
                  style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'11px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
                  Fechar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header squad */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
        <Card style={{background:'linear-gradient(135deg,rgba(227,27,35,.12),rgba(227,27,35,.04))',border:'1px solid rgba(227,27,35,.2)',borderRadius:16,marginBottom:'.75rem',overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',top:-20,right:-20,opacity:.05}}>
            <Sword size={120} color="#e31b23" weight="fill"/>
          </div>
          <CardContent style={{padding:'1rem 1.1rem',position:'relative'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.5rem'}}>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#fff',lineHeight:1}}>{squadData.nome}</div>
                <div style={{fontSize:'.65rem',color:'rgba(227,27,35,.7)',fontWeight:700,marginTop:'2px',letterSpacing:'.06em'}}>{squadData.tag}</div>
              </div>
              <motion.button whileTap={{scale:.95}} onClick={()=>setShowCodigo(true)}
                style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'.35rem .7rem',color:'#9898a8',fontSize:'.72rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem'}}>
                <Link2 size={13}/> Convidar
              </motion.button>
            </div>
            <div style={{fontSize:'.75rem',color:'rgba(255,255,255,.4)',marginBottom:'.6rem'}}>{squadData.descricao}</div>
            <Separator style={{background:'rgba(255,255,255,.08)',marginBottom:'.6rem'}}/>
            <div style={{display:'flex',gap:'1rem',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.7rem',color:'#9898a8'}}>
                <Users size={13}/> {squadData.membros}/{squadData.maxMembros} membros
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.7rem',color:'#9898a8'}}>
                <CheckCircle2 size={13}/> {checkinCount} check-ins hoje
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Check-in */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}>
        <motion.button whileTap={checkinFeito?{}:{scale:.98}} onClick={()=>!checkinFeito&&doCheckin()} style={{
          width:'100%',marginBottom:'.75rem',
          background:checkinFeito?'rgba(34,197,94,.06)':'linear-gradient(135deg,#e31b23,#8b0000)',
          border:checkinFeito?'1px solid rgba(34,197,94,.25)':'none',
          borderRadius:14,padding:'1rem 1.2rem',cursor:checkinFeito?'default':'pointer',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          boxShadow:checkinFeito?'none':'0 0 30px rgba(227,27,35,.2)',outline:'none',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
            <div style={{width:40,height:40,borderRadius:10,background:checkinFeito?'rgba(34,197,94,.15)':'rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {checkinFeito?<CheckCircle2 size={22} color="#4ade80"/>:<Dumbbell size={22} color="#fff"/>}
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:checkinFeito?'#4ade80':'#fff',letterSpacing:'.04em'}}>
                {checkinFeito?'Presença marcada':'Marcar presença'}
              </div>
              <div style={{fontSize:'.68rem',color:checkinFeito?'rgba(74,222,128,.5)':'rgba(255,255,255,.5)',marginTop:'2px'}}>
                {checkinFeito?'Você apareceu hoje!':'Mostre pro squad que você foi'}
              </div>
            </div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',color:checkinFeito?'#4ade80':'#fff',lineHeight:1}}>{checkinCount}</div>
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.12}}
        style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:12,padding:'3px',gap:'3px',marginBottom:'1rem'}}>
        {TABS.map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.95}} onClick={()=>setTab(t.id)} style={{
              flex:1,padding:'.44rem .2rem',borderRadius:9,border:'none',cursor:'pointer',
              background:tab===t.id?'rgba(227,27,35,.15)':'transparent',
              color:tab===t.id?'#e31b23':'#484858',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
              fontSize:'.65rem',letterSpacing:'.04em',position:'relative',
              boxShadow:tab===t.id?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',
              outline:'none',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'.15rem',
            }}>
              <TIcon size={16} weight={tab===t.id?'fill':'regular'} color={tab===t.id?'#e31b23':'#484858'}/>
              {t.label}
              {t.badge&&<span style={{position:'absolute',top:2,right:4,background:'#e31b23',color:'#fff',borderRadius:'999px',fontSize:'.45rem',fontWeight:900,padding:'1px 4px',minWidth:13,textAlign:'center'}}>{t.badge}</span>}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Conteúdo das tabs */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.18}}>

          {/* FEED */}
          {tab==='feed' && (
            <div style={{display:'grid',gap:'.5rem'}}>
              <AnimatePresence>
                {feedItems.map((f,i)=>(
                  <motion.div key={f.id} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} exit={{opacity:0}} transition={{delay:i*.04}}>
                    <Card style={{background:f.tempo==='agora'?'rgba(34,197,94,.06)':'rgba(255,255,255,.02)',border:`1px solid ${f.tempo==='agora'?'rgba(34,197,94,.2)':'#1a1a20'}`,borderRadius:12}}>
                      <CardContent style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                        <Avatar initials={f.initials} size={38}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',color:'#f0f0f2'}}>{f.membroNome}</div>
                          <div style={{fontSize:'.7rem',color:'#7a7a8a',marginTop:'1px'}}>
                            <span style={{color:'#e31b23',fontWeight:600}}>{f.acao}</span> · {f.detalhe}
                          </div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.2rem',flexShrink:0}}>
                          <div style={{fontSize:'.62rem',color:'#2e2e38',display:'flex',alignItems:'center',gap:'.2rem'}}>
                            <Clock size={10}/>{f.tempo}
                          </div>
                          {f.tempo==='agora'&&<Badge style={{background:'rgba(34,197,94,.15)',color:'#4ade80',border:'1px solid rgba(34,197,94,.3)',fontSize:'.48rem'}}>NOVO</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* RANKING */}
          {tab==='ranking' && (
            <div style={{display:'grid',gap:'.5rem'}}>
              <Card style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:12,marginBottom:'.25rem'}}>
                <CardContent style={{padding:'.75rem 1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',color:'#fff'}}>Março 2026</div>
                    <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'1px',display:'flex',alignItems:'center',gap:'.3rem'}}><Dumbbell size={11}/> Vence por mais treinos</div>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.82rem',color:'#facc15',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <Clock size={13}/> 12 dias restantes
                  </div>
                </CardContent>
              </Card>

              {membrosOrdenados.map((m,i)=>{
                const isMe  = m.nome===userName;
                const max   = membrosOrdenados[0].treinos;
                const barW  = Math.max(4,Math.round((m.treinos/max)*100));
                const cores = ['#facc15','#c0c0c0','#cd7f32'];
                const cor   = cores[i]||'#484858';
                return (
                  <motion.div key={m.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}>
                    <Card style={{background:isMe?'rgba(227,27,35,.06)':i===0?'rgba(250,204,21,.04)':'rgba(255,255,255,.015)',border:isMe?'1px solid rgba(227,27,35,.25)':i===0?'1px solid rgba(250,204,21,.15)':'1px solid #1a1a20',borderRadius:14,overflow:'hidden',position:'relative'}}>
                      <div style={{position:'absolute',left:0,top:0,bottom:0,width:barW+'%',background:i===0?'rgba(250,204,21,.05)':isMe?'rgba(227,27,35,.06)':'rgba(255,255,255,.02)',pointerEvents:'none'}}/>
                      <CardContent style={{padding:'.85rem 1rem',position:'relative',display:'flex',alignItems:'center',gap:'.75rem'}}>
                        <div style={{width:26,textAlign:'center',flexShrink:0}}>
                          {i===0?<Crown size={20} color="#facc15" style={{margin:'0 auto'}}/>:
                           i===1?<Medal size={18} color="#c0c0c0" style={{margin:'0 auto'}}/>:
                           i===2?<Medal size={18} color="#cd7f32" style={{margin:'0 auto'}}/>:
                           <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#484858'}}>{i+1}</span>}
                        </div>
                        <Avatar initials={m.initials} size={36} cor={isMe?'#e31b23':cor}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:isMe?'#e31b23':i===0?'#facc15':'#f0f0f2',display:'flex',alignItems:'center',gap:'.4rem'}}>
                            {m.nome}
                            {isMe&&<Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.48rem',padding:'0 4px'}}>você</Badge>}
                            {m.dono&&<Badge style={{background:'rgba(250,204,21,.1)',color:'#facc15',border:'1px solid rgba(250,204,21,.2)',fontSize:'.48rem',padding:'0 4px'}}>dono</Badge>}
                          </div>
                          <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'1px',display:'flex',alignItems:'center',gap:'.3rem'}}>
                            {(m.checkinHoje||(isMe&&checkinFeito))
                              ?<><CheckCircle2 size={10} color="#4ade80"/> <span style={{color:'#4ade80'}}>Treinou hoje</span></>
                              :<><Clock size={10}/> Não treinou hoje</>}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:isMe?'#e31b23':i===0?'#facc15':'#f0f0f2',lineHeight:1}}>{m.treinos}</div>
                          <div style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>treinos</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* CHAT */}
          {tab==='chat' && (
            <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
              <div ref={chatRef} style={{display:'grid',gap:'.5rem',maxHeight:'52vh',overflowY:'auto',paddingBottom:'.25rem'}}>
                {chatMsgs.map((c,i)=>(
                  <motion.div key={c.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.02}}
                    style={{display:'flex',alignItems:'flex-end',gap:'.5rem',flexDirection:c.meu?'row-reverse':'row'}}>
                    {!c.meu&&<Avatar initials={c.initials} size={30}/>}
                    <div style={{maxWidth:'75%'}}>
                      {!c.meu&&<div style={{fontSize:'.58rem',color:'#7a7a8a',marginBottom:'2px',marginLeft:'4px'}}>{c.membroNome}</div>}
                      <div style={{
                        background:c.meu?'rgba(227,27,35,.15)':'rgba(255,255,255,.06)',
                        border:`1px solid ${c.meu?'rgba(227,27,35,.25)':'#2e2e38'}`,
                        borderRadius:c.meu?'14px 14px 4px 14px':'14px 14px 14px 4px',
                        padding:'.6rem .85rem',
                      }}>
                        <div style={{fontSize:'.85rem',color:'#f0f0f2',lineHeight:1.4}}>{c.msg}</div>
                        <div style={{fontSize:'.52rem',color:'#484858',marginTop:'3px',textAlign:'right',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'.2rem'}}>
                          <Clock size={9}/>{c.tempo}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div style={{display:'flex',gap:'.5rem',position:'sticky',bottom:0,background:'#0f0f13',paddingTop:'.5rem'}}>
                <input value={msg} onChange={e=>setMsg(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&enviarMsg()}
                  placeholder="Mensagem..."
                  style={{flex:1,background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12,color:'#f0f0f2',padding:'10px 13px',fontSize:'.9rem',outline:'none'}}/>
                <motion.button whileTap={{scale:.9}} onClick={enviarMsg}
                  style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'10px 14px',color:'#fff',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Send size={18}/>
                </motion.button>
              </div>
            </div>
          )}

          {/* DESAFIOS */}
          {tab==='desafios' && (
            <div style={{display:'grid',gap:'.65rem'}}>
              {DESAFIOS.map((d,i)=>(
                <motion.div key={d.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
                  <Card style={{background:'#1e1e24',border:`1px solid ${d.ativo?'rgba(227,27,35,.2)':'#2e2e38'}`,borderRadius:14,opacity:d.ativo?1:.6}}>
                    <CardContent style={{padding:'1rem 1.1rem'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.65rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.65rem'}}>
                          <div style={{width:44,height:44,borderRadius:11,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <DesafioIcon tipo={d.tipo}/>
                          </div>
                          <div>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{d.nome}</div>
                            <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'2px'}}>{d.desc}</div>
                          </div>
                        </div>
                        <Badge style={{background:d.ativo?'rgba(34,197,94,.1)':'rgba(255,255,255,.05)',color:d.ativo?'#4ade80':'#484858',border:`1px solid ${d.ativo?'rgba(34,197,94,.3)':'#2e2e38'}`,fontSize:'.52rem',flexShrink:0,marginLeft:'.5rem'}}>
                          {d.ativo?'ATIVO':'FIM'}
                        </Badge>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.5rem .65rem',background:'rgba(0,0,0,.25)',borderRadius:9}}>
                        <div style={{fontSize:'.7rem',color:'#9898a8',display:'flex',alignItems:'center',gap:'.3rem'}}>
                          <Crown size={12} color="#facc15"/> <span style={{color:'#facc15',fontWeight:700}}>{d.lider}</span>
                        </div>
                        <div style={{fontSize:'.65rem',color:'#484858',display:'flex',alignItems:'center',gap:'.2rem'}}>
                          <Clock size={11}/>{d.fim}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              <motion.button whileTap={{scale:.97}}
                style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px dashed #2e2e38',borderRadius:14,padding:'1rem',color:'#484858',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
                <Plus size={16}/> Criar Desafio
              </motion.button>
            </div>
          )}

          {/* MEMBROS */}
          {tab==='membros' && (
            <div style={{display:'grid',gap:'.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.25rem'}}>
                <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',display:'flex',alignItems:'center',gap:'.3rem'}}>
                  <Users size={11}/> {squadData.membros}/{squadData.maxMembros} membros
                </div>
                <motion.button whileTap={{scale:.95}} onClick={()=>setShowCodigo(true)}
                  style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:8,padding:'.3rem .7rem',color:'#e31b23',fontSize:'.72rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem'}}>
                  <UserPlus size={13}/> Convidar
                </motion.button>
              </div>

              {MEMBROS.map((m,i)=>(
                <motion.div key={m.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                  <Card style={{background:'rgba(255,255,255,.02)',border:'1px solid #1a1a20',borderRadius:12}}>
                    <CardContent style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <Avatar initials={m.initials} size={38} cor={m.nome===userName?'#e31b23':'#e31b23'}/>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.4rem',flexWrap:'wrap'}}>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{m.nome}</span>
                          {m.dono&&<Badge style={{background:'rgba(250,204,21,.1)',color:'#facc15',border:'1px solid rgba(250,204,21,.2)',fontSize:'.5rem',display:'flex',alignItems:'center',gap:'.2rem'}}><Crown size={9}/> Dono</Badge>}
                          {m.nome===userName&&<Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.5rem'}}>você</Badge>}
                        </div>
                        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'1px',display:'flex',alignItems:'center',gap:'.3rem'}}>
                          <Clock size={10}/> Último treino: {m.ultimo}
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        {(m.checkinHoje||(m.nome===userName&&checkinFeito))
                          ?<div style={{fontSize:'.7rem',color:'#4ade80',fontWeight:700,display:'flex',alignItems:'center',gap:'.2rem',justifyContent:'flex-end'}}><CheckCircle2 size={12}/> Hoje</div>
                          :<div style={{fontSize:'.7rem',color:'#484858',display:'flex',alignItems:'center',gap:'.2rem',justifyContent:'flex-end'}}><Clock size={12}/> Ausente</div>
                        }
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',color:'#7a7a8a',marginTop:'1px'}}>{m.treinos} treinos</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              <Separator style={{background:'rgba(255,255,255,.05)',margin:'.25rem 0'}}/>

              <motion.button whileTap={{scale:.97}} onClick={sairDoSquad}
                style={{width:'100%',background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:12,padding:'.75rem',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
                <LogOut size={15}/> Sair do Squad
              </motion.button>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}
