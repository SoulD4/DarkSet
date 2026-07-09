'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import PageHeader from '@/components/core/PageHeader';
import EmptyState from '@/components/core/EmptyState';
import { useToast, ToastViewport } from '@/components/core/Toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, addDoc, collection,
  onSnapshot, query, orderBy, limit,
  serverTimestamp, where, getDocs,
  updateDoc
} from 'firebase/firestore';
import {
  Users, Link2, Copy, Check, LogOut,
  Send, Trophy, Flame, MessageCircle, Clock,
  Dumbbell, CheckCircle2, UserPlus,
  Medal, Target, Crown, Activity,
  Lock, Eye, EyeOff, Loader2, AlertCircle,
  Swords, Rocket, Flag
} from 'lucide-react';

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
type Tab = 'feed'|'ranking'|'chat'|'desafios'|'membros';

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
type AvatarTone = 'accent'|'muted'|'gold';
const AVATAR_TONES: Record<AvatarTone,string> = {
  accent: 'bg-accent-soft border-accent/30 text-accent',
  muted:  'bg-surface-3 border-line text-ink-3',
  gold:   'bg-warn-soft border-warn/30 text-warn',
};
function Avatar({initials,size=36,tone='accent'}:{initials:string;size?:number;tone?:AvatarTone}) {
  return (
    <div
      style={{width:size,height:size,fontSize:size*0.36}}
      className={`rounded-full border flex items-center justify-center shrink-0 font-display font-bold ${AVATAR_TONES[tone]}`}
    >
      {initials}
    </div>
  );
}

function DesafioIcon({tipo}:{tipo:string}) {
  if(tipo==='treino') return <Dumbbell size={20} className="text-accent"/>;
  if(tipo==='cardio') return <Activity size={20} className="text-info"/>;
  if(tipo==='streak') return <Flame    size={20} className="text-warn"/>;
  if(tipo==='pr')     return <Trophy   size={20} className="text-ok"/>;
  return <Target size={20} className="text-ink-3"/>;
}

function FieldLabel({children}:{children:React.ReactNode}) {
  return <label className="eyebrow flex items-center gap-1.5 mb-1.5">{children}</label>;
}

function ErroInline({msg}:{msg:string}) {
  if(!msg) return null;
  return (
    <div className="flex items-center gap-1.5 text-danger text-[0.78rem] mb-3">
      <AlertCircle size={14}/>{msg}
    </div>
  );
}

