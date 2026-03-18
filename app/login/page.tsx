'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M23.5 12.27c0-.84-.07-1.45-.22-2.09H12.22v3.8h6.42c-.13 1.01-.83 2.53-2.39 3.55l-.02.13 3.47 2.69.24.02c2.19-2.02 3.46-4.99 3.46-8.1z"/>
    <path fill="#34A853" d="M12.22 23.5c3.14 0 5.77-1.03 7.69-2.82l-3.66-2.83c-.98.67-2.31 1.14-4.03 1.14-3.08 0-5.68-2.02-6.61-4.82l-.12.01-3.58 2.77-.05.11C2.83 21 7.19 23.5 12.22 23.5z"/>
    <path fill="#FBBC05" d="M5.61 14.17c-.24-.73-.38-1.52-.38-2.35 0-.82.14-1.61.37-2.35l-.01-.16-3.62-2.8-.12.06C.75 8.26.22 10.06.22 11.82c0 1.76.53 3.56 1.63 5.25l3.76-2.9z"/>
    <path fill="#EA4335" d="M12.22 4.64c2.18 0 3.64.94 4.48 1.72l3.26-3.18C17.98 1.2 15.36.14 12.22.14 7.19.14 2.83 2.63.75 6.4l3.84 2.98C5.52 7.58 8.12 4.64 12.22 4.64z"/>
  </svg>
);

