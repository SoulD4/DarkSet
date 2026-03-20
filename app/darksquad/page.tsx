'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, addDoc, collection,
  onSnapshot, query, orderBy, limit,
  serverTimestamp, where, getDocs,
  updateDoc, arrayUnion, Timestamp
} from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users, Link2, Copy, Check, LogOut,
  Send, Plus, X, Trophy, Flame,
  MessageCircle, ChevronRight, Clock,
  Dumbbell, CheckCircle2, UserPlus,
  Medal, Target, Crown, Activity,
  Lock, Eye, EyeOff, Loader2, AlertCircle
} from 'lucide-react';
import {
  Sword, UsersThree, ChatCircle,
  RocketLaunch, Flag, Globe
} from '@phosphor-icons/react';
import { getLiga, fmtPontos, LIGAS, type RankScore } from '@/lib/rankSystem';
import { useRankSync } from '@/lib/useRankSync';

// ── Tipos ─────────────────────────────────────────────────────
type SquadInfo = {
  id: string; nome: string; tag: string; descricao: string;
  maxMembros: number; donoUid: string; dono: string;
  codigo: string; temSenha: boolean; membros: number;
  criadoEm: number;
};
type Membro = {
  uid: string; nome: string; initials: string;
  treinos: number; checkinHoje: boolean; ultimo: string; dono: boolean;
};
type ChatMsg = {
  id: string; uid: string; nome: string; initials: string;
  msg: string; tempo: string; meu: boolean;
};
type Desafio = {
  id: string; nome: string; desc: string;
  ativo: boolean; fim: string; lider: string; tipo: string;
};
type RankItem = { uid: string; nome: string; initials: string; treinos: number; isMe: boolean };
type Tab = 'feed'|'ranking'|'chat'|'desafios'|'membros'|'global';

// ── Pool de desafios semanais ──────────────────────────────────
const POOL_DESAFIOS = [
  {nome:'Rei da Semana',      desc:'Mais treinos em 7 dias',           tipo:'treino'},
  {nome:'Corredor do Mês',    desc:'Mais km de cardio no mês',         tipo:'cardio'},
  {nome:'Sequência de Fogo',  desc:'Maior streak ativo do grupo',      tipo:'streak'},
  {nome:'PR Hunter',          desc:'Mais PRs batidos esta semana',     tipo:'pr'    },
  {nome:'Volume Monster',     desc:'Maior volume total (kg) na semana',tipo:'treino'},
  {nome:'Madrugador',         desc:'Mais treinos antes das 8h',        tipo:'treino'},
  {nome:'Consistência',       desc:'Treinar todos os dias da semana',  tipo:'streak'},
  {nome:'Cardio King',        desc:'Mais sessões de cardio na semana', tipo:'cardio'},
  {nome:'Heavy Hitter',       desc:'Maior carga máxima registrada',    tipo:'pr'    },
  {nome:'Resistência',        desc:'Maior duração total de treinos',   tipo:'treino'},
  {nome:'Frequência Total',   desc:'Mais check-ins no squad',          tipo:'streak'},
  {nome:'Sprint Challenge',   desc:'Melhor pace (min/km) no cardio',   tipo:'cardio'},
];

const getWeekOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7*24*3600*1000));
};

const getDesafiosSemana = (): Desafio[] => {
  const seed = getWeekOfYear();
  const shuffled = [...POOL_DESAFIOS].sort((a,b)=>{
    const ha = (a.nome+seed).split('').reduce((s,ch)=>s+ch.charCodeAt(0),0);
    const hb = (b.nome+seed).split('').reduce((s,ch)=>s+ch.charCodeAt(0),0);
    return ha-hb;
  });
  const d = new Date();
  d.setDate(d.getDate()+(7-d.getDay()));
  const fim = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
  return shuffled.slice(0,4).map((d,i)=>({
    ...d, id:String(i+1), ativo:true, fim, lider:'Calculando...',
  }));
};

