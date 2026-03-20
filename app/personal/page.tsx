'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, addDoc, getDocs,
  collection, query, where, orderBy,
  deleteDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Lock, Eye, EyeOff, Plus, X, Trash2,
  ChevronRight, Copy, Check, Send,
  UserPlus, Users, Dumbbell, ClipboardList,
  AlertCircle, CheckCircle2, Loader2,
  ArrowLeft, Search, Settings, LogOut
} from 'lucide-react';
import {
  Barbell, Student, UserCircle, Sword,
  Certificate, Link as LinkIcon
} from '@phosphor-icons/react';

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
  const [toast,     setToast]     = useState('');

  const showToast = (m:string)=>{setToast(m);setTimeout(()=>setToast(''),2500);};

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
    } catch(e){showToast('Erro ao gerar convite');}
  };

  const copiarConvite = () => {
    navigator.clipboard?.writeText(codigoConvite).catch(()=>{});
    setCopiado(true); setTimeout(()=>setCopiado(false),2000);
    showToast('Código copiado!');
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
      showToast('Ficha salva!');
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
      showToast('Ficha removida');
    } catch(_){}
  };

  const exFiltrados = EXERCICIOS.filter(e=>
    e.nome.toLowerCase().includes(busca.toLowerCase()) &&
    (!grupoFiltro||e.grupo===grupoFiltro)
  );

  // ── LOADING ──────────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  // ── TELA PENDENTE ─────────────────────────────────────────────
  if(step==='pending') return (
    <PageShell>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
        style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'65vh',textAlign:'center',gap:'1rem',padding:'1rem'}}>
        <motion.div animate={{scale:[1,1.05,1]}} transition={{duration:2,repeat:Infinity}}>
          <Certificate size={64} color="#facc15" weight="fill"/>
        </motion.div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
          Aguardando<br/><span style={{color:'#facc15'}}>Aprovação</span>
        </div>
        <div style={{fontSize:'.88rem',color:'#7a7a8a',maxWidth:280,lineHeight:1.6}}>
          Sua solicitação foi enviada. Você será notificado quando for aprovado pela administração.
        </div>
        <Card style={{background:'rgba(250,204,21,.06)',border:'1px solid rgba(250,204,21,.2)',borderRadius:12,width:'100%',maxWidth:300}}>
          <CardContent style={{padding:'.85rem',textAlign:'center'}}>
            <div style={{fontSize:'.65rem',color:'#facc15',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.3rem'}}>Status</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:'#facc15'}}>Em análise</div>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  );

  // ── LOGIN ─────────────────────────────────────────────────────
  if(!unlocked) return (
    <PageShell>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
        style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'65vh',padding:'1.5rem',gap:'1.5rem'}}>

        <div style={{textAlign:'center'}}>
          <motion.div animate={{scale:[1,1.06,1]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}>
            <Certificate size={56} color="#e31b23" weight="fill"/>
          </motion.div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1,marginTop:'.5rem'}}>
            DARK<span style={{color:'#e31b23'}}>PERSONAL</span>
          </div>
          <div style={{fontSize:'.78rem',color:'#7a7a8a',marginTop:'.4rem'}}>
            {step==='pin'?'Área exclusiva para personal trainers':
             step==='cref'?'Cadastre seu CREF para verificação':''}
          </div>
        </div>

        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,width:'100%',maxWidth:340}}>
          <CardContent style={{padding:'1.25rem',display:'grid',gap:'1rem'}}>
            {step==='pin'&&(
              <>
                <div>
                  <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:'.3rem',marginBottom:5}}>
                    <Lock size={11}/> {pinSalvo?'Digite seu PIN':'Crie um PIN de acesso'}
                  </label>
                  <div style={{position:'relative'}}>
                    <input type={showPin?'text':'password'} value={pin}
                      onChange={e=>{ setPin(e.target.value.replace(/\D/g,'')); setErro(''); }}
                      onKeyDown={e=>e.key==='Enter'&&entrarPin()}
                      placeholder={pinSalvo?'••••':'mínimo 4 dígitos'}
                      maxLength={8} inputMode="numeric"
                      style={{width:'100%',background:'rgba(0,0,0,.4)',border:`1px solid ${erro?'rgba(227,27,35,.5)':'#2e2e38'}`,borderRadius:10,color:'#f0f0f2',padding:'13px 44px 13px 13px',fontSize:'1.5rem',outline:'none',letterSpacing:'.3em',textAlign:'center'}}/>
                    <button onClick={()=>setShowPin(v=>!v)}
                      style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#484858',cursor:'pointer',outline:'none',display:'flex',alignItems:'center'}}>
                      {showPin?<EyeOff size={16}/>:<Eye size={16}/>}
                    </button>
                  </div>
                </div>
                {erro&&<div style={{display:'flex',alignItems:'center',gap:'.3rem',color:'#e31b23',fontSize:'.75rem'}}><AlertCircle size={13}/>{erro}</div>}
                <motion.button whileTap={{scale:.97}} onClick={entrarPin} disabled={salvando||!pin}
                  style={{width:'100%',background:pin?'linear-gradient(135deg,#e31b23,#b31217)':'rgba(227,27,35,.2)',border:'none',borderRadius:10,padding:'13px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',cursor:pin?'pointer':'not-allowed',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  {salvando?<Loader2 size={16}/>:<><Lock size={15}/> {pinSalvo?'Entrar':'Criar PIN'}</>}
                </motion.button>
              </>
            )}

            {step==='cref'&&(
              <>
                <div>
                  <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:'.3rem',marginBottom:5}}>
                    <Certificate size={11} weight="fill"/> CREF
                  </label>
                  <input type="text" value={crefInput}
                    onChange={e=>{setCrefInput(e.target.value.toUpperCase());setErro('');}}
                    onKeyDown={e=>e.key==='Enter'&&salvarCref()}
                    placeholder="000000-G/SP"
                    maxLength={11}
                    style={{width:'100%',background:'rgba(0,0,0,.4)',border:`1px solid ${erro?'rgba(227,27,35,.5)':'#2e2e38'}`,borderRadius:10,color:'#f0f0f2',padding:'13px',fontSize:'1.1rem',outline:'none',letterSpacing:'.1em',textAlign:'center',fontFamily:'monospace'}}/>
                  <div style={{fontSize:'.6rem',color:'#484858',marginTop:'.4rem'}}>Sua solicitação será analisada pela administração</div>
                </div>
                {erro&&<div style={{display:'flex',alignItems:'center',gap:'.3rem',color:'#e31b23',fontSize:'.75rem'}}><AlertCircle size={13}/>{erro}</div>}
                <motion.button whileTap={{scale:.97}} onClick={salvarCref} disabled={salvando||!crefInput.trim()}
                  style={{width:'100%',background:crefInput?'linear-gradient(135deg,#e31b23,#b31217)':'rgba(227,27,35,.2)',border:'none',borderRadius:10,padding:'13px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',cursor:crefInput?'pointer':'not-allowed',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  {salvando?<Loader2 size={16}/>:<><Send size={15}/> Enviar para aprovação</>}
                </motion.button>
                <motion.button whileTap={{scale:.97}} onClick={()=>setStep('pin')}
                  style={{background:'none',border:'none',color:'#484858',fontSize:'.75rem',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
                  <ArrowLeft size={13}/> Voltar
                </motion.button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  );

  // ── ÁREA DO PERSONAL (desbloqueada) ───────────────────────────
  const TABS: {id:Tab;label:string;Icon:any}[] = [
    {id:'alunos', label:'Alunos',  Icon:Student    },
    {id:'fichas', label:'Fichas',  Icon:ClipboardList},
    {id:'config', label:'Config',  Icon:Settings   },
  ];

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

      {/* Modal convite */}
      <AnimatePresence>
        {showConvite&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.9)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}
            onClick={e=>{if(e.target===e.currentTarget)setShowConvite(false);}}>
            <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.9,opacity:0}}
              style={{background:'#0f0f13',border:'1px solid #2e2e38',borderRadius:20,padding:'1.5rem',width:'100%',maxWidth:340,textAlign:'center'}}>
              <UserPlus size={32} color="#e31b23" style={{margin:'0 auto .75rem'}}/>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.25rem'}}>Código de Convite</div>
              <div style={{fontSize:'.75rem',color:'#7a7a8a',marginBottom:'1rem'}}>Compartilhe com seu aluno</div>
              <div style={{fontFamily:'monospace',fontWeight:900,fontSize:'2rem',letterSpacing:'.2em',color:'#e31b23',background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:12,padding:'1rem',marginBottom:'1rem'}}>
                {codigoConvite}
              </div>
              <div style={{fontSize:'.72rem',color:'#7a7a8a',marginBottom:'1rem',lineHeight:1.5}}>
                O aluno deve ir em <strong style={{color:'#f0f0f2'}}>DarkPersonal → Entrar com código</strong> e digitar este código
              </div>
              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.95}} onClick={copiarConvite}
                  style={{flex:1,background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:10,padding:'11px',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                  {copiado?<><Check size={15}/> Copiado!</>:<><Copy size={15}/> Copiar</>}
                </motion.button>
                <motion.button whileTap={{scale:.95}} onClick={()=>setShowConvite(false)}
                  style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'11px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
                  Fechar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
            DARK<span style={{color:'#e31b23'}}>PERSONAL</span>
          </div>
          <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px',display:'flex',alignItems:'center',gap:'.3rem'}}>
            <Certificate size={11} color="#e31b23" weight="fill"/>
            {personalData?.cref||'Personal Trainer'} · {alunos.length} aluno{alunos.length!==1?'s':''}
          </div>
        </div>
        <motion.button whileTap={{scale:.95}} onClick={gerarConvite}
          style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:10,padding:'.5rem .9rem',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.35rem'}}>
          <UserPlus size={15}/> Convidar
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:12,padding:'3px',gap:'3px',marginBottom:'1rem'}}>
        {TABS.map(t=>{
          const TIcon = t.Icon;
          return (
            <motion.button key={t.id} whileTap={{scale:.95}} onClick={()=>{setTab(t.id);setAlunoSel(null);setFichaView('lista');}} style={{
              flex:1,padding:'.5rem',borderRadius:9,border:'none',cursor:'pointer',
              background:tab===t.id?'rgba(227,27,35,.15)':'transparent',
              color:tab===t.id?'#e31b23':'#484858',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
              fontSize:'.75rem',letterSpacing:'.04em',
              boxShadow:tab===t.id?'inset 0 0 0 1px rgba(227,27,35,.3)':'none',
              outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.35rem',
            }}>
              <TIcon size={15} color={tab===t.id?'#e31b23':'#484858'}/>
              {t.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab+(alunoSel?.uid||'')+(fichaView)} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

          {/* ── ALUNOS ────────────────────────────────────────── */}
          {tab==='alunos'&&(
            <div style={{display:'grid',gap:'.55rem'}}>
              {alunos.length===0&&(
                <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14}}>
                  <CardContent style={{padding:'2.5rem 1rem',textAlign:'center'}}>
                    <Student size={44} color="#484858" weight="fill" style={{margin:'0 auto .75rem'}}/>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#484858',textTransform:'uppercase'}}>Nenhum aluno ainda</div>
                    <div style={{fontSize:'.78rem',color:'#484858',marginTop:'.4rem'}}>Gere um convite e compartilhe com seu aluno</div>
                    <motion.button whileTap={{scale:.97}} onClick={gerarConvite}
                      style={{marginTop:'1rem',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:10,padding:'.6rem 1.2rem',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.4rem',margin:'.75rem auto 0'}}>
                      <UserPlus size={15}/> Gerar Convite
                    </motion.button>
                  </CardContent>
                </Card>
              )}
              {alunos.map((a,i)=>(
                <motion.div key={a.uid} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                  <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                    <CardContent style={{padding:'.85rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <div style={{width:42,height:42,borderRadius:'50%',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',color:'#e31b23'}}>
                        {a.initials}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{a.nome}</div>
                        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'1px'}}>Último treino: {a.ultimoTreino}</div>
                      </div>
                      <motion.button whileTap={{scale:.9}} onClick={async()=>{setAlunoSel(a);setTab('fichas');await carregarFichasAluno(a.uid);}}
                        style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .7rem',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.72rem',fontWeight:700}}>
                        <ClipboardList size={13}/> Fichas
                      </motion.button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── FICHAS ────────────────────────────────────────── */}
          {tab==='fichas'&&(
            <div>
              {/* Selector de aluno */}
              {!alunoSel?(
                <div style={{display:'grid',gap:'.5rem'}}>
                  <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.25rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <Student size={12} weight="fill"/> Selecione o aluno
                  </div>
                  {alunos.length===0?(
                    <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:12}}>
                      <CardContent style={{padding:'2rem',textAlign:'center'}}>
                        <div style={{fontSize:'.82rem',color:'#484858'}}>Nenhum aluno vinculado ainda</div>
                      </CardContent>
                    </Card>
                  ):alunos.map((a,i)=>(
                    <motion.button key={a.uid} whileTap={{scale:.98}} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}
                      onClick={async()=>{setAlunoSel(a);await carregarFichasAluno(a.uid);}}
                      style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12,padding:'.85rem 1rem',display:'flex',alignItems:'center',gap:'.75rem',cursor:'pointer',outline:'none',textAlign:'left'}}>
                      <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.9rem',color:'#e31b23'}}>
                        {a.initials}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{a.nome}</div>
                        <div style={{fontSize:'.65rem',color:'#7a7a8a'}}>Ver e criar fichas</div>
                      </div>
                      <ChevronRight size={16} color="#484858"/>
                    </motion.button>
                  ))}
                </div>
              ):fichaView==='lista'?(
                /* Lista de fichas do aluno */
                <div style={{display:'grid',gap:'.55rem'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.25rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                      <motion.button whileTap={{scale:.9}} onClick={()=>{setAlunoSel(null);setFichasAluno([]);}}
                        style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.3rem .65rem',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.72rem',fontWeight:700}}>
                        <ArrowLeft size={13}/> Voltar
                      </motion.button>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{alunoSel.nome}</div>
                    </div>
                    <motion.button whileTap={{scale:.95}} onClick={()=>{setNomeFicha('');setByDay(byDayVazio());setFichaView('builder');}}
                      style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:8,padding:'.35rem .75rem',color:'#e31b23',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.72rem',fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>
                      <Plus size={14}/> Nova Ficha
                    </motion.button>
                  </div>
                  {fichasAluno.length===0?(
                    <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:12}}>
                      <CardContent style={{padding:'2rem',textAlign:'center'}}>
                        <ClipboardList size={36} color="#484858" style={{margin:'0 auto .5rem'}}/>
                        <div style={{fontSize:'.82rem',color:'#484858'}}>Nenhuma ficha criada ainda</div>
                      </CardContent>
                    </Card>
                  ):fichasAluno.map((f,i)=>{
                    const totalEx = Object.values(f.byDay||{}).flat().length;
                    const dias = Object.entries(f.byDay||{}).filter(([,v])=>v.length>0).map(([k])=>k.slice(0,3));
                    return (
                      <motion.div key={f.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                          <CardContent style={{padding:'.85rem 1rem'}}>
                            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'.4rem'}}>
                              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',color:'#f0f0f2',textTransform:'uppercase'}}>{f.nome}</div>
                              <motion.button whileTap={{scale:.9}} onClick={()=>deletarFicha(f.id)}
                                style={{background:'rgba(227,27,35,.07)',border:'1px solid rgba(227,27,35,.15)',borderRadius:6,padding:'4px 7px',color:'#e31b23',cursor:'pointer',outline:'none',flexShrink:0}}>
                                <Trash2 size={13}/>
                              </motion.button>
                            </div>
                            <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                              <Badge variant="outline" style={{borderColor:'rgba(227,27,35,.2)',color:'#7a7a8a',fontSize:'.55rem'}}>{totalEx} exercícios</Badge>
                              {dias.map(d=>(
                                <Badge key={d} style={{background:'rgba(227,27,35,.1)',color:'#e31b23',border:'1px solid rgba(227,27,35,.2)',fontSize:'.55rem'}}>{d}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ):(
                /* Builder de ficha */
                <div style={{display:'grid',gap:'.75rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                    <motion.button whileTap={{scale:.9}} onClick={()=>setFichaView('lista')}
                      style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.3rem .65rem',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.72rem',fontWeight:700}}>
                      <ArrowLeft size={13}/> Voltar
                    </motion.button>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',color:'#f0f0f2'}}>Nova Ficha — {alunoSel?.nome}</div>
                  </div>

                  {/* Nome da ficha */}
                  <div>
                    <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:4}}>Nome da ficha</label>
                    <input value={nomeFicha} onChange={e=>setNomeFicha(e.target.value)}
                      placeholder="Ex: Treino A — Peito e Tríceps"
                      style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'11px 13px',fontSize:'.95rem',outline:'none'}}/>
                  </div>

                  {/* Seletor de dia */}
                  <div style={{display:'flex',gap:'.3rem',overflowX:'auto',paddingBottom:'.25rem',margin:'0 -1rem',padding:'0 1rem .25rem',width:'calc(100% + 2rem)'}}>
                    {DIAS.map(d=>(
                      <motion.button key={d} whileTap={{scale:.9}} onClick={()=>setDiaAtivo(d)}
                        style={{flexShrink:0,padding:'.3rem .55rem',borderRadius:8,border:`1px solid ${diaAtivo===d?'#e31b23':'#2e2e38'}`,background:diaAtivo===d?'rgba(227,27,35,.15)':'transparent',color:diaAtivo===d?'#e31b23':'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.7rem',cursor:'pointer',outline:'none',position:'relative'}}>
                        {d.slice(0,3)}
                        {byDay[d].length>0&&<span style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'#e31b23',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.5rem',color:'#fff',fontWeight:900}}>{byDay[d].length}</span>}
                      </motion.button>
                    ))}
                  </div>

                  {/* Exercícios do dia */}
                  {byDay[diaAtivo].length>0&&(
                    <div style={{display:'grid',gap:'.35rem'}}>
                      {byDay[diaAtivo].map((ex,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'.5rem',background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:10,padding:'.5rem .75rem'}}>
                          <Barbell size={14} color="#e31b23" weight="fill"/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'.82rem',color:'#f0f0f2',fontWeight:600}}>{ex.nome}</div>
                            <div style={{fontSize:'.6rem',color:'#7a7a8a'}}>{ex.series} séries × {ex.reps}</div>
                          </div>
                          <motion.button whileTap={{scale:.9}} onClick={()=>removeEx(i)}
                            style={{background:'rgba(227,27,35,.07)',border:'1px solid rgba(227,27,35,.15)',borderRadius:6,padding:'3px 6px',color:'#e31b23',cursor:'pointer',outline:'none'}}>
                            <X size={12}/>
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Busca exercícios */}
                  <div>
                    <div style={{position:'relative',marginBottom:'.5rem'}}>
                      <Search size={14} color="#484858" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)'}}/>
                      <input value={busca} onChange={e=>setBusca(e.target.value)}
                        placeholder="Buscar exercício..."
                        style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'9px 13px 9px 33px',fontSize:'.85rem',outline:'none',boxSizing:'border-box' as const}}/>
                    </div>
                    {/* Filtro por grupo */}
                    <div style={{display:'flex',gap:'.3rem',overflowX:'auto',paddingBottom:'.25rem',marginBottom:'.5rem',margin:'0 -1rem .5rem',padding:'0 1rem .25rem',width:'calc(100% + 2rem)'}}>
                      <motion.button whileTap={{scale:.9}} onClick={()=>setGrupoFiltro('')}
                        style={{flexShrink:0,padding:'.25rem .6rem',borderRadius:6,border:`1px solid ${!grupoFiltro?'#e31b23':'#2e2e38'}`,background:!grupoFiltro?'rgba(227,27,35,.15)':'transparent',color:!grupoFiltro?'#e31b23':'#7a7a8a',fontSize:'.65rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
                        Todos
                      </motion.button>
                      {GRUPOS.map(g=>(
                        <motion.button key={g} whileTap={{scale:.9}} onClick={()=>setGrupoFiltro(g)}
                          style={{flexShrink:0,padding:'.25rem .6rem',borderRadius:6,border:`1px solid ${grupoFiltro===g?'#e31b23':'#2e2e38'}`,background:grupoFiltro===g?'rgba(227,27,35,.15)':'transparent',color:grupoFiltro===g?'#e31b23':'#7a7a8a',fontSize:'.65rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
                          {g}
                        </motion.button>
                      ))}
                    </div>
                    {/* Lista */}
                    <div style={{maxHeight:220,overflowY:'auto',display:'grid',gap:'.3rem',width:'100%'}}>
                      {exFiltrados.map((e,i)=>{
                        const jaAdicionado = byDay[diaAtivo].some(x=>x.nome===e.nome);
                        return (
                          <motion.button key={i} whileTap={{scale:.98}} onClick={()=>addEx(e.nome)} disabled={jaAdicionado}
                            style={{display:'flex',alignItems:'center',gap:'.6rem',background:jaAdicionado?'rgba(34,197,94,.06)':'rgba(255,255,255,.02)',border:`1px solid ${jaAdicionado?'rgba(34,197,94,.2)':'#1a1a20'}`,borderRadius:9,padding:'.5rem .75rem',cursor:jaAdicionado?'default':'pointer',outline:'none',textAlign:'left'}}>
                            <div style={{width:28,height:28,borderRadius:7,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <Barbell size={14} color={jaAdicionado?'#4ade80':'#7a7a8a'} weight="fill"/>
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'.82rem',color:jaAdicionado?'#4ade80':'#f0f0f2',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.nome}</div>
                              <div style={{fontSize:'.58rem',color:'#484858'}}>{e.grupo} · {e.equip}</div>
                            </div>
                            {jaAdicionado?<CheckCircle2 size={14} color="#4ade80"/>:<Plus size={14} color="#484858"/>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Erro + salvar */}
                  {erro&&<div style={{display:'flex',alignItems:'center',gap:'.3rem',color:'#e31b23',fontSize:'.75rem'}}><AlertCircle size={13}/>{erro}</div>}
                  <motion.button whileTap={{scale:.97}} onClick={salvarFicha} disabled={salvando}
                    style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',boxShadow:'0 4px 20px rgba(227,27,35,.3)'}}>
                    {salvando?<Loader2 size={16}/>:<><CheckCircle2 size={16}/> Salvar Ficha</>}
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIG ────────────────────────────────────────── */}
          {tab==='config'&&(
            <div style={{display:'grid',gap:'.75rem'}}>
              <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                <CardContent style={{padding:'1rem'}}>
                  <div style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <Certificate size={12} weight="fill" color="#e31b23"/> Perfil Professional
                  </div>
                  <div style={{display:'grid',gap:'.5rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'.82rem',color:'#7a7a8a'}}>CREF</span>
                      <span style={{fontFamily:'monospace',fontWeight:700,color:'#f0f0f2',fontSize:'.88rem'}}>{personalData?.cref||'—'}</span>
                    </div>
                    <Separator style={{background:'rgba(255,255,255,.05)'}}/>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'.82rem',color:'#7a7a8a'}}>Status</span>
                      <Badge style={{background:'rgba(34,197,94,.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,.3)',fontSize:'.6rem'}}>Aprovado</Badge>
                    </div>
                    <Separator style={{background:'rgba(255,255,255,.05)'}}/>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'.82rem',color:'#7a7a8a'}}>Alunos ativos</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,color:'#f0f0f2',fontSize:'1rem'}}>{alunos.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <motion.button whileTap={{scale:.97}} onClick={gerarConvite}
                style={{width:'100%',background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:12,padding:'13px',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
                <UserPlus size={16}/> Gerar Novo Convite
              </motion.button>

              <motion.button whileTap={{scale:.97}} onClick={()=>{setUnlocked(false);setStep('pin');setPin('');}}
                style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:12,padding:'13px',color:'#484858',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
                <Lock size={16}/> Bloquear Área
              </motion.button>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}
