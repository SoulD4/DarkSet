'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, TrendingUp, HeartPulse, Swords, ChevronLeft, Loader2,
  CheckCircle2, XCircle,
} from 'lucide-react';
import Button from '@/components/core/Button';
import { Logo } from '@/components/layout/AppChrome';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';

/* Logotipo oficial do Google — cores da marca Google (asset de terceiro). */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.84-.07-1.45-.22-2.09H12.22v3.8h6.42c-.13 1.01-.83 2.53-2.39 3.55l-.02.13 3.47 2.69.24.02c2.19-2.02 3.46-4.99 3.46-8.1z"/>
    <path fill="#34A853" d="M12.22 23.5c3.14 0 5.77-1.03 7.69-2.82l-3.66-2.83c-.98.67-2.31 1.14-4.03 1.14-3.08 0-5.68-2.02-6.61-4.82l-.12.01-3.58 2.77-.05.11C2.83 21 7.19 23.5 12.22 23.5z"/>
    <path fill="#FBBC05" d="M5.61 14.17c-.24-.73-.38-1.52-.38-2.35 0-.82.14-1.61.37-2.35l-.01-.16-3.62-2.8-.12.06C.75 8.26.22 10.06.22 11.82c0 1.76.53 3.56 1.63 5.25l3.76-2.9z"/>
    <path fill="#EA4335" d="M12.22 4.64c2.18 0 3.64.94 4.48 1.72l3.26-3.18C17.98 1.2 15.36.14 12.22.14 7.19.14 2.83 2.63.75 6.4l3.84 2.98C5.52 7.58 8.12 4.64 12.22 4.64z"/>
  </svg>
);

const errMsg = (code: string) => ({
  'auth/user-not-found':       'Email ou senha incorretos.',
  'auth/wrong-password':       'Email ou senha incorretos.',
  'auth/invalid-credential':   'Email ou senha incorretos.',
  'auth/email-already-in-use': 'Este email já está cadastrado. Tente entrar.',
  'auth/weak-password':        'Senha muito fraca (mínimo 6 caracteres).',
  'auth/invalid-email':        'Email inválido.',
  'auth/too-many-requests':    'Muitas tentativas. Aguarde alguns minutos.',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
} as Record<string,string>)[code] ?? 'Erro inesperado. Tente novamente.';

type Mode = 'signIn' | 'signUp' | 'forgot';

const FEATURES = [
  { icon: Dumbbell,   label: 'Fichas' },
  { icon: TrendingUp, label: 'Evolução' },
  { icon: HeartPulse, label: 'Cardio' },
  { icon: Swords,     label: 'Squad' },
];

const STATS: [string, string][] = [
  ['10k+', 'Atletas'],
  ['500+', 'Exercícios'],
  ['4.8★', 'Avaliação'],
];

