'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  X, Search, Plus, Minus, ChevronRight,
  ArrowLeft, Droplets, Target, TrendingUp,
  History, CheckCircle2, Trash2, Settings,
  BarChart2, Flame, Zap, Camera, Barcode,
  ScanLine, Pencil, Loader2, AlertCircle
} from 'lucide-react';
import {
  ForkKnife, Egg, Barbell, Carrot, Drop,
  Coffee, Cookie, Fish, Leaf
} from '@phosphor-icons/react';

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
  icon: string; // phosphor icon name
};
type ItemRefeicao = Alimento & { porcao: number; id: string };
type Refeicao     = { nome: string; itens: ItemRefeicao[] };
type DiaRegistro  = { data: string; refeicoes: Refeicao[]; agua: number; metaCal: number; metaProt: number };

// ── Constantes ────────────────────────────────────────────────
const REFEICOES_PADRAO = ['Café da manhã','Almoço','Pré-treino','Pós-treino','Jantar','Lanche'];
const META_AGUA = 8;

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

function AliIcon({ icon, size=20, color='#7a7a8a' }: { icon:string; size?:number; color?:string }) {
  const props = { size, color, weight: 'fill' as const };
  if(icon==='egg')     return <Egg {...props}/>;
  if(icon==='barbell') return <Barbell {...props}/>;
  if(icon==='carrot')  return <Carrot {...props}/>;
  if(icon==='drop')    return <Drop {...props}/>;
  if(icon==='coffee')  return <Coffee {...props}/>;
  if(icon==='cookie')  return <Cookie {...props}/>;
  if(icon==='fish')    return <Fish {...props}/>;
  if(icon==='leaf')    return <Leaf {...props}/>;
  return <ForkKnife {...props}/>;
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
        note: [brand, p.serving_size?'porção: '+p.serving_size:'', !hasNutrients?'⚠️ sem macros na base':''].filter(Boolean).join(' · '),
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

  const S = {
    overlay: {position:'fixed' as const,inset:0,zIndex:250,background:'#06060a',display:'flex',flexDirection:'column' as const},
    header:  {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 1.25rem',borderBottom:'1px solid #1e1e24',flexShrink:0},
    body:    {flex:1,overflowY:'auto' as const,padding:'1rem 1.25rem'},
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={S.overlay}>
      {/* Header */}
      <div style={S.header}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase' as const,color:'#f0f0f2',display:'flex',alignItems:'center',gap:'.5rem'}}>
          <ScanLine size={20} color="#22c55e"/> Adicionar Alimento
        </div>
        <motion.button whileTap={{scale:.9}} onClick={()=>{stopCamera();onClose();}}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',color:'#7a7a8a',cursor:'pointer',outline:'none'}}>
          <X size={16}/>
        </motion.button>
      </div>

      <div style={S.body}>
        {/* Tabs de modo */}
        {status!=='preview'&&status!=='manual'&&(
          <div style={{display:'flex',gap:'.4rem',marginBottom:'1rem'}}>
            {[
              {id:'scan', label:'Scanner',  Icon:Camera},
              {id:'name', label:'Buscar',   Icon:Search},
              {id:'manual',label:'Manual',  Icon:Pencil},
            ].map(({id,label,Icon})=>(
              <motion.button key={id} whileTap={{scale:.95}}
                onClick={()=>{
                  if(id==='manual') setStatus('manual');
                  else if(id==='scan') setStatus(camErr?'notfound':'scanning');
                  else { setStatus('notfound'); setNameResults([]); }
                }}
                style={{flex:1,padding:'.45rem',borderRadius:10,
                  border:'1px solid '+((
                    id==='scan'?(status==='scanning'||status==='requesting'):
                    id==='name'?status==='notfound':
                    status==='manual'
                  )?'#22c55e':'#2e2e38'),
                  background:(id==='manual'&&status==='manual')?'rgba(34,197,94,.1)':'rgba(255,255,255,.04)',
                  color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.35rem',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.78rem',textTransform:'uppercase' as const}}>
                <Icon size={14}/>{label}
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Câmera */}
          {(status==='scanning'||status==='requesting')&&(
            <motion.div key="cam" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div style={{position:'relative',borderRadius:16,overflow:'hidden',background:'#000',marginBottom:'1rem',aspectRatio:'4/3'}}>
                <video ref={videoRef} playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                {/* Guia de scan */}
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:220,height:140,border:'2px solid #22c55e',borderRadius:12,boxShadow:'0 0 0 2000px rgba(0,0,0,.4)'}}/>
                </div>
                <div style={{position:'absolute',bottom:12,left:0,right:0,textAlign:'center',fontSize:'.72rem',color:'rgba(255,255,255,.7)',fontWeight:600}}>
                  {status==='requesting'?'Iniciando câmera...':'Aponte para o código de barras'}
                </div>
              </div>
              {'BarcodeDetector' in window
                ? <div style={{fontSize:'.72rem',color:'#4ade80',textAlign:'center',marginBottom:'1rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}><ScanLine size={14}/> Detecção automática ativa</div>
                : <div style={{fontSize:'.72rem',color:'#f87171',textAlign:'center',marginBottom:'1rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}><AlertCircle size={14}/> Câmera sem suporte a barcode — use busca por nome</div>
              }
            </motion.div>
          )}

          {/* Buscando */}
          {status==='searching'&&(
            <motion.div key="searching" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{textAlign:'center',padding:'3rem 1rem'}}>
              <motion.div animate={{rotate:360}} transition={{duration:.7,repeat:Infinity,ease:'linear'}} style={{display:'inline-block',marginBottom:'1rem'}}>
                <Loader2 size={36} color="#22c55e"/>
              </motion.div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'1.1rem',color:'#f0f0f2'}}>Buscando na base...</div>
              <div style={{fontSize:'.72rem',color:'#7a7a8a',marginTop:'.3rem'}}>OpenFoodFacts · 3M+ produtos</div>
            </motion.div>
          )}

          {/* Busca por nome */}
          {(status==='notfound'||nameResults.length>0)&&status!=='preview'&&status!=='manual'&&(
            <motion.div key="namesearch" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div style={{position:'relative',marginBottom:'.75rem'}}>
                <Search size={15} color="#484858" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
                <input value={nameSearch} onChange={e=>setNameSearch(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&searchByName()}
                  placeholder="Buscar alimento por nome..."
                  style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'11px 70px 11px 36px',fontSize:'.9rem',outline:'none'}}
                  autoFocus/>
                <motion.button whileTap={{scale:.95}} onClick={searchByName}
                  style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'#22c55e',border:'none',borderRadius:7,padding:'5px 10px',color:'#000',fontWeight:700,fontSize:'.72rem',cursor:'pointer',outline:'none'}}>
                  {nameLoading?<Loader2 size={12}/>:'Buscar'}
                </motion.button>
              </div>

              {nameNotFound&&<div style={{textAlign:'center',padding:'1.5rem',color:'#484858',fontSize:'.82rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}><AlertCircle size={16}/> Nenhum resultado encontrado</div>}

              <div style={{display:'grid',gap:'.4rem'}}>
                {nameResults.map((p:any,i:number)=>{
                  const n=p.nutriments||{};
                  const cal=parseFloat(n['energy-kcal_100g'])||0;
                  const name=p.product_name_pt||p.product_name||'Alimento';
                  return (
                    <motion.button key={i} whileTap={{scale:.98}} onClick={()=>selectNameResult(p)}
                      style={{background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:12,padding:'.75rem 1rem',textAlign:'left' as const,cursor:'pointer',display:'flex',alignItems:'center',gap:'.75rem',outline:'none'}}>
                      <div style={{width:36,height:36,borderRadius:9,background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <ForkKnife size={18} color="#22c55e" weight="fill"/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'.88rem',fontWeight:600,color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{name}</div>
                        <div style={{fontSize:'.6rem',color:'#7a7a8a',marginTop:'1px'}}>
                          {cal>0?`${Math.round(cal)}kcal/100g`:'macros não disponíveis'}
                          {p.brands?` · ${p.brands.split(',')[0]}`:''}
                        </div>
                      </div>
                      <ChevronRight size={15} color="#484858"/>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Manual */}
          {status==='manual'&&(
            <motion.div key="manual" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} style={{display:'grid',gap:'.75rem'}}>
              <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase' as const,letterSpacing:'.08em',display:'flex',alignItems:'center',gap:'.3rem'}}>
                <Pencil size={12}/> Entrada manual
              </div>
              {[
                {key:'name',     label:'Nome do alimento', type:'text',   placeholder:'Ex: Frango grelhado'},
                {key:'calories', label:'Calorias (kcal)',   type:'number', placeholder:'0'},
                {key:'protein',  label:'Proteína (g)',      type:'number', placeholder:'0'},
                {key:'carbs',    label:'Carboidrato (g)',   type:'number', placeholder:'0'},
                {key:'fat',      label:'Gordura (g)',       type:'number', placeholder:'0'},
              ].map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:'.6rem',color:'#7a7a8a',textTransform:'uppercase' as const,letterSpacing:'.06em',display:'block',marginBottom:4}}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={(manualData as any)[f.key]}
                    onChange={e=>setManualData(d=>({...d,[f.key]:e.target.value}))}
                    style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'10px 13px',fontSize:'1rem',outline:'none'}}/>
                </div>
              ))}
              <motion.button whileTap={{scale:.97}} onClick={accept} disabled={!manualData.name}
                style={{width:'100%',background:manualData.name?'linear-gradient(135deg,#22c55e,#16a34a)':'rgba(34,197,94,.2)',border:'none',borderRadius:12,padding:'13px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase' as const,cursor:manualData.name?'pointer':'not-allowed',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                <CheckCircle2 size={16}/> Adicionar
              </motion.button>
            </motion.div>
          )}

          {/* Preview produto */}
          {status==='preview'&&preview&&(
            <motion.div key="preview" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'grid',gap:'.85rem'}}>
              {/* Info produto */}
              <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                <CardContent style={{padding:'1rem'}}>
                  <input value={editPrev.name||''} onChange={e=>setEditPrev(p=>({...p,name:e.target.value}))}
                    style={{width:'100%',background:'transparent',border:'none',color:'#f0f0f2',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.15rem',outline:'none',marginBottom:'.25rem'}}/>
                  {preview.note&&<div style={{fontSize:'.62rem',color:'#7a7a8a'}}>{preview.note}</div>}
                  {!preview.hasNutrients&&(
                    <div style={{display:'flex',alignItems:'center',gap:'.35rem',background:'rgba(250,204,21,.08)',border:'1px solid rgba(250,204,21,.2)',borderRadius:8,padding:'.45rem .65rem',marginTop:'.5rem'}}>
                      <AlertCircle size={13} color="#facc15"/>
                      <span style={{fontSize:'.68rem',color:'#facc15'}}>Macros não disponíveis para este produto. Preencha manualmente.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Porção */}
              {preview.per100g&&(
                <div>
                  <label style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase' as const,letterSpacing:'.06em',display:'block',marginBottom:5}}>Porção (gramas)</label>
                  <div style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
                    <motion.button whileTap={{scale:.9}} onClick={()=>handlePortionChange(String(Math.max(5,numOFF(portion)-10)))}
                      style={{width:38,height:38,borderRadius:9,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',color:'#f0f0f2',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Minus size={15}/>
                    </motion.button>
                    <input type="number" value={portion} onChange={e=>handlePortionChange(e.target.value)}
                      style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'10px',fontSize:'1rem',outline:'none',textAlign:'center' as const,fontWeight:700}}/>
                    <motion.button whileTap={{scale:.9}} onClick={()=>handlePortionChange(String(numOFF(portion)+10))}
                      style={{width:38,height:38,borderRadius:9,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',color:'#f0f0f2',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Plus size={15}/>
                    </motion.button>
                  </div>
                  <div style={{display:'flex',gap:'.3rem',marginTop:'.5rem'}}>
                    {[50,100,150,200,300].map(g=>(
                      <motion.button key={g} whileTap={{scale:.9}} onClick={()=>handlePortionChange(String(g))}
                        style={{flex:1,padding:'.3rem',borderRadius:7,border:'1px solid '+(portion===String(g)?'#22c55e':'#2e2e38'),background:portion===String(g)?'rgba(34,197,94,.15)':'transparent',color:portion===String(g)?'#22c55e':'#7a7a8a',fontSize:'.68rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
                        {g}g
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Macros editáveis */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.4rem'}}>
                {[
                  {key:'calories', lbl:'kcal', cor:'#e31b23'},
                  {key:'protein',  lbl:'prot',  cor:'#60a5fa'},
                  {key:'carbs',    lbl:'carb',  cor:'#34d399'},
                  {key:'fat',      lbl:'gord',  cor:'#f472b6'},
                ].map(m=>(
                  <div key={m.key} style={{background:'rgba(0,0,0,.3)',border:'1px solid #2e2e38',borderRadius:10,padding:'.5rem',textAlign:'center' as const}}>
                    <input type="number" value={(editPrev as any)[m.key]||'0'}
                      onChange={e=>setEditPrev(p=>({...p,[m.key]:e.target.value}))}
                      style={{width:'100%',background:'transparent',border:'none',color:m.cor,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',outline:'none',textAlign:'center' as const}}/>
                    <div style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{m.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Botões */}
              <div style={{display:'flex',gap:'.5rem'}}>
                <motion.button whileTap={{scale:.97}} onClick={()=>{setStatus(camErr?'notfound':'scanning');setPreview(null);}}
                  style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase' as const,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.35rem'}}>
                  <ArrowLeft size={14}/> Voltar
                </motion.button>
                <motion.button whileTap={{scale:.97}} onClick={accept}
                  style={{flex:2,background:'linear-gradient(135deg,#22c55e,#16a34a)',border:'none',borderRadius:10,padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase' as const,letterSpacing:'.04em',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',boxShadow:'0 4px 16px rgba(34,197,94,.25)'}}>
                  <CheckCircle2 size={16}/> Adicionar
                </motion.button>
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
  const [toast,     setToast]     = useState('');

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

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
    showToast('Dia salvo!');
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
    showToast('Adicionado: '+r.name);
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
    showToast('Metas salvas!');
    setView('home');
  };

  const totais   = useMemo(()=>calcMacros(dia.refeicoes.flatMap(r=>r.itens)),[dia]);
  const pctCal   = Math.min(100,Math.round((totais.cal/dia.metaCal)*100));
  const pctProt  = Math.min(100,Math.round((totais.prot/dia.metaProt)*100));
  const filtrados= ALIMENTOS.filter(a=>a.nome.toLowerCase().includes(busca.toLowerCase()));

  // ── LOADING ──────────────────────────────────────────────
  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <motion.div animate={{rotate:360}} transition={{duration:.65,repeat:Infinity,ease:'linear'}}
          style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
      </div>
    </PageShell>
  );

  // ── MODAL BUSCA ───────────────────────────────────────────
  const ModalBusca = () => (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.88)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}}
      onClick={e=>{if(e.target===e.currentTarget){setModalRef(null);setAlimentoSel(null);setBusca('');}}}>
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:300,damping:32}}
        style={{background:'#0f0f13',borderTop:'1px solid #2e2e38',borderRadius:'24px 24px 0 0',width:'100%',maxHeight:'88vh',display:'flex',flexDirection:'column'}}>

        <div style={{display:'flex',justifyContent:'center',padding:'12px 0 0'}}>
          <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2}}/>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 1.25rem .5rem'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2'}}>
            {modalRef!==null?dia.refeicoes[modalRef].nome:''}
          </div>
          <motion.button whileTap={{scale:.9}} onClick={()=>{setModalRef(null);setAlimentoSel(null);setBusca('');}}
            style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',color:'#7a7a8a',cursor:'pointer',outline:'none'}}>
            <X size={16}/>
          </motion.button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'0 1.25rem 1.25rem'}}>
          <AnimatePresence mode="wait">
            {!alimentoSel ? (
              <motion.div key="busca" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div style={{position:'relative',marginBottom:'.75rem'}}>
                  <Search size={15} color="#484858" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
                  <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar alimento..."
                    style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'10px 13px 10px 36px',fontSize:'.9rem',outline:'none'}}
                    autoFocus/>
                </div>
                <div style={{display:'grid',gap:'.4rem'}}>
                  {filtrados.map((a,i)=>(
                    <motion.button key={i} whileTap={{scale:.98}} onClick={()=>setAlimentoSel(a)}
                      style={{background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:12,padding:'.75rem 1rem',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'.75rem',outline:'none'}}>
                      <div style={{width:38,height:38,borderRadius:9,background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <AliIcon icon={a.icon} size={18} color="#e31b23"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'.9rem',fontWeight:600,color:'#f0f0f2'}}>{a.nome}</div>
                        <div style={{fontSize:'.62rem',color:'#7a7a8a',marginTop:'2px'}}>
                          {a.cal}kcal · P:{a.prot}g · C:{a.carb}g · G:{a.gord}g /100g
                        </div>
                      </div>
                      <ChevronRight size={16} color="#484858"/>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="porcao" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} style={{display:'grid',gap:'1rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.75rem',background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:12,padding:'.85rem'}}>
                  <div style={{width:44,height:44,borderRadius:10,background:'rgba(227,27,35,.1)',border:'1px solid rgba(227,27,35,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <AliIcon icon={alimentoSel.icon} size={22} color="#e31b23"/>
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'1rem',color:'#f0f0f2'}}>{alimentoSel.nome}</div>
                    <div style={{fontSize:'.62rem',color:'#7a7a8a'}}>por 100g</div>
                  </div>
                </div>

                <div>
                  <label style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:5}}>Porção (gramas)</label>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                    <motion.button whileTap={{scale:.9}} onClick={()=>setPorcao(p=>String(Math.max(5,parseFloat(p)||100)-5))}
                      style={{width:40,height:40,borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',color:'#f0f0f2',fontSize:'1.2rem',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Minus size={16}/>
                    </motion.button>
                    <input type="number" value={porcao} onChange={e=>setPorcao(e.target.value)}
                      style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'11px 13px',fontSize:'1.1rem',outline:'none',fontWeight:600,textAlign:'center'}}/>
                    <motion.button whileTap={{scale:.9}} onClick={()=>setPorcao(p=>String((parseFloat(p)||100)+5))}
                      style={{width:40,height:40,borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',color:'#f0f0f2',fontSize:'1.2rem',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Plus size={16}/>
                    </motion.button>
                  </div>
                  {/* Presets rápidos */}
                  <div style={{display:'flex',gap:'.35rem',marginTop:'.5rem'}}>
                    {[50,100,150,200,300].map(g=>(
                      <motion.button key={g} whileTap={{scale:.9}} onClick={()=>setPorcao(String(g))}
                        style={{flex:1,padding:'.3rem',borderRadius:7,border:'1px solid '+(porcao===String(g)?'#e31b23':'#2e2e38'),background:porcao===String(g)?'rgba(227,27,35,.15)':'transparent',color:porcao===String(g)?'#e31b23':'#7a7a8a',fontSize:'.7rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
                        {g}g
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Preview macros */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.4rem'}}>
                  {[
                    {val:Math.round(alimentoSel.cal *num(porcao)/100), lbl:'kcal', cor:'#e31b23'},
                    {val:Math.round(alimentoSel.prot*num(porcao)/100), lbl:'prot', cor:'#60a5fa'},
                    {val:Math.round(alimentoSel.carb*num(porcao)/100), lbl:'carb', cor:'#34d399'},
                    {val:Math.round(alimentoSel.gord*num(porcao)/100), lbl:'gord', cor:'#f472b6'},
                  ].map((m,i)=>(
                    <Card key={i} style={{background:'rgba(0,0,0,.3)',border:'1px solid #2e2e38',borderRadius:10}}>
                      <CardContent style={{padding:'.5rem',textAlign:'center'}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:m.cor}}>{m.val}</div>
                        <div style={{fontSize:'.52rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.lbl}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div style={{display:'flex',gap:'.5rem'}}>
                  <motion.button whileTap={{scale:.97}} onClick={()=>setAlimentoSel(null)}
                    style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:10,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                    <ArrowLeft size={15}/> Voltar
                  </motion.button>
                  <motion.button whileTap={{scale:.97}} onClick={addItem}
                    style={{flex:2,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:10,padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.28)',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}}>
                    <CheckCircle2 size={16}/> Adicionar
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );

  // ── METAS ─────────────────────────────────────────────────
  if(view==='metas') return (
    <PageShell>
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
        <motion.button whileTap={{scale:.95}} onClick={()=>setView('home')}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .8rem',color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.35rem'}}>
          <ArrowLeft size={14}/> Voltar
        </motion.button>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2'}}>Metas</div>
      </motion.div>

      <div style={{display:'grid',gap:'1rem'}}>
        <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'1rem',display:'grid',gap:'.75rem'}}>
            <div>
              <label style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:'.3rem',marginBottom:6}}>
                <Flame size={12} color="#e31b23"/> Meta de Calorias (kcal/dia)
              </label>
              <input type="number" value={metaCalEdit} onChange={e=>setMetaCalEdit(e.target.value)}
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'12px 13px',fontSize:'1.2rem',outline:'none',fontWeight:700}}/>
              <div style={{display:'flex',gap:'.35rem',marginTop:'.5rem'}}>
                {[1800,2000,2200,2500,2800,3000].map(c=>(
                  <motion.button key={c} whileTap={{scale:.9}} onClick={()=>setMetaCalEdit(String(c))}
                    style={{flex:1,padding:'.3rem',borderRadius:7,border:'1px solid '+(metaCalEdit===String(c)?'#e31b23':'#2e2e38'),background:metaCalEdit===String(c)?'rgba(227,27,35,.15)':'transparent',color:metaCalEdit===String(c)?'#e31b23':'#7a7a8a',fontSize:'.62rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
                    {c}
                  </motion.button>
                ))}
              </div>
            </div>
            <Separator style={{background:'rgba(255,255,255,.05)'}}/>
            <div>
              <label style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:'.3rem',marginBottom:6}}>
                <Barbell size={12} color="#60a5fa" weight="fill"/> Meta de Proteína (g/dia)
              </label>
              <input type="number" value={metaProtEdit} onChange={e=>setMetaProtEdit(e.target.value)}
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:10,color:'#f0f0f2',padding:'12px 13px',fontSize:'1.2rem',outline:'none',fontWeight:700}}/>
              <div style={{display:'flex',gap:'.35rem',marginTop:'.5rem'}}>
                {[100,120,150,175,200,220].map(p=>(
                  <motion.button key={p} whileTap={{scale:.9}} onClick={()=>setMetaProtEdit(String(p))}
                    style={{flex:1,padding:'.3rem',borderRadius:7,border:'1px solid '+(metaProtEdit===String(p)?'#60a5fa':'#2e2e38'),background:metaProtEdit===String(p)?'rgba(96,165,250,.15)':'transparent',color:metaProtEdit===String(p)?'#60a5fa':'#7a7a8a',fontSize:'.62rem',fontWeight:700,cursor:'pointer',outline:'none'}}>
                    {p}g
                  </motion.button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <motion.button whileTap={{scale:.97}} onClick={salvarMetas}
          style={{width:'100%',background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:14,padding:'15px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:'pointer',outline:'none',boxShadow:'0 4px 20px rgba(227,27,35,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
          <CheckCircle2 size={18}/> Salvar Metas
        </motion.button>
      </div>
    </PageShell>
  );

  // ── HISTÓRICO ─────────────────────────────────────────────
  if(view==='historico') return (
    <PageShell>
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
        <motion.button whileTap={{scale:.95}} onClick={()=>setView('home')}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .8rem',color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.35rem'}}>
          <ArrowLeft size={14}/> Voltar
        </motion.button>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',textTransform:'uppercase',color:'#f0f0f2'}}>Histórico</div>
      </motion.div>

      {historico.length===0 ? (
        <Card style={{background:'#1e1e24',border:'1px dashed #2e2e38',borderRadius:14}}>
          <CardContent style={{padding:'3rem 1rem',textAlign:'center'}}>
            <motion.div animate={{y:[0,-6,0]}} transition={{duration:2,repeat:Infinity}} style={{marginBottom:'.75rem'}}>
              <History size={44} color="#484858" style={{margin:'0 auto'}}/>
            </motion.div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',color:'#484858',textTransform:'uppercase'}}>Nenhum registro ainda</div>
            <div style={{fontSize:'.8rem',color:'#484858',marginTop:'.4rem'}}>Salve o dia atual para ver o histórico</div>
          </CardContent>
        </Card>
      ) : (
        <div style={{display:'grid',gap:'.6rem'}}>
          {historico.map((d,i)=>{
            const t=calcMacros(d.refeicoes.flatMap(r=>r.itens));
            const ok=t.cal<=d.metaCal;
            return (
              <motion.div key={d.data} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}>
                <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:12}}>
                  <CardContent style={{padding:'1rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.6rem'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{fmtData(d.data)}</div>
                      <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:ok?'#22c55e':'#e31b23'}}>{t.cal} kcal</div>
                        <Badge style={{background:ok?'rgba(34,197,94,.12)':'rgba(227,27,35,.12)',color:ok?'#4ade80':'#e31b23',border:`1px solid ${ok?'rgba(34,197,94,.3)':'rgba(227,27,35,.3)'}`,fontSize:'.5rem'}}>
                          {ok?'Na meta':'Acima'}
                        </Badge>
                      </div>
                    </div>
                    <div style={{background:'rgba(255,255,255,.05)',borderRadius:3,height:3,marginBottom:'.5rem',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:3,background:ok?'#22c55e':'#e31b23',width:`${Math.min(100,Math.round(t.cal/d.metaCal*100))}%`}}/>
                    </div>
                    <div style={{display:'flex',gap:'.85rem',alignItems:'center'}}>
                      {[['P',t.prot+'g','#60a5fa'],['C',t.carb+'g','#34d399'],['G',t.gord+'g','#f472b6']].map(([l,v,c])=>(
                        <div key={l} style={{fontSize:'.72rem',color:'#7a7a8a'}}>
                          <span style={{color:c,fontWeight:700}}>{l}</span> {v}
                        </div>
                      ))}
                      <div style={{fontSize:'.72rem',color:'#7a7a8a',marginLeft:'auto',display:'flex',alignItems:'center',gap:'.2rem'}}>
                        <Droplets size={11}/>{d.agua}/{META_AGUA}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
        {modalRef!==null && <ModalBusca/>}
        {showScanner && scanRefIdx!==null && (
          <BarcodeScanner
            onResult={(r)=>handleScanResult(r, scanRefIdx)}
            onClose={()=>{setShowScanner(false);setScanRefIdx(null);}}
          />
        )}
      </AnimatePresence>

      <PageShell>
        <AnimatePresence>
          {toast && (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{position:'fixed',top:76,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1.1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'.4rem'}}>
              <CheckCircle2 size={14}/>{toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
          style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
              DARK<span style={{color:'#22c55e'}}>DIET</span>
            </div>
            <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px',display:'flex',alignItems:'center',gap:'.3rem'}}>
              <ForkKnife size={11} color="#7a7a8a" weight="fill"/> {fmtData(hoje())}
              {saving && <span style={{color:'#484858'}}> · salvando...</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:'.4rem'}}>
            <motion.button whileTap={{scale:.95}} onClick={()=>setView('metas')}
              style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .7rem',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.75rem',fontWeight:700}}>
              <Settings size={14}/> Metas
            </motion.button>
            <motion.button whileTap={{scale:.95}} onClick={()=>setView('historico')}
              style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,padding:'.4rem .7rem',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',gap:'.3rem',fontSize:'.75rem',fontWeight:700}}>
              <History size={14}/>
            </motion.button>
          </div>
        </motion.div>

        {/* Resumo do dia */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.08}}>
          <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:16,marginBottom:'.75rem',overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 0% 0%,rgba(34,197,94,.08),transparent 60%)',pointerEvents:'none'}}/>
            <CardContent style={{padding:'1rem',position:'relative'}}>
              {/* Calorias */}
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:'.75rem'}}>
                <div>
                  <div style={{display:'flex',alignItems:'baseline',gap:'.35rem'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'3rem',color:totais.cal>dia.metaCal?'#e31b23':'#f0f0f2',lineHeight:1}}>{totais.cal}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'1rem',color:'#484858'}}>/ {dia.metaCal} kcal</div>
                  </div>
                  <div style={{fontSize:'.55rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <Flame size={11} color={totais.cal>dia.metaCal?'#e31b23':'#7a7a8a'}/> calorias hoje
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',color:totais.cal>dia.metaCal?'#e31b23':'#22c55e',lineHeight:1}}>{pctCal}%</div>
                  <div style={{fontSize:'.55rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.06em'}}>da meta</div>
                </div>
              </div>

              {/* Barra caloria */}
              <div style={{background:'rgba(255,255,255,.06)',borderRadius:4,height:6,marginBottom:'1rem',overflow:'hidden'}}>
                <motion.div animate={{width:`${pctCal}%`}} transition={{duration:.5,ease:'easeOut'}}
                  style={{height:'100%',borderRadius:4,background:totais.cal>dia.metaCal?'#e31b23':'#22c55e',boxShadow:`0 0 8px ${totais.cal>dia.metaCal?'rgba(227,27,35,.5)':'rgba(34,197,94,.5)'}`}}/>
              </div>

              <Separator style={{background:'rgba(255,255,255,.05)',marginBottom:'.85rem'}}/>

              {/* Macros */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem'}}>
                {[
                  {val:totais.prot, meta:dia.metaProt, lbl:'Proteína', unit:'g', cor:'#60a5fa', pct:pctProt},
                  {val:totais.carb, meta:0, lbl:'Carboidrato', unit:'g', cor:'#34d399', pct:0},
                  {val:totais.gord, meta:0, lbl:'Gordura',     unit:'g', cor:'#f472b6', pct:0},
                ].map((m,i)=>(
                  <div key={i} style={{background:'rgba(0,0,0,.2)',borderRadius:10,padding:'.6rem .5rem',textAlign:'center'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:m.cor,lineHeight:1}}>{m.val}<span style={{fontSize:'.65rem',color:'#484858'}}>{m.unit}</span></div>
                    {m.meta>0 && <div style={{background:'rgba(255,255,255,.06)',borderRadius:2,height:3,margin:'.3rem 0 .2rem',overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:m.cor,width:`${Math.min(100,m.pct)}%`}}/></div>}
                    <div style={{fontSize:'.5rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.lbl}{m.meta>0?` · ${m.pct}%`:''}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Água */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.14}}>
          <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14,marginBottom:'.75rem'}}>
            <CardContent style={{padding:'.85rem'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <Droplets size={18} color="#38bdf8"/>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2',lineHeight:1}}>Hidratação</div>
                    <div style={{fontSize:'.6rem',color:'#7a7a8a',marginTop:'1px'}}>{dia.agua} de {META_AGUA} copos (250ml)</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <motion.button whileTap={{scale:.9}} onClick={()=>setDia(d=>({...d,agua:Math.max(0,d.agua-1)}))}
                    style={{width:34,height:34,borderRadius:9,background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',color:'#7a7a8a',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Minus size={15}/>
                  </motion.button>
                  <div style={{display:'flex',gap:'3px'}}>
                    {Array.from({length:META_AGUA},(_,i)=>(
                      <motion.div key={i} whileTap={{scale:.8}}
                        onClick={()=>setDia(d=>({...d,agua:i+1}))}
                        style={{width:14,height:22,borderRadius:3,background:i<dia.agua?'#38bdf8':'rgba(255,255,255,.06)',border:`1px solid ${i<dia.agua?'rgba(56,189,248,.4)':'#2e2e38'}`,cursor:'pointer',transition:'all .15s'}}/>
                    ))}
                  </div>
                  <motion.button whileTap={{scale:.9}} onClick={()=>setDia(d=>({...d,agua:Math.min(META_AGUA,d.agua+1)}))}
                    style={{width:34,height:34,borderRadius:9,background:'rgba(56,189,248,.1)',border:'1px solid rgba(56,189,248,.3)',color:'#38bdf8',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Plus size={15}/>
                  </motion.button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Refeições */}
        <div style={{display:'grid',gap:'.55rem',marginBottom:'.85rem'}}>
          {dia.refeicoes.map((ref,ri)=>{
            const macRef = calcMacros(ref.itens);
            return (
              <motion.div key={ri} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.18+ri*.04}}>
                <Card style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:14}}>
                  <CardContent style={{padding:'0'}}>
                    {/* Header refeição */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.75rem 1rem',borderBottom:ref.itens.length>0?'1px solid rgba(255,255,255,.05)':'none'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                        <ForkKnife size={14} color="#7a7a8a" weight="fill"/>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.95rem',textTransform:'uppercase',color:'#f0f0f2',letterSpacing:'.03em'}}>{ref.nome}</div>
                        {ref.itens.length>0 && <Badge variant="outline" style={{borderColor:'rgba(34,197,94,.2)',color:'#4ade80',fontSize:'.5rem'}}>{macRef.cal} kcal</Badge>}
                      </div>
                      <div style={{display:'flex',gap:'.3rem'}}>
                        <motion.button whileTap={{scale:.9}} onClick={()=>{setScanRefIdx(ri);setShowScanner(true);}}
                          style={{width:30,height:30,borderRadius:8,background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.15)',color:'#4ade80',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}
                          title="Scanner / OpenFoodFacts">
                          <Camera size={14}/>
                        </motion.button>
                        <motion.button whileTap={{scale:.9}} onClick={()=>setModalRef(ri)}
                          style={{width:30,height:30,borderRadius:8,background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.2)',color:'#4ade80',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}
                          title="Buscar na lista">
                          <Plus size={15}/>
                        </motion.button>
                      </div>
                    </div>

                    {/* Itens */}
                    {ref.itens.map((it,ii)=>(
                      <motion.div key={it.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:ii*.03}}
                        style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.55rem 1rem',borderBottom:'1px solid rgba(255,255,255,.03)'}}>
                        <div style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <AliIcon icon={it.icon} size={16} color="#7a7a8a"/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'.82rem',color:'#f0f0f2',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.nome}</div>
                          <div style={{fontSize:'.6rem',color:'#7a7a8a',marginTop:'1px'}}>
                            {it.porcao}g · {Math.round(it.cal*it.porcao/100)}kcal · P:{Math.round(it.prot*it.porcao/100)}g
                          </div>
                        </div>
                        <motion.button whileTap={{scale:.9}} onClick={()=>removeItem(ri,it.id)}
                          style={{background:'rgba(227,27,35,.07)',border:'1px solid rgba(227,27,35,.15)',borderRadius:6,padding:'4px 7px',color:'#e31b23',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',flexShrink:0}}>
                          <Trash2 size={12}/>
                        </motion.button>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Salvar dia */}
        <motion.button whileTap={{scale:.97}} onClick={salvarDia} disabled={saving}
          style={{width:'100%',background:saving?'rgba(34,197,94,.3)':'linear-gradient(135deg,#22c55e,#16a34a)',border:'none',borderRadius:14,padding:'15px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:saving?'not-allowed':'pointer',outline:'none',boxShadow:saving?'none':'0 4px 20px rgba(34,197,94,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
          <CheckCircle2 size={18}/> Salvar Dia
        </motion.button>
      </PageShell>
    </>
  );
}
