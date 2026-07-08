'use client';
import { useState, useEffect } from 'react';
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
  doc, getDoc, setDoc, getDocs,
  collection, query, where,
  deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import {
  Lock, Eye, EyeOff, Plus, X, Trash2,
  ChevronRight, Copy, Check, Send,
  UserPlus, Dumbbell, ClipboardList,
  AlertCircle, CheckCircle2, Loader2,
  ArrowLeft, Search, Settings,
  Award, GraduationCap,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────
type ExFicha  = { nome:string; series:number; reps:string };
type Ficha    = { id:string; nome:string; byDay:Record<string,ExFicha[]>; fromPersonal?:boolean; personalName?:string; criadoEm?:number };
type Aluno    = { uid:string; nome:string; initials:string; ultimoTreino:string; linkId:string; fichas:Ficha[] };
type PersonalData = { cref:string; uid:string; nome:string; aprovado:boolean };
type Tab      = 'alunos'|'fichas'|'config';

// ── Exercícios ─────────────────────────────────────────────────
const EXERCICIOS = [
  {nome:'Supino Reto Barra',      grupo:'Peito',   equip:'Barra'    },
  {nome:'Supino Inclinado Halteres',grupo:'Peito', equip:'Halteres' },
  {nome:'Crucifixo Máquina',      grupo:'Peito',   equip:'Máquina'  },
  {nome:'Crossover Polia Alta',   grupo:'Peito',   equip:'Cabo'     },
  {nome:'Puxada Frontal Aberta',  grupo:'Costas',  equip:'Cabo'     },
  {nome:'Remada Curvada Barra',   grupo:'Costas',  equip:'Barra'    },
  {nome:'Remada Unilateral',      grupo:'Costas',  equip:'Halteres' },
  {nome:'Barra Fixa',             grupo:'Costas',  equip:'Peso Corpo'},
  {nome:'Desenvolvimento Barra',  grupo:'Ombro',   equip:'Barra'    },
  {nome:'Elevação Lateral',       grupo:'Ombro',   equip:'Halteres' },
  {nome:'Crucifixo Inverso',      grupo:'Ombro',   equip:'Halteres' },
  {nome:'Rosca Direta Barra',     grupo:'Bíceps',  equip:'Barra'    },
  {nome:'Rosca Martelo',          grupo:'Bíceps',  equip:'Halteres' },
  {nome:'Rosca Concentrada',      grupo:'Bíceps',  equip:'Halteres' },
  {nome:'Tríceps Pulley Corda',   grupo:'Tríceps', equip:'Cabo'     },
  {nome:'Tríceps Testa Barra W',  grupo:'Tríceps', equip:'Barra'    },
  {nome:'Agachamento Barra',      grupo:'Pernas',  equip:'Barra'    },
  {nome:'Leg Press 45°',          grupo:'Pernas',  equip:'Máquina'  },
  {nome:'Cadeira Extensora',      grupo:'Pernas',  equip:'Máquina'  },
  {nome:'Cadeira Flexora',        grupo:'Pernas',  equip:'Máquina'  },
  {nome:'Stiff Halteres',         grupo:'Pernas',  equip:'Halteres' },
  {nome:'Hip Thrust Barra',       grupo:'Glúteos', equip:'Barra'    },
  {nome:'Levantamento Terra',     grupo:'Costas',  equip:'Barra'    },
  {nome:'Prancha',                grupo:'Abdômen', equip:'Peso Corpo'},
  {nome:'Abdominal Crunch',       grupo:'Abdômen', equip:'Peso Corpo'},
];

const DIAS   = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const GRUPOS = Array.from(new Set(EXERCICIOS.map(e=>e.grupo)));
const byDayVazio = () => Object.fromEntries(DIAS.map(d=>[d,[] as ExFicha[]]));
const validarCref = (v:string) => /^\d{6}-[GPTR]\/[A-Z]{2}$/.test(v.trim().toUpperCase());
const gerarCodigo = () => 'PT-'+Math.random().toString(36).slice(2,7).toUpperCase();

// ── Página ─────────────────────────────────────────────────────
export default function PersonalPage() {
  const [uid,       setUid]       = useState<string|null>(null);
  const [userName,  setUserName]  = useState('');
  const [loading,   setLoading]   = useState(true);

  // Auth personal
  const [unlocked,  setUnlocked]  = useState(false);
  const [step,      setStep]      = useState<'pin'|'cref'|'request'|'pending'|'ok'>('pin');
  const [pin,       setPin]       = useState('');
  const [pinSalvo,  setPinSalvo]  = useState('');
  const [crefInput, setCrefInput] = useState('');
  const [showPin,   setShowPin]   = useState(false);
  const [erro,      setErro]      = useState('');
  const [salvando,  setSalvando]  = useState(false);

  // Dados personal
  const [personalData, setPersonalData] = useState<PersonalData|null>(null);
  const [alunos,   setAlunos]   = useState<Aluno[]>([]);
  const [tab,      setTab]       = useState<Tab>('alunos');

  // Convite
  const [showConvite, setShowConvite] = useState(false);
  const [codigoConvite,setCodigoConvite]= useState('');
  const [copiado,  setCopiado]  = useState(false);

  // Ficha builder
  const [alunoSel,  setAlunoSel]  = useState<Aluno|null>(null);
  const [nomeFicha, setNomeFicha] = useState('');
  const [diaAtivo,  setDiaAtivo]  = useState('Segunda');
  const [byDay,     setByDay]     = useState<Record<string,ExFicha[]>>(byDayVazio());
  const [busca,     setBusca]     = useState('');
  const [grupoFiltro,setGrupoFiltro]=useState('');
  const [fichaView, setFichaView] = useState<'lista'|'builder'>('lista');
  const [fichasAluno,setFichasAluno]=useState<Ficha[]>([]);
  const { toast, show } = useToast();

  // ── Auth ────────────────────────────────────────────────────
  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){setLoading(false);return;}
      setUid(u.uid);
      try {
        const userSnap = await getDoc(doc(db,'users',u.uid));
        const d = userSnap.exists()?userSnap.data():{} as any;
        setUserName(d.name||u.displayName||'Personal');
        console.log('user data:', d.role, d.name);

        // Verificar se é personal
        const isPersonalByRole = ['personal','personal_trainer'].includes(d.role||'');

        let isPersonalByDoc = false;
        let pdData: any = null;
        try {
          const personalSnap = await getDoc(doc(db,'personals',u.uid));
          if(personalSnap.exists()){
            pdData = personalSnap.data();
            isPersonalByDoc = pdData.aprovado === true;
          }
        } catch(_){ console.log('personals read failed, using role'); }

        if(isPersonalByRole || isPersonalByDoc){
          const pd: PersonalData = pdData
            ? pdData as PersonalData
            : { cref: d.cref||'—', uid: u.uid, nome: d.name||'Personal', aprovado: true };
          setPersonalData(pd);

          // Criar doc em personals se não existir
          if(!pdData){
            try {
              await setDoc(doc(db,'personals',u.uid),{
                uid:u.uid, cref:d.cref||'', nome:d.name||'Personal',
                aprovado:true, criadoEm:Date.now(),
              });
            } catch(_){}
          }

          // PIN salvo
          try {
            const pinSnap = await getDoc(doc(db,'users',u.uid,'private','pin'));
            if(pinSnap.exists()) setPinSalvo(pinSnap.data().pin||'');
          } catch(_){}

          setStep('pin');
          setUnlocked(false); // sempre pede PIN ao entrar
        } else {
          // Sem role nem doc — fluxo de cadastro
          setStep('cref');
        }
        // Carregar alunos vinculados
        await carregarAlunos(u.uid);
      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  const carregarAlunos = async (ptUid: string) => {
    try {
      const linksSnap = await getDocs(
        query(collection(db,'personal_links'), where('personalUid','==',ptUid), where('active','==',true))
      );
      const lista: Aluno[] = [];
      for(const linkDoc of linksSnap.docs){
        const l = linkDoc.data();
        const nome = l.studentName||'Aluno';
        lista.push({
          uid: l.studentUid||'', nome, initials:nome.slice(0,2).toUpperCase(),
          ultimoTreino: l.ultimoTreino||'Nunca', linkId:linkDoc.id, fichas:[],
        });
      }
      setAlunos(lista);
    } catch(e){console.error(e);}
  };

  // ── PIN ─────────────────────────────────────────────────────
  const entrarPin = async () => {
    if(!pin.trim()||pin.length<4){setErro('PIN deve ter ao menos 4 dígitos');return;}
    setSalvando(true);
    if(pinSalvo){
      if(pin!==pinSalvo){setErro('PIN incorreto');setSalvando(false);return;}
      setErro(''); setPin('');
      // Se tem personal data aprovado, entrar direto
      if(personalData?.aprovado){ setUnlocked(true); setStep('ok'); }
      // Se não tem CREF ainda, ir para CREF
      else setStep('cref');
    } else {
      // Criar PIN novo
      try {
        await setDoc(doc(db,'users',uid!,'private','pin'),{pin:pin.trim()});
        setPinSalvo(pin.trim());
      } catch(_){}
      setErro(''); setPin('');
      setStep('cref');
    }
    setSalvando(false);
  };

  // ── CREF ────────────────────────────────────────────────────
  const salvarCref = async () => {
    const v = crefInput.trim().toUpperCase();
    if(!validarCref(v)){setErro('Formato inválido. Ex: 123456-G/SP');return;}
    setSalvando(true);
    try {
      // Verificar se CREF já está registrado
      const existSnap = await getDocs(query(collection(db,'personals'),where('cref','==',v)));
      if(!existSnap.empty&&existSnap.docs[0].id!==uid){
        setErro('Este CREF já está cadastrado'); setSalvando(false); return;
      }
      // Enviar request para aprovação
      await setDoc(doc(db,'personal_requests',uid!),{
        uid, cref:v, nome:userName,
        status:'pending', criadoEm:serverTimestamp(),
      });
      setStep('pending');
    } catch(e){setErro('Erro ao enviar. Tente novamente.');}
    setSalvando(false);
  };

  // ── Gerar convite ────────────────────────────────────────────
  const gerarConvite = async () => {
    if(!uid) return;
    const code = gerarCodigo();
    try {
      await setDoc(doc(db,'personal_invites',code),{
        personalUid:uid, personalName:userName,
        code, active:true, criadoEm:serverTimestamp(),
      });
      setCodigoConvite(code);
      setShowConvite(true);
    } catch(e){show('Erro ao gerar convite','danger');}
  };

  const copiarConvite = () => {
    navigator.clipboard?.writeText(codigoConvite).catch(()=>{});
    setCopiado(true); setTimeout(()=>setCopiado(false),2000);
    show('Código copiado!');
  };

  // ── Ficha builder ─────────────────────────────────────────────
  const carregarFichasAluno = async (aUid:string) => {
    try {
      const snap = await getDocs(collection(db,'personal_plans',aUid,'plans'));
      setFichasAluno(snap.docs.map(d=>d.data() as Ficha));
    } catch(e){setFichasAluno([]);}
  };

  const addEx = (exNome:string) => {
    setByDay(prev=>{
      const d = {...prev};
      if(!d[diaAtivo].find(e=>e.nome===exNome))
        d[diaAtivo]=[...d[diaAtivo],{nome:exNome,series:3,reps:'10-12'}];
      return d;
    });
  };

  const removeEx = (idx:number) => {
    setByDay(prev=>({...prev,[diaAtivo]:prev[diaAtivo].filter((_,i)=>i!==idx)}));
  };

  const salvarFicha = async () => {
    if(!alunoSel){setErro('Selecione um aluno');return;}
    if(!nomeFicha.trim()){setErro('Dê um nome à ficha');return;}
    const totalEx = Object.values(byDay).flat().length;
    if(totalEx===0){setErro('Adicione ao menos um exercício');return;}
    setSalvando(true);
    try {
      const ficha:Ficha = {
        id:'pt_'+Date.now(), nome:nomeFicha.trim(), byDay,
        fromPersonal:true, personalName:userName, criadoEm:Date.now(),
      };
      await setDoc(
        doc(db,'personal_plans',alunoSel.uid,'plans',ficha.id),
        ficha
      );
      show('Ficha salva!');
      setNomeFicha(''); setByDay(byDayVazio()); setFichaView('lista');
      carregarFichasAluno(alunoSel.uid);
    } catch(e){setErro('Erro ao salvar ficha.');}
    setSalvando(false);
  };

  const deletarFicha = async (fichaId:string) => {
    if(!alunoSel) return;
    try {
      await deleteDoc(doc(db,'personal_plans',alunoSel.uid,'plans',fichaId));
      setFichasAluno(f=>f.filter(x=>x.id!==fichaId));
      show('Ficha removida');
    } catch(_){}
  };

  const exFiltrados = EXERCICIOS.filter(e=>
    e.nome.toLowerCase().includes(busca.toLowerCase()) &&
    (!grupoFiltro||e.grupo===grupoFiltro)
  );

  // ── LOADING ──────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  // ── TELA PENDENTE ─────────────────────────────────────────────
  if(step==='pending') return (
    <PageShell>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
        className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-4 px-4">
        <motion.div animate={{scale:[1,1.05,1]}} transition={{duration:2,repeat:Infinity}}
          className="text-warn">
          <Award size={64}/>
        </motion.div>
        <h1 className="font-display font-bold text-[1.7rem] leading-tight tracking-tight text-ink-1">
          Aguardando<br/><span className="text-warn">aprovação</span>
        </h1>
        <p className="text-[0.88rem] text-ink-2 max-w-[280px] leading-relaxed">
          Sua solicitação foi enviada. Você será notificado quando for aprovado pela administração.
        </p>
        <div className="card w-full max-w-[300px] border-warn/30 bg-warn-soft px-4 py-3.5 text-center">
          <div className="eyebrow text-warn">Status</div>
          <div className="font-display font-bold text-[1.1rem] text-warn mt-1">Em análise</div>
        </div>
      </motion.div>
    </PageShell>
  );

  // ── LOGIN (PIN / CREF) ────────────────────────────────────────
  if(!unlocked) return (
    <PageShell>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
        className="flex flex-col items-center justify-center min-h-[65vh] gap-6 px-2">

        <div className="text-center">
          <motion.div animate={{scale:[1,1.06,1]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}
            className="inline-flex text-accent">
            <Award size={56}/>
          </motion.div>
          <div className="font-display font-bold text-[1.9rem] leading-tight tracking-tight text-ink-1 mt-2">
            Dark<span className="text-accent">Personal</span>
          </div>
          <div className="text-[0.78rem] text-ink-2 mt-1.5">
            {step==='pin'?'Área exclusiva para personal trainers':
             step==='cref'?'Cadastre seu CREF para verificação':''}
          </div>
        </div>

        <div className="card w-full max-w-[340px] p-5 grid gap-4">
          {step==='pin'&&(
            <>
              <div>
                <label className="eyebrow flex items-center gap-1.5 mb-1.5">
                  <Lock size={11}/> {pinSalvo?'Digite seu PIN':'Crie um PIN de acesso'}
                </label>
                <div className="relative">
                  <input type={showPin?'text':'password'} value={pin}
                    onChange={e=>{ setPin(e.target.value.replace(/\D/g,'')); setErro(''); }}
                    onKeyDown={e=>e.key==='Enter'&&entrarPin()}
                    placeholder={pinSalvo?'••••':'mínimo 4 dígitos'}
                    maxLength={8} inputMode="numeric"
                    className={`field w-full h-14 pr-11 text-center text-[1.4rem] tracking-[0.3em] tnum ${erro?'border-danger/50':''}`}/>
                  <button onClick={()=>setShowPin(v=>!v)}
                    aria-label={showPin?'Ocultar PIN':'Mostrar PIN'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 inline-flex items-center">
                    {showPin?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </div>
              {erro&&(
                <div className="flex items-center gap-1.5 text-danger text-[0.75rem]">
                  <AlertCircle size={13}/>{erro}
                </div>
              )}
              <Button full onClick={entrarPin} disabled={salvando||!pin}>
                {salvando?<Loader2 size={16} className="animate-spin"/>:<><Lock size={15}/> {pinSalvo?'Entrar':'Criar PIN'}</>}
              </Button>
            </>
          )}

          {step==='cref'&&(
            <>
              <div>
                <label className="eyebrow flex items-center gap-1.5 mb-1.5">
                  <Award size={11}/> CREF
                </label>
                <input type="text" value={crefInput}
                  onChange={e=>{setCrefInput(e.target.value.toUpperCase());setErro('');}}
                  onKeyDown={e=>e.key==='Enter'&&salvarCref()}
                  placeholder="000000-G/SP"
                  maxLength={11}
                  className={`field w-full h-12 text-center text-[1.1rem] tracking-[0.1em] font-mono ${erro?'border-danger/50':''}`}/>
                <div className="text-[0.62rem] text-ink-3 mt-1.5">Sua solicitação será analisada pela administração</div>
              </div>
              {erro&&(
                <div className="flex items-center gap-1.5 text-danger text-[0.75rem]">
                  <AlertCircle size={13}/>{erro}
                </div>
              )}
              <Button full onClick={salvarCref} disabled={salvando||!crefInput.trim()}>
                {salvando?<Loader2 size={16} className="animate-spin"/>:<><Send size={15}/> Enviar para aprovação</>}
              </Button>
              <motion.button whileTap={{scale:.97}} onClick={()=>setStep('pin')}
                className="inline-flex items-center justify-center gap-1 text-ink-3 text-[0.75rem] font-semibold">
                <ArrowLeft size={13}/> Voltar
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </PageShell>
  );

  // ── ÁREA DO PERSONAL (desbloqueada) ───────────────────────────
  const TABS: {id:Tab;label:string;Icon:any}[] = [
    {id:'alunos', label:'Alunos',  Icon:GraduationCap },
    {id:'fichas', label:'Fichas',  Icon:ClipboardList },
    {id:'config', label:'Config',  Icon:Settings      },
  ];

  return (
    <PageShell>
      <ToastViewport toast={toast}/>

      {/* Modal convite */}
      <AnimatePresence>
        {showConvite&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={e=>{if(e.target===e.currentTarget)setShowConvite(false);}}>
            <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.9,opacity:0}}
              className="card w-full max-w-[340px] p-6 text-center shadow-float">
              <div className="flex justify-center text-accent mb-3"><UserPlus size={32}/></div>
              <div className="font-display font-bold text-[1.25rem] tracking-tight text-ink-1 mb-1">Código de Convite</div>
              <div className="text-[0.75rem] text-ink-2 mb-4">Compartilhe com seu aluno</div>
              <div className="font-mono font-bold text-[1.9rem] tracking-[0.2em] text-accent bg-accent-soft border border-accent/30 rounded-xl p-4 mb-4 tnum">
                {codigoConvite}
              </div>
              <div className="text-[0.72rem] text-ink-2 mb-4 leading-relaxed">
                O aluno deve ir em <strong className="text-ink-1">DarkPersonal → Entrar com código</strong> e digitar este código
              </div>
              <div className="flex gap-2">
                <Button variant="soft" size="sm" className="flex-1" onClick={copiarConvite}>
                  {copiado?<><Check size={15}/> Copiado!</>:<><Copy size={15}/> Copiar</>}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={()=>setShowConvite(false)}>
                  Fechar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <PageHeader
        title={<>Dark<span className="text-accent">Personal</span></>}
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <Award size={12} className="text-accent"/>
            {personalData?.cref||'Personal Trainer'} · {alunos.length} aluno{alunos.length!==1?'s':''}
          </span>
        }
        right={
          <Button variant="soft" size="sm" onClick={gerarConvite}>
            <UserPlus size={14}/> Convidar
          </Button>
        }
      />

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.06}}
        className="flex bg-surface-2 border border-line rounded-xl p-1 gap-1 mb-6">
        {TABS.map(t=>{
          const TIcon = t.Icon;
          const active = tab===t.id;
          return (
            <motion.button key={t.id} whileTap={{scale:.95}}
              onClick={()=>{setTab(t.id);setAlunoSel(null);setFichaView('lista');}}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[0.75rem] font-semibold transition-colors
                ${active?'bg-accent-soft text-accent border border-accent/30':'text-ink-3 border border-transparent'}`}>
              <TIcon size={14}/>
              {t.label}
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={tab+(alunoSel?.uid||'')+(fichaView)} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

          {/* ── ALUNOS ────────────────────────────────────────── */}
          {tab==='alunos'&&(
            <div className="grid gap-2.5">
              {alunos.length===0&&(
                <EmptyState
                  icon={<GraduationCap size={44}/>}
                  title="Nenhum aluno ainda"
                  subtitle="Gere um convite e compartilhe com seu aluno"
                  action={
                    <Button variant="soft" onClick={gerarConvite}>
                      <UserPlus size={15}/> Gerar Convite
                    </Button>
                  }
                />
              )}
              {alunos.map((a,i)=>(
                <motion.div key={a.uid} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                  transition={{delay:Math.min(i*0.04,0.4)}}
                  className="card px-4 py-3.5 flex items-center gap-3">
                  <div className="w-[42px] h-[42px] rounded-full bg-accent-soft border border-accent/30 text-accent font-display font-bold text-[1rem] flex items-center justify-center shrink-0">
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-[1rem] text-ink-1 truncate">{a.nome}</div>
                    <div className="text-[0.65rem] text-ink-3 mt-px">Último treino: {a.ultimoTreino}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0"
                    onClick={async()=>{setAlunoSel(a);setTab('fichas');await carregarFichasAluno(a.uid);}}>
                    <ClipboardList size={13}/> Fichas
                  </Button>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── FICHAS ────────────────────────────────────────── */}
          {tab==='fichas'&&(
            <div>
              {/* Selector de aluno */}
              {!alunoSel?(
                <div className="grid gap-2">
                  <div className="eyebrow mb-1 flex items-center gap-1.5">
                    <GraduationCap size={12}/> Selecione o aluno
                  </div>
                  {alunos.length===0?(
                    <EmptyState
                      icon={<GraduationCap size={36}/>}
                      title="Nenhum aluno vinculado"
                      subtitle="Convide um aluno para começar a criar fichas."
                    />
                  ):alunos.map((a,i)=>(
                    <motion.button key={a.uid} whileTap={{scale:.98}}
                      initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.04,0.4)}}
                      onClick={async()=>{setAlunoSel(a);await carregarFichasAluno(a.uid);}}
                      className="card px-4 py-3.5 flex items-center gap-3 text-left hover:bg-surface-2 transition-colors">
                      <div className="w-[38px] h-[38px] rounded-full bg-accent-soft border border-accent/30 text-accent font-display font-bold text-[0.9rem] flex items-center justify-center shrink-0">
                        {a.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-[1rem] text-ink-1 truncate">{a.nome}</div>
                        <div className="text-[0.65rem] text-ink-3">Ver e criar fichas</div>
                      </div>
                      <ChevronRight size={16} className="text-ink-3 shrink-0"/>
                    </motion.button>
                  ))}
                </div>
              ):fichaView==='lista'?(
                /* Lista de fichas do aluno */
                <div className="grid gap-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Button variant="ghost" size="sm" className="shrink-0"
                        onClick={()=>{setAlunoSel(null);setFichasAluno([]);}}>
                        <ArrowLeft size={13}/> Voltar
                      </Button>
                      <div className="font-display font-semibold text-[1rem] text-ink-1 truncate">{alunoSel.nome}</div>
                    </div>
                    <Button variant="soft" size="sm" className="shrink-0"
                      onClick={()=>{setNomeFicha('');setByDay(byDayVazio());setFichaView('builder');}}>
                      <Plus size={14}/> Nova Ficha
                    </Button>
                  </div>
                  {fichasAluno.length===0?(
                    <EmptyState
                      icon={<ClipboardList size={36}/>}
                      title="Nenhuma ficha criada ainda"
                      subtitle="Crie a primeira ficha de treino para este aluno."
                    />
                  ):fichasAluno.map((f,i)=>{
                    const totalEx = Object.values(f.byDay||{}).flat().length;
                    const dias = Object.entries(f.byDay||{}).filter(([,v])=>v.length>0).map(([k])=>k.slice(0,3));
                    return (
                      <motion.div key={f.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                        transition={{delay:Math.min(i*0.04,0.4)}}
                        className="card px-4 py-3.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-display font-bold text-[1rem] text-ink-1 truncate mr-2">{f.nome}</div>
                          <motion.button whileTap={{scale:.9}} onClick={()=>deletarFicha(f.id)}
                            aria-label={`Excluir ficha ${f.nome}`}
                            className="shrink-0 inline-flex items-center rounded-md border border-danger/30 bg-danger-soft text-danger px-1.5 py-1">
                            <Trash2 size={13}/>
                          </motion.button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="chip text-[0.55rem]">{totalEx} exercícios</span>
                          {dias.map(d=>(
                            <span key={d} className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft text-accent text-[0.55rem] font-semibold px-2 py-0.5">
                              {d}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ):(
                /* Builder de ficha */
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={()=>setFichaView('lista')}>
                      <ArrowLeft size={13}/> Voltar
                    </Button>
                    <div className="font-display font-semibold text-[0.95rem] text-ink-1 truncate">
                      Nova Ficha — {alunoSel?.nome}
                    </div>
                  </div>

                  {/* Nome da ficha */}
                  <div>
                    <label className="eyebrow block mb-1.5">Nome da ficha</label>
                    <input value={nomeFicha} onChange={e=>setNomeFicha(e.target.value)}
                      placeholder="Ex: Treino A — Peito e Tríceps"
                      className="field w-full min-w-0"/>
                  </div>

                  {/* Seletor de dia */}
                  <div className="flex gap-1.5 flex-wrap">
                    {DIAS.map(d=>{
                      const active=diaAtivo===d;
                      return (
                        <motion.button key={d} whileTap={{scale:.9}} onClick={()=>setDiaAtivo(d)}
                          className={`relative shrink-0 rounded-lg border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors
                            ${active?'border-accent/30 bg-accent-soft text-accent':'border-line text-ink-3'}`}>
                          {d.slice(0,3)}
                          {byDay[d].length>0&&(
                            <span className="absolute -top-1.5 -right-1.5 w-[15px] h-[15px] rounded-full bg-accent text-accent-ink text-[0.52rem] font-bold flex items-center justify-center tnum">
                              {byDay[d].length}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Exercícios do dia */}
                  {byDay[diaAtivo].length>0&&(
                    <div className="grid gap-1.5">
                      {byDay[diaAtivo].map((ex,i)=>(
                        <div key={i} className="card-2 flex items-center gap-2.5 rounded-xl px-3 py-2">
                          <Dumbbell size={14} className="text-accent shrink-0"/>
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.82rem] font-semibold text-ink-1 truncate">{ex.nome}</div>
                            <div className="text-[0.6rem] text-ink-3 tnum">{ex.series} séries × {ex.reps}</div>
                          </div>
                          <motion.button whileTap={{scale:.9}} onClick={()=>removeEx(i)}
                            aria-label={`Remover ${ex.nome}`}
                            className="shrink-0 inline-flex items-center rounded-md border border-danger/30 bg-danger-soft text-danger px-1.5 py-1">
                            <X size={12}/>
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Busca exercícios */}
                  <div>
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"/>
                      <input value={busca} onChange={e=>setBusca(e.target.value)}
                        placeholder="Buscar exercício..."
                        className="field w-full pl-9"/>
                    </div>
                    {/* Filtro por grupo */}
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      <motion.button whileTap={{scale:.9}} onClick={()=>setGrupoFiltro('')}
                        className={!grupoFiltro?'chip-active shrink-0':'chip shrink-0'}>
                        Todos
                      </motion.button>
                      {GRUPOS.map(g=>(
                        <motion.button key={g} whileTap={{scale:.9}} onClick={()=>setGrupoFiltro(g)}
                          className={grupoFiltro===g?'chip-active shrink-0':'chip shrink-0'}>
                          {g}
                        </motion.button>
                      ))}
                    </div>
                    {/* Lista */}
                    <div className="max-h-[220px] overflow-y-auto grid gap-1.5 w-full no-scrollbar">
                      {exFiltrados.map((e,i)=>{
                        const jaAdicionado = byDay[diaAtivo].some(x=>x.nome===e.nome);
                        return (
                          <motion.button key={i} whileTap={{scale:.98}} onClick={()=>addEx(e.nome)} disabled={jaAdicionado}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors
                              ${jaAdicionado?'bg-ok-soft border-ok/30 cursor-default':'bg-surface-2 border-line hover:bg-surface-3'}`}>
                            <div className={`w-7 h-7 rounded-lg border border-line bg-surface-1 flex items-center justify-center shrink-0
                              ${jaAdicionado?'text-ok':'text-ink-3'}`}>
                              <Dumbbell size={14}/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-[0.82rem] font-semibold truncate ${jaAdicionado?'text-ok':'text-ink-1'}`}>{e.nome}</div>
                              <div className="text-[0.58rem] text-ink-3">{e.grupo} · {e.equip}</div>
                            </div>
                            {jaAdicionado
                              ?<CheckCircle2 size={14} className="text-ok shrink-0"/>
                              :<Plus size={14} className="text-ink-3 shrink-0"/>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Erro + salvar */}
                  {erro&&(
                    <div className="flex items-center gap-1.5 text-danger text-[0.75rem]">
                      <AlertCircle size={13}/>{erro}
                    </div>
                  )}
                  <Button full onClick={salvarFicha} disabled={salvando}>
                    {salvando?<Loader2 size={16} className="animate-spin"/>:<><CheckCircle2 size={16}/> Salvar Ficha</>}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIG ────────────────────────────────────────── */}
          {tab==='config'&&(
            <div className="grid gap-3">
              <div className="card p-4">
                <div className="eyebrow mb-3 flex items-center gap-1.5">
                  <Award size={12} className="text-accent"/> Perfil Profissional
                </div>
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.82rem] text-ink-2">CREF</span>
                    <span className="font-mono font-bold text-[0.88rem] text-ink-1">{personalData?.cref||'—'}</span>
                  </div>
                  <div className="border-t border-line"/>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.82rem] text-ink-2">Status</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-ok/30 bg-ok-soft text-ok text-[0.6rem] font-semibold px-2 py-0.5">
                      <CheckCircle2 size={10}/> Aprovado
                    </span>
                  </div>
                  <div className="border-t border-line"/>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.82rem] text-ink-2">Alunos ativos</span>
                    <span className="font-display font-bold text-[1rem] text-ink-1 tnum">{alunos.length}</span>
                  </div>
                </div>
              </div>

              <Button variant="soft" full onClick={gerarConvite}>
                <UserPlus size={16}/> Gerar Novo Convite
              </Button>

              <Button variant="ghost" full onClick={()=>{setUnlocked(false);setStep('pin');setPin('');}}>
                <Lock size={16}/> Bloquear Área
              </Button>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}
