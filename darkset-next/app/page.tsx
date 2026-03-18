'use client';
import PageShell from '@/components/layout/PageShell';

export default function HomePage() {
  const streak = 12;
  const weekDone = 3;
  const weekGoal = 5;
  const weekDays = ['S','T','Q','Q','S','S','D'];
  const trainedDays = [0, 1, 3];

  return (
    <PageShell>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
        <div>
          <p style={{fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.12em',color:'#5a5a6a',margin:0}}>Bem-vindo de volta</p>
          <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#f0f0f2',margin:0,lineHeight:1}}>DarkSet</h1>
        </div>
        <div style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#e31b23,#6b0a0e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#fff'}}>DS</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem',marginBottom:'1rem'}}>
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'1rem',textAlign:'center'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2.5rem',color:streak>0?'#f97316':'#323240',lineHeight:1}}>{streak}</div>
          <div style={{fontSize:'.65rem',color:'#9898a8',textTransform:'uppercase',letterSpacing:'.07em',marginTop:'.25rem'}}>🔥 Streak dias</div>
        </div>
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.5rem'}}>
            <span style={{fontSize:'.65rem',color:'#9898a8',textTransform:'uppercase',letterSpacing:'.07em'}}>Semana</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#e31b23'}}>{weekDone}/{weekGoal}</span>
          </div>
          <div style={{display:'flex',gap:'.3rem',justifyContent:'space-between'}}>
            {weekDays.map((d,i)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:trainedDays.includes(i)?'#e31b23':'rgba(255,255,255,.06)',boxShadow:trainedDays.includes(i)?'0 0 8px rgba(227,27,35,.5)':'none'}}/>
                <span style={{fontSize:'9px',color:'#323240'}}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.5rem'}}>Hoje</p>
      <div style={{background:'#0e0e11',border:'1px solid #202028',borderLeft:'2px solid #e31b23',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>Treino A — Peito</div>
            <div style={{fontSize:'.72rem',color:'#9898a8',marginTop:'3px'}}>8 exercícios · ~55 min</div>
          </div>
          <button style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'.6rem 1.1rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.88rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.3)'}}>Iniciar</button>
        </div>
        <div style={{marginTop:'.75rem',background:'#16161c',borderRadius:'3px',height:'3px'}}>
          <div style={{height:'100%',borderRadius:'3px',background:'#e31b23',width:'0%'}}/>
        </div>
        <div style={{fontSize:'.62rem',color:'#5a5a6a',marginTop:'4px'}}>0 de 8 exercícios</div>
      </div>

      <p style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.5rem'}}>Últimos treinos</p>
      <div style={{display:'grid',gap:'.5rem'}}>
        {[
          {date:'Ontem',      plan:'Treino B — Costas', dur:'48 min'},
          {date:'Quinta-feira',plan:'Treino A — Peito',  dur:'52 min'},
          {date:'Terça-feira', plan:'Treino C — Pernas', dur:'61 min'},
        ].map((t,i)=>(
          <div key={i} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.85rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:'.65rem',textTransform:'uppercase',letterSpacing:'.04em',color:'#5a5a6a',marginBottom:'2px'}}>{t.date}</div>
              <div style={{fontWeight:600,fontSize:'.9rem',color:'#f0f0f2'}}>{t.plan}</div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:'#e31b23'}}>{t.dur}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