export default function LoginPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode]           = useState<Mode>('signIn');
  const [nome,  setNome]          = useState('');
  const [email, setEmail]         = useState('');
  const [senha, setSenha]         = useState('');
  const [termos, setTermos]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState('');
  const [sucesso, setSucesso]     = useState('');

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u => { if(u) router.replace('/'); });
    return ()=>unsub();
  },[]);

  // Fecha modal com ESC
  useEffect(()=>{
    const fn = (e:KeyboardEvent) => { if(e.key==='Escape') setShowModal(false); };
    window.addEventListener('keydown',fn);
    return ()=>window.removeEventListener('keydown',fn);
  },[]);

  const openModal = (m: Mode) => { setMode(m); setErro(''); setSucesso(''); setShowModal(true); };
  const resetForm = () => { setErro(''); setSucesso(''); };

  const handleGoogle = async () => {
    setLoading(true); resetForm();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      router.replace('/');
    } catch(e:any) {
      const msg = errMsg(e.code||'');
      if(msg) setErro(msg);
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if(!email.trim()||(!senha&&mode!=='forgot')){ setErro('Preencha todos os campos.'); return; }
    setLoading(true); resetForm();
    try {
      if(mode==='forgot'){
        await sendPasswordResetEmail(auth, email.trim());
        setSucesso('Email enviado! Verifique sua caixa de entrada.');
        setMode('signIn');
      } else if(mode==='signIn'){
        await signInWithEmailAndPassword(auth, email.trim(), senha);
        router.replace('/');
      } else {
        if(!termos){ setErro('Aceite os Termos de Uso para continuar.'); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
        if(nome.trim()) await updateProfile(cred.user, {displayName: nome.trim()});
        await sendEmailVerification(cred.user);
        setSucesso(`Conta criada! Verifique seu email (${email}) antes de entrar.`);
        setMode('signIn');
      }
    } catch(e:any){
      setErro(errMsg(e.code||''));
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* ── SPLASH IMERSIVO ───────────────────────────────────── */}
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
        {/* Glow volt sutil ao fundo (tokens, sem hex) */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-180px] right-[-120px] w-[380px] h-[380px] rounded-full bg-accent/5 blur-3xl" />

        <div className="relative z-[1] flex flex-col h-full px-6 max-w-[480px] mx-auto w-full">
          {/* Centro: badge + logo + slogan + features */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-2"
          >
            <span className="chip chip-active mb-2 cursor-default">Seu app de treino</span>

            <Logo size="3.6rem" />

            <p className="eyebrow !text-ink-2 tracking-[0.14em] mt-1">
              Seu Treino. Sua Evolução.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {FEATURES.map(({ icon: Icon, label }) => (
                <span key={label} className="chip cursor-default">
                  <Icon size={13} className="text-accent" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Rodapé: stats + CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid gap-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)' }}
          >
            <div className="flex justify-center gap-8 mb-1">
              {STATS.map(([v, l]) => (
                <div key={l} className="text-center">
                  <div className="font-display font-bold text-xl leading-none text-ink-1 tnum">{v}</div>
                  <div className="eyebrow mt-1">{l}</div>
                </div>
              ))}
            </div>

            <Button size="lg" full onClick={()=>openModal('signIn')}>
              Entrar
            </Button>
            <Button size="lg" full variant="ghost" onClick={()=>openModal('signUp')}>
              Criar conta grátis
            </Button>

            <p className="text-center text-[0.65rem] text-ink-3 leading-relaxed">
              Ao continuar, você concorda com os Termos de Uso e Política de Privacidade do DarkSet.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── MODAL (bottom sheet) ──────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={()=>setShowModal(false)}
              className="fixed inset-0 z-[90] bg-black/70"
              style={{ backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              role="dialog" aria-modal="true" aria-label="Acessar conta"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 40 }}
              className="fixed bottom-0 inset-x-0 z-[91] max-w-[480px] mx-auto
                         bg-surface-1 border-t border-line rounded-t-3xl
                         px-6 pt-6 max-h-[92vh] overflow-y-auto"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
            >
              {/* Handle */}
              <div className="w-9 h-1 rounded-full bg-surface-3 mx-auto -mt-2 mb-5" />

              {/* Logo mini */}
              <div className="text-center mb-5">
                <Logo size="1.6rem" />
              </div>

              {/* Tabs Entrar / Criar conta */}
              {mode!=='forgot' && (
                <div className="flex gap-1 bg-surface-2 border border-line rounded-xl p-1 mb-5">
                  {(['signIn','signUp'] as Mode[]).map(m=>(
                    <button
                      key={m}
                      onClick={()=>{setMode(m);resetForm();}}
                      className={`flex-1 h-9 rounded-lg text-[0.82rem] font-bold transition-colors
                        ${mode===m ? 'bg-accent text-accent-ink shadow-volt' : 'text-ink-3'}`}
                    >
                      {m==='signIn'?'Entrar':'Criar conta'}
                    </button>
                  ))}
                </div>
              )}

              {/* Botão Google */}
              {mode!=='forgot' && (
                <>
                  <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-ink-1 text-bg font-semibold text-[0.9rem]
                               flex items-center justify-center gap-3 shadow-card
                               disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <GoogleIcon /> Continuar com Google
                  </button>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-line" />
                    <span className="text-[0.72rem] text-ink-3">ou</span>
                    <div className="flex-1 h-px bg-line" />
                  </div>
                </>
              )}

              {/* Cabeçalho do modo "esqueci a senha" */}
              {mode==='forgot' && (
                <div className="mb-5">
                  <button
                    onClick={()=>{setMode('signIn');resetForm();}}
                    className="flex items-center gap-1 text-[0.82rem] text-ink-3 mb-2"
                  >
                    <ChevronLeft size={15} /> Voltar
                  </button>
                  <h2 className="font-display font-bold text-xl tracking-tight text-ink-1">
                    Redefinir senha
                  </h2>
                  <p className="text-[0.8rem] text-ink-2 mt-1">
                    Enviaremos um link para seu email.
                  </p>
                </div>
              )}

              {/* Formulário */}
              <div className="grid gap-3 mb-4">
                {mode==='signUp' && (
                  <div>
                    <label className="eyebrow block mb-1.5" htmlFor="login-nome">Nome</label>
                    <input id="login-nome" className="field" type="text" placeholder="Seu nome" value={nome}
                      onChange={e=>{setNome(e.target.value);setErro('');}} autoComplete="name"/>
                  </div>
                )}
                <div>
                  <label className="eyebrow block mb-1.5" htmlFor="login-email">Email</label>
                  <input id="login-email" className="field" type="email" placeholder="email@exemplo.com" value={email}
                    onChange={e=>{setEmail(e.target.value);setErro('');}} autoComplete="email"/>
                </div>
                {mode!=='forgot' && (
                  <div>
                    <label className="eyebrow block mb-1.5" htmlFor="login-senha">Senha</label>
                    <input id="login-senha" className="field" type="password" placeholder="••••••••" value={senha}
                      onChange={e=>{setSenha(e.target.value);setErro('');}}
                      onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
                      autoComplete={mode==='signUp'?'new-password':'current-password'}/>
                  </div>
                )}
              </div>

              {/* Termos (signup) */}
              {mode==='signUp' && (
                <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
                  <input
                    type="checkbox" checked={termos}
                    onChange={e=>setTermos(e.target.checked)}
                    className="mt-0.5 shrink-0"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-[0.72rem] text-ink-3 leading-relaxed">
                    Li e concordo com os{' '}
                    <a href="/privacidade.html" target="_blank" className="text-ink-2 underline">Termos de Uso</a>
                    {' '}do DarkSet.
                  </span>
                </label>
              )}

              {/* Erro / Sucesso */}
              <AnimatePresence mode="wait">
                {erro && (
                  <motion.div
                    key="erro"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    role="alert"
                    className="flex items-start gap-2 bg-danger-soft border border-danger/30 rounded-xl
                               px-3.5 py-3 mb-3.5 text-[0.82rem] text-danger leading-snug"
                  >
                    <XCircle size={15} className="shrink-0 mt-0.5" />
                    {erro}
                  </motion.div>
                )}
                {sucesso && (
                  <motion.div
                    key="sucesso"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    role="status"
                    className="flex items-start gap-2 bg-ok-soft border border-ok/30 rounded-xl
                               px-3.5 py-3 mb-3.5 text-[0.82rem] text-ok leading-snug"
                  >
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    {sucesso}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button size="lg" full onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 size={17} className="animate-spin" />}
                {mode==='signIn'?'Entrar':mode==='signUp'?'Criar conta':'Enviar link'}
              </Button>

              {/* Links secundários */}
              <div className="text-center mt-3.5 flex flex-col gap-1.5">
                {mode==='signIn' && (
                  <button
                    onClick={()=>{setMode('forgot');resetForm();}}
                    className="text-[0.78rem] text-ink-3 underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
                {mode!=='forgot' && (
                  <p className="text-[0.78rem] text-ink-3">
                    {mode==='signIn' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
                    <button
                      onClick={()=>{setMode(mode==='signIn'?'signUp':'signIn');resetForm();}}
                      className="text-ink-2 font-bold underline"
                    >
                      {mode==='signIn' ? 'Criar conta' : 'Entrar'}
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