/** Bottom-sheet padrão */
function Sheet({onClose,children}:{onClose:()=>void;children:React.ReactNode}) {
  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[200] bg-bg/85 backdrop-blur-sm flex items-end"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:300,damping:32}}
        className="bg-surface-1 border-t border-line rounded-t-3xl w-full p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-4"/>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function DarkSquadPage() {
  const router = useRouter();

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
  const chatRef = useRef<HTMLDivElement>(null);

  const { toast, show } = useToast();

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
      // Adicionar criador localmente imediatamente
      setMembros([{
        uid, nome:userName, initials:userInitials,
        treinos:0, checkinHoje:false, ultimo:'Hoje', dono:true,
      }]);
      show('Squad criado!');
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
      show('Bem-vindo ao squad!');
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
    show('Presença marcada!');
  };

  // ── Sair do squad ──────────────────────────────────────────
  const sairDoSquad = async ()=>{
    if(!uid||!squadId) return;
    try {
      await setDoc(doc(db,'users',uid,'data','squad'),{squadId:null},{merge:true});
    } catch(_){}
    setSquadId(null); setSquad(null);
    setMembros([]); setChatMsgs([]); setRanking([]);
    show('Saiu do squad');
  };

  const copiarCodigo = ()=>{
    navigator.clipboard?.writeText(squad?.codigo||'').catch(()=>{});
    setCopiado(true); setTimeout(()=>setCopiado(false),2000);
    show('Código copiado!');
  };

  const checkinCount = membros.filter(m=>m.checkinHoje).length + (checkinFeito&&!membros.find(m=>m.uid===uid)?.checkinHoje?1:0);

  const TABS: {id:Tab;label:string;Icon:any;badge?:number}[] = [
    {id:'feed',     label:'Feed',    Icon:Rocket       },
    {id:'ranking',  label:'Rank',    Icon:Trophy       },
    {id:'chat',     label:'Chat',    Icon:MessageCircle},
    {id:'desafios', label:'Desafios',Icon:Flag         },
    {id:'membros',  label:'Time',    Icon:Users        },
  ];

  // ── Loading ────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  // ── Não logado ─────────────────────────────────────────────
  if(!uid) return (
    <PageShell>
      <PageHeader title="DarkSquad" subtitle="Treine em grupo e compita no ranking"/>
      <EmptyState
        icon={<Swords size={40}/>}
        title="Faça login para acessar"
        subtitle="Entre na sua conta para criar ou participar de um squad."
        action={<Button onClick={()=>router.push('/login')}>Entrar</Button>}
      />
    </PageShell>
  );

  // ── Sem squad ──────────────────────────────────────────────
  if(!squadId) return (
    <PageShell>
      <ToastViewport toast={toast}/>
      <AnimatePresence>
        {/* Modal entrar */}
        {showEntrar && (
          <Sheet onClose={()=>{setShowEntrar(false);setErro('');}}>
            <div className="font-display font-bold text-xl text-ink-1 mb-4 flex items-center gap-2">
              <Link2 size={18} className="text-accent"/> Entrar com código
            </div>
            <FieldLabel>Código do Squad</FieldLabel>
            <input
              value={codigoInput}
              onChange={e=>{setCodigoInput(e.target.value.toUpperCase());setErro('');}}
              placeholder="Ex: DWAR2026"
              className={`field font-mono tracking-[0.15em] text-lg mb-3 ${erro?'border-danger/50':''}`}
            />
            <FieldLabel>Senha <span className="text-ink-3 font-normal normal-case tracking-normal">(se o squad tiver)</span></FieldLabel>
            <div className="relative mb-4">
              <input
                value={senhaInput}
                onChange={e=>{setSenhaInput(e.target.value);setErro('');}}
                type={mostrarSenha?'text':'password'}
                placeholder="Deixe em branco se não tiver"
                className={`field pr-11 ${erro?'border-danger/50':''}`}
              />
              <button
                onClick={()=>setMostrarSenha(v=>!v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 flex items-center"
                aria-label={mostrarSenha?'Ocultar senha':'Mostrar senha'}
              >
                {mostrarSenha?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            <ErroInline msg={erro}/>
            <div className="flex gap-2.5">
              <Button variant="ghost" className="flex-1" onClick={()=>{setShowEntrar(false);setErro('');setCodigoInput('');setSenhaInput('');}}>
                Cancelar
              </Button>
              <Button className="flex-[2]" onClick={entrarSquad} disabled={salvando||!codigoInput.trim()}>
                {salvando?<Loader2 size={16} className="animate-spin"/>:<><UserPlus size={16}/> Entrar</>}
              </Button>
            </div>
          </Sheet>
        )}

        {/* Modal criar */}
        {showCriar && (
          <Sheet onClose={()=>{setShowCriar(false);setErro('');}}>
            <div className="font-display font-bold text-xl text-ink-1 mb-4 flex items-center gap-2">
              <Swords size={18} className="text-accent"/> Criar Squad
            </div>
            <FieldLabel>Nome do Squad</FieldLabel>
            <input
              value={nomeInput}
              onChange={e=>{setNomeInput(e.target.value);setErro('');}}
              placeholder="Ex: Dark Warriors" maxLength={24}
              className="field mb-3"
            />
            <FieldLabel>
              <Lock size={11}/> Senha <span className="text-ink-3 font-normal normal-case tracking-normal">(opcional)</span>
            </FieldLabel>
            <div className="relative mb-4">
              <input
                value={senhaNovoInput}
                onChange={e=>setSenhaNovoInput(e.target.value)}
                type={mostrarSenha?'text':'password'}
                placeholder="Deixe em branco para squad aberto"
                maxLength={20}
                className="field pr-11"
              />
              <button
                onClick={()=>setMostrarSenha(v=>!v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 flex items-center"
                aria-label={mostrarSenha?'Ocultar senha':'Mostrar senha'}
              >
                {mostrarSenha?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            <div className="card-2 p-3 mb-4 text-[0.72rem] text-ink-2 leading-relaxed flex gap-2">
              <Link2 size={13} className="shrink-0 mt-0.5"/> Um código único será gerado para você convidar os membros.
            </div>
            <ErroInline msg={erro}/>
            <div className="flex gap-2.5">
              <Button variant="ghost" className="flex-1" onClick={()=>{setShowCriar(false);setErro('');setNomeInput('');setSenhaNovoInput('');}}>
                Cancelar
              </Button>
              <Button className="flex-[2]" onClick={criarSquad} disabled={!nomeInput.trim()||salvando}>
                {salvando?<Loader2 size={16} className="animate-spin"/>:<><Swords size={16}/> Criar</>}
              </Button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Tela sem squad */}
      <motion.div
        initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
        className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-5 p-4"
      >
        <motion.div animate={{scale:[1,1.08,1]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}>
          <Swords size={56} className="text-accent"/>
        </motion.div>
        <div>
          <div className="font-display font-bold text-[2rem] leading-none tracking-tight text-ink-1">
            Dark<span className="text-accent">Squad</span>
          </div>
          <p className="text-[0.88rem] text-ink-2 max-w-[280px] leading-relaxed mt-2 mx-auto">
            Treine em grupo, compita no ranking e motive uns aos outros
          </p>
        </div>
        <div className="grid gap-2.5 w-full max-w-[300px]">
          <Button full size="lg" onClick={()=>setShowCriar(true)}>
            <Swords size={18}/> Criar Squad
          </Button>
          <Button full size="lg" variant="ghost" onClick={()=>setShowEntrar(true)}>
            <Link2 size={18}/> Entrar com código
          </Button>
        </div>
      </motion.div>
    </PageShell>
  );

  // ── Com squad ──────────────────────────────────────────────
  return (
    <PageShell>
      <ToastViewport toast={toast}/>

      {/* Modal código */}
      <AnimatePresence>
        {showCodigo&&(
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[200] bg-bg/85 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={e=>{if(e.target===e.currentTarget)setShowCodigo(false);}}
          >
            <motion.div
              initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.9,opacity:0}}
              className="card p-6 w-full max-w-[340px] text-center shadow-float"
            >
              <Link2 size={32} className="text-accent mx-auto mb-3"/>
              <div className="font-display font-bold text-xl text-ink-1 mb-1">Código do Squad</div>
              <div className="text-[0.78rem] text-ink-2 mb-5">Compartilhe com seus amigos</div>
              <div className="font-mono font-bold text-[2rem] tracking-[0.2em] text-accent bg-accent-soft border border-accent/30 rounded-xl p-4 mb-4 tnum">
                {squad?.codigo||'...'}
              </div>
              {squad?.temSenha&&(
                <div className="flex items-center justify-center gap-1.5 text-[0.72rem] text-warn bg-warn-soft border border-warn/30 rounded-lg px-3 py-1.5 mb-4">
                  <Lock size={13}/> Squad com senha
                </div>
              )}
              <div className="flex gap-2.5">
                <Button variant="soft" className="flex-1" size="sm" onClick={copiarCodigo}>
                  {copiado?<><Check size={15}/> Copiado!</>:<><Copy size={15}/> Copiar</>}
                </Button>
                <Button variant="ghost" className="flex-1" size="sm" onClick={()=>setShowCodigo(false)}>
                  Fechar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header squad */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
        <div className="card relative overflow-hidden mb-3 border-accent/30">
          <div className="absolute -top-5 -right-5 opacity-[0.05] pointer-events-none text-accent">
            <Swords size={120}/>
          </div>
          <div className="relative p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <div className="font-display font-bold text-2xl leading-none tracking-tight text-ink-1 truncate">
                  {squad?.nome||'Carregando...'}
                </div>
                <div className="text-[0.68rem] text-accent font-bold tracking-wide mt-1 flex items-center gap-1.5">
                  {squad?.tag}
                  {squad?.temSenha&&<Lock size={10} className="text-warn"/>}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0 ml-2" onClick={()=>setShowCodigo(true)}>
                <Link2 size={13}/> Convidar
              </Button>
            </div>
            <div className="text-[0.75rem] text-ink-2 mb-2.5">{squad?.descricao}</div>
            <div className="border-t border-line pt-2.5 flex gap-4">
              <div className="flex items-center gap-1.5 text-[0.7rem] text-ink-2">
                <Users size={13}/> <span className="tnum">{membros.length}/{squad?.maxMembros||20}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[0.7rem] text-ink-2">
                <CheckCircle2 size={13}/> <span className="tnum">{checkinCount}</span> check-ins hoje
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Check-in */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.08}}>
        <motion.button
          whileTap={checkinFeito?undefined:{scale:.98}}
          onClick={doCheckin}
          className={`w-full mb-3 rounded-2xl p-4 flex items-center justify-between transition-colors ${
            checkinFeito
              ? 'bg-ok-soft border border-ok/30 cursor-default'
              : 'bg-accent text-accent-ink shadow-volt'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              checkinFeito ? 'bg-ok-soft text-ok' : 'bg-accent-ink/10'
            }`}>
              {checkinFeito?<CheckCircle2 size={22}/>:<Dumbbell size={22}/>}
            </div>
            <div className="text-left">
              <div className={`font-display font-bold text-[1.05rem] leading-tight ${checkinFeito?'text-ok':''}`}>
                {checkinFeito?'Presença marcada':'Marcar presença'}
              </div>
              <div className={`text-[0.68rem] mt-0.5 ${checkinFeito?'text-ok/70':'text-accent-ink/70'}`}>
                {checkinFeito?'Você apareceu hoje!':'Mostre pro squad que você foi'}
              </div>
            </div>
          </div>
          <div className={`font-display font-bold text-[2rem] leading-none tnum ${checkinFeito?'text-ok':''}`}>
            {checkinCount}
          </div>
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.12}}
        className="flex card-2 p-[3px] gap-[3px] mb-4"
      >
        {TABS.map(t=>{
          const TIcon=t.Icon;
          const active = tab===t.id;
          return (
            <motion.button
              key={t.id} whileTap={{scale:.95}} onClick={()=>setTab(t.id)}
              className={`flex-1 py-1.5 px-0.5 rounded-lg relative flex flex-col items-center gap-0.5
                font-display font-bold text-[0.62rem] tracking-wide transition-colors ${
                active ? 'bg-accent-soft text-accent border border-accent/30' : 'text-ink-3'
              }`}
            >
              <TIcon size={15}/>
              {t.label}
              {t.badge&&(
                <span className="absolute top-0.5 right-1 bg-accent text-accent-ink rounded-full text-[0.45rem] font-bold px-1 min-w-[13px] text-center tnum">
                  {t.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Conteúdo */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

          {/* FEED */}
          {tab==='feed'&&(
            <div className="grid gap-2">
              {chatMsgs.length===0&&(
                <EmptyState
                  icon={<Rocket size={36}/>}
                  title="Nenhuma atividade ainda"
                  subtitle="Faça check-in para começar!"
                />
              )}
              {[...chatMsgs].reverse().slice(0,20).reverse().map((f,i)=>(
                <motion.div key={f.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.04,.4)}}>
                  <div className="card p-3 flex items-center gap-3">
                    <Avatar initials={f.initials} size={38} tone={f.uid==='system'?'muted':'accent'}/>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-[0.92rem] text-ink-1">{f.nome}</div>
                      <div className="text-[0.75rem] text-ink-2 mt-px truncate">{f.msg}</div>
                    </div>
                    <div className="text-[0.62rem] text-ink-3 shrink-0 flex items-center gap-1 tnum">
                      <Clock size={10}/>{f.tempo}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* RANKING */}
          {tab==='ranking'&&(
            <div className="grid gap-2">
              <div className="card border-accent/30 p-3.5 flex justify-between items-center mb-1">
                <div>
                  <div className="font-display font-bold text-[0.95rem] text-ink-1 uppercase">
                    {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
                  </div>
                  <div className="text-[0.65rem] text-ink-2 mt-0.5 flex items-center gap-1.5">
                    <Dumbbell size={11}/> Treinos no mês
                  </div>
                </div>
                <span className="chip bg-warn-soft border-warn/30 text-warn text-[0.62rem]">AO VIVO</span>
              </div>
              {(ranking.length>0?ranking:membros.map(m=>({...m,isMe:m.uid===uid}))).map((m,i)=>{
                const max=ranking[0]?.treinos||1;
                const barW=Math.max(4,Math.round((m.treinos/max)*100));
                return (
                  <motion.div key={m.uid} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.04,.4)}}>
                    <div className={`card relative overflow-hidden ${
                      m.isMe ? 'border-accent/30' : i===0 ? 'border-warn/30' : ''
                    }`}>
                      <div
                        className={`absolute left-0 top-0 bottom-0 pointer-events-none ${
                          i===0 ? 'bg-warn-soft/50' : m.isMe ? 'bg-accent-soft/50' : 'bg-surface-2/60'
                        }`}
                        style={{width:barW+'%'}}
                      />
                      <div className="relative p-3.5 flex items-center gap-3">
                        <div className="w-[26px] text-center shrink-0 flex justify-center">
                          {i===0?<Crown size={20} className="text-warn"/>:
                           i===1?<Medal size={18} className="text-ink-2"/>:
                           i===2?<Medal size={18} className="text-ink-3"/>:
                           <span className="font-display font-bold text-base text-ink-3 tnum">{i+1}</span>}
                        </div>
                        <Avatar initials={m.initials} size={36} tone={i===0&&!m.isMe?'gold':'accent'}/>
                        <div className="flex-1 min-w-0">
                          <div className={`font-display font-semibold text-[0.95rem] flex items-center gap-2 flex-wrap ${
                            m.isMe ? 'text-accent' : i===0 ? 'text-warn' : 'text-ink-1'
                          }`}>
                            {m.nome}
                            {m.isMe&&<span className="chip chip-active text-[0.55rem] px-1.5 py-0">você</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-display font-bold text-[1.35rem] leading-none tnum ${
                            m.isMe ? 'text-accent' : i===0 ? 'text-warn' : 'text-ink-1'
                          }`}>{m.treinos}</div>
                          <div className="eyebrow mt-0.5">treinos</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {ranking.length===0&&(
                <EmptyState
                  icon={<Trophy size={36}/>}
                  title="Nenhum treino registrado"
                  subtitle="Nenhum treino registrado este mês."
                />
              )}
            </div>
          )}

          {/* CHAT */}
          {tab==='chat'&&(
            <div className="flex flex-col gap-3">
              <div ref={chatRef} className="grid gap-2 max-h-[52vh] overflow-y-auto pb-1">
                {chatMsgs.length===0&&(
                  <div className="text-center p-8 text-ink-3 text-[0.82rem]">
                    Nenhuma mensagem ainda. Seja o primeiro!
                  </div>
                )}
                {chatMsgs.map((c,i)=>(
                  <motion.div
                    key={c.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.02,.3)}}
                    className={`flex items-end gap-2 ${c.meu?'flex-row-reverse':'flex-row'}`}
                  >
                    {!c.meu&&<Avatar initials={c.initials} size={30} tone={c.uid==='system'?'muted':'accent'}/>}
                    <div className="max-w-[75%]">
                      {!c.meu&&<div className="text-[0.6rem] text-ink-3 mb-0.5 ml-1">{c.nome}</div>}
                      <div className={`px-3.5 py-2.5 ${
                        c.uid==='system'
                          ? 'card-2 rounded-xl'
                          : c.meu
                            ? 'bg-accent-soft border border-accent/30 rounded-2xl rounded-br-md'
                            : 'card-2 rounded-2xl rounded-bl-md'
                      }`}>
                        <div className={`text-[0.85rem] leading-snug ${
                          c.uid==='system' ? 'text-ink-2 italic' : 'text-ink-1'
                        }`}>{c.msg}</div>
                        <div className="text-[0.55rem] text-ink-3 mt-1 flex items-center justify-end gap-1 tnum">
                          <Clock size={9}/>{c.tempo}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2 sticky bottom-0 bg-bg pt-2">
                <input
                  value={msg} onChange={e=>setMsg(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&enviarMsg()}
                  placeholder="Mensagem..."
                  className="field flex-1"
                />
                <Button className="px-4 shrink-0" onClick={enviarMsg} aria-label="Enviar mensagem">
                  <Send size={18}/>
                </Button>
              </div>
            </div>
          )}

          {/* DESAFIOS */}
          {tab==='desafios'&&(
            <div className="grid gap-2.5">
              <div className="eyebrow flex items-center gap-1.5 mb-1">
                <Flag size={11}/> Desafios desta semana — renovam automaticamente
              </div>
              {desafios.map((d,i)=>(
                <motion.div key={d.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.04,.4)}}>
                  <div className="card border-accent/30 p-4">
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl card-2 flex items-center justify-center shrink-0">
                          <DesafioIcon tipo={d.tipo}/>
                        </div>
                        <div>
                          <div className="font-display font-bold text-[1rem] leading-tight text-ink-1">{d.nome}</div>
                          <div className="text-[0.68rem] text-ink-2 mt-0.5">{d.desc}</div>
                        </div>
                      </div>
                      <span className="chip bg-ok-soft border-ok/30 text-ok text-[0.55rem] shrink-0 ml-2">ATIVO</span>
                    </div>
                    <div className="flex justify-between items-center px-2.5 py-2 bg-surface-2 rounded-lg">
                      <div className="text-[0.7rem] text-ink-2 flex items-center gap-1.5">
                        <Crown size={12} className="text-warn"/>
                        <span className="text-warn font-semibold">{d.lider}</span>
                      </div>
                      <div className="text-[0.65rem] text-ink-3 flex items-center gap-1">
                        <Clock size={11}/> Até {d.fim}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="card-2 p-3 text-[0.72rem] text-ink-3 text-center flex items-center justify-center gap-1.5">
                <Flag size={13}/> Os desafios mudam todo domingo automaticamente
              </div>
            </div>
          )}

          {/* MEMBROS */}
          {tab==='membros'&&(
            <div className="grid gap-2">
              <div className="flex justify-between items-center mb-1">
                <div className="eyebrow flex items-center gap-1.5">
                  <Users size={11}/> <span className="tnum">{membros.length}/{squad?.maxMembros||20}</span> membros
                </div>
                <Button size="sm" variant="soft" onClick={()=>setShowCodigo(true)}>
                  <UserPlus size={13}/> Convidar
                </Button>
              </div>
              {membros.length===0&&(
                <EmptyState
                  icon={<Users size={36}/>}
                  title="Nenhum membro ainda"
                  subtitle="Convide seus amigos com o código!"
                />
              )}
              {membros.map((m,i)=>(
                <motion.div key={m.uid} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.04,.4)}}>
                  <div className="card p-3 flex items-center gap-3">
                    <Avatar initials={m.initials} size={38}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-[0.95rem] text-ink-1">{m.nome}</span>
                        {m.dono&&(
                          <span className="chip bg-warn-soft border-warn/30 text-warn text-[0.55rem] px-1.5 py-0 gap-1">
                            <Crown size={9}/> Dono
                          </span>
                        )}
                        {m.uid===uid&&<span className="chip chip-active text-[0.55rem] px-1.5 py-0">você</span>}
                      </div>
                      <div className="text-[0.65rem] text-ink-3 mt-0.5 flex items-center gap-1.5">
                        <Clock size={10}/> {m.ultimo}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {m.checkinHoje
                        ?<div className="text-[0.7rem] text-ok font-semibold flex items-center gap-1 justify-end"><CheckCircle2 size={12}/> Hoje</div>
                        :<div className="text-[0.7rem] text-ink-3 flex items-center gap-1 justify-end"><Clock size={12}/> Ausente</div>
                      }
                      <div className="font-display font-semibold text-[0.82rem] text-ink-2 mt-0.5 tnum">{m.treinos} treinos</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="border-t border-line my-1"/>
              <Button full variant="danger" onClick={sairDoSquad}>
                <LogOut size={15}/> Sair do Squad
              </Button>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}
