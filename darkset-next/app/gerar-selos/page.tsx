'use client';
import { useState } from 'react';

const PROXY = 'https://replicate-proxy.rybocatto.workers.dev';
const MODEL = 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4';
const SELOS = [
  {id:'ferro_1',title:'Primeira Gota',rar:'comum',p:'dark fantasy RPG badge, blood drop iron shield, gothic dark souls, red glow, black bg, game icon, no text'},
  {id:'ferro_20',title:'Iniciado',rar:'comum',p:'dark fantasy RPG badge, iron chains skull symbol, gothic dark souls, silver glow, black bg, game icon, no text'},
  {id:'ferro_150',title:'Veterano de Ferro',rar:'raro',p:'dark fantasy RPG badge, iron gauntlet fist raised, gothic dark souls, blue electric glow, black bg, game icon, no text'},
  {id:'ferro_365',title:'Um Ano de Ferro',rar:'epico',p:'dark fantasy RPG badge, iron crown thorns, gothic dark souls, purple aura, black bg, game icon, no text'},
  {id:'ferro_730',title:'O Ferro e Meu Lar',rar:'lendario',p:'dark fantasy RPG badge, dark iron fortress divine golden light, legendary aura, gothic dark souls, black bg, game icon, no text'},
  {id:'streak_14',title:'Chama Acesa',rar:'comum',p:'dark fantasy RPG badge, burning torch flame iron shield, orange fire glow, black bg, game icon, no text'},
  {id:'streak_30',title:'Mes Inquebrantavel',rar:'epico',p:'dark fantasy RPG badge, iron padlock purple flames, gothic dark souls, black bg, game icon, no text'},
  {id:'streak_180',title:'Eterno',rar:'lendario',p:'dark fantasy RPG badge, infinity symbol golden divine fire, legendary aura, gothic dark souls, black bg, game icon, no text'},
  {id:'vol_5t',title:'Primeiros Quilos',rar:'comum',p:'dark fantasy RPG badge, iron weight barbell plates, gothic style, grey glow, black bg, game icon, no text'},
  {id:'vol_50t',title:'Carregador',rar:'raro',p:'dark fantasy RPG badge, iron boulder floating energy aura, blue shield, gothic dark souls, black bg, game icon, no text'},
  {id:'vol_250t',title:'Maquina de Guerra',rar:'epico',p:'dark fantasy RPG badge, war machine skull dark gears, purple energy, gothic dark souls, black bg, game icon, no text'},
  {id:'vol_1000t',title:'Colossus',rar:'lendario',p:'dark fantasy RPG badge, titan stone giant golden aura, legendary gothic dark souls, black bg, game icon, no text'},
  {id:'pr_5',title:'Quebrador',rar:'comum',p:'dark fantasy RPG badge, cracked shattered stone dark energy, gothic iron shield, grey glow, black bg, game icon, no text'},
  {id:'pr_25',title:'Obliterador',rar:'raro',p:'dark fantasy RPG badge, explosion shockwave impact, blue electric gothic shield, black bg, game icon, no text'},
  {id:'pr_100',title:'Lenda do Ferro',rar:'epico',p:'dark fantasy RPG badge, champion laurel iron crown, purple mystical shield, gothic dark souls, black bg, game icon, no text'},
  {id:'pr_300',title:'Imortal',rar:'lendario',p:'dark fantasy RPG badge, immortal phoenix iron ashes golden flames, legendary shield, gothic dark souls, black bg, game icon, no text'},
  {id:'ex_15',title:'Explorador',rar:'comum',p:'dark fantasy RPG badge, gothic compass rose iron needle, grey glow, black bg, game icon, no text'},
  {id:'ex_40',title:'Arsenal Completo',rar:'raro',p:'dark fantasy RPG badge, crossed dark swords axes, blue shield, gothic dark souls, black bg, game icon, no text'},
  {id:'ex_80',title:'Mestre do Movimento',rar:'epico',p:'dark fantasy RPG badge, dark energy rune sigil, purple mystical shield, gothic dark souls, black bg, game icon, no text'},
  {id:'run_first',title:'Primeira Corrida',rar:'comum',p:'dark fantasy RPG badge, dark running boot trail, gothic iron shield, grey glow, black bg, game icon, no text'},
  {id:'run_10',title:'DarkRunner',rar:'comum',p:'dark fantasy RPG badge, running silhouette speed trails, iron gothic shield, red glow, black bg, game icon, no text'},
  {id:'cardio_20',title:'Pulmao de Aco',rar:'raro',p:'dark fantasy RPG badge, iron lungs wind energy, blue electric shield, gothic dark souls, black bg, game icon, no text'},
  {id:'cardio_50',title:'Cardio Intenso',rar:'epico',p:'dark fantasy RPG badge, dark heart ECG lightning, purple fire shield, gothic dark souls, black bg, game icon, no text'},
  {id:'squad_win_1',title:'Conquistador',rar:'raro',p:'dark fantasy RPG badge, bronze skull battle flag, blue gothic shield, black bg, game icon, no text'},
  {id:'squad_win_6',title:'Dominador',rar:'epico',p:'dark fantasy RPG badge, silver warlord horned helmet, purple mystical shield, gothic dark souls, black bg, game icon, no text'},
  {id:'squad_win_12',title:'Rei do Squad',rar:'lendario',p:'dark fantasy RPG badge, golden king crown crossed dark swords, legendary radiant shield, gothic dark souls, black bg, game icon, no text'},
  {id:'diet_first',title:'Nutricao Ativada',rar:'comum',p:'dark fantasy RPG badge, dark chalice green elixir, iron shield, green glow, black bg, game icon, no text'},
  {id:'diet_streak',title:'Consistencia',rar:'raro',p:'dark fantasy RPG badge, iron battery charging energy, blue gothic shield, black bg, game icon, no text'},
  {id:'diet_iron',title:'Vontade de Ferro',rar:'epico',p:'dark fantasy RPG badge, iron fist crushing food willpower, purple gothic shield, black bg, game icon, no text'},
  {id:'diet_ascetic',title:'Asceta da Fome',rar:'lendario',p:'dark fantasy RPG badge, skeletal monk golden divine aura, legendary shield, gothic dark souls, black bg, game icon, no text'},
  {id:'zen_first',title:'Corpo Preparado',rar:'comum',p:'dark fantasy RPG badge, dark lotus flower darkness, gothic iron shield, purple glow, black bg, game icon, no text'},
  {id:'zen_10',title:'Corpo Flexivel',rar:'raro',p:'dark fantasy RPG badge, dark lotus mystical aura, blue gothic shield, black bg, game icon, no text'},
  {id:'zen_50',title:'Guardiao',rar:'epico',p:'dark fantasy RPG badge, dark eagle wings spread lotus, purple cosmic gothic shield, black bg, game icon, no text'},
  {id:'zen_100',title:'Lenda da Flex',rar:'lendario',p:'dark fantasy RPG badge, golden dragon coiled dark lotus, legendary radiant gothic shield, black bg, game icon, no text'},
  {id:'madrugador',title:'Madrugador',rar:'epico',p:'dark fantasy RPG badge, dark sunrise iron mountains moon, purple dawn gothic shield, black bg, game icon, no text'},
  {id:'semana_full',title:'Semana Perfeita',rar:'raro',p:'dark fantasy RPG badge, seven pointed dark star calendar, blue gothic shield, black bg, game icon, no text'},
  {id:'elite_badge',title:'DarkSet Elite',rar:'epico',p:'dark fantasy RPG badge, elite lightning bolt crown, purple electric gothic shield, black bg, game icon, no text'},
  {id:'darkgod_badge',title:'DarkGod Founder',rar:'lendario',p:'dark fantasy RPG badge, god darkness throne golden skull crown divine, legendary radiant gothic shield, black bg, game icon, no text'},
];
const COR:Record<string,string>={comum:'#9898a8',raro:'#60a5fa',epico:'#a78bfa',lendario:'#facc15'};
export default function GerarSelos() {
  const [res,setRes]=useState<Record<string,any>>({});
  const [run,setRun]=useState(false);
  const [prog,setProg]=useState('');
  const [cur,setCur]=useState('');
  const [urls,setUrls]=useState<{id:string;url:string}[]>([]);
  const up=(id:string,d:any)=>setRes(p=>({...p,[id]:d}));
  const poll=async(pid:string)=>{
    for(let i=0;i<90;i++){
      await new Promise(r=>setTimeout(r,2500));
      try{const r=await fetch(PROXY+'/predictions/'+pid);const d=await r.json();
        if(d.status==='succeeded')return d.output?.[0]||null;
        if(d.status==='failed')return null;
      }catch{return null;}
    }return null;
  };
  const gen=async(s:typeof SELOS[0])=>{
    setCur(s.title);up(s.id,{status:'loading'});
    try{
      const r=await fetch(PROXY+'/predictions',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({version:MODEL,input:{prompt:s.p,
          negative_prompt:'text, letters, words, watermark, blurry, low quality, ugly, deformed, white background, border',
          width:512,height:512,num_inference_steps:35,guidance_scale:8}})});
      const d=await r.json();
      if(!d.id){up(s.id,{status:'error',msg:d.detail||'erro'});return;}
      const url=await poll(d.id);
      if(url){up(s.id,{status:'ok',url});setUrls(p=>[...p,{id:s.id,url}]);}
      else up(s.id,{status:'error',msg:'timeout'});
    }catch(e:any){up(s.id,{status:'error',msg:e.message});}
  };
  const genAll=async()=>{
    setRun(true);setUrls([]);let done=0;
    for(let i=0;i<SELOS.length;i+=2){
      await Promise.all(SELOS.slice(i,i+2).map(s=>gen(s)));
      done+=Math.min(2,SELOS.length-i);setProg(done+'/'+SELOS.length);
    }
    setRun(false);setCur('');setProg('Concluido!');
  };
  return(
    <div style={{background:'#0f0f13',minHeight:'100vh',padding:16,fontFamily:"'Barlow Condensed',sans-serif"}}>
      <div style={{fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#e31b23',marginBottom:8}}>
        DARK<span style={{color:'#f0f0f2'}}>SELOS</span> Gerador
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,alignItems:'center'}}>
        <button onClick={()=>{setRun(true);gen(SELOS[0]).then(()=>{setRun(false);setCur('');});}} disabled={run}
          style={{background:'rgba(255,255,255,.08)',border:'1px solid #2e2e38',borderRadius:8,padding:'8px 14px',color:'#f0f0f2',fontWeight:700,fontSize:'.78rem',textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}>
          Testar 1
        </button>
        <button onClick={genAll} disabled={run}
          style={{background:run?'rgba(227,27,35,.3)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:8,padding:'8px 14px',color:'#fff',fontWeight:700,fontSize:'.78rem',textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}>
          {run?'Gerando...':'Gerar Todos ('+SELOS.length+')'}
        </button>
        {prog&&<span style={{color:'#4ade80',fontSize:'.75rem'}}>{prog}</span>}
        {cur&&<span style={{color:'#facc15',fontSize:'.72rem'}}>→ {cur}</span>}
      </div>
      {urls.length>0&&(
        <details style={{marginBottom:10}}>
          <summary style={{fontSize:'.7rem',color:'#7a7a8a',cursor:'pointer'}}>URLs ({urls.length})</summary>
          <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:8,padding:8,maxHeight:120,overflowY:'auto',marginTop:4}}>
            {urls.map(u=><div key={u.id} style={{fontSize:'.56rem',marginBottom:2}}><span style={{color:'#60a5fa'}}>{u.id}</span>: <a href={u.url} target="_blank" rel="noreferrer" style={{color:'#4ade80'}}>{u.url}</a></div>)}
          </div>
        </details>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
        {SELOS.map(s=>{const r=res[s.id];const cor=COR[s.rar];return(
          <div key={s.id} style={{background:'#1e1e24',border:'1px solid '+(r?.status==='ok'?cor:'#2e2e38'),borderRadius:8,padding:5,textAlign:'center'}}>
            {r?.status==='ok'&&r.url?<a href={r.url} target="_blank" rel="noreferrer"><img src={r.url} alt={s.title} style={{width:'100%',borderRadius:6,aspectRatio:'1/1',objectFit:'cover',display:'block'}}/></a>
              :<div style={{width:'100%',aspectRatio:'1/1',background:'#0a0a0f',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>{r?.status==='loading'?'⏳':'⚔️'}</div>}
            <div style={{fontSize:'.52rem',color:'#9898a8',marginTop:3,textTransform:'uppercase',lineHeight:1.2}}>{s.title}</div>
            <div style={{fontSize:'.48rem',fontWeight:700,color:cor,textTransform:'uppercase'}}>{s.rar}</div>
            {r?.status==='error'&&<div style={{fontSize:'.45rem',color:'#e31b23'}}>{String(r.msg).slice(0,30)}</div>}
          </div>);})}
      </div>
    </div>
  );
}