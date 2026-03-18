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

const BG = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format&fit=crop';
const BG_FALLBACK = 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80&auto=format&fit=crop';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" style={{flexShrink:0}}>
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
  const [imgLoaded, setImgLoaded] = useState(false);

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
        setSucesso(`✅ Conta criada! Verifique seu email (${email}) antes de entrar.`);
        setMode('signIn');
      }
    } catch(e:any){
      setErro(errMsg(e.code||''));
    } finally { setLoading(false); }
  };

  const inp = {
    width:'100%', background:'rgba(0,0,0,.4)',
    border:'1px solid rgba(255,255,255,.1)', borderRadius:'12px',
    color:'#fff', padding:'12px 14px', fontSize:'1rem',
    outline:'none', fontFamily:'Inter,sans-serif',
  } as React.CSSProperties;

  const inpFocus = (e:React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(227,27,35,.6)';
  };
  const inpBlur = (e:React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,.1)';
  };

  return (
    <>
      {/* ── SPLASH SCREEN ─────────────────────────────────────── */}
      <div style={{
        position:'fixed', inset:0,
        display:'flex', flexDirection:'column',
        overflow:'hidden',
        background:'#0a0a0e',
      }}>
        {/* Background com foto sempre visível via CSS */}
        <div style={{
          position:'absolute',inset:0,
          backgroundImage:`url(${BG})`,
          backgroundSize:'cover',
          backgroundPosition:'center',
          backgroundRepeat:'no-repeat',
          backgroundAttachment:'scroll',
        }}/>

        {/* Gradiente forte para legibilidade */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(8,8,16,.65) 0%,rgba(8,8,16,.35) 30%,rgba(8,8,16,.75) 65%,rgba(8,8,16,1) 90%)'}}/>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 40%,rgba(227,27,35,.1) 0%,transparent 55%)'}}/>

        {/* Conteúdo */}
        <div style={{
          position:'relative', zIndex:1,
          display:'flex', flexDirection:'column',
          height:'100%', padding:'0 1.5rem',
        }}>
          {/* Logo — centro superior */}
          <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'.5rem'}}>
            {/* Badge */}
            <div style={{
              background:'rgba(227,27,35,.15)',
              border:'1px solid rgba(227,27,35,.3)',
              borderRadius:'999px', padding:'.3rem .9rem',
              fontSize:'.65rem', fontWeight:700, color:'rgba(227,27,35,.9)',
              textTransform:'uppercase', letterSpacing:'.15em',
              marginBottom:'.5rem',
            }}>Seu app de treino</div>

            {/* Logo */}
            <h1 style={{
              fontFamily:"'Barlow Condensed',sans-serif",
              fontWeight:900, fontSize:'5rem',
              letterSpacing:'.06em', color:'#fff', lineHeight:1,
              textShadow:'0 4px 32px rgba(0,0,0,.8)',
              margin:0,
            }}>
              DARK<span style={{color:'#e31b23'}}>SET</span>
            </h1>

            {/* Slogan */}
            <p style={{
              fontSize:'.88rem', color:'rgba(255,255,255,.7)',
              letterSpacing:'.12em', textTransform:'uppercase',
              fontWeight:500, marginTop:'.25rem',
            }}>
              Seu Treino. Sua Evolução.
            </p>

            {/* Features rápidas */}
            <div style={{
              display:'flex', gap:'.75rem', marginTop:'1.5rem', flexWrap:'wrap',
              justifyContent:'center',
            }}>
              {['🏋️ Fichas', '📈 Evolução', '🏃 Cardio', '⚔️ Squad'].map(f=>(
                <div key={f} style={{
                  background:'rgba(255,255,255,.08)',
                  border:'1px solid rgba(255,255,255,.12)',
                  borderRadius:'999px', padding:'.3rem .75rem',
                  fontSize:'.72rem', color:'rgba(255,255,255,.7)', fontWeight:600,
                }}>{f}</div>
              ))}
            </div>
          </div>

          {/* Botões inferiores */}
          <div style={{paddingBottom:'max(env(safe-area-inset-bottom),2rem)', display:'grid', gap:'.75rem'}}>
            {/* Stats */}
            <div style={{
              display:'flex', justifyContent:'center', gap:'2rem',
              marginBottom:'.5rem',
            }}>
              {[['10k+','Atletas'],['500+','Exercícios'],['4.8★','Avaliação']].map(([v,l])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:'#fff',lineHeight:1}}>{v}</div>
                  <div style={{fontSize:'.6rem',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.08em',marginTop:'2px'}}>{l}</div>
                </div>
              ))}
            </div>

            <button onClick={()=>openModal('signIn')} style={{
              width:'100%',
              background:'linear-gradient(135deg,#e31b23,#8b0000)',
              border:'none', borderRadius:'16px',
              padding:'16px', color:'#fff',
              fontFamily:"'Barlow Condensed',sans-serif",
              fontWeight:900, fontSize:'1.1rem',
              textTransform:'uppercase', letterSpacing:'.08em',
              cursor:'pointer',
              boxShadow:'0 4px 24px rgba(227,27,35,.4)',
            }}>
              Entrar
            </button>

            <button onClick={()=>openModal('signUp')} style={{
              width:'100%',
              background:'rgba(255,255,255,.08)',
              border:'1px solid rgba(255,255,255,.18)',
              borderRadius:'16px', padding:'16px', color:'#fff',
              fontFamily:"'Barlow Condensed',sans-serif",
              fontWeight:900, fontSize:'1.1rem',
              textTransform:'uppercase', letterSpacing:'.08em',
              cursor:'pointer', backdropFilter:'blur(10px)',
            }}>
              Criar conta grátis
            </button>

            <p style={{textAlign:'center',fontSize:'.65rem',color:'rgba(255,255,255,.25)',lineHeight:1.4}}>
              Ao continuar, você concorda com os Termos de Uso e Política de Privacidade do DarkSet.
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────── */}
      {showModal && (
        <>
          {/* Overlay */}
          <div onClick={()=>setShowModal(false)} style={{
            position:'fixed', inset:0, zIndex:90,
            background:'rgba(0,0,0,.6)',
            backdropFilter:'blur(4px)',
            animation:'fadeIn .2s ease',
          }}/>

          {/* Sheet */}
          <div style={{
            position:'fixed', bottom:0, left:0, right:0, zIndex:91,
            background:'#111115',
            borderTop:'1px solid rgba(255,255,255,.08)',
            borderRadius:'24px 24px 0 0',
            padding:'1.5rem 1.5rem max(env(safe-area-inset-bottom),1.5rem)',
            maxHeight:'92vh', overflowY:'auto',
            animation:'slideUp .28s cubic-bezier(.4,0,.2,1)',
          }}>
            {/* Handle */}
            <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,.15)',margin:'-0.5rem auto 1.25rem'}}/>

            {/* Logo mini */}
            <div style={{textAlign:'center',marginBottom:'1.25rem'}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:'#fff',letterSpacing:'.06em'}}>
                DARK<span style={{color:'#e31b23'}}>SET</span>
              </span>
            </div>

            {/* Tabs */}
            {mode!=='forgot' && (
              <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'12px',padding:'3px',gap:'3px',marginBottom:'1.25rem'}}>
                {(['signIn','signUp'] as Mode[]).map(m=>(
                  <button key={m} onClick={()=>{setMode(m);resetForm();}} style={{
                    flex:1, padding:'.5rem', borderRadius:'9px', border:'none',
                    cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif",
                    fontWeight:800, fontSize:'.9rem', textTransform:'uppercase',
                    letterSpacing:'.05em', transition:'all .15s',
                    background: mode===m ? '#e31b23' : 'transparent',
                    color: mode===m ? '#fff' : 'rgba(255,255,255,.35)',
                    boxShadow: mode===m ? '0 2px 12px rgba(227,27,35,.3)' : 'none',
                  }}>
                    {m==='signIn'?'Entrar':'Criar conta'}
                  </button>
                ))}
              </div>
            )}

            {/* Botão Google */}
            {mode!=='forgot' && (
              <>
                <button onClick={handleGoogle} disabled={loading} style={{
                  width:'100%', background:'#fff', border:'none', borderRadius:'12px',
                  padding:'.85rem', display:'flex', alignItems:'center',
                  justifyContent:'center', gap:'.75rem', cursor:'pointer',
                  fontWeight:700, fontSize:'.9rem', color:'#1a1a1a',
                  marginBottom:'.75rem', opacity: loading?.6:1,
                  boxShadow:'0 2px 12px rgba(0,0,0,.3)',
                }}>
                  <GoogleIcon/> Continuar com Google
                </button>
                <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1rem'}}>
                  <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
                  <span style={{fontSize:'.72rem',color:'rgba(255,255,255,.3)'}}>ou</span>
                  <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
                </div>
              </>
            )}

            {/* Título forgot */}
            {mode==='forgot' && (
              <div style={{marginBottom:'1.25rem'}}>
                <button onClick={()=>{setMode('signIn');resetForm();}} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',fontSize:'.82rem',cursor:'pointer',padding:0,marginBottom:'.5rem',display:'block'}}>
                  ← Voltar
                </button>
                <h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#fff',margin:0}}>
                  Redefinir senha
                </h2>
                <p style={{fontSize:'.8rem',color:'rgba(255,255,255,.4)',marginTop:'.3rem'}}>
                  Enviaremos um link para seu email.
                </p>
              </div>
            )}

            {/* Formulário */}
            <div style={{display:'grid',gap:'.75rem',marginBottom:'1rem'}}>
              {mode==='signUp' && (
                <div>
                  <label style={{fontSize:'.65rem',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.1em',display:'block',marginBottom:'5px'}}>Nome</label>
                  <input style={inp} type="text" placeholder="Seu nome" value={nome}
                    onFocus={inpFocus} onBlur={inpBlur}
                    onChange={e=>{setNome(e.target.value);setErro('');}} autoComplete="name"/>
                </div>
              )}
              <div>
                <label style={{fontSize:'.65rem',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.1em',display:'block',marginBottom:'5px'}}>Email</label>
                <input style={inp} type="email" placeholder="email@exemplo.com" value={email}
                  onFocus={inpFocus} onBlur={inpBlur}
                  onChange={e=>{setEmail(e.target.value);setErro('');}} autoComplete="email"/>
              </div>
              {mode!=='forgot' && (
                <div>
                  <label style={{fontSize:'.65rem',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.1em',display:'block',marginBottom:'5px'}}>Senha</label>
                  <input style={inp} type="password" placeholder="••••••••" value={senha}
                    onFocus={inpFocus} onBlur={inpBlur}
                    onChange={e=>{setSenha(e.target.value);setErro('');}}
                    onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
                    autoComplete={mode==='signUp'?'new-password':'current-password'}/>
                </div>
              )}
            </div>

            {/* Termos signup */}
            {mode==='signUp' && (
              <label style={{display:'flex',alignItems:'flex-start',gap:'.6rem',marginBottom:'1rem',cursor:'pointer'}}>
                <input type="checkbox" checked={termos} onChange={e=>setTermos(e.target.checked)}
                  style={{marginTop:'.15rem',accentColor:'#e31b23',flexShrink:0}}/>
                <span style={{fontSize:'.72rem',color:'rgba(255,255,255,.4)',lineHeight:1.5}}>
                  Li e concordo com os{' '}
                  <a href="/privacidade.html" target="_blank" style={{color:'rgba(255,255,255,.65)',textDecoration:'none'}}>Termos de Uso</a>
                  {' '}do DarkSet.
                </span>
              </label>
            )}

            {/* Erro / Sucesso */}
            {erro && (
              <div style={{background:'rgba(227,27,35,.12)',border:'1px solid rgba(227,27,35,.3)',borderRadius:'10px',padding:'.7rem .9rem',marginBottom:'.85rem',fontSize:'.82rem',color:'#fca5a5',lineHeight:1.4}}>
                {erro}
              </div>
            )}
            {sucesso && (
              <div style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.25)',borderRadius:'10px',padding:'.7rem .9rem',marginBottom:'.85rem',fontSize:'.82rem',color:'#86efac',lineHeight:1.4}}>
                {sucesso}
              </div>
            )}

            {/* Botão submit */}
            <button onClick={handleSubmit} disabled={loading} style={{
              width:'100%',
              background: loading ? 'rgba(227,27,35,.4)' : 'linear-gradient(135deg,#e31b23,#b31217)',
              border:'none', borderRadius:'14px', padding:'15px', color:'#fff',
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
              fontSize:'1.05rem', textTransform:'uppercase', letterSpacing:'.06em',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(227,27,35,.3)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem',
            }}>
              {loading && <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spinCw .6s linear infinite'}}/>}
              {mode==='signIn'?'Entrar':mode==='signUp'?'Criar conta':'Enviar link'}
            </button>

            {/* Links */}
            <div style={{textAlign:'center',marginTop:'.85rem',display:'flex',flexDirection:'column',gap:'.35rem'}}>
              {mode==='signIn' && (
                <button onClick={()=>{setMode('forgot');resetForm();}} style={{background:'none',border:'none',color:'rgba(255,255,255,.3)',fontSize:'.78rem',cursor:'pointer',textDecoration:'underline'}}>
                  Esqueci minha senha
                </button>
              )}
              {mode!=='forgot' && (
                <p style={{fontSize:'.78rem',color:'rgba(255,255,255,.25)',margin:0}}>
                  {mode==='signIn' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
                  <button onClick={()=>{setMode(mode==='signIn'?'signUp':'signIn');resetForm();}} style={{background:'none',border:'none',color:'rgba(255,255,255,.55)',fontSize:'.78rem',cursor:'pointer',fontWeight:700,textDecoration:'underline'}}>
                    {mode==='signIn' ? 'Criar conta' : 'Entrar'}
                  </button>
                </p>
              )}
            </div>
          </div>

          <style>{`
            @keyframes fadeIn { from{opacity:0} to{opacity:1} }
            @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
          `}</style>
        </>
      )}
    </>
  );
}