const hoje = () => new Date().toISOString().slice(0,10);
const mesAtual = () => new Date().toISOString().slice(0,7);
const gerarCodigo = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
};
const fmtTempo = (ts: any): string => {
  if(!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
};

// ── Componentes auxiliares ─────────────────────────────────────
function Avatar({initials,size=36,cor='#e31b23'}:{initials:string;size?:number;cor?:string}) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:`${cor}22`,border:`1px solid ${cor}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:size*0.38,color:cor}}>
      {initials}
    </div>
  );
}

function DesafioIcon({tipo}:{tipo:string}) {
  if(tipo==='treino') return <Dumbbell size={22} color="#e31b23"/>;
  if(tipo==='cardio') return <Activity  size={22} color="#f97316"/>;
  if(tipo==='streak') return <Flame     size={22} color="#facc15"/>;
  if(tipo==='pr')     return <Trophy    size={22} color="#a78bfa"/>;
  return <Target size={22} color="#7a7a8a"/>;
}

// ── Página principal ───────────────────────────────────────────
export default function DarkSquadPage() {
  // Auth + user
  const [uid,          setUid]          = useState<string|null>(null);
  const [userName,     setUserName]     = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [loading,      setLoading]      = useState(true);

  // Squad
  const [squadId,      setSquadId]      = useState<string|null>(null);
  const [squad,        setSquad]        = useState<SquadInfo|null>(null);
  const [membros,      setMembros]      = useState<Membro[]>([]);
  const [ranking,      setRanking]      = useState<RankItem[]>([]);
  const [chatMsgs,     setChatMsgs]     = useState<ChatMsg[]>([]);
  const [checkinFeito, setCheckin]      = useState(false);
  const [desafios]                      = useState<Desafio[]>(getDesafiosSemana());

  // UI
  const [tab,          setTab]          = useState<Tab>('feed');
  const [msg,          setMsg]          = useState('');
  const [showCodigo,   setShowCodigo]   = useState(false);
  const [showEntrar,   setShowEntrar]   = useState(false);
  const [showCriar,    setShowCriar]    = useState(false);
  const [codigoInput,  setCodigoInput]  = useState('');
  const [senhaInput,   setSenhaInput]   = useState('');
  const [nomeInput,    setNomeInput]    = useState('');
  const [senhaNovoInput,setSenhaNovoInput]= useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro,         setErro]         = useState('');
  const [copiado,      setCopiado]      = useState(false);
  const [salvando,     setSalvando]     = useState(false);
  const [globalRank,   setGlobalRank]   = useState<RankScore[]>([]);
  const [loadingRank,  setLoadingRank]  = useState(false);
  const [toast,        setToast]        = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const showToast = (m:string)=>{ setToast(m); setTimeout(()=>setToast(''),2500); };

  // Sync rank global
  useRankSync(uid, userName, userInitials);

  // ── Auth + carregar squad ──────────────────────────────────
  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);

      // Nome
      try {
        const snap = await getDoc(doc(db,'users',u.uid));
        const data = snap.exists()?snap.data():{};
        const name = (data.name||data.displayName||u.displayName||'Atleta').split(' ')[0];
        setUserName(name);
        setUserInitials(name.slice(0,2).toUpperCase());
      } catch(_){}

      // Squad do usuário
      try {
        const userSquadSnap = await getDoc(doc(db,'users',u.uid,'data','squad'));
        if(userSquadSnap.exists()){
          const sd = userSquadSnap.data();
          if(sd.squadId){ setSquadId(sd.squadId); }
        }
      } catch(_){}

      // Check-in hoje
      try {
        const userSquadSnap = await getDoc(doc(db,'users',u.uid,'data','squad'));
        if(userSquadSnap.exists()){
          const sd = userSquadSnap.data();
          if(sd.checkinHoje===hoje()) setCheckin(true);
        }
      } catch(_){}

      setLoading(false);
    });
  },[]);

  // ── Listeners em tempo real quando tem squadId ─────────────
  useEffect(()=>{
    if(!squadId||!uid) return;

    // Info do squad
    const unsubSquad = onSnapshot(doc(db,'squads',squadId), snap=>{
      if(snap.exists()) setSquad(snap.data() as SquadInfo);
    });

    // Membros
    const unsubMembros = onSnapshot(
      collection(db,'squads',squadId,'membros'),
      async snap=>{
        const lista: Membro[] = [];
        const checkinHojeSnap = await getDocs(
          query(collection(db,'squads',squadId,'checkins'),
            where('data','==',hoje()))
        );
        const checkinUids = new Set(checkinHojeSnap.docs.map(d=>d.data().uid));

        // Rank do mês
        const rankSnap = await getDocs(
          collection(db,'squads',squadId,'rank',mesAtual(),'scores')
        );
        const rankMap: Record<string,number> = {};
        rankSnap.docs.forEach(d=>{ rankMap[d.id]=d.data().treinos||0; });

        snap.docs.forEach(d=>{
          const m = d.data();
          lista.push({
            uid:d.id, nome:m.nome, initials:m.initials,
            treinos:rankMap[d.id]||0,
            checkinHoje:checkinUids.has(d.id),
            ultimo:m.ultimoTreino||'Nunca',
            dono:m.dono||false,
          });
        });
        lista.sort((a,b)=>b.treinos-a.treinos);
        setMembros(lista);
        setRanking(lista.map(m=>({
          uid:m.uid, nome:m.nome, initials:m.initials,
          treinos:m.treinos, isMe:m.uid===uid,
        })));
      }
    );

    // Chat em tempo real
    const unsubChat = onSnapshot(
      query(collection(db,'squads',squadId,'chat'), orderBy('criadoEm','asc'), limit(100)),
      snap=>{
        setChatMsgs(snap.docs.map(d=>{
          const m=d.data();
          return {
            id:d.id, uid:m.uid, nome:m.nome, initials:m.initials,
            msg:m.msg, tempo:fmtTempo(m.criadoEm), meu:m.uid===uid,
          };
        }));
      }
    );

    return ()=>{ unsubSquad(); unsubMembros(); unsubChat(); };
  },[squadId,uid]);

  // Carregar rank global
  useEffect(()=>{
    if(tab!=='global'||globalRank.length>0) return;
    const load = async ()=>{
      setLoadingRank(true);
      try {
        const { getDocs, collection, orderBy, query, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db,'globalRank'),orderBy('pontos','desc'),limit(50)));
        const lista = snap.docs.map((d,i)=>({...d.data() as RankScore, posicao:i+1}));
        setGlobalRank(lista);
      } catch(e){ console.error(e); }
      setLoadingRank(false);
    };
    load();
  },[tab]);

  // Scroll chat
  useEffect(()=>{
    if(tab==='chat'&&chatRef.current)
      chatRef.current.scrollTop=chatRef.current.scrollHeight;
  },[tab,chatMsgs]);

  // ── Sync treinos mensais do usuário no squad ───────────────
  useEffect(()=>{
    if(!squadId||!uid||!userName) return;
    const syncTreinos = async ()=>{
      try {
        const histSnap = await getDoc(doc(db,'users',uid,'data','history'));
        if(!histSnap.exists()) return;
        const hist = JSON.parse(histSnap.data().payload||'{}');
        const mes = mesAtual();
        const treinos = Object.keys(hist).filter(d=>d.startsWith(mes)).length;
        await setDoc(
          doc(db,'squads',squadId,'rank',mes,'scores',uid),
          {treinos, nome:userName, initials:userInitials, uid, updatedAt:Date.now()},
          {merge:true}
        );
        // Atualizar último treino no perfil do membro
        const datas = Object.keys(hist).sort().reverse();
        if(datas.length>0){
          await setDoc(
            doc(db,'squads',squadId,'membros',uid),
            {ultimoTreino: datas[0]===hoje()?'Hoje':datas[0]},
            {merge:true}
          );
        }
      } catch(e){ console.error(e); }
    };
    syncTreinos();
  },[squadId,uid,userName,userInitials]);

  // ── Criar squad ────────────────────────────────────────────
  const criarSquad = async ()=>{
    if(!nomeInput.trim()||!uid) return;
    setSalvando(true); setErro('');
    try {
      const codigo = gerarCodigo();
      const tag = '#'+nomeInput.trim().toUpperCase().replace(/\s+/g,'').slice(0,8);
      const id = uid+'_squad_'+Date.now();
      const novoSquad: SquadInfo = {
        id, nome:nomeInput.trim().toUpperCase(), tag,
        descricao:'Treinamos juntos, evoluímos juntos.',
        maxMembros:20, donoUid:uid, dono:userName,
        codigo, temSenha:!!senhaNovoInput.trim(), membros:1,
        criadoEm:Date.now(),
      };
      // Cria squad
      await setDoc(doc(db,'squads',id), novoSquad);
      if(senhaNovoInput.trim()){
        await setDoc(doc(db,'squads',id,'privado','senha'),{hash:senhaNovoInput.trim()});
      }
      // Adiciona criador como membro
      await setDoc(doc(db,'squads',id,'membros',uid),{
        uid, nome:userName, initials:userInitials,
        dono:true, entrou:Date.now(), ultimoTreino:'',
      });
      // Salva referência no perfil do usuário
      await setDoc(doc(db,'users',uid,'data','squad'),{
        squadId:id, entrou:Date.now(), dono:true,
      });
      setSquadId(id);
      setShowCriar(false); setNomeInput(''); setSenhaNovoInput('');
      showToast('Squad criado!');
    } catch(e){ setErro('Erro ao criar squad. Tente novamente.'); }
    setSalvando(false);
  };

  // ── Entrar no squad ────────────────────────────────────────
  const entrarSquad = async ()=>{
    const code = codigoInput.trim().toUpperCase();
    if(!code||!uid){ setErro('Digite um código'); return; }
    setSalvando(true); setErro('');
    try {
      // Busca squad pelo código
      const q = query(collection(db,'squads'), where('codigo','==',code), limit(1));
      const snap = await getDocs(q);
      if(snap.empty){ setErro('Squad não encontrado'); setSalvando(false); return; }

      const squadDoc = snap.docs[0];
      const squadData = squadDoc.data() as SquadInfo;

      // Verifica senha se tiver
      if(squadData.temSenha){
        const senhaSnap = await getDoc(doc(db,'squads',squadDoc.id,'privado','senha'));
        const hashSalvo = senhaSnap.exists()?senhaSnap.data().hash:'';
        if(senhaInput.trim()!==hashSalvo){
          setErro('Senha incorreta'); setSalvando(false); return;
        }
      }

      // Verifica se já é membro
      const membroSnap = await getDoc(doc(db,'squads',squadDoc.id,'membros',uid));
      if(!membroSnap.exists()){
        // Adiciona como membro
        await setDoc(doc(db,'squads',squadDoc.id,'membros',uid),{
          uid, nome:userName, initials:userInitials,
          dono:false, entrou:Date.now(), ultimoTreino:'',
        });
        // Atualiza contador de membros
        await updateDoc(doc(db,'squads',squadDoc.id),{
          membros: (squadData.membros||0)+1,
        });
      }

      // Salva no perfil do usuário
      await setDoc(doc(db,'users',uid,'data','squad'),{
        squadId:squadDoc.id, entrou:Date.now(), dono:false,
      });
      setSquadId(squadDoc.id);
      setShowEntrar(false); setCodigoInput(''); setSenhaInput('');
      showToast('Bem-vindo ao squad!');
    } catch(e){ setErro('Erro ao entrar. Tente novamente.'); }
    setSalvando(false);
  };

  // ── Enviar mensagem ────────────────────────────────────────
  const enviarMsg = async ()=>{
    if(!msg.trim()||!squadId||!uid) return;
    const texto = msg.trim();
    setMsg('');
    try {
      await addDoc(collection(db,'squads',squadId,'chat'),{
        uid, nome:userName, initials:userInitials,
        msg:texto, criadoEm:serverTimestamp(),
      });
    } catch(e){ setMsg(texto); }
  };

  // ── Check-in ───────────────────────────────────────────────
  const doCheckin = async ()=>{
    if(checkinFeito||!squadId||!uid) return;
    setCheckin(true);
    try {
      await addDoc(collection(db,'squads',squadId,'checkins'),{
        uid, nome:userName, initials:userInitials,
        data:hoje(), criadoEm:serverTimestamp(),
      });
      await setDoc(doc(db,'users',uid,'data','squad'),{
        checkinHoje:hoje(),
      },{merge:true});
      // Post no chat automático
      await addDoc(collection(db,'squads',squadId,'chat'),{
        uid:'system', nome:'Sistema', initials:'DS',
        msg:`${userName} marcou presença hoje!`,
        criadoEm:serverTimestamp(),
      });
    } catch(e){ setCheckin(false); }
    showToast('Presença marcada!');
  };

  // ── Sair do squad ──────────────────────────────────────────
  const sairDoSquad = async ()=>{
    if(!uid||!squadId) return;
    try {
      await setDoc(doc(db,'users',uid,'data','squad'),{squadId:null},{merge:true});
    } catch(_){}
    setSquadId(null); setSquad(null);
    setMembros([]); setChatMsgs([]); setRanking([]);
    showToast('Saiu do squad');
  };

  const copiarCodigo = ()=>{
    navigator.clipboard?.writeText(squad?.codigo||'').catch(()=>{});
    setCopiado(true); setTimeout(()=>setCopiado(false),2000);
    showToast('Código copiado!');
  };

  const checkinCount = membros.filter(m=>m.checkinHoje).length + (checkinFeito&&!membros.find(m=>m.uid===uid)?.checkinHoje?1:0);

  const TABS: {id:Tab;label:string;Icon:any;badge?:number}[] = [
    {id:'feed',     label:'Feed',    Icon:RocketLaunch},
    {id:'ranking',  label:'Rank',    Icon:Trophy      },
    {id:'chat',     label:'Chat',    Icon:ChatCircle  },
    {id:'desafios', label:'Desafios',Icon:Flag        },
    {id:'membros',  label:'Time',    Icon:UsersThree  },
    {id:'global',   label:'Global',  Icon:Globe       },
  ];

  // ── Loading ────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  // ── Sem squad ──────────────────────────────────────────────
  if(!squadId) return (
    <PageShell>
      <AnimatePresence>
        {/* Modal entrar */}
        {showEntrar && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.9)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}}
            onClick={e=>{if(e.target===e.currentTarget){setShowEntrar(false);setErro('');}}}>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:300,damping:32}}
              style={{background:'#0f0f13',borderTop:'1px solid #2e2e38',borderRadius:'24px 24px 0 0',width:'100%',padding:'1.5rem'}}>
              <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2,margin:'0 auto 1rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.5rem'}}>
                <Link2 size={18} color="#e31b23"/> Entrar com código
              </div>
              <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:4}}>Código do Squad</label>
              <input value={codigoInput} onChange={e=>{setCodigoInput(e.target.value.toUpperCase());setErro('');}}
                placeholder="Ex: DWAR2026"
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:`1px solid ${erro?'rgba(227,27,35,.5)':'#2e2e38'}`,borderRadius:10,color:'#f0f0f2',padding:'12px 13px',fontSize:'1.2rem',outline:'none',fontFamily:'monospace',letterSpacing:'.15em',marginBottom:'.65rem'}}/>
              <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:4}}>Senha <span style={{color:'#484858',fontWeight:400,fontSize:'.58rem',textTransform:'none'}}>(se o squad tiver)</span></label>
              <div style={{position:'relative',marginBottom:'1rem'}}>
                <input value={senhaInput} onChange={e=>{setSenhaInput(e.target.value);setErro('');}}
                  type={mostrarSenha?'text':'password'} placeholder="Deixe em branco se não tiver"
                  style={{width:'100%',background:'rgba(0,0,0,.4)',border:`1px solid ${erro?'rgba(227,27,35,.5)':'#2e2e38'}`,borderRadius:10,color:'#f0f0f2',padding:'12px 40px 12px 13px',fontSize:'1rem',outline:'none'}}/>
                <button onClick={()=>setMostrarSenha(v=>!v)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#484858',cursor:'pointer',outline:'none',display:'flex',alignItems:'center'}}>
                  {mostrarSenha?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              {erro&&<div style={{display:'flex',alignItems:'center',gap:'.4rem',color:'#e31b23',fontSize:'.78rem',marginBottom:'.75rem'}}><AlertCircle size={14}/>{erro}</div>}
              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.97}} onClick={()=>{setShowEntrar(false);setErro('');setCodigoInput('');setSenhaInput('');}}
                  style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
                  Cancelar
                </motion.button>
                <motion.button whileTap={{scale:.97}} onClick={entrarSquad} disabled={salvando||!codigoInput.trim()}
                  style={{flex:2,background:codigoInput.trim()?'linear-gradient(135deg,#e31b23,#b31217)':'rgba(227,27,35,.2)',border:'none',borderRadius:10,padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:codigoInput.trim()?'pointer':'not-allowed',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  {salvando?<Loader2 size={16} className="animate-spin"/>:<><UserPlus size={16}/> Entrar</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal criar */}
        {showCriar && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.9)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}}
            onClick={e=>{if(e.target===e.currentTarget){setShowCriar(false);setErro('');}}}>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:300,damping:32}}
              style={{background:'#0f0f13',borderTop:'1px solid #2e2e38',borderRadius:'24px 24px 0 0',width:'100%',padding:'1.5rem',maxHeight:'85vh',overflowY:'auto'}}>
              <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2,margin:'0 auto 1rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.5rem'}}>
                <Sword size={18} color="#e31b23" weight="fill"/> Criar Squad
              </div>
              <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:4}}>Nome do Squad</label>
              <input value={nomeInput} onChange={e=>{setNomeInput(e.target.value);setErro('');}}
                placeholder="Ex: Dark Warriors" maxLength={24}
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'12px 13px',fontSize:'1.1rem',outline:'none',marginBottom:'.75rem'}}/>
              <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:'.4rem',marginBottom:4}}>
                <Lock size={11}/> Senha <span style={{color:'#484858',fontWeight:400,fontSize:'.58rem',textTransform:'none'}}>(opcional)</span>
              </label>
              <div style={{position:'relative',marginBottom:'1rem'}}>
                <input value={senhaNovoInput} onChange={e=>setSenhaNovoInput(e.target.value)}
                  type={mostrarSenha?'text':'password'} placeholder="Deixe em branco para squad aberto"
                  maxLength={20}
                  style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'12px 40px 12px 13px',fontSize:'1rem',outline:'none'}}/>
                <button onClick={()=>setMostrarSenha(v=>!v)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#484858',cursor:'pointer',outline:'none',display:'flex',alignItems:'center'}}>
                  {mostrarSenha?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              <div style={{background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:10,padding:'.65rem',marginBottom:'1rem',fontSize:'.7rem',color:'#7a7a8a',lineHeight:1.6,display:'flex',gap:'.4rem'}}>
                <Link2 size={13} style={{flexShrink:0,marginTop:2}}/> Um código único será gerado para você convidar os membros.
              </div>
              {erro&&<div style={{display:'flex',alignItems:'center',gap:'.4rem',color:'#e31b23',fontSize:'.78rem',marginBottom:'.75rem'}}><AlertCircle size={14}/>{erro}</div>}
              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.97}} onClick={()=>{setShowCriar(false);setErro('');setNomeInput('');setSenhaNovoInput('');}}
                  style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
                  Cancelar
                </motion.button>
                <motion.button whileTap={{scale:.97}} onClick={criarSquad} disabled={!nomeInput.trim()||salvando}
                  style={{flex:2,background:nomeInput.trim()?'linear-gradient(135deg,#e31b23,#b31217)':'rgba(227,27,35,.2)',border:'none',borderRadius:10,padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:nomeInput.trim()?'pointer':'not-allowed',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  {salvando?<Loader2 size={16}/>:<><Sword size={16} weight="fill"/> Criar</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tela sem squad */}
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

  // ── Com squad ──────────────────────────────────────────────
  return (
    <PageShell>
      {/* Toast */}
      <AnimatePresence>
        {toast&&(
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:300,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'.4rem',pointerEvents:'none'}}>
            <CheckCircle2 size={14}/>{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal código */}
      <AnimatePresence>
        {showCodigo&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.9)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}
            onClick={e=>{if(e.target===e.currentTarget)setShowCodigo(false);}}>
            <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.9,opacity:0}}
              style={{background:'#0f0f13',border:'1px solid #2e2e38',borderRadius:20,padding:'1.5rem',width:'100%',maxWidth:340,textAlign:'center'}}>
              <Link2 size={32} color="#e31b23" style={{margin:'0 auto .75rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.25rem'}}>Código do Squad</div>
              <div style={{fontSize:'.78rem',color:'#7a7a8a',marginBottom:'1.25rem'}}>Compartilhe com seus amigos</div>
              <div style={{fontFamily:'monospace',fontWeight:900,fontSize:'2rem',letterSpacing:'.2em',color:'#e31b23',background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:12,padding:'1rem',marginBottom:'1rem'}}>
                {squad?.codigo||'...'}
              </div>
              {squad?.temSenha&&(
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',fontSize:'.72rem',color:'#facc15',background:'rgba(250,204,21,.08)',border:'1px solid rgba(250,204,21,.2)',borderRadius:8,padding:'.4rem .75rem',marginBottom:'1rem'}}>
                  <Lock size={13}/> Squad com senha
                </div>
              )}
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
          <div style={{position:'absolute',top:-20,right:-20,opacity:.05,pointerEvents:'none'}}>
            <Sword size={120} color="#e31b23" weight="fill"/>
          </div>
          <CardContent style={{padding:'1rem 1.1rem',position:'relative'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.5rem'}}>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#fff',lineHeight:1}}>
                  {squad?.nome||'Carregando...'}
                </div>
                <div style={{fontSize:'.65rem',color:'rgba(227,27,35,.7)',fontWeight:700,marginTop:'2px',letterSpacing:'.06em'}}>
                  {squad?.tag}
                  {squad?.temSenha&&<span style={{marginLeft:'.5rem',color:'#facc15'}}><Lock size={10}/></span>}
                </div>
              </div>
              <motion.button whileTap={{scale:.95}} onClick={()=>setShowCodigo(true)}
                style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'.35rem .7rem',color:'#9898a8',fontSize:'.72rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem'}}>
                <Link2 size={13}/> Convidar
              </motion.button>
            </div>
            <div style={{fontSize:'.75rem',color:'rgba(255,255,255,.4)',marginBottom:'.6rem'}}>{squad?.descricao}</div>
            <Separator style={{background:'rgba(255,255,255,.08)',marginBottom:'.6rem'}}/>
            <div style={{display:'flex',gap:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.7rem',color:'#9898a8'}}>
                <Users size={13}/> {membros.length}/{squad?.maxMembros||20}
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
        <motion.button whileTap={checkinFeito?{}:{scale:.98}} onClick={doCheckin} style={{
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
          const TIcon=t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.95}} onClick={()=>setTab(t.id)} style={{
              flex:1,padding:'.44rem .2rem',borderRadius:9,border:'none',cursor:'pointer',
              background:tab===t.id?'rgba(227,27,35,.15)':'transparent',
              color:tab===t.id?'#e31b23':'#484858',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
              fontSize:'.62rem',letterSpacing:'.03em',position:'relative',
              boxShadow:tab===t.id?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',
              outline:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:'.12rem',
            }}>
              <TIcon size={15} weight={tab===t.id?'fill':'regular'} color={tab===t.id?'#e31b23':'#484858'}/>
              {t.label}
              {t.badge&&<span style={{position:'absolute',top:2,right:4,background:'#e31b23',color:'#fff',borderRadius:'999px',fontSize:'.45rem',fontWeight:900,padding:'1px 4px',minWidth:13,textAlign:'center'}}>{t.badge}</span>}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Conteúdo */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

          {/* FEED */}
          {tab==='feed'&&(
            <div style={{display:'grid',gap:'.5rem'}}>
              {chatMsgs.length===0&&(
                <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:12}}>
                  <CardContent style={{padding:'2rem',textAlign:'center'}}>
                    <RocketLaunch size={36} color="#484858" style={{margin:'0 auto .5rem'}}/>
                    <div style={{fontSize:'.82rem',color:'#484858'}}>Nenhuma atividade ainda</div>
                    <div style={{fontSize:'.72rem',color:'#484858',marginTop:'.25rem'}}>Faça check-in para começar!</div>
                  </CardContent>
                </Card>
              )}
              {[...chatMsgs].reverse().slice(0,20).reverse().map((f,i)=>(
                <motion.div key={f.id} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*.03}}>
                  <Card style={{background:'rgba(255,255,255,.02)',border:'1px solid #1a1a20',borderRadius:12}}>
                    <CardContent style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <Avatar initials={f.initials==='DS'?'DS':f.initials} size={38} cor={f.uid==='system'?'#484858':'#e31b23'}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',color:'#f0f0f2'}}>{f.nome}</div>
                        <div style={{fontSize:'.75rem',color:'#9898a8',marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.msg}</div>
                      </div>
                      <div style={{fontSize:'.62rem',color:'#2e2e38',flexShrink:0,display:'flex',alignItems:'center',gap:'.2rem'}}>
                        <Clock size={10}/>{f.tempo}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* RANKING */}
          {tab==='ranking'&&(
            <div style={{display:'grid',gap:'.5rem'}}>
              <Card style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:12,marginBottom:'.25rem'}}>
                <CardContent style={{padding:'.75rem 1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',color:'#fff'}}>
                      {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}
                    </div>
                    <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'1px',display:'flex',alignItems:'center',gap:'.3rem'}}><Dumbbell size={11}/> Treinos no mês</div>
                  </div>
                  <Badge style={{background:'rgba(250,204,21,.1)',color:'#facc15',border:'1px solid rgba(250,204,21,.2)',fontSize:'.65rem'}}>AO VIVO</Badge>
                </CardContent>
              </Card>
              {(ranking.length>0?ranking:membros.map(m=>({...m,isMe:m.uid===uid}))).map((m,i)=>{
                const max=ranking[0]?.treinos||1;
                const barW=Math.max(4,Math.round((m.treinos/max)*100));
                return (
                  <motion.div key={m.uid} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}>
                    <Card style={{background:m.isMe?'rgba(227,27,35,.06)':i===0?'rgba(250,204,21,.04)':'rgba(255,255,255,.015)',border:m.isMe?'1px solid rgba(227,27,35,.25)':i===0?'1px solid rgba(250,204,21,.15)':'1px solid #1a1a20',borderRadius:14,overflow:'hidden',position:'relative'}}>
                      <div style={{position:'absolute',left:0,top:0,bottom:0,width:barW+'%',background:i===0?'rgba(250,204,21,.05)':m.isMe?'rgba(227,27,35,.06)':'rgba(255,255,255,.02)',pointerEvents:'none'}}/>
                      <CardContent style={{padding:'.85rem 1rem',position:'relative',display:'flex',alignItems:'center',gap:'.75rem'}}>
                        <div style={{width:26,textAlign:'center',flexShrink:0}}>
                          {i===0?<Crown size={20} color="#facc15" style={{margin:'0 auto'}}/>:
                           i===1?<Medal size={18} color="#c0c0c0" style={{margin:'0 auto'}}/>:
                           i===2?<Medal size={18} color="#cd7f32" style={{margin:'0 auto'}}/>:
                           <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#484858'}}>{i+1}</span>}
                        </div>
                        <Avatar initials={m.initials} size={36} cor={m.isMe?'#e31b23':i===0?'#facc15':'#e31b23'}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:m.isMe?'#e31b23':i===0?'#facc15':'#f0f0f2',display:'flex',alignItems:'center',gap:'.4rem',flexWrap:'wrap'}}>
                            {m.nome}
                            {m.isMe&&<Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.48rem',padding:'0 4px'}}>você</Badge>}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:m.isMe?'#e31b23':i===0?'#facc15':'#f0f0f2',lineHeight:1}}>{m.treinos}</div>
                          <div style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>treinos</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {ranking.length===0&&(
                <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:12}}>
                  <CardContent style={{padding:'2rem',textAlign:'center'}}>
                    <Trophy size={36} color="#484858" style={{margin:'0 auto .5rem'}}/>
                    <div style={{fontSize:'.82rem',color:'#484858'}}>Nenhum treino registrado este mês</div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* CHAT */}
          {tab==='chat'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
              <div ref={chatRef} style={{display:'grid',gap:'.5rem',maxHeight:'52vh',overflowY:'auto',paddingBottom:'.25rem'}}>
                {chatMsgs.length===0&&(
                  <div style={{textAlign:'center',padding:'2rem',color:'#484858',fontSize:'.82rem'}}>
                    Nenhuma mensagem ainda. Seja o primeiro!
                  </div>
                )}
                {chatMsgs.map((c,i)=>(
                  <motion.div key={c.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.02,.3)}}
                    style={{display:'flex',alignItems:'flex-end',gap:'.5rem',flexDirection:c.meu?'row-reverse':'row'}}>
                    {!c.meu&&<Avatar initials={c.initials} size={30} cor={c.uid==='system'?'#484858':'#e31b23'}/>}
                    <div style={{maxWidth:'75%'}}>
                      {!c.meu&&<div style={{fontSize:'.58rem',color:'#7a7a8a',marginBottom:'2px',marginLeft:'4px'}}>{c.nome}</div>}
                      <div style={{
                        background:c.uid==='system'?'rgba(255,255,255,.04)':c.meu?'rgba(227,27,35,.15)':'rgba(255,255,255,.06)',
                        border:`1px solid ${c.uid==='system'?'#2e2e38':c.meu?'rgba(227,27,35,.25)':'#2e2e38'}`,
                        borderRadius:c.meu?'14px 14px 4px 14px':c.uid==='system'?'10px':'14px 14px 14px 4px',
                        padding:'.6rem .85rem',
                      }}>
                        <div style={{fontSize:'.85rem',color:c.uid==='system'?'#7a7a8a':'#f0f0f2',lineHeight:1.4,fontStyle:c.uid==='system'?'italic':'normal'}}>{c.msg}</div>
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
                  style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'10px 14px',color:'#fff',cursor:'pointer',outline:'none',display:'flex',alignItems:'center'}}>
                  <Send size={18}/>
                </motion.button>
              </div>
            </div>
          )}

          {/* DESAFIOS */}
          {tab==='desafios'&&(
            <div style={{display:'grid',gap:'.65rem'}}>
              <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'.25rem'}}>
                <Flag size={11} color="#7a7a8a" weight="fill"/> Desafios desta semana — renovam automaticamente
              </div>
              {desafios.map((d,i)=>(
                <motion.div key={d.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
                  <Card style={{background:'#1e1e24',border:'1px solid rgba(227,27,35,.2)',borderRadius:14}}>
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
                        <Badge style={{background:'rgba(34,197,94,.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,.3)',fontSize:'.52rem',flexShrink:0,marginLeft:'.5rem'}}>ATIVO</Badge>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.5rem .65rem',background:'rgba(0,0,0,.25)',borderRadius:9}}>
                        <div style={{fontSize:'.7rem',color:'#9898a8',display:'flex',alignItems:'center',gap:'.3rem'}}>
                          <Crown size={12} color="#facc15"/> <span style={{color:'#facc15',fontWeight:700}}>{d.lider}</span>
                        </div>
                        <div style={{fontSize:'.65rem',color:'#484858',display:'flex',alignItems:'center',gap:'.2rem'}}>
                          <Clock size={11}/> Até {d.fim}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              <div style={{background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:12,padding:'.75rem',fontSize:'.72rem',color:'#484858',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                <Flag size={13} weight="fill"/> Os desafios mudam todo domingo automaticamente
              </div>
            </div>
          )}

          {/* MEMBROS */}
          {tab==='membros'&&(
            <div style={{display:'grid',gap:'.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.25rem'}}>
                <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',display:'flex',alignItems:'center',gap:'.3rem'}}>
                  <Users size={11}/> {membros.length}/{squad?.maxMembros||20} membros
                </div>
                <motion.button whileTap={{scale:.95}} onClick={()=>setShowCodigo(true)}
                  style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:8,padding:'.3rem .7rem',color:'#e31b23',fontSize:'.72rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem'}}>
                  <UserPlus size={13}/> Convidar
                </motion.button>
              </div>
              {membros.length===0&&(
                <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:12}}>
                  <CardContent style={{padding:'2rem',textAlign:'center'}}>
                    <UsersThree size={36} color="#484858" style={{margin:'0 auto .5rem'}}/>
                    <div style={{fontSize:'.82rem',color:'#484858'}}>Nenhum membro ainda</div>
                    <div style={{fontSize:'.72rem',color:'#484858',marginTop:'.25rem'}}>Convide seus amigos com o código!</div>
                  </CardContent>
                </Card>
              )}
              {membros.map((m,i)=>(
                <motion.div key={m.uid} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                  <Card style={{background:'rgba(255,255,255,.02)',border:'1px solid #1a1a20',borderRadius:12}}>
                    <CardContent style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <Avatar initials={m.initials} size={38}/>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.4rem',flexWrap:'wrap'}}>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{m.nome}</span>
                          {m.dono&&<Badge style={{background:'rgba(250,204,21,.1)',color:'#facc15',border:'1px solid rgba(250,204,21,.2)',fontSize:'.5rem',display:'flex',alignItems:'center',gap:'.2rem'}}><Crown size={9}/> Dono</Badge>}
                          {m.uid===uid&&<Badge variant="outline" style={{borderColor:'rgba(227,27,35,.3)',color:'#e31b23',fontSize:'.5rem'}}>você</Badge>}
                        </div>
                        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'1px',display:'flex',alignItems:'center',gap:'.3rem'}}>
                          <Clock size={10}/> {m.ultimo}
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        {m.checkinHoje
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
