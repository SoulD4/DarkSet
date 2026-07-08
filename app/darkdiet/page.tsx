'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/core/PageHeader';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import EmptyState from '@/components/core/EmptyState';
import { useToast, ToastViewport } from '@/components/core/Toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  X, Search, Plus, Minus, ChevronRight, ArrowLeft, Droplets,
  History, CheckCircle2, Trash2, Settings, Flame, Camera,
  ScanLine, Pencil, AlertCircle, Salad,
  Egg, Dumbbell, Carrot, Droplet, Coffee, Cookie, Fish, Leaf, Utensils,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────
// ── OpenFoodFacts ─────────────────────────────────────────────
type OFFResult = {
  name: string; cal100: number; prot100: number; carb100: number; fat100: number;
  calories: string; protein: string; carbs: string; fat: string;
  note: string; per100g: boolean; servQty: number; hasNutrients: boolean;
};

type Alimento = {
  nome: string; cal: number; prot: number;
  carb: number; gord: number; por: number;
  icon: string; // nome do ícone (formato persistido — não alterar)
};
type ItemRefeicao = Alimento & { porcao: number; id: string };
type Refeicao     = { nome: string; itens: ItemRefeicao[] };
type DiaRegistro  = { data: string; refeicoes: Refeicao[]; agua: number; metaCal: number; metaProt: number };

// ── Constantes ────────────────────────────────────────────────
const REFEICOES_PADRAO = ['Café da manhã','Almoço','Pré-treino','Pós-treino','Jantar','Lanche'];
const META_AGUA = 8;

// Cores de macro (tokens do design system)
const COR_KCAL = 'var(--accent)';
const COR_PROT = 'var(--chart-2)';
const COR_CARB = 'var(--chart-4)';
const COR_GORD = 'var(--chart-3)';

const ALIMENTOS: Alimento[] = [
  { nome:'Frango grelhado',   cal:165, prot:31,  carb:0,  gord:3.6, por:100, icon:'fish'    },
  { nome:'Arroz integral',    cal:216, prot:5,   carb:45, gord:1.8, por:100, icon:'leaf'     },
  { nome:'Ovo inteiro',       cal:155, prot:13,  carb:1,  gord:11,  por:100, icon:'egg'      },
  { nome:'Batata doce',       cal:86,  prot:1.6, carb:20, gord:0.1, por:100, icon:'carrot'   },
  { nome:'Whey protein',      cal:400, prot:80,  carb:8,  gord:6,   por:100, icon:'barbell'  },
  { nome:'Aveia',             cal:389, prot:17,  carb:66, gord:7,   por:100, icon:'cookie'   },
  { nome:'Banana',            cal:89,  prot:1.1, carb:23, gord:0.3, por:100, icon:'leaf'     },
  { nome:'Brócolis',          cal:34,  prot:2.8, carb:7,  gord:0.4, por:100, icon:'carrot'   },
  { nome:'Salmão',            cal:208, prot:20,  carb:0,  gord:13,  por:100, icon:'fish'     },
  { nome:'Feijão cozido',     cal:127, prot:8.7, carb:23, gord:0.5, por:100, icon:'leaf'     },
  { nome:'Pasta de amendoim', cal:588, prot:25,  carb:20, gord:50,  por:100, icon:'cookie'   },
  { nome:'Iogurte grego',     cal:97,  prot:9,   carb:4,  gord:5,   por:100, icon:'drop'     },
  { nome:'Arroz branco',      cal:130, prot:2.7, carb:28, gord:0.3, por:100, icon:'leaf'     },
  { nome:'Carne bovina',      cal:250, prot:26,  carb:0,  gord:16,  por:100, icon:'fish'     },
  { nome:'Atum em lata',      cal:116, prot:25,  carb:0,  gord:1,   por:100, icon:'fish'     },
  { nome:'Pão integral',      cal:247, prot:13,  carb:41, gord:4,   por:100, icon:'cookie'   },
  { nome:'Leite integral',    cal:61,  prot:3.2, carb:4.8,gord:3.3, por:100, icon:'drop'     },
  { nome:'Queijo cottage',    cal:98,  prot:11,  carb:3.4,gord:4.3, por:100, icon:'egg'      },
  { nome:'Azeite',            cal:884, prot:0,   carb:0,  gord:100, por:100, icon:'drop'     },
  { nome:'Café preto',        cal:2,   prot:0.3, carb:0,  gord:0,   por:100, icon:'coffee'   },
  { nome:'Maçã',              cal:52,  prot:0.3, carb:14, gord:0.2, por:100, icon:'leaf'     },
  { nome:'Amendoim',          cal:567, prot:25,  carb:16, gord:49,  por:100, icon:'cookie'   },
  { nome:'Tilápia',           cal:96,  prot:20,  carb:0,  gord:2,   por:100, icon:'fish'     },
  { nome:'Lentilha cozida',   cal:116, prot:9,   carb:20, gord:0.4, por:100, icon:'leaf'     },
];

function AliIcon({ icon, size = 18, className = '' }: { icon: string; size?: number; className?: string }) {
  const p = { size, className };
  if (icon === 'egg')     return <Egg {...p}/>;
  if (icon === 'barbell') return <Dumbbell {...p}/>;
  if (icon === 'carrot')  return <Carrot {...p}/>;
  if (icon === 'drop')    return <Droplet {...p}/>;
  if (icon === 'coffee')  return <Coffee {...p}/>;
  if (icon === 'cookie')  return <Cookie {...p}/>;
  if (icon === 'fish')    return <Fish {...p}/>;
  if (icon === 'leaf')    return <Leaf {...p}/>;
  return <Utensils {...p}/>;
}

