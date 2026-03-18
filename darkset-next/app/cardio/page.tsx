'use client';
import { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/layout/PageShell';

const TIPOS = [
  {id:'corrida',  nome:'Corrida',  icon:'🏃', gps:true,  cor:'#e31b23'},
  {id:'bike',     nome:'Bike',     icon:'🚴', gps:true,  cor:'#f97316'},
  {id:'caminhada',nome:'Caminhada',icon:'🚶', gps:true,  cor:'#22c55e'},
  {id:'hiit',     nome:'HIIT',     icon:'⚡', gps:false, cor:'#facc15'},
  {id:'natacao',  nome:'Natação',  icon:'🏊', gps:false, cor:'#38bdf8'},
  {id:'eliptico', nome:'Elíptico', icon:'🔄', gps:false, cor:'#a78bfa'},
  {id:'corda',    nome:'Corda',    icon:'🪢', gps:false, cor:'#fb7185'},
  {id:'livre',    nome:'Livre',    icon:'💪', gps:false, cor:'#9898a8'},
];

const HISTORICO_MOCK = [
  {tipo:'🏃',nome:'Corrida',data:'Hoje',    tempo:'28:42',dist:'5.2km',pace:'5:31/km',cal:'274'},
  {tipo:'🚴',nome:'Bike',   data:'Quinta',  tempo:'45:00',dist:'18km', pace:'24km/h', cal:'412'},
  {tipo:'🏃',nome:'Corrida',data:'Terça',   tempo:'32:10',dist:'6.0km',pace:'5:21/km',cal:'315'},
];

const fmt = (s) => String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const calcPace = (d,s) => {
  if(!d||!s) return '--:--';
  const p=(s/60)/d;
  return Math.floor(p)+':'+String(Math.round((p%1)*60)).padStart(2,'0')+'/km';
};

export default function CardioPage() {
  const [view,setView]       = useState('home');
  const [tipo,setTipo]       = useState(null);
  const [running,setRunning] = useState(false);
  const [elapsed,setElapsed] = useState(0);
  const [dist,setDist]       = useState('');
  const [notas,setNotas]     = useState('');
  const [useGPS,setUseGPS]   = useState(true);
  const [gpsStatus,setGpsStatus] = useState('idle'); // idle|waiting|ok|error
  const [distGPS,setDistGPS] = useState(0);
  const timerRef = useRef(null);
  const tsRef    = useRef(null);
  const watchRef = useRef(null);
  const lastRef  = useRef(null);

  useEffect(()=>{
    if(running){
      if(!tsRef.current) tsRef.current=Date.now()-elapsed*1000;
      timerRef.current=setInterval(()=>setElapsed(Math.floor((Date.now()-tsRef.current)/1000)),500);
    } else clearInterval(timerRef.current);
    return ()=>clearInterval(timerRef.current);
  },[running]);

  useEffect(()=>{
    if(!running||!useGPS||!tipo?.gps) return;
    if(!navigator.geolocation){setGpsStatus('error');return;}
    setGpsStatus('waiting');
    watchRef.current=navigator.geolocation.watchPosition(
      ({coords:{latitude:lat,longitude:lng,accuracy}})=>{
        if(accuracy>50) return;
        setGpsStatus('ok');
        if(lastRef.current){
          const R=6371,dLat=(lat-lastRef.current.lat)*Math.PI/180,dLon=(lng-lastRef.current.lng)*Math.PI/180;
          const a=Math.sin(dLat/2)**2+Math.cos(lastRef.current.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2;
          const d=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
          if(d>0.003){setDistGPS(p=>Math.round((p+d)*1000)/1000);lastRef.current={lat,lng};}
        } else lastRef.current={lat,lng};
      },
      ()=>setGpsStatus('error'),
      {enableHighAccuracy:true,timeout:10000,maximumAge:2000}
    );
    return ()=>{if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);};
  },[running,useGPS,tipo]);

  const distancia = tipo?.gps&&useGPS ? distGPS : parseFloat(dist||'0');
  const pace = calcPace(distancia,elapsed);
  const calorias = Math.round(distancia*70*0.72);

  const iniciar = (t) => {
    setTipo(t);setElapsed(0);setRunning(false);
    setDist('');setNotas('');setDistGPS(0);
    setGpsStatus('idle');lastRef.current=null;tsRef.current=null;
    setView('sessao');
  };

  const salvar = () => {
    setRunning(false);
    if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);
    setView('home');
  };

  // ── SESSÃO ────────────────────────────────────────────────────────────
  if(view==='sessao'&&tipo) return (
    <PageShell>
      {/* Header sessão */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
          <div style={{width:42,height:42,borderRadius:'12px',background:`${tipo.cor}22`,border:`1px solid ${tipo.cor}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem'}}>
            {tipo.icon}
          </div>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{tipo.nome}</div>
            <div style={{fontSize:'.62rem',color:'#5a5a6a',marginTop:'2px'}}>
              {running?'Em andamento...':elapsed>0?'Pausado':'Pronto para iniciar'}
            </div>
          </div>
        </div>
        <button onClick={()=>{setRunning(false);setView('home');}} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.4rem .8rem',color:'#9898a8',fontSize:'.78rem',fontWeight:700,cursor:'pointer'}}>✕ Sair</button>
      </div>

      {/* Timer principal */}
      <div style={{background:'linear-gradient(135deg,#0e0e11,#141418)',border:'1px solid #202028',borderRadius:'20px',padding:'2rem 1.5rem',textAlign:'center',marginBottom:'.75rem',position:'relative',overflow:'hidden'}}>
        {/* Glow de fundo quando running */}
        {running&&<div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 50%,${tipo.cor}15 0%,transparent 70%)`,pointerEvents:'none'}}/>}
        
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'5.5rem',letterSpacing:'.02em',lineHeight:1,color:running?tipo.cor:'#f0f0f2',transition:'color .3s',textShadow:running?`0 0 40px ${tipo.cor}55`:'none'}}>
          {fmt(elapsed)}
        </div>
        <div style={{fontSize:'.58rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.14em',marginTop:'.4rem'}}>tempo de atividade</div>

        {/* Stats ao vivo */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.5rem',marginTop:'1.25rem'}}>
          {[
            {val: distancia>0?distancia.toFixed(2):'0.00', unit:'km',   label:'distância', color:tipo.cor},
            {val: distancia>0?pace:'--:--',                unit:'',     label:'pace/km',   color:'#f0f0f2'},
            {val: calorias>0?String(calorias):'0',         unit:'kcal', label:'calorias',  color:'#f97316'},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(0,0,0,.35)',border:'1px solid #202028',borderRadius:'12px',padding:'.75rem .5rem'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:s.color,lineHeight:1}}>
                {s.val}<span style={{fontSize:'.65rem',color:'#5a5a6a',marginLeft:'2px'}}>{s.unit}</span>
              </div>
              <div style={{fontSize:'.5rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginTop:'3px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Botões de controle */}
        <div style={{display:'flex',gap:'.6rem',marginTop:'1.25rem'}}>
          <button onClick={()=>setRunning(r=>!r)} style={{
            flex:1,borderRadius:'14px',padding:'1rem',border:'none',cursor:'pointer',
            background:running?'rgba(227,27,35,.12)':tipo.cor,
            color:running?tipo.cor:'#fff',
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',
            textTransform:'uppercase',letterSpacing:'.06em',
            boxShadow:running?'none':`0 4px 24px ${tipo.cor}44`,
            transition:'all .2s',
            border:running?`1px solid ${tipo.cor}44`:'none',
          }}>
            {running?'⏸ Pausar':elapsed>0?'▶ Retomar':'▶ Iniciar'}
          </button>
          <button onClick={()=>{setRunning(false);setElapsed(0);tsRef.current=null;setDistGPS(0);}} style={{
            background:'rgba(255,255,255,.04)',border:'1px solid #202028',
            borderRadius:'14px',padding:'1rem 1.1rem',color:'#5a5a6a',fontSize:'1.1rem',cursor:'pointer',
          }}>↺</button>
        </div>
      </div>

      {/* GPS card */}
      {tipo.gps&&(
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'14px',padding:'1rem',marginBottom:'.75rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:gpsStatus!=='idle'?'.6rem':0}}>
            <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
              <span style={{fontSize:'1rem'}}>📍</span>
              <span style={{fontSize:'.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'#9898a8'}}>GPS</span>
              {gpsStatus==='ok'&&<span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'block',animation:'pulse 1s ease-in-out infinite'}}/>}
            </div>
            <button onClick={()=>setUseGPS(g=>!g)} style={{
              fontSize:'.68rem',fontWeight:700,padding:'.25rem .7rem',borderRadius:'8px',cursor:'pointer',
              border:`1px solid ${useGPS?'rgba(227,27,35,.3)':'#202028'}`,
              background:useGPS?'rgba(227,27,35,.1)':'rgba(255,255,255,.04)',
              color:useGPS?'#e31b23':'#9898a8',
            }}>{useGPS?'🛰 Automático':'📝 Manual'}</button>
          </div>
          {useGPS&&gpsStatus!=='idle'&&(
            <div style={{fontSize:'.78rem',fontWeight:600,color:gpsStatus==='ok'?'#22c55e':gpsStatus==='error'?'#f87171':'#9898a8',background:gpsStatus==='ok'?'rgba(34,197,94,.08)':'rgba(255,255,255,.04)',border:`1px solid ${gpsStatus==='ok'?'rgba(34,197,94,.2)':'#202028'}`,borderRadius:'8px',padding:'.5rem .75rem'}}>
              {gpsStatus==='ok'?`✅ Rastreando — ${distGPS.toFixed(2)}km percorridos`:gpsStatus==='error'?'❌ Permissão de GPS negada':'⏳ Aguardando sinal GPS...'}
            </div>
          )}
          {!useGPS&&(
            <div>
              <label style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'5px'}}>Distância (km)</label>
              <input type="number" step="0.1" placeholder="0.0" value={dist} onChange={e=>setDist(e.target.value)}
                style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'8px',color:'#eaeaea',padding:'10px 13px',fontSize:'1rem',outline:'none'}}/>
            </div>
          )}
        </div>
      )}

      {/* Notas + Salvar */}
      <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'14px',padding:'1rem'}}>
        <label style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'5px'}}>Como foi? (opcional)</label>
        <textarea placeholder="Condições, sensação, observações..." value={notas} onChange={e=>setNotas(e.target.value)} rows={2}
          style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'8px',color:'#eaeaea',padding:'10px 13px',fontSize:'.88rem',outline:'none',resize:'none',fontFamily:'Inter,sans-serif',marginBottom:'.75rem'}}/>
        <button onClick={salvar} style={{
          width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',
          border:'none',borderRadius:'12px',padding:'14px',color:'#fff',
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',
          textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',
          boxShadow:'0 4px 20px rgba(227,27,35,.3)',
        }}>Salvar Cardio ✓</button>
      </div>
    </PageShell>
  );

  // ── HOME CARDIO ──────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
            DARK<span style={{color:'#e31b23'}}>CARDIO</span>
          </div>
          <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px',letterSpacing:'.06em'}}>Registre sua atividade</div>
        </div>
        <button onClick={()=>setView('historico')} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'.45rem .9rem',color:'#9898a8',fontSize:'.75rem',fontWeight:700,cursor:'pointer',letterSpacing:'.04em'}}>
          Histórico
        </button>
      </div>

      {/* Stats rápidos */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.5rem',marginBottom:'1.25rem'}}>
        {[
          {val:'12',  icon:'🔥', label:'Streak',    color:'#f97316'},
          {val:'47km',icon:'📍', label:'Este mês',  color:'#e31b23'},
          {val:'3h20',icon:'⏱', label:'Tempo total',color:'#9898a8'},
        ].map((s,i)=>(
          <div key={i} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.85rem .5rem',textAlign:'center'}}>
            <div style={{fontSize:'1.1rem',marginBottom:'.2rem'}}>{s.icon}</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:s.color,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:'.52rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em',marginTop:'3px'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Label */}
      <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.65rem'}}>
        Selecione a atividade
      </div>

      {/* Grid de tipos — visual moderno */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem',marginBottom:'1rem'}}>
        {TIPOS.slice(0,2).map(t=>(
          <button key={t.id} onClick={()=>iniciar(t)} style={{
            background:`linear-gradient(135deg,${t.cor}18,${t.cor}08)`,
            border:`1px solid ${t.cor}33`,
            borderRadius:'16px',padding:'1.25rem 1rem',
            display:'flex',flexDirection:'column',gap:'.5rem',
            cursor:'pointer',textAlign:'left',transition:'all .15s',
            position:'relative',overflow:'hidden',
          }}>
            <div style={{position:'absolute',top:'-10px',right:'-10px',fontSize:'3.5rem',opacity:.15}}>{t.icon}</div>
            <span style={{fontSize:'1.8rem'}}>{t.icon}</span>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',letterSpacing:'.04em'}}>{t.nome}</div>
              <div style={{fontSize:'.6rem',color:t.cor,fontWeight:700,marginTop:'2px'}}>📍 GPS ativo</div>
            </div>
          </button>
        ))}
        {/* Caminhada — destaque menor */}
        <button onClick={()=>iniciar(TIPOS[2])} style={{
          background:`linear-gradient(135deg,${TIPOS[2].cor}18,${TIPOS[2].cor}08)`,
          border:`1px solid ${TIPOS[2].cor}33`,
          borderRadius:'16px',padding:'1rem',
          display:'flex',alignItems:'center',gap:'.75rem',
          cursor:'pointer',transition:'all .15s',
        }}>
          <span style={{fontSize:'1.6rem'}}>{TIPOS[2].icon}</span>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',color:'#f0f0f2'}}>{TIPOS[2].nome}</div>
            <div style={{fontSize:'.6rem',color:TIPOS[2].cor,fontWeight:700}}>📍 GPS</div>
          </div>
        </button>
        {/* HIIT */}
        <button onClick={()=>iniciar(TIPOS[3])} style={{
          background:`linear-gradient(135deg,${TIPOS[3].cor}18,${TIPOS[3].cor}08)`,
          border:`1px solid ${TIPOS[3].cor}33`,
          borderRadius:'16px',padding:'1rem',
          display:'flex',alignItems:'center',gap:'.75rem',
          cursor:'pointer',transition:'all .15s',
        }}>
          <span style={{fontSize:'1.6rem'}}>{TIPOS[3].icon}</span>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',color:'#f0f0f2'}}>{TIPOS[3].nome}</div>
        </button>
      </div>

      {/* Outros tipos — linha */}
      <div style={{display:'flex',gap:'.4rem',overflowX:'auto',paddingBottom:'.25rem',marginBottom:'1rem'}}>
        {TIPOS.slice(4).map(t=>(
          <button key={t.id} onClick={()=>iniciar(t)} style={{
            background:'#0e0e11',border:'1px solid #202028',
            borderRadius:'12px',padding:'.65rem .9rem',
            display:'flex',flexDirection:'column',alignItems:'center',gap:'.3rem',
            cursor:'pointer',flexShrink:0,minWidth:64,
          }}>
            <span style={{fontSize:'1.3rem'}}>{t.icon}</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.68rem',textTransform:'uppercase',color:'#9898a8'}}>{t.nome}</span>
          </button>
        ))}
      </div>

      {/* Histórico recente */}
      <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.6rem'}}>Recentes</div>
      <div style={{display:'grid',gap:'.5rem'}}>
        {HISTORICO_MOCK.map((h,i)=>(
          <div key={i} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'.85rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
            <div style={{width:38,height:38,borderRadius:'10px',background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0}}>{h.tipo}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2',lineHeight:1}}>{h.nome}</div>
              <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>{h.data} · {h.dist} · {h.pace}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:'#e31b23'}}>{h.tempo}</div>
              <div style={{fontSize:'.58rem',color:'#5a5a6a'}}>{h.cal} kcal</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