const errMsg = (code: string) => {
  const map: Record<string,string> = {
    'auth/user-not-found':       'Email ou senha incorretos.',
    'auth/wrong-password':       'Email ou senha incorretos.',
    'auth/invalid-credential':   'Email ou senha incorretos.',
    'auth/email-already-in-use': 'Este email já está cadastrado. Tente entrar.',
    'auth/weak-password':        'Senha muito fraca (mínimo 6 caracteres).',
    'auth/invalid-email':        'Email inválido.',
    'auth/too-many-requests':    'Muitas tentativas. Aguarde alguns minutos.',
    'auth/popup-closed-by-user': '',
    'auth/cancelled-popup-request': '',
  };
  return map[code] || 'Erro inesperado. Tente novamente.';
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]         = useState<'signIn'|'signUp'|'forgot'>('signIn');
  const [nome, setNome]         = useState('');
  const [email, setEmail]       = useState('');
  const [senha, setSenha]       = useState('');
  const [termos, setTermos]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState('');
  const [sucesso, setSucesso]   = useState('');

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u => {
      if(u) router.replace('/');
    });
    return () => unsub();
  },[]);

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
    setLoading(true); resetForm();
    if(!email.trim() || !senha) { setErro('Preencha email e senha.'); setLoading(false); return; }
    try {
      if(mode==='signIn') {
        await signInWithEmailAndPassword(auth, email.trim(), senha);
        router.replace('/');
      } else {
        if(!termos) { setErro('Aceite os Termos de Uso para criar sua conta.'); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
        if(nome.trim()) await updateProfile(cred.user, { displayName: nome.trim() });
        await sendEmailVerification(cred.user);
        setSucesso(`✅ Conta criada! Verifique seu email (${email}) e clique no link de confirmação.`);
        setMode('signIn');
      }
    } catch(e:any) {
      setErro(errMsg(e.code||''));
    } finally { setLoading(false); }
  };

  const handleForgot = async () => {
    setLoading(true); resetForm();
    if(!email.trim()) { setErro('Digite seu email acima.'); setLoading(false); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSucesso('Email de redefinição enviado! Verifique sua caixa de entrada.');
      setMode('signIn');
    } catch(e:any) {
      setErro(errMsg(e.code||''));
    } finally { setLoading(false); }
  };

  const inp = "w-full bg-[#111115] border border-[#2e2e38] rounded-xl text-white placeholder-[#484858] px-4 py-3 text-base outline-none focus:border-red-600 transition-colors";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{background:'linear-gradient(180deg,#0a0a0e 0%,#0f0f13 100%)'}}>

      {/* Background gym image overlay */}
      <div className="fixed inset-0 pointer-events-none"
        style={{background:'radial-gradient(ellipse at 50% 0%,rgba(227,27,35,.08) 0%,transparent 60%)'}}/>

      {/* Logo */}
      <div className="text-center mb-8 relative">
        <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3rem',letterSpacing:'.06em',color:'#fff',lineHeight:1}}>
          DARK<span style={{color:'#e31b23'}}>SET</span>
        </h1>
        <p style={{fontSize:'.72rem',color:'#484858',letterSpacing:'.2em',textTransform:'uppercase',marginTop:'.3rem'}}>
          Treine. Evolua. Domine.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative"
        style={{background:'rgba(30,30,36,.95)',border:'1px solid #2e2e38',borderRadius:'20px',padding:'1.75rem',backdropFilter:'blur(20px)'}}>

        {/* Tabs entrar / criar */}
        {mode !== 'forgot' && (
          <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'12px',padding:'3px',gap:'3px',marginBottom:'1.25rem'}}>
            {(['signIn','signUp'] as const).map(m=>(
              <button key={m} onClick={()=>{setMode(m);resetForm();}} style={{
                flex:1,padding:'.5rem',borderRadius:'9px',border:'none',cursor:'pointer',
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',
                textTransform:'uppercase',letterSpacing:'.05em',transition:'all .15s',
                background: mode===m ? '#e31b23' : 'transparent',
                color: mode===m ? '#fff' : '#7a7a8a',
                boxShadow: mode===m ? '0 2px 12px rgba(227,27,35,.3)' : 'none',
              }}>
                {m==='signIn' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>
        )}

        {/* Título modo esqueci */}
        {mode==='forgot' && (
          <div className="mb-4">
            <button onClick={()=>{setMode('signIn');resetForm();}} style={{background:'none',border:'none',color:'#7a7a8a',fontSize:'.82rem',cursor:'pointer',marginBottom:'.75rem',padding:0}}>
              ← Voltar
            </button>
            <h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2'}}>
              Redefinir senha
            </h2>
            <p style={{fontSize:'.78rem',color:'#7a7a8a',marginTop:'.3rem'}}>
              Digite seu email e enviaremos um link de redefinição.
            </p>
          </div>
        )}

        {/* Botão Google */}
        {mode !== 'forgot' && (
          <>
            <button onClick={handleGoogle} disabled={loading} style={{
              width:'100%',background:'#fff',border:'none',borderRadius:'12px',
              padding:'.8rem',display:'flex',alignItems:'center',justifyContent:'center',
              gap:'.75rem',cursor:'pointer',marginBottom:'.6rem',
              fontWeight:700,fontSize:'.9rem',color:'#1a1a1a',
              boxShadow:'0 2px 8px rgba(0,0,0,.3)',transition:'opacity .15s',
              opacity: loading ? .6 : 1,
            }}>
              <GoogleIcon/>
              Continuar com Google
            </button>
            <p style={{fontSize:'.62rem',color:'#484858',textAlign:'center',marginBottom:'.75rem',lineHeight:1.4}}>
              Ao continuar, você concorda com os{' '}
              <a href="/privacidade.html" target="_blank" style={{color:'#7a7a8a',textDecoration:'none'}}>
                Termos de Uso e Política de Privacidade
              </a>
            </p>
            <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1rem'}}>
              <div style={{flex:1,height:1,background:'#2e2e38'}}/>
              <span style={{fontSize:'.72rem',color:'#484858'}}>ou</span>
              <div style={{flex:1,height:1,background:'#2e2e38'}}/>
            </div>
          </>
        )}

        {/* Formulário */}
        <div style={{display:'grid',gap:'.75rem',marginBottom:'1rem'}}>
          {mode==='signUp' && (
            <div>
              <label style={{fontSize:'.68rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:'5px'}}>Nome</label>
              <input className={inp} type="text" placeholder="Seu nome" value={nome}
                onChange={e=>{setNome(e.target.value);setErro('');}} autoComplete="name"/>
            </div>
          )}
          <div>
            <label style={{fontSize:'.68rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:'5px'}}>Email</label>
            <input className={inp} type="email" placeholder="email@exemplo.com" value={email}
              onChange={e=>{setEmail(e.target.value);setErro('');}} autoComplete="email"/>
          </div>
          {mode !== 'forgot' && (
            <div>
              <label style={{fontSize:'.68rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:'5px'}}>Senha</label>
              <input className={inp} type="password" placeholder="••••••••" value={senha}
                onChange={e=>{setSenha(e.target.value);setErro('');}}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
                autoComplete={mode==='signUp'?'new-password':'current-password'}/>
            </div>
          )}
        </div>

        {/* Termos (signup) */}
        {mode==='signUp' && (
          <label style={{display:'flex',alignItems:'flex-start',gap:'.6rem',marginBottom:'1rem',cursor:'pointer'}}>
            <input type="checkbox" checked={termos} onChange={e=>setTermos(e.target.checked)}
              style={{marginTop:'.15rem',accentColor:'#e31b23',flexShrink:0}}/>
            <span style={{fontSize:'.72rem',color:'#7a7a8a',lineHeight:1.5}}>
              Li e concordo com os{' '}
              <a href="/privacidade.html" target="_blank" style={{color:'#b0b0be',textDecoration:'none'}}>
                Termos de Uso e Política de Privacidade
              </a>
              {' '}do DarkSet, incluindo os avisos sobre atividade física.
            </span>
          </label>
        )}

        {/* Erro */}
        {erro && (
          <div style={{background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.25)',borderRadius:'10px',padding:'.65rem .9rem',marginBottom:'1rem',fontSize:'.82rem',color:'#fca5a5',lineHeight:1.4}}>
            {erro}
          </div>
        )}

        {/* Sucesso */}
        {sucesso && (
          <div style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.25)',borderRadius:'10px',padding:'.65rem .9rem',marginBottom:'1rem',fontSize:'.82rem',color:'#86efac',lineHeight:1.4}}>
            {sucesso}
          </div>
        )}

        {/* Botão principal */}
        <button onClick={mode==='forgot'?handleForgot:handleSubmit} disabled={loading} style={{
          width:'100%',
          background: loading ? 'rgba(227,27,35,.5)' : 'linear-gradient(135deg,#e31b23,#b31217)',
          border:'none',borderRadius:'12px',padding:'13px',color:'#fff',
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',
          textTransform:'uppercase',letterSpacing:'.06em',cursor:loading?'not-allowed':'pointer',
          boxShadow: loading ? 'none' : '0 4px 20px rgba(227,27,35,.3)',
          transition:'all .15s',
          display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',
        }}>
          {loading && <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spinCw .6s linear infinite'}}/>}
          {mode==='signIn'?'Entrar':mode==='signUp'?'Criar conta':'Enviar email'}
        </button>

        {/* Links rodapé */}
        <div style={{textAlign:'center',marginTop:'.85rem',display:'flex',flexDirection:'column',gap:'.4rem'}}>
          {mode==='signIn' && (
            <button onClick={()=>{setMode('forgot');resetForm();}} style={{background:'none',border:'none',color:'#7a7a8a',fontSize:'.78rem',cursor:'pointer',textDecoration:'underline'}}>
              Esqueci minha senha
            </button>
          )}
          <p style={{fontSize:'.78rem',color:'#484858'}}>
            {mode==='signIn' ? 'Ainda não tem uma conta? ' : mode==='signUp' ? 'Já tem uma conta? ' : ''}
            {mode !== 'forgot' && (
              <button onClick={()=>{setMode(mode==='signIn'?'signUp':'signIn');resetForm();}}
                style={{background:'none',border:'none',color:'#b0b0be',fontSize:'.78rem',cursor:'pointer',fontWeight:700,textDecoration:'underline'}}>
                {mode==='signIn' ? 'Criar conta' : 'Entrar'}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