const num = (v: string) => { const n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; };
const hoje     = () => new Date().toISOString().slice(0,10);
const fmtData  = (d:string) => {
  const dt=new Date(d+'T12:00:00'), h=hoje();
  const on=new Date(); on.setDate(on.getDate()-1);
  if(d===h) return 'Hoje';
  if(d===on.toISOString().slice(0,10)) return 'Ontem';
  return dt.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
};

const calcMacros = (itens:ItemRefeicao[]) => itens.reduce(
  (acc,it)=>({
    cal:  acc.cal  + Math.round(it.cal  * it.porcao/100),
    prot: acc.prot + Math.round(it.prot * it.porcao/100),
    carb: acc.carb + Math.round(it.carb * it.porcao/100),
    gord: acc.gord + Math.round(it.gord * it.porcao/100),
  }),
  {cal:0,prot:0,carb:0,gord:0}
);

const diaVazio = (data:string, metaCal=2400, metaProt=150): DiaRegistro => ({
  data, agua:0, metaCal, metaProt,
  refeicoes: REFEICOES_PADRAO.map(n=>({nome:n,itens:[]})),
});

// ── Subcomponentes de UI ──────────────────────────────────────
function IconBtn({ onClick, children, tone = 'neutral', title }: {
  onClick: () => void; children: React.ReactNode; tone?: 'neutral'|'accent'|'accent-soft'|'danger'|'info'; title?: string;
}) {
  const tones: Record<string,string> = {
    'neutral':     'bg-surface-2 border-line text-ink-3 hover:bg-surface-3',
    'accent':      'bg-accent-soft border-accent/30 text-accent',
    'accent-soft': 'bg-surface-2 border-accent/20 text-accent',
    'danger':      'bg-danger-soft border-danger/30 text-danger',
    'info':        'bg-info-soft border-info/30 text-info',
  };
  return (
    <motion.button whileTap={{scale:.9}} onClick={onClick} title={title}
      className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${tones[tone]}`}>
      {children}
    </motion.button>
  );
}

function StepperBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button whileTap={{scale:.9}} onClick={onClick}
      className="h-10 w-10 rounded-xl bg-surface-2 border border-line text-ink-1 flex items-center justify-center shrink-0 hover:bg-surface-3 transition-colors">
      {children}
    </motion.button>
  );
}

function PresetChips({ options, value, onSelect, suffix = '' }: {
  options: number[]; value: string; onSelect: (v:string)=>void; suffix?: string;
}) {
  return (
    <div className="flex gap-1.5 mt-2">
      {options.map(o=>(
        <button key={o} onClick={()=>onSelect(String(o))}
          className={`flex-1 justify-center chip !px-1 ${value===String(o)?'chip-active':''}`}>
          {o}{suffix}
        </button>
      ))}
    </div>
  );
}

function RingMeta({ pct, over }: { pct: number; over: boolean }) {
  const R = 34, C = 2*Math.PI*R;
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className="-rotate-90">
      <circle cx={44} cy={44} r={R} fill="none" stroke="var(--surface-3)" strokeWidth={8}/>
      <motion.circle cx={44} cy={44} r={R} fill="none"
        stroke={over ? 'var(--danger)' : COR_KCAL} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={C}
        initial={{strokeDashoffset:C}}
        animate={{strokeDashoffset: C - (Math.min(100,pct)/100)*C}}
        transition={{duration:.6,ease:'easeOut'}}/>
    </svg>
  );
}

// ── BarcodeScanner + OpenFoodFacts ────────────────────────────
function BarcodeScanner({ onResult, onClose }: { onResult:(r:OFFResult)=>void; onClose:()=>void }) {
  const videoRef  = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream|null>(null);
  const rafRef    = React.useRef<number|null>(null);

  const [status,       setStatus]       = React.useState<'requesting'|'scanning'|'searching'|'preview'|'notfound'|'manual'>('requesting');
  const [camErr,       setCamErr]       = React.useState(false);
  const [preview,      setPreview]      = React.useState<OFFResult|null>(null);
  const [editPrev,     setEditPrev]     = React.useState<Partial<OFFResult>>({});
  const [portion,      setPortion]      = React.useState('100');
  const [nameSearch,   setNameSearch]   = React.useState('');
  const [nameResults,  setNameResults]  = React.useState<any[]>([]);
  const [nameLoading,  setNameLoading]  = React.useState(false);
  const [nameNotFound, setNameNotFound] = React.useState(false);
  const [manualData,   setManualData]   = React.useState({name:'',calories:'',protein:'',carbs:'',fat:''});

  const numOFF = (v: any) => { const x=parseFloat(String(v||0).replace(',','.')); return isFinite(x)?x:0; };

  const stopCamera = React.useCallback(()=>{
    if(rafRef.current)  cancelAnimationFrame(rafRef.current);
    if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
  },[]);

  const fetchProduct = React.useCallback(async (barcode: string)=>{
    setStatus('searching'); setPreview(null);
    try {
      const r = await fetch(
        'https://world.openfoodfacts.org/api/v2/product/'+barcode+
        '?fields=product_name,product_name_pt,brands,nutriments,serving_size,serving_quantity'
      );
      const data = await r.json();
      if(!data||data.status!==1||!data.product){ setStatus('notfound'); return; }
      const p = data.product;
      const n = p.nutriments||{};
      const tryN = (...keys: string[]) => { for(const k of keys){ const v=numOFF(n[k]); if(v>0) return v; } return 0; };
      const cal  = tryN('energy-kcal_100g','energy-kcal_serving','energy-kcal','energy_100g_kcal') || (tryN('energy_100g','energy_serving','energy')/4.184);
      const prot = tryN('proteins_100g','protein_100g','proteins_serving','proteins','protein');
      const carb = tryN('carbohydrates_100g','carbohydrate_100g','carbohydrates_serving','carbohydrates');
      const fat  = tryN('fat_100g','fats_100g','fat_serving','fat','fats');
      const name = p.product_name_pt||p.product_name||p.generic_name_pt||p.generic_name||'Produto '+barcode;
      const brand = (p.brands||'').split(',')[0].trim();
      const servQty = numOFF(p.serving_quantity)||100;
      const hasNutrients = cal>0||prot>0||carb>0||fat>0;
      const result: OFFResult = {
        name, cal100:cal, prot100:prot, carb100:carb, fat100:fat,
        calories: String(Math.round(cal*servQty/100)),
        protein:  String(Math.round(prot*servQty/100)),
        carbs:    String(Math.round(carb*servQty/100)),
        fat:      String(Math.round(fat*servQty/100)),
        note: [brand, p.serving_size?'porção: '+p.serving_size:'', !hasNutrients?'sem macros na base':''].filter(Boolean).join(' · '),
        per100g:true, servQty, hasNutrients,
      };
      setPortion(String(servQty)); setPreview(result); setEditPrev(result); setStatus('preview');
    } catch(e){ setStatus('notfound'); }
  },[]);

  const searchByName = async ()=>{
    const q = nameSearch.trim(); if(!q) return;
    setNameLoading(true); setNameNotFound(false); setNameResults([]);
    try {
      const r = await fetch(
        'https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(q)+
        '&search_simple=1&action=process&json=1&page_size=8'+
        '&fields=product_name,product_name_pt,brands,nutriments,serving_size,serving_quantity,code'
      );
      const data = await r.json();
      const products = (data.products||[]).filter((p:any)=>p.product_name||p.product_name_pt);
      if(!products.length) setNameNotFound(true);
      else setNameResults(products);
    } catch(e){ setNameNotFound(true); }
    setNameLoading(false);
  };

  const selectNameResult = (p: any)=>{
    const n=p.nutriments||{};
    const tryN=(...keys: string[])=>{ for(const k of keys){ const v=numOFF(n[k]); if(v>0) return v; } return 0; };
    const cal =tryN('energy-kcal_100g','energy-kcal_serving','energy-kcal')||(tryN('energy_100g')/4.184);
    const prot=tryN('proteins_100g','proteins_serving','proteins');
    const carb=tryN('carbohydrates_100g','carbohydrates_serving','carbohydrates');
    const fat =tryN('fat_100g','fat_serving','fat');
    const servQty=numOFF(p.serving_quantity)||100;
    const name=p.product_name_pt||p.product_name||'Alimento';
    const brand=(p.brands||'').split(',')[0].trim();
    const result: OFFResult = {
      name, cal100:cal, prot100:prot, carb100:carb, fat100:fat,
      calories:String(Math.round(cal*servQty/100)),
      protein: String(Math.round(prot*servQty/100)),
      carbs:   String(Math.round(carb*servQty/100)),
      fat:     String(Math.round(fat*servQty/100)),
      note:brand+(p.serving_size?' · porção: '+p.serving_size:''),
      per100g:true, servQty, hasNutrients:cal>0||prot>0||carb>0||fat>0,
    };
    setPortion(String(servQty)); setPreview(result); setEditPrev(result); setNameResults([]); setStatus('preview');
  };

  const handlePortionChange = (v: string)=>{
    setPortion(v);
    if(!preview?.per100g) return;
    const g=numOFF(v)||100;
    setEditPrev(p=>({
      ...p,
      calories:String(Math.round(numOFF(preview.cal100)*g/100)),
      protein: String(Math.round(numOFF(preview.prot100)*g/100)),
      carbs:   String(Math.round(numOFF(preview.carb100)*g/100)),
      fat:     String(Math.round(numOFF(preview.fat100)*g/100)),
    }));
  };

  // Inicia câmera
  React.useEffect(()=>{
    let cancelled=false;
    const start=async()=>{
      try {
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}}});
        if(cancelled){stream.getTracks().forEach(t=>t.stop());return;}
        streamRef.current=stream;
        if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
        setStatus('scanning');
        if('BarcodeDetector' in window){
          const det=new (window as any).BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','qr_code']});
          const tick=async()=>{
            if(cancelled||!videoRef.current) return;
            try { const codes=await det.detect(videoRef.current); if(codes.length){stopCamera();fetchProduct(codes[0].rawValue);return;} } catch(_){}
            rafRef.current=requestAnimationFrame(tick);
          };
          rafRef.current=requestAnimationFrame(tick);
        }
      } catch(e){if(!cancelled){setCamErr(true);setStatus('notfound');}}
    };
    start();
    return()=>{cancelled=true;stopCamera();};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fetchProduct]);

  const accept=()=>{
    if(!editPrev.name&&!manualData.name) return;
    if(status==='manual'){
      onResult({
        name:manualData.name||'Alimento', cal100:numOFF(manualData.calories),
        prot100:numOFF(manualData.protein), carb100:numOFF(manualData.carbs), fat100:numOFF(manualData.fat),
        calories:manualData.calories||'0', protein:manualData.protein||'0',
        carbs:manualData.carbs||'0', fat:manualData.fat||'0',
        note:'entrada manual', per100g:false, servQty:100, hasNutrients:true,
      });
    } else {
      onResult({
        ...(preview as OFFResult),
        ...editPrev,
        name: (editPrev.name||preview?.name||''),
        calories: editPrev.calories||'0', protein:editPrev.protein||'0',
        carbs:editPrev.carbs||'0', fat:editPrev.fat||'0',
      });
    }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[250] bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
        <div className="font-display font-bold text-lg text-ink-1 flex items-center gap-2">
          <ScanLine size={18} className="text-accent"/> Adicionar alimento
        </div>
        <IconBtn onClick={()=>{stopCamera();onClose();}}><X size={16}/></IconBtn>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Tabs de modo */}
        {status!=='preview'&&status!=='manual'&&(
          <div className="flex gap-1.5 mb-4">
            {[
              {id:'scan',  label:'Scanner', Icon:Camera},
              {id:'name',  label:'Buscar',  Icon:Search},
              {id:'manual',label:'Manual',  Icon:Pencil},
            ].map(({id,label,Icon})=>(
              <motion.button key={id} whileTap={{scale:.95}}
                onClick={()=>{
                  if(id==='manual') setStatus('manual');
                  else if(id==='scan') setStatus(camErr?'notfound':'scanning');
                  else { setStatus('notfound'); setNameResults([]); }
                }}
                className="flex-1 h-9 rounded-xl bg-surface-2 border border-line text-ink-2 text-[0.78rem] font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-3 transition-colors">
                <Icon size={14}/>{label}
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Câmera */}
          {(status==='scanning'||status==='requesting')&&(
            <motion.div key="cam" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div className="relative rounded-2xl overflow-hidden bg-black mb-4 aspect-[4/3]">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover block"/>
                {/* Guia de scan */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[220px] h-[140px] border-2 border-accent rounded-xl"
                    style={{boxShadow:'0 0 0 2000px rgba(0,0,0,.4)'}}/>
                </div>
                <div className="absolute bottom-3 inset-x-0 text-center text-[0.72rem] text-ink-1/80 font-semibold">
                  {status==='requesting'?'Iniciando câmera...':'Aponte para o código de barras'}
                </div>
              </div>
              {'BarcodeDetector' in window
                ? <div className="text-[0.72rem] text-ok text-center mb-4 flex items-center justify-center gap-1.5"><ScanLine size={14}/> Detecção automática ativa</div>
                : <div className="text-[0.72rem] text-danger text-center mb-4 flex items-center justify-center gap-1.5"><AlertCircle size={14}/> Câmera sem suporte a barcode — use busca por nome</div>
              }
            </motion.div>
          )}

          {/* Buscando */}
          {status==='searching'&&(
            <motion.div key="searching" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="text-center py-12 px-4 flex flex-col items-center gap-4">
              <Spinner size={36}/>
              <div>
                <div className="font-display font-bold text-lg text-ink-1">Buscando na base...</div>
                <div className="text-[0.72rem] text-ink-3 mt-1">OpenFoodFacts · 3M+ produtos</div>
              </div>
            </motion.div>
          )}

          {/* Busca por nome */}
          {(status==='notfound'||nameResults.length>0)&&status!=='preview'&&status!=='manual'&&(
            <motion.div key="namesearch" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div className="relative mb-3">
                <Search size={15} className="text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                <input value={nameSearch} onChange={e=>setNameSearch(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&searchByName()}
                  placeholder="Buscar alimento por nome..."
                  className="field pl-10 pr-24"
                  autoFocus/>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <Button size="sm" onClick={searchByName}>
                    {nameLoading?<Spinner size={14}/>:'Buscar'}
                  </Button>
                </div>
              </div>

              {nameNotFound&&(
                <div className="text-center py-6 text-ink-3 text-[0.82rem] flex items-center justify-center gap-1.5">
                  <AlertCircle size={16}/> Nenhum resultado encontrado
                </div>
              )}

              <div className="grid gap-1.5">
                {nameResults.map((p:any,i:number)=>{
                  const n=p.nutriments||{};
                  const cal=parseFloat(n['energy-kcal_100g'])||0;
                  const name=p.product_name_pt||p.product_name||'Alimento';
                  return (
                    <motion.button key={i} whileTap={{scale:.98}} onClick={()=>selectNameResult(p)}
                      initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.04,0.4)}}
                      className="card-2 px-4 py-3 text-left flex items-center gap-3 w-full hover:bg-surface-3 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-accent-soft border border-accent/20 flex items-center justify-center shrink-0">
                        <Utensils size={17} className="text-accent"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.88rem] font-semibold text-ink-1 truncate">{name}</div>
                        <div className="text-[0.62rem] text-ink-3 mt-px">
                          {cal>0?`${Math.round(cal)}kcal/100g`:'macros não disponíveis'}
                          {p.brands?` · ${p.brands.split(',')[0]}`:''}
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-ink-3"/>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Manual */}
          {status==='manual'&&(
            <motion.div key="manual" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="grid gap-3">
              <div className="eyebrow flex items-center gap-1.5"><Pencil size={12}/> Entrada manual</div>
              {[
                {key:'name',     label:'Nome do alimento', type:'text',   placeholder:'Ex: Frango grelhado'},
                {key:'calories', label:'Calorias (kcal)',   type:'number', placeholder:'0'},
                {key:'protein',  label:'Proteína (g)',      type:'number', placeholder:'0'},
                {key:'carbs',    label:'Carboidrato (g)',   type:'number', placeholder:'0'},
                {key:'fat',      label:'Gordura (g)',       type:'number', placeholder:'0'},
              ].map(f=>(
                <div key={f.key}>
                  <label className="eyebrow block mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={(manualData as any)[f.key]}
                    onChange={e=>setManualData(d=>({...d,[f.key]:e.target.value}))}
                    className="field"/>
                </div>
              ))}
              <Button full onClick={accept} disabled={!manualData.name}>
                <CheckCircle2 size={16}/> Adicionar
              </Button>
            </motion.div>
          )}

          {/* Preview produto */}
          {status==='preview'&&preview&&(
            <motion.div key="preview" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid gap-3.5">
              {/* Info produto */}
              <div className="card-2 p-4">
                <input value={editPrev.name||''} onChange={e=>setEditPrev(p=>({...p,name:e.target.value}))}
                  className="w-full bg-transparent border-none text-ink-1 font-display font-bold text-[1.1rem] outline-none mb-1"/>
                {preview.note&&<div className="text-[0.62rem] text-ink-3">{preview.note}</div>}
                {!preview.hasNutrients&&(
                  <div className="flex items-center gap-1.5 bg-warn-soft border border-warn/30 rounded-lg px-2.5 py-2 mt-2">
                    <AlertCircle size={13} className="text-warn shrink-0"/>
                    <span className="text-[0.68rem] text-warn">Macros não disponíveis para este produto. Preencha manualmente.</span>
                  </div>
                )}
              </div>

              {/* Porção */}
              {preview.per100g&&(
                <div>
                  <label className="eyebrow block mb-1.5">Porção (gramas)</label>
                  <div className="flex gap-1.5 items-center">
                    <StepperBtn onClick={()=>handlePortionChange(String(Math.max(5,numOFF(portion)-10)))}><Minus size={15}/></StepperBtn>
                    <input type="number" value={portion} onChange={e=>handlePortionChange(e.target.value)}
                      className="field flex-1 text-center font-bold tnum"/>
                    <StepperBtn onClick={()=>handlePortionChange(String(numOFF(portion)+10))}><Plus size={15}/></StepperBtn>
                  </div>
                  <PresetChips options={[50,100,150,200,300]} value={portion} onSelect={handlePortionChange} suffix="g"/>
                </div>
              )}

              {/* Macros editáveis */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  {key:'calories', lbl:'kcal', cor:COR_KCAL},
                  {key:'protein',  lbl:'prot', cor:COR_PROT},
                  {key:'carbs',    lbl:'carb', cor:COR_CARB},
                  {key:'fat',      lbl:'gord', cor:COR_GORD},
                ].map(m=>(
                  <div key={m.key} className="card-2 p-2 text-center">
                    <input type="number" value={(editPrev as any)[m.key]||'0'}
                      onChange={e=>setEditPrev(p=>({...p,[m.key]:e.target.value}))}
                      className="w-full bg-transparent border-none font-display font-bold text-base text-center outline-none tnum"
                      style={{color:m.cor}}/>
                    <div className="eyebrow">{m.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Botões */}
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={()=>{setStatus(camErr?'notfound':'scanning');setPreview(null);}}>
                  <ArrowLeft size={14}/> Voltar
                </Button>
                <Button className="flex-[2]" onClick={accept}>
                  <CheckCircle2 size={16}/> Adicionar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Página ────────────────────────────────────────────────────
export default function DarkDietPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [uid,       setUid]       = useState<string|null>(null);
  const [dia,       setDia]       = useState<DiaRegistro>(diaVazio(hoje()));
  const [historico, setHistorico] = useState<DiaRegistro[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [view,      setView]      = useState<'home'|'historico'|'metas'>('home');
  const [modalRef,  setModalRef]  = useState<number|null>(null);
  const [showScanner,setShowScanner] = useState(false);
  const [scanRefIdx, setScanRefIdx]  = useState<number|null>(null);
  const [busca,     setBusca]     = useState('');
  const [alimentoSel,setAlimentoSel] = useState<Alimento|null>(null);
  const [porcao,    setPorcao]    = useState('100');
  const [metaCalEdit,setMetaCalEdit] = useState('2400');
  const [metaProtEdit,setMetaProtEdit] = useState('150');

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db,'users',u.uid,'data','diet'));
        if(snap.exists()){
          const data = JSON.parse(snap.data().payload||'{}');
          if(data.historico) setHistorico(data.historico);
          // carrega o dia de hoje se existir
          const diaHoje = data.historico?.find((d:DiaRegistro)=>d.data===hoje());
          const meta = data.metas || {cal:2400,prot:150};
          setMetaCalEdit(String(meta.cal));
          setMetaProtEdit(String(meta.prot));
          if(diaHoje) setDia(diaHoje);
          else setDia(diaVazio(hoje(), meta.cal, meta.prot));
        }
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const save = async (novoDia: DiaRegistro, novoHist?: DiaRegistro[], metas?: {cal:number;prot:number}) => {
    if(!uid) return;
    setSaving(true);
    try {
      const hist = novoHist ?? historico;
      const mt   = metas ?? {cal:dia.metaCal, prot:dia.metaProt};
      await setDoc(doc(db,'users',uid,'data','diet'),{
        payload: JSON.stringify({ historico: hist, metas: mt }),
        updatedAt: Date.now(),
      });
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const salvarDia = async () => {
    const novoHist = [dia, ...historico.filter(d=>d.data!==dia.data)]
      .sort((a,b)=>b.data.localeCompare(a.data));
    setHistorico(novoHist);
    await save(dia, novoHist);
    show('Dia salvo!');
  };

  const handleScanResult = (r: OFFResult, refIdx: number) => {
    const item: ItemRefeicao = {
      nome: r.name,
      cal:  parseFloat(r.calories)||0,
      prot: parseFloat(r.protein)||0,
      carb: parseFloat(r.carbs)||0,
      gord: parseFloat(r.fat)||0,
      por:  100, porcao: 100,
      icon: 'fork', id: Date.now().toString(),
    };
    setDia(d=>{
      const refs=d.refeicoes.map((ref,i)=>i===refIdx?{...ref,itens:[...ref.itens,item]}:ref);
      return {...d,refeicoes:refs};
    });
    setShowScanner(false); setScanRefIdx(null);
    show('Adicionado: '+r.name);
  };

  const addItem = () => {
    if(!alimentoSel || modalRef===null) return;
    const item:ItemRefeicao = {...alimentoSel, porcao:parseFloat(porcao)||100, id:Date.now().toString()};
    setDia(d=>{
      const refs = d.refeicoes.map((r,i)=>i===modalRef?{...r,itens:[...r.itens,item]}:r);
      return {...d, refeicoes:refs};
    });
    setAlimentoSel(null); setPorcao('100'); setBusca('');
  };

  const removeItem = (refIdx:number, itemId:string) => {
    setDia(d=>({...d,refeicoes:d.refeicoes.map((r,i)=>i===refIdx?{...r,itens:r.itens.filter(it=>it.id!==itemId)}:r)}));
  };

  const salvarMetas = async () => {
    const mt = {cal:parseInt(metaCalEdit)||2400, prot:parseInt(metaProtEdit)||150};
    const novoDia = {...dia, metaCal:mt.cal, metaProt:mt.prot};
    setDia(novoDia);
    await save(novoDia, undefined, mt);
    show('Metas salvas!');
    setView('home');
  };

  const totais   = useMemo(()=>calcMacros(dia.refeicoes.flatMap(r=>r.itens)),[dia]);
  const pctCal   = Math.min(100,Math.round((totais.cal/dia.metaCal)*100));
  const pctProt  = Math.min(100,Math.round((totais.prot/dia.metaProt)*100));
  const overCal  = totais.cal>dia.metaCal;
  const filtrados= ALIMENTOS.filter(a=>a.nome.toLowerCase().includes(busca.toLowerCase()));

  // ── LOADING ──────────────────────────────────────────────
  if(loading) return <PageShell><Spinner full/></PageShell>;

  // ── NÃO LOGADO ────────────────────────────────────────────
  if(!uid) return (
    <PageShell>
      <PageHeader title="DarkDiet" subtitle="Nutrição, macros e hidratação"/>
      <EmptyState
        icon={<Salad size={40}/>}
        title="Entre para registrar sua dieta"
        subtitle="Faça login para salvar refeições, acompanhar macros e bater suas metas."
        action={<Button onClick={()=>router.push('/login')}>Entrar</Button>}
      />
    </PageShell>
  );

  // ── METAS ─────────────────────────────────────────────────
  if(view==='metas') return (
    <PageShell>
      <ToastViewport toast={toast}/>
      <PageHeader title="Metas" subtitle="Defina seus alvos diários"
        right={<Button variant="ghost" size="sm" onClick={()=>setView('home')}><ArrowLeft size={14}/> Voltar</Button>}/>

      <div className="grid gap-4">
        <div className="card p-4 grid gap-4">
          <div>
            <label className="eyebrow flex items-center gap-1.5 mb-1.5">
              <Flame size={12} className="text-accent"/> Meta de calorias (kcal/dia)
            </label>
            <input type="number" value={metaCalEdit} onChange={e=>setMetaCalEdit(e.target.value)}
              className="field text-[1.15rem] font-bold tnum"/>
            <PresetChips options={[1800,2000,2200,2500,2800,3000]} value={metaCalEdit} onSelect={setMetaCalEdit}/>
          </div>
          <div className="border-t border-line pt-4">
            <label className="eyebrow flex items-center gap-1.5 mb-1.5">
              <Dumbbell size={12} style={{color:COR_PROT}}/> Meta de proteína (g/dia)
            </label>
            <input type="number" value={metaProtEdit} onChange={e=>setMetaProtEdit(e.target.value)}
              className="field text-[1.15rem] font-bold tnum"/>
            <PresetChips options={[100,120,150,175,200,220]} value={metaProtEdit} onSelect={setMetaProtEdit} suffix="g"/>
          </div>
        </div>

        <Button full size="lg" onClick={salvarMetas}>
          <CheckCircle2 size={18}/> Salvar metas
        </Button>
      </div>
    </PageShell>
  );

  // ── HISTÓRICO ─────────────────────────────────────────────
  if(view==='historico') return (
    <PageShell>
      <ToastViewport toast={toast}/>
      <PageHeader title="Histórico" subtitle="Seus dias registrados"
        right={<Button variant="ghost" size="sm" onClick={()=>setView('home')}><ArrowLeft size={14}/> Voltar</Button>}/>

      {historico.length===0 ? (
        <EmptyState
          icon={<History size={40}/>}
          title="Nenhum registro ainda"
          subtitle="Salve o dia atual para ver o histórico."
          action={<Button variant="soft" onClick={()=>setView('home')}>Registrar hoje</Button>}
        />
      ) : (
        <div className="grid gap-2.5">
          {historico.map((d,i)=>{
            const t=calcMacros(d.refeicoes.flatMap(r=>r.itens));
            const ok=t.cal<=d.metaCal;
            return (
              <motion.div key={d.data} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.04,0.4)}}
                className="card p-4">
                <div className="flex justify-between items-start mb-2.5">
                  <div className="font-display font-bold text-ink-1">{fmtData(d.data)}</div>
                  <div className="flex items-center gap-2">
                    <div className={`font-display font-bold text-[1.05rem] tnum ${ok?'text-ok':'text-danger'}`}>{t.cal} kcal</div>
                    <span className={`text-[0.58rem] font-bold uppercase tracking-wide rounded-full border px-2 py-0.5 ${ok?'bg-ok-soft border-ok/30 text-ok':'bg-danger-soft border-danger/30 text-danger'}`}>
                      {ok?'Na meta':'Acima'}
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-surface-3 overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${ok?'bg-ok':'bg-danger'}`}
                    style={{width:`${Math.min(100,Math.round(t.cal/d.metaCal*100))}%`}}/>
                </div>
                <div className="flex gap-3.5 items-center text-[0.72rem] text-ink-2">
                  {[['P',t.prot+'g',COR_PROT],['C',t.carb+'g',COR_CARB],['G',t.gord+'g',COR_GORD]].map(([l,v,c])=>(
                    <div key={l as string}>
                      <span className="font-bold" style={{color:c as string}}>{l}</span> {v}
                    </div>
                  ))}
                  <div className="ml-auto flex items-center gap-1 text-info">
                    <Droplets size={11}/>{d.agua}/{META_AGUA}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageShell>
  );

  // ── HOME ──────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {/* Modal de busca (bottom sheet) */}
        {modalRef!==null && (
          <motion.div key="modal-busca" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end"
            onClick={e=>{if(e.target===e.currentTarget){setModalRef(null);setAlimentoSel(null);setBusca('');}}}>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:300,damping:32}}
              className="bg-surface-1 border-t border-line rounded-t-3xl w-full max-h-[88vh] flex flex-col">

              <div className="flex justify-center pt-3">
                <div className="w-10 h-1 rounded-full bg-surface-3"/>
              </div>

              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="font-display font-bold text-lg text-ink-1">
                  {dia.refeicoes[modalRef].nome}
                </div>
                <IconBtn onClick={()=>{setModalRef(null);setAlimentoSel(null);setBusca('');}}><X size={16}/></IconBtn>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-5">
                <AnimatePresence mode="wait">
                  {!alimentoSel ? (
                    <motion.div key="busca" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                      <div className="relative mb-3">
                        <Search size={15} className="text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar alimento..."
                          className="field pl-10" autoFocus/>
                      </div>
                      <div className="grid gap-1.5">
                        {filtrados.map((a,i)=>(
                          <motion.button key={a.nome} whileTap={{scale:.98}} onClick={()=>setAlimentoSel(a)}
                            initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.02,0.3)}}
                            className="card-2 px-4 py-3 text-left flex items-center gap-3 w-full hover:bg-surface-3 transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-accent-soft border border-accent/20 flex items-center justify-center shrink-0">
                              <AliIcon icon={a.icon} size={17} className="text-accent"/>
                            </div>
                            <div className="flex-1">
                              <div className="text-[0.9rem] font-semibold text-ink-1">{a.nome}</div>
                              <div className="text-[0.62rem] text-ink-3 mt-0.5 tnum">
                                {a.cal}kcal · P:{a.prot}g · C:{a.carb}g · G:{a.gord}g /100g
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-ink-3"/>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="porcao" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="grid gap-4">
                      <div className="card-2 p-3.5 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-accent-soft border border-accent/20 flex items-center justify-center shrink-0">
                          <AliIcon icon={alimentoSel.icon} size={21} className="text-accent"/>
                        </div>
                        <div>
                          <div className="font-semibold text-ink-1">{alimentoSel.nome}</div>
                          <div className="text-[0.62rem] text-ink-3">por 100g</div>
                        </div>
                      </div>

                      <div>
                        <label className="eyebrow block mb-1.5">Porção (gramas)</label>
                        <div className="flex items-center gap-2">
                          <StepperBtn onClick={()=>setPorcao(p=>String(Math.max(5,parseFloat(p)||100)-5))}><Minus size={16}/></StepperBtn>
                          <input type="number" value={porcao} onChange={e=>setPorcao(e.target.value)}
                            className="field flex-1 text-center font-semibold text-[1.05rem] tnum"/>
                          <StepperBtn onClick={()=>setPorcao(p=>String((parseFloat(p)||100)+5))}><Plus size={16}/></StepperBtn>
                        </div>
                        <PresetChips options={[50,100,150,200,300]} value={porcao} onSelect={setPorcao} suffix="g"/>
                      </div>

                      {/* Preview macros */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          {val:Math.round(alimentoSel.cal *num(porcao)/100), lbl:'kcal', cor:COR_KCAL},
                          {val:Math.round(alimentoSel.prot*num(porcao)/100), lbl:'prot', cor:COR_PROT},
                          {val:Math.round(alimentoSel.carb*num(porcao)/100), lbl:'carb', cor:COR_CARB},
                          {val:Math.round(alimentoSel.gord*num(porcao)/100), lbl:'gord', cor:COR_GORD},
                        ].map((m,i)=>(
                          <div key={i} className="card-2 p-2 text-center">
                            <div className="font-display font-bold text-[1.05rem] tnum" style={{color:m.cor}}>{m.val}</div>
                            <div className="eyebrow">{m.lbl}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1" onClick={()=>setAlimentoSel(null)}>
                          <ArrowLeft size={15}/> Voltar
                        </Button>
                        <Button className="flex-[2]" onClick={addItem}>
                          <CheckCircle2 size={16}/> Adicionar
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showScanner && scanRefIdx!==null && (
          <BarcodeScanner key="scanner"
            onResult={(r)=>handleScanResult(r, scanRefIdx)}
            onClose={()=>{setShowScanner(false);setScanRefIdx(null);}}
          />
        )}
      </AnimatePresence>

      <PageShell>
        <ToastViewport toast={toast}/>

        <PageHeader
          title="DarkDiet"
          subtitle={
            <span className="inline-flex items-center gap-1.5">
              <Salad size={12}/> {fmtData(hoje())}{saving && <span className="text-ink-3"> · salvando...</span>}
            </span>
          }
          right={
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={()=>setView('metas')}><Settings size={14}/> Metas</Button>
              <Button variant="ghost" size="sm" onClick={()=>setView('historico')} aria-label="Histórico"><History size={14}/></Button>
            </div>
          }
        />

        {/* Resumo do dia */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.05}}
          className="card p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <RingMeta pct={pctCal} over={overCal}/>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-display font-bold text-[1.05rem] tnum ${overCal?'text-danger':'text-accent'}`}>{pctCal}%</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className={`font-display font-bold text-[2.4rem] leading-none tnum ${overCal?'text-danger':'text-ink-1'}`}>{totais.cal}</span>
                <span className="text-ink-3 text-sm tnum">/ {dia.metaCal} kcal</span>
              </div>
              <div className="eyebrow mt-1.5 flex items-center gap-1">
                <Flame size={11} className={overCal?'text-danger':'text-accent'}/> calorias hoje
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {[
              {val:totais.prot, meta:dia.metaProt, lbl:'Proteína',    cor:COR_PROT, pct:pctProt},
              {val:totais.carb, meta:0,            lbl:'Carboidrato', cor:COR_CARB, pct:0},
              {val:totais.gord, meta:0,            lbl:'Gordura',     cor:COR_GORD, pct:0},
            ].map((m)=>(
              <div key={m.lbl} className="card-2 px-2 py-2.5 text-center">
                <div className="font-display font-bold text-[1.2rem] leading-none tnum" style={{color:m.cor}}>
                  {m.val}<span className="text-[0.65rem] text-ink-3">g</span>
                </div>
                {m.meta>0 && (
                  <div className="h-1 rounded-full bg-surface-3 overflow-hidden mt-1.5">
                    <motion.div className="h-full rounded-full" style={{background:m.cor}}
                      animate={{width:`${Math.min(100,m.pct)}%`}} transition={{duration:.5,ease:'easeOut'}}/>
                  </div>
                )}
                <div className="eyebrow mt-1">{m.lbl}{m.meta>0?` · ${m.pct}%`:''}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Água */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.1}}
          className="card p-3.5 mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Droplets size={18} className="text-info shrink-0"/>
              <div className="min-w-0">
                <div className="font-display font-semibold text-ink-1 leading-none">Hidratação</div>
                <div className="text-[0.6rem] text-ink-3 mt-1 tnum">{dia.agua} de {META_AGUA} copos (250ml)</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconBtn onClick={()=>setDia(d=>({...d,agua:Math.max(0,d.agua-1)}))}><Minus size={15}/></IconBtn>
              <div className="flex gap-[3px]">
                {Array.from({length:META_AGUA},(_,i)=>(
                  <motion.button key={i} whileTap={{scale:.8}}
                    onClick={()=>setDia(d=>({...d,agua:i+1}))}
                    aria-label={`${i+1} copos`}
                    className={`w-3.5 h-[22px] rounded-[3px] border transition-colors ${
                      i<dia.agua ? 'bg-info border-info/40' : 'bg-surface-2 border-line'
                    }`}/>
                ))}
              </div>
              <IconBtn tone="info" onClick={()=>setDia(d=>({...d,agua:Math.min(META_AGUA,d.agua+1)}))}><Plus size={15}/></IconBtn>
            </div>
          </div>
        </motion.div>

        {/* Refeições */}
        <div className="grid gap-2.5 mb-6">
          {dia.refeicoes.map((ref,ri)=>{
            const macRef = calcMacros(ref.itens);
            return (
              <motion.div key={ri} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                transition={{delay:Math.min(.14+ri*0.04,0.4)}}
                className="card overflow-hidden">
                {/* Header refeição */}
                <div className={`flex items-center justify-between px-4 py-3 ${ref.itens.length>0?'border-b border-line':''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Utensils size={14} className="text-ink-3 shrink-0"/>
                    <div className="font-display font-semibold text-[0.92rem] text-ink-1 truncate">{ref.nome}</div>
                    {ref.itens.length>0 && (
                      <span className="text-[0.58rem] font-bold text-accent bg-accent-soft border border-accent/20 rounded-full px-2 py-0.5 tnum shrink-0">
                        {macRef.cal} kcal
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <IconBtn tone="accent-soft" title="Scanner / OpenFoodFacts"
                      onClick={()=>{setScanRefIdx(ri);setShowScanner(true);}}>
                      <Camera size={14}/>
                    </IconBtn>
                    <IconBtn tone="accent" title="Buscar na lista" onClick={()=>setModalRef(ri)}>
                      <Plus size={15}/>
                    </IconBtn>
                  </div>
                </div>

                {/* Itens */}
                {ref.itens.map((it,ii)=>(
                  <motion.div key={it.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:Math.min(ii*0.03,0.3)}}
                    className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/50 last:border-b-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center shrink-0">
                      <AliIcon icon={it.icon} size={15} className="text-ink-3"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.82rem] text-ink-1 font-semibold truncate">{it.nome}</div>
                      <div className="text-[0.6rem] text-ink-3 mt-px tnum">
                        {it.porcao}g · {Math.round(it.cal*it.porcao/100)}kcal · P:{Math.round(it.prot*it.porcao/100)}g
                      </div>
                    </div>
                    <IconBtn tone="danger" onClick={()=>removeItem(ri,it.id)}><Trash2 size={13}/></IconBtn>
                  </motion.div>
                ))}
              </motion.div>
            );
          })}
        </div>

        {/* Salvar dia */}
        <Button full size="lg" onClick={salvarDia} disabled={saving}>
          <CheckCircle2 size={18}/> Salvar dia
        </Button>
      </PageShell>
    </>
  );
}
