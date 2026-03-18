'use client';
import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { href:'/',         label:'Início',  icon:'🏠' },
  { href:'/treino',   label:'Treino',  icon:'🏋️' },
  { href:'/cardio',   label:'Cardio',  icon:'🏃' },
  { href:'/evolucao', label:'Evolução',icon:'📈' },
  { href:'/perfil',   label:'Perfil',  icon:'👤' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav style={{
      position:'fixed',bottom:0,left:0,right:0,zIndex:50,
      background:'#0e0e11',borderTop:'1px solid #202028',
      paddingBottom:'max(env(safe-area-inset-bottom),8px)',
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-around',paddingTop:8,paddingBottom:4}}>
        {TABS.map(({href,icon,label})=>{
          const active = pathname===href||(href!=='/'&&pathname.startsWith(href));
          return (
            <button key={href} onClick={()=>router.push(href)}
              style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'4px 12px',background:'none',border:'none',cursor:'pointer',minWidth:52}}>
              <span style={{fontSize:'1.3rem',lineHeight:1}}>{icon}</span>
              <span style={{fontSize:10,fontWeight:600,letterSpacing:'.03em',color:active?'#e31b23':'#5a5a6a'}}>{label}</span>
              {active&&<span style={{width:4,height:4,borderRadius:'50%',background:'#e31b23',display:'block',marginTop:1}}/>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
