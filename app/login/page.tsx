'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, provider } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'cadastro'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const traduzErro = (code: string) => {
    const erros: Record<string, string> = {
      'auth/invalid-email':          'Email inválido',
      'auth/user-not-found':         'Usuário não encontrado',
      'auth/wrong-password':         'Senha incorreta',
      'auth/email-already-in-use':   'Email já cadastrado',
      'auth/weak-password':          'Senha muito fraca (mín. 6 caracteres)',
      'auth/too-many-requests':      'Muitas tentativas. Tente mais tarde',
      'auth/popup-closed-by-user':   'Login cancelado',
      'auth/network-request-failed': 'Sem conexão com internet',
    };
    return erros[code] || 'Erro inesperado. Tente novamente';
  };

  const handleSubmit = async () => {
    setErro('');
    if (!email || !senha) { setErro('Preencha todos os campos'); return; }
    if (mode === 'cadastro' && !nome) { setErro('Preencha seu nome'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, senha);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(cred.user, { displayName: nome });
      }
      router.push('/');
    } catch (e: any) {
      setErro(traduzErro(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErro('');
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (e: any) {
      setErro(traduzErro(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) { setErro('Digite seu email acima primeiro'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setForgotSent(true);
      setErro('');
    } catch (e: any) {
      setErro(traduzErro(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#060608', display: 'flex', flexDirection: 'column' }}>
      {/* Foto de fundo */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80')",
        backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0,
      }}/>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(to bottom, rgba(6,6,8,.55) 0%, rgba(6,6,8,.92) 45%, rgba(6,6,8,1) 100%)',
        zIndex: 1,
      }}/>

      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
        minHeight: '100dvh', padding: '0 1.5rem',
      }}>
        {/* Logo */}
        <div style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)', marginBottom: 'auto' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900, fontSize: '2.8rem',
            letterSpacing: '.06em', lineHeight: 1, color: '#fff',
          }}>
            DARK<span style={{ color: '#e31b23' }}>SET</span>
          </div>
          <div style={{
            fontSize: '.72rem', color: 'rgba(255,255,255,.35)',
            letterSpacing: '.18em', textTransform: 'uppercase', marginTop: '4px',
          }}>
            Treine. Evolua. Domine.
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(14,14,17,.95)',
          border: '1px solid #202028', borderRadius: '20px',
          padding: '1.5rem',
          marginBottom: 'max(env(safe-area-inset-bottom), 32px)',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Toggle */}
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,.4)',
            border: '1px solid #202028', borderRadius: '10px',
            padding: '3px', gap: '3px', marginBottom: '1.25rem',
          }}>
            {(['login', 'cadastro'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErro(''); setForgotSent(false); }}
                style={{
                  flex: 1, padding: '.48rem', borderRadius: '8px',
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontSize: '.85rem',
                  letterSpacing: '.06em', textTransform: 'uppercase',
                  transition: 'all .15s',
                  background: mode === m ? '#e31b23' : 'transparent',
                  color: mode === m ? '#fff' : '#5a5a6a',
                  boxShadow: mode === m ? '0 2px 12px rgba(227,27,35,.32)' : 'none',
                }}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px',
            background: '#fff', color: '#111', border: 'none',
            borderRadius: '12px', padding: '13px',
            fontWeight: 700, fontSize: '.95rem', cursor: 'pointer',
            marginBottom: '1rem',
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '.04em',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.5 12.27c0-.84-.07-1.45-.22-2.09H12.22v3.8h6.42c-.13 1.01-.83 2.53-2.39 3.55l3.47 2.69C21.74 18.42 23.5 15.63 23.5 12.27z"/>
              <path fill="#34A853" d="M12.22 23.5c3.14 0 5.77-1.03 7.69-2.82l-3.66-2.83c-.98.67-2.31 1.14-4.03 1.14-3.08 0-5.68-2.02-6.61-4.82l-3.58 2.77C2.83 21 7.19 23.5 12.22 23.5z"/>
              <path fill="#FBBC05" d="M5.61 14.17c-.24-.73-.38-1.52-.38-2.35 0-.82.14-1.61.37-2.35L2 6.67C.75 8.26.22 10.06.22 11.82c0 1.76.53 3.56 1.63 5.25l3.76-2.9z"/>
              <path fill="#EA4335" d="M12.22 4.64c2.18 0 3.64.94 4.48 1.72l3.26-3.18C17.98 1.2 15.36.14 12.22.14 7.19.14 2.83 2.63.75 6.4l3.84 2.98C5.52 7.58 8.12 4.64 12.22 4.64z"/>
            </svg>
            Continuar com Google
          </button>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#202028' }}/>
            <span style={{ fontSize: '.72rem', color: '#5a5a6a', letterSpacing: '.1em' }}>ou</span>
            <div style={{ flex: 1, height: '1px', background: '#202028' }}/>
          </div>

          {/* Campos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1rem' }}>
            {mode === 'cadastro' && (
              <div>
                <label style={{ fontSize: '.68rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '5px' }}>Nome</label>
                <input type="text" placeholder="Seu nome" value={nome}
                  onChange={e => setNome(e.target.value)}
                  style={{ width: '100%', background: '#111115', border: '1px solid #222227', borderRadius: '10px', color: '#eaeaea', padding: '11px 13px', fontSize: '.9rem', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
              </div>
            )}
            <div>
              <label style={{ fontSize: '.68rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '5px' }}>Email</label>
              <input type="email" placeholder="email@exemplo.com" value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: '#111115', border: '1px solid #222227', borderRadius: '10px', color: '#eaeaea', padding: '11px 13px', fontSize: '.9rem', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
            </div>
            <div>
              <label style={{ fontSize: '.68rem', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '5px' }}>Senha</label>
              <input type="password" placeholder="••••••••" value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', background: '#111115', border: '1px solid #222227', borderRadius: '10px', color: '#eaeaea', padding: '11px 13px', fontSize: '.9rem', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div style={{
              background: 'rgba(227,27,35,.1)', border: '1px solid rgba(227,27,35,.25)',
              borderRadius: '8px', padding: '9px 12px',
              fontSize: '.78rem', color: '#f87171', marginBottom: '.75rem',
            }}>{erro}</div>
          )}

          {/* Sucesso esqueci senha */}
          {forgotSent && (
            <div style={{
              background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)',
              borderRadius: '8px', padding: '9px 12px',
              fontSize: '.78rem', color: '#4ade80', marginBottom: '.75rem',
            }}>✅ Email enviado! Verifique sua caixa de entrada.</div>
          )}

          {/* Botão submit */}
          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%',
            background: loading ? 'rgba(227,27,35,.4)' : 'linear-gradient(135deg,#e31b23,#b31217)',
            border: 'none', borderRadius: '12px', padding: '13px', color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800, fontSize: '1rem', letterSpacing: '.04em',
            textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(227,27,35,.3)', transition: 'all .15s',
          }}>
            {loading ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          {/* Esqueci senha */}
          {mode === 'login' && (
            <button onClick={handleForgot} style={{
              width: '100%', background: 'none', border: 'none',
              color: '#5a5a6a', fontSize: '.75rem', cursor: 'pointer',
              marginTop: '.75rem', fontFamily: 'Inter, sans-serif',
            }}>
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
