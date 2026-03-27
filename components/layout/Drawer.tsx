'use client';
import { Trophy, useState, useEffect } from 'react';
import { Trophy, usePathname, useRouter } from 'next/navigation';
import { Trophy, auth } from '@/lib/firebase';
import { Trophy, onAuthStateChanged } from 'firebase/auth';

const MENU = [
  {
    section: 'TREINO',
    items: [
      { href: '/',          icon: '🏠', label: 'Início'       },
      { href: '/treino',    icon: '🏋️', label: 'Fichas'       },
      { href: '/modo-treino',icon:'⚡', label: 'Modo Treino'  },
      { href: '/historico', icon: '📋', label: 'Histórico'    },
      { href: '/evolucao',  icon: '📈', label: 'Evolução'     },
    ],
  },
  {
    section: 'SAÚDE',
    items: [
      { href: '/cardio',    icon: '🏃', label: 'DarkCardio'   },
      { href: '/darkzen',   icon: '🧘', label: 'DarkZen'      },
      { href: '/darkdiet',  icon: '🥗', label: 'DarkDiet'     },
    ],
  },
  {
    section: 'COMUNIDADE',
    items: [
      { href: '/darksquad', icon: '⚔️', label: 'DarkSquad'   },
      { href: '/personal',  icon: '👨‍💼', label: 'Personal'    },
      { href: '/darkselos', icon: '🏅', label: 'DarkSelos'    },
    ],
  },
  {
    section: 'CONTA',
    items: [
      { href: '/perfil',    icon: '👤', label: 'Perfil'       },
    ],
  },
];

