'use client';
import { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/layout/PageShell';

const TIPOS = [
  { id: 'corrida',   nome: 'Corrida',   icon: '🏃', gps: true  },
  { id: 'bike',      nome: 'Bike',      icon: '🚴', gps: true  },
  { id: 'caminhada', nome: 'Caminhada', icon: '🚶', gps: true  },
  { id: 'hiit',      nome: 'HIIT',      icon: '⚡', gps: false },
  { id: 'natacao',   nome: 'Natação',   icon: '🏊', gps: false },
  { id: 'eliptico',  nome: 'Elíptico',  icon: '🔄', gps: false },
  { id: 'corda',     nome: 'Corda',     icon: '🪢', gps: false },
  { id: 'livre',     nome: 'Livre',     icon: '💪', gps: false },
];

const fmt = (s) => {
  const m = Math.floor(s/60), sec = s%60;
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
};

const calcPace = (distKm, secs) => {
  if (!distKm || !secs) return '--:--';
  const p = (secs/60)/distKm;
  return Math.floor(p)+':'+String(Math.round((p%1)*60)).padStart(2,'0')+'/km';
};

export default function CardioPage() {
  const [view, setView] = useState('home');
  const [tipoSel, setTipoSel] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [dist, setDist] = useState('');
  const [notas, setNotas] = useState('');
  const [useGPS, setUseGPS] = useState(true);
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [gpsErro, setGpsErro] = useState('');
  const [distGPS, setDistGPS] = useState(0);
  const timerRef = useRef(null);
  const tsRef = useRef(null);
  const watchRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    if (running) {
      if (!tsRef.current) tsRef.current = Date.now() - elapsed*1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now()-tsRef.current)/1000));
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  useEffect(() => {
    if (!running || !useGPS || !tipoSel?.gps) return;
    if (!navigator.geolocation) { setGpsErro('GPS não disponível'); return; }
    setGpsAtivo(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const {latitude: lat, longitude: lng, accuracy} = pos.coords;
        if (accuracy > 50) return;
        if (lastRef.current) {
          const R=6371, dLat=(lat-lastRef.current.lat)*Math.PI/180, dLon=(lng-lastRef.current.lng)*Math.PI/180;
          const a=Math.sin(dLat/2)**2+Math.cos(lastRef.current.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2;
          const d=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
          if (d>0.003) { setDistGPS(prev=>Math.round((prev+d)*1000)/1000); lastRef.current={lat,lng}; }
        } else { lastRef.current={lat,lng}; }
      },
      () => setGpsErro('Permissão negada'),
      {enableHighAccuracy:true,timeout:10000,maximumAge:2000}
    );
    return () => { if(watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, [running, useGPS, tipoSel]);

  const distancia = tipoSel?.gps && useGPS ? distGPS : parseFloat(dist||'0');
  const pace = calcPace(distancia, elapsed);

  const iniciar = (tipo) => {
    setTipoSel(tipo); setElapsed(0); setRunning(false);
    setDist(''); setNotas(''); setDistGPS(0);
    setGpsAtivo(false); setGpsErro('');
    lastRef.current=null; tsRef.current=null;
    setView('sessao');
  };

  const salvar = () => {
    setRunning(false);
    if(watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    setView('home');
  };

  if (view==='sessao' && tipoSel) return (
    <PageShell>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',textTransform:'uppercase',color:'#f0f0f2'}}>
          {tipoSel.icon} {tipoSel.nome}
        </div>
        <button onClick={()=>{setRunning(false);setView('home');}} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.4rem .8rem',color:'#9898a8',fontSize:'.8rem',fontWeight:700,cursor:'pointer'}}>Sair</button>
      </div>
      <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'16px',padding:'1.5rem',textAlign:'center',marginBottom:'.75rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'5rem',letterSpacing:'.04em',lineHeight:1,color:running?'#e31b23':'#f0f0f2',textShadow:running?'0 0 30px rgba(227,27,35,.35)':'none',transition:'all .3s'}}>
          {fmt(elapsed)}
        </div>
        <div style={{fontSize:'.6rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.1em',marginTop:'.3rem'}}>tempo</div>
        {distancia>0&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.5rem',marginTop:'1rem'}}>
            {[[distancia.toFixed(2)+'km','dist'],[pace,'pace'],[Math.round(distancia*70*0.72)+'kcal','cal']].map(([v,l],i)=>(
              <div key={i} style={{background:'rgba(0,0,0,.3)',borderRadius:'8px',padding:'.5rem'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:i===1?'#e31b23':'#fff'}}>{v}</div>
                <div style={{fontSize:'.5rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em'}}>{l}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:'.6rem',marginTop:'1.1rem'}}>
          <button onClick={()=>setRunning(r=>!r)} style={{flex:1,background:running?'rgba(227,27,35,.14)':'linear-gradient(135deg,#e31b23,#b31217)',border:running?'1px solid rgba(227,27,35,.3)':'none',borderRadius:'12px',padding:'.9rem',color:running?'#e31b23':'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',cursor:'pointer'}}>
            {running?'⏸ Pausar':elapsed>0?'▶ Retomar':'▶ Iniciar'}
          </button>
          <button onClick={()=>{setRunning(false);setElapsed(0);tsRef.current=null;setDistGPS(0);}} style={{background:'rgba(255,255,255,.04)',border:'1px solid #202028',borderRadius:'12px',padding:'.9rem 1rem',color:'#9898a8',fontSize:'1rem',cursor:'pointer'}}>↺</button>
        </div>
      </div>
      {tipoSel.gps&&(
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.85rem 1rem',marginBottom:'.75rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'.65rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.07em'}}>📍 GPS</div>
            <button onClick={()=>setUseGPS(g=>!g)} style={{fontSize:'.65rem',fontWeight:700,padding:'.22rem .6rem',borderRadius:'6px',cursor:'pointer',border:'1px solid '+(useGPS?'rgba(227,27,35,.3)':'#202028'),background:useGPS?'rgba(227,27,35,.1)':'rgba(255,255,255,.04)',color:useGPS?'#e31b23':'#9898a8'}}>
              {useGPS?'🛰 Ligado':'📝 Manual'}
            </button>
          </div>
          {useGPS&&<div style={{marginTop:'.5rem',fontSize:'.78rem',color:gpsErro?'#f87171':gpsAtivo?'#22c55e':'#9898a8'}}>{gpsErro||(gpsAtivo?'✅ Rastreando — '+distGPS.toFixed(2)+'km':'⏳ Aguardando GPS...')}</div>}
          {!useGPS&&<input type="number" step="0.1" placeholder="Distância (km)" value={dist} onChange={e=>setDist(e.target.value)} style={{width:'100%',marginTop:'.5rem',background:'#111115',border:'1px solid #222227',borderRadius:'8px',color:'#eaeaea',padding:'8px 12px',fontSize:'.9rem',outline:'none'}}/>}
        </div>
      )}
      <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'1rem'}}>
        <textarea placeholder="Como foi o treino?" value={notas} onChange={e=>setNotas(e.target.value)} rows={2} style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'8px',color:'#eaeaea',padding:'8px 12px',fontSize:'.85rem',outline:'none',resize:'none',fontFamily:'Inter,sans-serif'}}/>
        <button onClick={salvar} style={{width:'100%',marginTop:'.75rem',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'12px',padding:'13px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',cursor:'pointer',boxShadow:'0 4px 20px rgba(227,27,35,.3)'}}>
          Salvar Cardio ✓
        </button>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.9rem',textTransform:'uppercase',lineHeight:1}}>
            DARK<span style={{color:'#e31b23'}}>CARDIO</span>
          </div>
          <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>Registre seu cardio</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.6rem'}}>
        {TIPOS.map(tipo=>(
          <button key={tipo.id} onClick={()=>iniciar(tipo)} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'1rem .5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'.4rem',cursor:'pointer'}}>
            <span style={{fontSize:'1.8rem'}}>{tipo.icon}</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',textTransform:'uppercase',color:'#f0f0f2'}}>{tipo.nome}</span>
            {tipo.gps&&<span style={{fontSize:'.52rem',color:'#e31b23',fontWeight:700}}>📍 GPS</span>}
          </button>
        ))}
      </div>
    </PageShell>
  );
}
