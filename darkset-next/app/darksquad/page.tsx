'use client';
import PageShell from '@/components/layout/PageShell';
export default function Page() {
  return <PageShell><div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center',gap:'1rem'}}><div style={{fontSize:'4rem'}}>⚔️</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2'}}>DarkSquad</div><div style={{fontSize:'.85rem',color:'#5a5a6a',maxWidth:260}}>Treine em grupo, compete no ranking e vença o mês. Em breve!</div></div></PageShell>;
}