export default function Drawer() {
  const [open, setOpen]   = useState(false);
  const [user, setUser]   = useState<any>(null);
  const pathname          = usePathname();
  const router            = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Fecha ao trocar de rota
  useEffect(() => { setOpen(false); }, [pathname]);

  const navigate = (href: string) => { router.push(href); setOpen(false); };

  const initials = user
    ? (user.displayName || user.email || 'DS').slice(0,2).toUpperCase()
    : 'DS';

  return (
    <>
      {/* ── HEADER fixo no topo ──────────────────────────────── */}
      <header style={{
        position:'fixed',top:0,left:0,right:0,zIndex:40,
        background:'rgba(6,6,8,.92)',
        borderBottom:'1px solid rgba(227,27,35,.1)',
        backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0.6rem 1rem',
        paddingTop:'max(env(safe-area-inset-top),0.6rem)',
      }}>
        {/* Hamburger */}
        <button onClick={()=>setOpen(true)} style={{
          background:'none',border:'none',cursor:'pointer',
          padding:'.3rem',display:'flex',flexDirection:'column',
          gap:'5px',flexShrink:0,
        }}>
          <span style={{display:'block',width:22,height:2,background:'#c0c0c8',borderRadius:1,transition:'all .2s'}}/>
          <span style={{display:'block',width:16,height:2,background:'#c0c0c8',borderRadius:1,transition:'all .2s'}}/>
          <span style={{display:'block',width:22,height:2,background:'#c0c0c8',borderRadius:1,transition:'all .2s'}}/>
        </button>

        {/* Logo */}
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',letterSpacing:'.06em',color:'#fff',lineHeight:1}}>
          DARK<span style={{color:'#e31b23'}}>SET</span>
        </div>

        {/* Avatar */}
        <button onClick={()=>navigate('/perfil')} style={{
          width:34,height:34,borderRadius:'50%',
          background: user?.photoURL ? 'transparent' : 'linear-gradient(135deg,#e31b23,#6b0a0e)',
          border:'2px solid rgba(227,27,35,.3)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
          fontSize:'.85rem',color:'#fff',cursor:'pointer',flexShrink:0,
          overflow:'hidden',padding:0,
        }}>
          {user?.photoURL
            ? <img src={user.photoURL} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
            : initials
          }
        </button>
      </header>

      {/* ── OVERLAY ──────────────────────────────────────────── */}
      {open && (
        <div onClick={()=>setOpen(false)} style={{
          position:'fixed',inset:0,zIndex:60,
          background:'rgba(0,0,0,.72)',
          backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)',
          animation:'fadeIn .18s ease',
        }}/>
      )}

      {/* ── DRAWER ───────────────────────────────────────────── */}
      <div style={{
        position:'fixed',top:0,left:0,bottom:0,zIndex:61,
        width:272,maxWidth:'80vw',
        background:'#080809',
        borderRight:'1px solid rgba(227,27,35,.12)',
        display:'flex',flexDirection:'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform .26s cubic-bezier(.4,0,.2,1)',
        overflowY:'auto',
      }}>

        {/* Header do drawer */}
        <div style={{
          padding:'1.25rem 1.1rem 1rem',
          borderBottom:'1px solid rgba(227,27,35,.1)',
          background:'linear-gradient(135deg,rgba(227,27,35,.08),transparent)',
          flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',letterSpacing:'.06em',color:'#fff',lineHeight:1}}>
              DARK<span style={{color:'#e31b23'}}>SET</span>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',color:'#9898a8',fontSize:'1rem',cursor:'pointer'}}>✕</button>
          </div>

          {/* User info */}
          {user ? (
            <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#e31b23,#6b0a0e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'.9rem',color:'#fff',flexShrink:0,overflow:'hidden'}}>
                {user.photoURL ? <img src={user.photoURL} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : initials}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:'.88rem',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.displayName||'Atleta'}</div>
                <div style={{fontSize:'.65rem',color:'#5a5a6a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
              </div>
            </div>
          ) : (
            <button onClick={()=>navigate('/login')} style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'.6rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.85rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer'}}>
              Entrar / Criar conta
            </button>
          )}
        </div>

        {/* Menu items */}
        <div style={{flex:1,padding:'.5rem 0'}}>
          {MENU.map((group,gi)=>(
            <div key={gi}>
              <div style={{fontSize:'.56rem',color:'#323240',textTransform:'uppercase',letterSpacing:'.12em',fontWeight:700,padding:'.65rem 1.1rem .3rem'}}>
                {group.section}
              </div>
              {group.items.map((item,ii)=>{
                const active = pathname===item.href||(item.href!=='/'&&pathname.startsWith(item.href));
                return (
                  <button key={ii} onClick={()=>navigate(item.href)} style={{
                    width:'100%',display:'flex',alignItems:'center',gap:'.85rem',
                    padding:'.72rem 1.1rem',background:'transparent',border:'none',
                    borderLeft:`3px solid ${active?'#e31b23':'transparent'}`,
                    cursor:'pointer',textAlign:'left',
                    transition:'all .12s',
                  }}>
                    <span style={{fontSize:'1.1rem',width:24,textAlign:'center',flexShrink:0}}>{item.icon}</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.04em',color:active?'#fff':'#9898a8'}}>
                      {item.label}
                    </span>
                    {active&&<span style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:'#e31b23',flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Plano badge */}
        <div style={{padding:'1rem 1.1rem',borderTop:'1px solid #111',flexShrink:0}}>
          <div style={{background:'rgba(227,27,35,.06)',border:'1px solid rgba(227,27,35,.15)',borderRadius:'10px',padding:'.75rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:'.6rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em'}}>Plano atual</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',color:'#f0f0f2',marginTop:'1px'}}>Gratuito</div>
            </div>
            <button onClick={()=>navigate('/perfil')} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'8px',padding:'.4rem .85rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.75rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer'}}>
              Elite ›
            </button>
          </div>
          <div style={{fontSize:'.55rem',color:'#323240',textAlign:'center',marginTop:'.5rem',letterSpacing:'.06em'}}>
            DARKSET v2.0 · darksetapp.com
          </div>
        </div>
      </div>
    </>
  );
}
