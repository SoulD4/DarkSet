'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Share2, Loader2, Dumbbell, Layers, Weight, Timer } from 'lucide-react';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import { useToast, ToastViewport } from '@/components/core/Toast';

type SetLog = { w: string; r: string };
type Entry  = { name: string; exId?: string; sets: SetLog[] };
type Session = { planName?: string; day?: string; entries: Entry[]; duration?: number };

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

/* ── Paleta do canvas — Graphite + Volt ────────────────────────────
 * A imagem gerada é um asset exportado (fora do DOM), portanto usa
 * os hex canônicos dos tokens diretamente.
 * Exceção de marca: o wordmark DARKSET mantém o SET em #E31B23. */
const CV = {
  bg:       '#0C0E11',
  surface:  '#14171C',
  surface2: '#10141A',
  ink1:     '#EEF2F8',
  ink2:     '#97A3B5',
  ink3:     '#5E6878',
  volt:     '#C8F542',
  red:      '#E31B23',
};
const volt = (a: number) => `rgba(200,245,66,${a})`;
const ink  = (a: number) => `rgba(238,242,248,${a})`;

/** Resolve a família real registrada pelo next/font a partir da CSS var. */
function resolveFontVar(varName: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

async function buildCanvas(session: Session, canvas: HTMLCanvasElement) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const LOGO_FONT    = resolveFontVar('--font-logo', '"Barlow Condensed","Arial Black",sans-serif');
  const DISPLAY_FONT = resolveFontVar('--font-display', '"Space Grotesk",Arial,sans-serif');
  try { await document.fonts.ready; } catch { /* segue com fallback */ }

  const entries   = session.entries || [];
  const totalSets = entries.reduce((a,en)=>a+(en.sets||[]).filter(s=>s.r).length, 0);
  const totalVol  = entries.reduce((a,en)=>a+(en.sets||[]).reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0), 0);

  // ── FUNDO GRAFITE ────────────────────────────────────────────────
  ctx.fillStyle = CV.bg;
  ctx.fillRect(0, 0, W, H);

  // Textura ruído sutil
  for(let i = 0; i < 14000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random()*.028})`;
    ctx.fillRect(Math.random()*W, Math.random()*H, 1, 1);
  }

  // Vinheta nas bordas
  const vignette = ctx.createRadialGradient(W/2, H/2, H*.2, W/2, H/2, H*.85);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Linhas diagonais bem sutis
  ctx.save();
  ctx.strokeStyle = 'rgba(151,163,181,.03)';
  ctx.lineWidth = 1;
  for(let i = -H; i < W+H; i += 60) {
    ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+H,H); ctx.stroke();
  }
  ctx.restore();

  // ── BARRA TOPO VOLT ──────────────────────────────────────────────
  const topBar = ctx.createLinearGradient(0,0,W,0);
  topBar.addColorStop(0,'transparent');
  topBar.addColorStop(0.15,volt(.55));
  topBar.addColorStop(0.5,CV.volt);
  topBar.addColorStop(0.85,volt(.55));
  topBar.addColorStop(1,'transparent');
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, W, 8);

  // Glow curto sob a barra
  const topGlow = ctx.createLinearGradient(0, 8, 0, 88);
  topGlow.addColorStop(0, volt(.16));
  topGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 8, W, 80);

  // ── WORDMARK (exceção de marca: SET em vermelho) ────────────────
  ctx.textAlign = 'center';
  ctx.font = `900 140px ${LOGO_FONT}`;
  ctx.fillStyle = CV.ink1;
  ctx.fillText('DARK', W/2 - 140, 190);
  ctx.save();
  ctx.shadowColor = 'rgba(227,27,35,.45)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = CV.red;
  ctx.fillText('SET', W/2 + 132, 190);
  ctx.restore();

  // Linha fina volt sob o wordmark
  const logoLine = ctx.createLinearGradient(0,0,W,0);
  logoLine.addColorStop(0,'transparent');
  logoLine.addColorStop(.35,volt(0));
  logoLine.addColorStop(.5,volt(.55));
  logoLine.addColorStop(.65,volt(0));
  logoLine.addColorStop(1,'transparent');
  ctx.fillStyle = logoLine;
  ctx.fillRect(0, 200, W, 2);

  // Tagline
  ctx.font = `600 26px ${DISPLAY_FONT}`;
  ctx.fillStyle = ink(.3);
  ctx.letterSpacing = '7px';
  ctx.fillText('SEU TREINO · SUA EVOLUÇÃO', W/2, 246);
  ctx.letterSpacing = '0px';

  // Data
  const hoje = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  ctx.font = `600 28px ${DISPLAY_FONT}`;
  ctx.fillStyle = ink(.38);
  ctx.fillText(hoje.toUpperCase(), W/2, 288);

  // ── NOME DA FICHA ────────────────────────────────────────────────
  const planName = (session.planName||'TREINO LIVRE').toUpperCase();
  const truncPlan = planName.length > 22 ? planName.slice(0,22)+'…' : planName;

  ctx.save();
  ctx.beginPath();
  const planBg = ctx.createLinearGradient(60,318,W-60,408);
  planBg.addColorStop(0, volt(.12));
  planBg.addColorStop(1, volt(.04));
  if(ctx.roundRect) ctx.roundRect(60, 318, W-120, 90, 14);
  else ctx.rect(60, 318, W-120, 90);
  ctx.fillStyle = planBg;
  ctx.fill();
  ctx.strokeStyle = volt(.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.font = `700 58px ${DISPLAY_FONT}`;
  ctx.fillStyle = CV.ink1;
  let plan = truncPlan;
  while(ctx.measureText(plan).width > W-180 && plan.length > 4) plan = plan.slice(0,-2)+'…';
  ctx.fillText(plan, W/2, 382);

  // ── SEPARADOR ────────────────────────────────────────────────────
  const sepY = 442;
  const lG = ctx.createLinearGradient(80,0,W/2-30,0);
  lG.addColorStop(0,'transparent'); lG.addColorStop(1,volt(.45));
  ctx.strokeStyle = lG; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80,sepY); ctx.lineTo(W/2-24,sepY); ctx.stroke();
  const rG = ctx.createLinearGradient(W/2+30,0,W-80,0);
  rG.addColorStop(0,volt(.45)); rG.addColorStop(1,'transparent');
  ctx.strokeStyle = rG;
  ctx.beginPath(); ctx.moveTo(W/2+24,sepY); ctx.lineTo(W-80,sepY); ctx.stroke();
  ctx.save();
  ctx.fillStyle = CV.volt;
  ctx.translate(W/2,sepY); ctx.rotate(Math.PI/4);
  ctx.fillRect(-7,-7,14,14);
  ctx.restore();

  // ── LISTA EXERCÍCIOS — zona fixa 468→1382 ───────────────────────
  const listTop = 468, listBot = 1382;
  const listH   = listBot - listTop;
  const maxEx   = Math.min(entries.length, 12);
  const rowH    = maxEx > 0 ? Math.floor(listH / maxEx) : listH;

  entries.slice(0, maxEx).forEach((en, i) => {
    const ry    = listTop + i * rowH;
    const valid = (en.sets||[]).filter(s=>s.r);
    const bestW = valid.length ? Math.max(0,...valid.map(s=>parseFloat(s.w)||0)) : 0;
    const vol   = valid.reduce((a,s)=>a+(parseFloat(s.w)||0)*(parseFloat(s.r)||0), 0);
    const totalReps = valid.reduce((a,s)=>a+(parseInt(s.r)||0), 0);
    const midY  = ry + rowH * .52;
    const fs    = Math.min(42, Math.max(26, Math.round(rowH * .31)));

    // Superfície da linha (grafite, alternada)
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = i % 2 === 0 ? CV.surface : 'rgba(20,23,28,.55)';
    if(ctx.roundRect) ctx.roundRect(60, ry+5, W-120, rowH-10, 10);
    else ctx.rect(60, ry+5, W-120, rowH-10);
    ctx.fill();

    // Borda esquerda volt fina
    ctx.fillStyle = volt(.75);
    ctx.fillRect(60, ry+5, 3, rowH-10);
    ctx.restore();

    // Número
    ctx.font = `700 ${fs}px ${DISPLAY_FONT}`;
    ctx.fillStyle = volt(.85);
    ctx.textAlign = 'left';
    ctx.fillText(`${i+1}`, 88, midY);

    // Nome
    ctx.font = `600 ${fs}px ${DISPLAY_FONT}`;
    ctx.fillStyle = ink(.88);
    let nm = en.name||'';
    while(ctx.measureText(nm).width > W-540 && nm.length>3) nm = nm.slice(0,-1);
    if(nm !== en.name) nm += '…';
    ctx.fillText(nm, 148, midY);

    // Stats — direita
    ctx.textAlign = 'right';
    if(bestW > 0 || valid.length > 0) {
      ctx.font = `700 ${Math.round(fs*.78)}px ${DISPLAY_FONT}`;
      ctx.fillStyle = CV.volt;
      const stat = bestW>0
        ? `${bestW}kg · ${valid.length}s · ${Math.round(vol)}kg`
        : `${valid.length} séries`;
      const subY = rowH > 80 ? midY - fs*.25 : midY;
      ctx.fillText(stat, W-82, subY);

      // Reps totais na segunda linha
      if(rowH > 85 && totalReps > 0) {
        ctx.font = `400 ${Math.round(fs*.5)}px ${DISPLAY_FONT}`;
        ctx.fillStyle = ink(.32);
        ctx.fillText(`${totalReps} reps totais`, W-82, midY + fs*.52);
      }
    }
  });

  if(entries.length > maxEx) {
    ctx.font = `500 28px ${DISPLAY_FONT}`;
    ctx.fillStyle = ink(.28);
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${entries.length-maxEx} exercícios`, W/2, listTop + maxEx*rowH + 32);
  }

  // ── SEPARADOR ANTES DOS STATS ────────────────────────────────────
  const statsTop = 1400;
  ctx.save();
  const divG = ctx.createLinearGradient(80,0,W-80,0);
  divG.addColorStop(0,'transparent');
  divG.addColorStop(.25,volt(.4));
  divG.addColorStop(.75,volt(.4));
  divG.addColorStop(1,'transparent');
  ctx.strokeStyle = divG; ctx.lineWidth = 1; ctx.setLineDash([5,5]);
  ctx.beginPath(); ctx.moveTo(80,statsTop-18); ctx.lineTo(W-80,statsTop-18); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── GLOW VOLT INFERIOR — controlado ─────────────────────────────
  const botGlow = ctx.createRadialGradient(W/2, H, 0, W/2, H, 560);
  botGlow.addColorStop(0, volt(.14));
  botGlow.addColorStop(.5, volt(.04));
  botGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = botGlow;
  ctx.fillRect(0, H-560, W, 560);

  // ── BLOCO STATS ──────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  const statsBg = ctx.createLinearGradient(60, statsTop, W-60, statsTop+220);
  statsBg.addColorStop(0, CV.surface);
  statsBg.addColorStop(1, CV.surface2);
  if(ctx.roundRect) ctx.roundRect(60, statsTop, W-120, 220, 16);
  else ctx.rect(60, statsTop, W-120, 220);
  ctx.fillStyle = statsBg;
  ctx.fill();
  ctx.strokeStyle = volt(.25);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const statsArr: {l:string;v:string}[] = [
    {l:'EXERCÍCIOS', v:String(entries.length)},
    {l:'SÉRIES',     v:String(totalSets)},
    {l:'VOLUME',     v:totalVol>0?Math.round(totalVol)+'kg':'—'},
  ];
  if(session.duration && session.duration>0)
    statsArr.push({l:'DURAÇÃO', v:fmtTime(session.duration)});

  const cols = statsArr.length;
  statsArr.forEach((st, i) => {
    const x = 60 + (W-120)/cols*i + (W-120)/cols/2;
    ctx.textAlign = 'center';

    // Valor
    ctx.save();
    ctx.shadowColor = volt(.35);
    ctx.shadowBlur = 14;
    ctx.font = `700 ${cols>3?62:70}px ${DISPLAY_FONT}`;
    ctx.fillStyle = CV.volt;
    ctx.fillText(st.v, x, statsTop+128);
    ctx.restore();

    // Label
    ctx.font = `600 22px ${DISPLAY_FONT}`;
    ctx.fillStyle = CV.ink3;
    ctx.letterSpacing = '3px';
    ctx.fillText(st.l, x, statsTop+168);
    ctx.letterSpacing = '0px';

    // Divisor vertical
    if(i < cols-1) {
      const dvx = 60 + (W-120)/cols*(i+1);
      ctx.strokeStyle = 'rgba(151,163,181,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dvx, statsTop+28); ctx.lineTo(dvx, statsTop+192); ctx.stroke();
    }
  });

  // ── BARRA INFERIOR + FOOTER ─────────────────────────────────────
  ctx.fillStyle = topBar;
  ctx.fillRect(0, H-8, W, 8);

  ctx.font = `500 24px ${DISPLAY_FONT}`;
  ctx.fillStyle = ink(.22);
  ctx.textAlign = 'center';
  ctx.fillText('#DarkSet · darksetapp.com', W/2, H-26);
}

