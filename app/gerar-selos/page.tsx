'use client';
import { useState } from 'react';
import { Loader2, Medal, ExternalLink } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/core/PageHeader';
import Button from '@/components/core/Button';

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
/* Cor por raridade — sempre via tokens CSS (design system), nunca hex. */
const COR:Record<string,string>={
  comum:'var(--ink-2)',
  raro:'var(--info)',
  epico:'var(--chart-6)',
  lendario:'var(--warn)',
};
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
    <PageShell hideBottomNav>
      <PageHeader
        title="Gerador de Selos"
        subtitle={`Ferramenta interna — gera as artes dos ${SELOS.length} DarkSelos via IA.`}
      />

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <Button
          size="sm" variant="ghost" disabled={run}
          onClick={()=>{setRun(true);gen(SELOS[0]).then(()=>{setRun(false);setCur('');});}}
        >
          Testar 1
        </Button>
        <Button size="sm" disabled={run} onClick={genAll}>
          {run && <Loader2 size={14} className="animate-spin" />}
          {run?'Gerando...':'Gerar Todos ('+SELOS.length+')'}
        </Button>
        {prog&&<span className="text-[0.75rem] font-semibold text-ok tnum">{prog}</span>}
        {cur&&<span className="text-[0.72rem] text-warn truncate">{cur}</span>}
      </div>

      {/* URLs geradas */}
      {urls.length>0&&(
        <details className="mb-4">
          <summary className="text-[0.7rem] text-ink-3 cursor-pointer select-none">
            URLs ({urls.length})
          </summary>
          <div className="card-2 p-2.5 mt-1.5 max-h-[120px] overflow-y-auto">
            {urls.map(u=>(
              <div key={u.id} className="text-[0.58rem] mb-0.5 break-all">
                <span className="text-info font-semibold">{u.id}</span>:{' '}
                <a href={u.url} target="_blank" rel="noreferrer" className="text-ok underline">{u.url}</a>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Grade de selos */}
      <div className="grid grid-cols-4 gap-1.5">
        {SELOS.map(s=>{const r=res[s.id];const cor=COR[s.rar];return(
          <div
            key={s.id}
            className="card-2 p-1.5 text-center"
            style={r?.status==='ok'?{borderColor:cor}:undefined}
          >
            {r?.status==='ok'&&r.url?(
              <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Abrir arte de ${s.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt={s.title} className="w-full rounded-lg aspect-square object-cover block"/>
              </a>
            ):(
              <div className="w-full aspect-square rounded-lg bg-bg flex items-center justify-center text-ink-3">
                {r?.status==='loading'
                  ? <Loader2 size={16} className="animate-spin text-accent" />
                  : <Medal size={16} />}
              </div>
            )}
            <div className="text-[0.52rem] text-ink-2 mt-1 uppercase leading-tight">{s.title}</div>
            <div className="text-[0.48rem] font-bold uppercase" style={{color:cor}}>{s.rar}</div>
            {r?.status==='error'&&(
              <div className="text-[0.45rem] text-danger">{String(r.msg).slice(0,30)}</div>
            )}
          </div>);})}
      </div>

      {/* Nota de contexto */}
      <p className="flex items-center justify-center gap-1 text-[0.62rem] text-ink-3 mt-4">
        <ExternalLink size={11} /> As imagens abrem em nova aba para download.
      </p>
    </PageShell>
  );
}
