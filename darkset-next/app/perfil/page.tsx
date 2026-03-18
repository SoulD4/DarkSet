'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('config');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <div style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%',animation:'spinCw .65s linear infinite'}}/>
      </div>
    </PageShell>
  );

  if (!user) return (
    <PageShell>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:'1rem',textAlign:'center'}}>
        <div style={{fontSize:'3rem'}}>👤</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2'}}>
          Faça login para acessar seu perfil
        </div>
        <button onClick={()=>router.push('/login')} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'12px',padding:'13px 32px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.3)'}}>
          Entrar
        </button>
      </div>
    </PageShell>
  );

  const initials = (user.displayName||user.email||'DS').slice(0,2).toUpperCase();

  return (
    <PageShell>
      {/* Header do perfil */}
      <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'16px',padding:'1.25rem',marginBottom:'1rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
          {user.photoURL
            ? <img src={user.photoURL} style={{width:60,height:60,borderRadius:'50%',border:'2px solid #202028',objectFit:'cover'}} alt="avatar"/>
            : <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#e31b23,#6b0a0e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:'#fff',flexShrink:0}}>{initials}</div>
          }
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#f0f0f2',lineHeight:1}}>
              {user.displayName||'Atleta'}
            </div>
            <div style={{fontSize:'.72rem',color:'#5a5a6a',marginTop:'3px'}}>{user.email}</div>
            <div style={{marginTop:'6px'}}>
              <span style={{background:'rgba(255,255,255,.05)',border:'1px solid #202028',borderRadius:'999px',padding:'.15rem .6rem',fontSize:'.62rem',color:'#9898a8',fontWeight:600}}>
                Gratuito
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #202028',borderRadius:'10px',padding:'3px',gap:'3px',marginBottom:'1rem'}}>
        {[['config','⚙️ Config'],['stats','📊 Stats'],['plano','👑 Plano']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'.46rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',letterSpacing:'.04em',textTransform:'uppercase',transition:'all .15s',background:tab===id?'#e31b23':'transparent',color:tab===id?'#fff':'#5a5a6a',boxShadow:tab===id?'0 2px 12px rgba(227,27,35,.32)':'none'}}>
            {label}
          </button>
        ))}
      </div>

      {/* Config */}
      {tab==='config'&&(
        <div style={{display:'grid',gap:'.65rem'}}>
          {[
            {icon:'🔔', label:'Notificações', desc:'Lembretes de treino'},
            {icon:'🎯', label:'Meta semanal', desc:'5 treinos por semana'},
            {icon:'⚖️', label:'Unidade de peso', desc:'Quilogramas (kg)'},
            {icon:'🌙', label:'Tema', desc:'Escuro'},
            {icon:'📱', label:'Vibração', desc:'Ativada'},
          ].map((item,i)=>(
            <div key={i} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.9rem 1rem',display:'flex',alignItems:'center',gap:'.85rem',cursor:'pointer'}}>
              <span style={{fontSize:'1.3rem'}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:'.9rem',fontWeight:600,color:'#f0f0f2'}}>{item.label}</div>
                <div style={{fontSize:'.72rem',color:'#5a5a6a',marginTop:'1px'}}>{item.desc}</div>
              </div>
              <span style={{color:'#323240',fontSize:'.9rem'}}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {tab==='stats'&&(
        <div style={{display:'grid',gap:'.65rem'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem'}}>
            {[
              ['47', '🔥', 'Streak máx.'],
              ['12', '📅', 'Streak atual'],
              ['128', '🏋️', 'Total treinos'],
              ['4.2t', '⚡', 'Volume total'],
            ].map(([val,icon,lbl],i)=>(
              <div key={i} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'1rem',textAlign:'center'}}>
                <div style={{fontSize:'1.3rem',marginBottom:'.25rem'}}>{icon}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:i<2?'#f97316':'#e31b23',lineHeight:1}}>{val}</div>
                <div style={{fontSize:'.58rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'3px'}}>{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'1rem'}}>
            <div style={{fontSize:'.65rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.75rem'}}>PRs pessoais</div>
            {[['Supino Reto','80kg'],['Agachamento','100kg'],['Remada','68kg']].map(([ex,pr],i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.55rem 0',borderBottom:i<2?'1px solid #202028':'none'}}>
                <span style={{fontSize:'.88rem',color:'#9898a8'}}>{ex}</span>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:'#e31b23'}}>{pr}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plano */}
      {tab==='plano'&&(
        <div style={{display:'grid',gap:'.75rem'}}>
          <div style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}>
            <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>⚡</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',textTransform:'uppercase',color:'#fff',letterSpacing:'.04em'}}>
              DARK<span style={{color:'#e31b23'}}>SET</span> ELITE
            </div>
            <div style={{fontSize:'.78rem',color:'#9898a8',marginTop:'.3rem',marginBottom:'1rem'}}>Desbloqueie tudo e evolua mais rápido</div>
            {[['📊','Gráficos avançados'],['☁️','Backup na nuvem'],['🏃','Cardio GPS'],['👥','Squad']].map(([icon,feat],i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.45rem 0',textAlign:'left'}}>
                <span>{icon}</span>
                <span style={{fontSize:'.85rem',color:'#f0f0f2'}}>{feat}</span>
                <span style={{marginLeft:'auto',fontSize:'.7rem',color:'#22c55e',fontWeight:700}}>✓</span>
              </div>
            ))}
            <button style={{width:'100%',marginTop:'1rem',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'12px',padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.05rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.3)'}}>
              Assinar Elite — R$ 14,90/mês
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <button onClick={handleLogout} style={{width:'100%',marginTop:'1.25rem',background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'12px',padding:'13px',color:'#e31b23',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer'}}>
        Sair da conta
      </button>
    </PageShell>
  );
}