interface Props {
  session:{planName?:string;day?:string;entries:{name:string;sets:{w:string;r:string}[]}[];duration?:number};
  onClose:()=>void;
}

export default function ShareWorkoutModal({session,onClose}:Props) {
  const canvasRef  = useRef<HTMLCanvasElement|null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [busy,setBusy]   = useState(false);
  const [ready,setReady] = useState(false);
  const { toast, show } = useToast();

  useEffect(()=>{
    const full = document.createElement('canvas');
    buildCanvas(session, full).then(()=>{
      canvasRef.current = full;
      const prev = previewRef.current;
      if(!prev) return;
      const SCALE = 390/1080;
      prev.width  = 390;
      prev.height = Math.round(1920*SCALE);
      prev.getContext('2d')!.drawImage(full, 0, 0, 390, Math.round(1920*SCALE));
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await new Promise<Blob>(res=>canvasRef.current!.toBlob(b=>res(b!),'image/png',.93));
      const file = new File([blob],'darkset-treino.png',{type:'image/png'});
      if(navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({title:'Meu treino — DarkSet',text:`${session.entries.length} exercícios 💪 #DarkSet`,files:[file]});
        show('Compartilhado!');
        setTimeout(onClose,1200);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download='darkset-treino.png'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url),5000);
        show('Imagem salva!');
      }
    } catch(e:any){ if(e?.name!=='AbortError') show('Erro ao gerar imagem','danger'); }
    setBusy(false);
  };

  const entries   = session.entries||[];
  const totalSets = entries.reduce((a,en)=>a+(en.sets||[]).filter(s=>s.r).length,0);
  const totalVol  = entries.reduce((a,en)=>a+(en.sets||[]).reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0),0);

  const tiles: {Icon: typeof Dumbbell; val: string; lbl: string}[] = [
    { Icon: Dumbbell, val: String(entries.length),                              lbl: 'Exerc.' },
    { Icon: Layers,   val: String(totalSets),                                   lbl: 'Séries' },
    { Icon: Weight,   val: totalVol>0 ? Math.round(totalVol)+'kg' : '—',        lbl: 'Volume' },
    { Icon: Timer,    val: session.duration ? fmtTime(session.duration) : '—',  lbl: 'Tempo'  },
  ];

  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-xl flex items-end justify-center"
      style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    >
      <motion.div
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:300,damping:32}}
        className="w-[min(480px,100vw)] max-h-[92vh] bg-surface-1 border-t border-line rounded-t-3xl overflow-hidden flex flex-col shadow-float"
      >
        {/* Alça do sheet */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-surface-3"/>
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div>
            <div className="font-display font-bold text-[1.35rem] leading-tight tracking-tight text-ink-1">
              Compartilhar treino
            </div>
            <div className="text-[0.72rem] text-ink-3 mt-0.5">Imagem 9:16 pronta para Stories</div>
          </div>
          <motion.button
            whileTap={{scale:.9}} onClick={onClose} aria-label="Fechar"
            className="w-8 h-8 rounded-lg bg-surface-2 border border-line text-ink-3 flex items-center justify-center hover:bg-surface-3 transition-colors"
          >
            <X size={16}/>
          </motion.button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5">

          {/* Preview do card gerado */}
          <motion.div
            initial={{opacity:0,scale:.95}} animate={{opacity:ready?1:0,scale:ready?1:.95}} transition={{duration:.35}}
            className="relative rounded-2xl overflow-hidden mb-4 border border-line shadow-float"
          >
            <canvas ref={previewRef} className="w-full h-auto block"/>
            {!ready && (
              <div className="absolute inset-0 min-h-[260px] bg-surface-2 flex flex-col items-center justify-center gap-3">
                <Spinner size={32}/>
                <div className="text-[0.72rem] text-ink-3">Gerando imagem…</div>
              </div>
            )}
            <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md border border-line rounded-md px-2 py-[3px] text-[0.58rem] font-bold tracking-wider text-ink-3">
              9:16 · STORIES
            </div>
          </motion.div>

          {/* Resumo em stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {tiles.map(({Icon,val,lbl})=>(
              <div key={lbl} className="card-2 px-1.5 py-2.5 text-center">
                <div className="flex justify-center mb-1 text-ink-3"><Icon size={14}/></div>
                <div className="font-display font-bold text-[1.02rem] leading-none text-accent tnum">{val}</div>
                <div className="text-[0.54rem] text-ink-3 uppercase tracking-wider mt-1">{lbl}</div>
              </div>
            ))}
          </div>

          {/* Lista de exercícios */}
          <div className="card-2 px-3 py-2.5 mb-4 grid gap-1.5">
            <div className="eyebrow mb-0.5">
              {entries.length} exercício(s) · {session.planName||'Treino Livre'}
            </div>
            {entries.slice(0,5).map((en,i)=>{
              const valid=(en.sets||[]).filter(s=>s.r);
              const bestW=valid.length?Math.max(0,...valid.map(s=>parseFloat(s.w)||0)):0;
              return (
                <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*.04}}
                  className="flex items-center gap-2">
                  <span className="w-4 text-right shrink-0 font-display font-bold text-[0.65rem] text-accent tnum">{i+1}</span>
                  <span className="flex-1 text-[0.8rem] text-ink-2 truncate">{en.name}</span>
                  <span className="shrink-0 text-[0.65rem] font-semibold text-ink-3 tnum">{bestW>0?`${bestW}kg · `:''}{valid.length}s</span>
                </motion.div>
              );
            })}
            {entries.length>5 && (
              <div className="text-[0.7rem] text-ink-3 text-center pt-0.5">+{entries.length-5} mais</div>
            )}
          </div>

          {/* Ações */}
          <div className="grid gap-2">
            <Button variant="primary" size="lg" full onClick={handleShare} disabled={busy||!ready}>
              {busy ? <Loader2 size={18} className="animate-spin"/> : <Share2 size={18}/>}
              {busy ? 'Gerando…' : 'Compartilhar nos Stories'}
            </Button>
            <Button variant="ghost" size="md" full onClick={onClose}>
              Agora não
            </Button>
          </div>
        </div>
      </motion.div>

      <ToastViewport toast={toast}/>
    </motion.div>
  );
}
