'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SetLog = { w: string; r: string };
type Entry  = { name: string; exId?: string; sets: SetLog[] };
type Session = { planName?: string; day?: string; entries: Entry[]; duration?: number };

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

async function loadImage(src: string): Promise<HTMLImageElement|null> {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function buildCanvas(session: Session, canvas: HTMLCanvasElement) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── FUNDO base ───────────────────────────────────────────────────
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, W, H);

  // Ruído de textura (simulado com pontos aleatórios)
  ctx.save();
  for(let i = 0; i < 18000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const a = Math.random() * 0.045;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  // Gradiente diagonal escuro
  const diagGrad = ctx.createLinearGradient(0, 0, W, H);
  diagGrad.addColorStop(0,   'rgba(30,10,10,.85)');
  diagGrad.addColorStop(0.5, 'rgba(7,7,10,.4)');
  diagGrad.addColorStop(1,   'rgba(10,5,15,.85)');
  ctx.fillStyle = diagGrad;
  ctx.fillRect(0, 0, W, H);

  // ── LINHAS diagonais estilo carbono ─────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.025)';
  ctx.lineWidth = 1;
  for(let i = -H; i < W + H; i += 48) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
  }
  ctx.restore();

  // ── GLOW vermelho superior grande ───────────────────────────────
  const glowTop = ctx.createRadialGradient(W/2, -80, 0, W/2, -80, 820);
  glowTop.addColorStop(0,   'rgba(227,27,35,.55)');
  glowTop.addColorStop(0.5, 'rgba(180,10,18,.18)');
  glowTop.addColorStop(1,   'transparent');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, 900);

  // ── GLOW vermelho inferior ───────────────────────────────────────
  const glowBot = ctx.createRadialGradient(W/2, H + 100, 0, W/2, H + 100, 700);
  glowBot.addColorStop(0,   'rgba(227,27,35,.4)');
  glowBot.addColorStop(1,   'transparent');
  ctx.fillStyle = glowBot;
  ctx.fillRect(0, H - 600, W, 600);

  // ── BARRA vermelha topo (mais grossa e brilhante) ────────────────
  const barGrad = ctx.createLinearGradient(0, 0, W, 0);
  barGrad.addColorStop(0,    'transparent');
  barGrad.addColorStop(0.15, '#e31b23');
  barGrad.addColorStop(0.5,  '#ff3a42');
  barGrad.addColorStop(0.85, '#e31b23');
  barGrad.addColorStop(1,    'transparent');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, W, 8);
  // brilho abaixo da barra
  const barGlow = ctx.createLinearGradient(0, 8, 0, 60);
  barGlow.addColorStop(0, 'rgba(227,27,35,.35)');
  barGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = barGlow;
  ctx.fillRect(0, 8, W, 52);

  // ── ÍCONE DS (carregado da pasta public) ─────────────────────────
  const iconImg = await loadImage('/icon-512.png');
  if(iconImg) {
    const IS = 160;
    const ix = W/2 - IS/2, iy = 68;
    // sombra/glow atrás do ícone
    ctx.save();
    ctx.shadowColor = 'rgba(227,27,35,.7)';
    ctx.shadowBlur  = 60;
    ctx.drawImage(iconImg, ix, iy, IS, IS);
    ctx.restore();
    ctx.drawImage(iconImg, ix, iy, IS, IS);
  }

  // ── LOGO texto ───────────────────────────────────────────────────
  const logoY = iconImg ? 284 : 180;
  ctx.textAlign = 'center';

  // Sombra do logo
  ctx.save();
  ctx.shadowColor = 'rgba(227,27,35,.8)';
  ctx.shadowBlur  = 40;
  ctx.font = '900 134px "Barlow Condensed", "Arial Black", sans-serif';
  ctx.fillStyle = '#f0f0f2';
  ctx.fillText('DARK', W/2 - 130, logoY);
  ctx.fillStyle = '#e31b23';
  ctx.fillText('SET', W/2 + 126, logoY);
  ctx.restore();

  // Linha brilhante sob o logo
  const underline = ctx.createLinearGradient(200, 0, W-200, 0);
  underline.addColorStop(0,   'transparent');
  underline.addColorStop(0.3, 'rgba(227,27,35,.6)');
  underline.addColorStop(0.7, 'rgba(227,27,35,.6)');
  underline.addColorStop(1,   'transparent');
  ctx.fillStyle = underline;
  ctx.fillRect(200, logoY + 10, W - 400, 3);

  // Tagline
  ctx.font = '600 30px "Barlow Condensed", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.letterSpacing = '6px';
  ctx.fillText('SEU TREINO · SUA EVOLUÇÃO', W/2, logoY + 54);
  ctx.letterSpacing = '0px';

  // Data
  const hoje = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long'});
  ctx.font = '700 34px "Barlow Condensed", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.fillText(hoje.toUpperCase(), W/2, logoY + 100);

  // ── NOME DA FICHA — caixa destacada ─────────────────────────────
  const planY = logoY + 160;
  const planName = (session.planName || 'TREINO LIVRE').toUpperCase();
  const truncPlan = planName.length > 22 ? planName.slice(0, 22) + '…' : planName;

  // Fundo da caixa do plano
  ctx.save();
  const planBg = ctx.createLinearGradient(60, planY - 60, W - 60, planY + 10);
  planBg.addColorStop(0, 'rgba(227,27,35,.18)');
  planBg.addColorStop(1, 'rgba(120,10,15,.08)');
  if(ctx.roundRect) ctx.roundRect(60, planY - 68, W - 120, 90, 14);
  else ctx.rect(60, planY - 68, W - 120, 90);
  ctx.fillStyle = planBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,27,35,.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(227,27,35,.5)';
  ctx.shadowBlur = 20;
  ctx.font = '900 86px "Barlow Condensed", "Arial Black", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(truncPlan, W/2, planY);
  ctx.restore();

  // ── SEPARADOR estilizado ─────────────────────────────────────────
  const sepY = planY + 52;
  ctx.save();
  // losango central
  ctx.fillStyle = '#e31b23';
  ctx.save();
  ctx.translate(W/2, sepY + 8);
  ctx.rotate(Math.PI/4);
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
  // linhas laterais
  const sepL = ctx.createLinearGradient(80, 0, W/2 - 28, 0);
  sepL.addColorStop(0, 'transparent');
  sepL.addColorStop(1, 'rgba(227,27,35,.5)');
  ctx.strokeStyle = sepL; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(80, sepY + 8); ctx.lineTo(W/2 - 22, sepY + 8); ctx.stroke();
  const sepR = ctx.createLinearGradient(W/2 + 28, 0, W - 80, 0);
  sepR.addColorStop(0, 'rgba(227,27,35,.5)');
  sepR.addColorStop(1, 'transparent');
  ctx.strokeStyle = sepR;
  ctx.beginPath(); ctx.moveTo(W/2 + 22, sepY + 8); ctx.lineTo(W - 80, sepY + 8); ctx.stroke();
  ctx.restore();

  // ── LISTA DE EXERCÍCIOS ──────────────────────────────────────────
  const entries = session.entries || [];
  const listStartY = sepY + 52;
  const maxEx = Math.min(entries.length, 10);
  const availH = H - listStartY - 440;
  const rowH = Math.min(128, availH / Math.max(maxEx, 1));

  entries.slice(0, maxEx).forEach((en, i) => {
    const ry = listStartY + i * rowH;
    const valid = (en.sets || []).filter(s => s.r);
    const bestW = valid.length ? Math.max(0, ...valid.map(s => parseFloat(s.w) || 0)) : 0;
    const vol   = valid.reduce((a, s) => a + (parseFloat(s.w)||0)*(parseFloat(s.r)||0), 0);

    // Fundo da linha — alternado com gradiente
    ctx.save();
    const rowBg = ctx.createLinearGradient(60, ry, W - 60, ry);
    if(i % 2 === 0) {
      rowBg.addColorStop(0, 'rgba(255,255,255,.07)');
      rowBg.addColorStop(0.5, 'rgba(255,255,255,.05)');
      rowBg.addColorStop(1, 'rgba(255,255,255,.02)');
    } else {
      rowBg.addColorStop(0, 'rgba(255,255,255,.03)');
      rowBg.addColorStop(1, 'rgba(255,255,255,.01)');
    }
    if(ctx.roundRect) ctx.roundRect(60, ry + 4, W - 120, rowH - 10, 10);
    else ctx.rect(60, ry + 4, W - 120, rowH - 10);
    ctx.fillStyle = rowBg;
    ctx.fill();
    // borda esquerda vermelha fina
    ctx.fillStyle = 'rgba(227,27,35,.5)';
    ctx.fillRect(60, ry + 4, 3, rowH - 10);
    ctx.restore();

    const midY = ry + rowH * .58;
    const fs = Math.round(rowH * .36);

    // Número
    ctx.font = `900 ${fs}px "Barlow Condensed", sans-serif`;
    ctx.fillStyle = 'rgba(227,27,35,.8)';
    ctx.textAlign = 'left';
    ctx.fillText(`${i+1}`, 84, midY);

    // Nome
    ctx.font = `700 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    ctx.fillStyle = '#eeeef5';
    let nm = en.name || '';
    const maxNmW = W - 460;
    while(ctx.measureText(nm).width > maxNmW && nm.length > 3) nm = nm.slice(0,-1);
    if(nm !== en.name) nm += '…';
    ctx.fillText(nm, 128, midY);

    // Stats direita
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(fs*.82)}px "Barlow Condensed", Arial, sans-serif`;
    ctx.fillStyle = 'rgba(227,27,35,.9)';
    const stat = bestW > 0
      ? `${bestW}kg · ${valid.length}s · ${Math.round(vol)}kg`
      : `${valid.length} séries`;
    ctx.fillText(stat, W - 84, midY);

    // Sub info (reps)
    if(rowH > 90) {
      const totalReps = valid.reduce((a,s)=>a+(parseInt(s.r)||0),0);
      ctx.font = `500 ${Math.round(fs*.58)}px Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.textAlign = 'right';
      ctx.fillText(`${totalReps} reps totais`, W - 84, midY + Math.round(fs*.72));
    }
  });

  if(entries.length > maxEx) {
    const moreY = listStartY + maxEx * rowH + 28;
    ctx.font = '600 30px "Barlow Condensed", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.textAlign = 'center';
    ctx.fillText(`▸  +${entries.length - maxEx} exercícios`, W/2, moreY);
  }

  // ── BLOCO DE STATS ───────────────────────────────────────────────
  const totalSets = entries.reduce((a,en)=>a+(en.sets||[]).filter(s=>s.r).length,0);
  const totalVol  = entries.reduce((a,en)=>a+(en.sets||[]).reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0),0);

  const statsY = H - 400;

  // Linha separadora acima dos stats
  ctx.save();
  const divL = ctx.createLinearGradient(80, 0, W-80, 0);
  divL.addColorStop(0, 'transparent');
  divL.addColorStop(0.2, 'rgba(227,27,35,.5)');
  divL.addColorStop(0.8, 'rgba(227,27,35,.5)');
  divL.addColorStop(1, 'transparent');
  ctx.strokeStyle = divL; ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(80, statsY - 24); ctx.lineTo(W-80, statsY - 24); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Fundo do bloco stats com gradiente
  ctx.save();
  const statsBg = ctx.createLinearGradient(60, statsY, W-60, statsY + 220);
  statsBg.addColorStop(0, 'rgba(227,27,35,.12)');
  statsBg.addColorStop(0.5, 'rgba(150,10,15,.06)');
  statsBg.addColorStop(1, 'rgba(227,27,35,.08)');
  if(ctx.roundRect) ctx.roundRect(60, statsY, W-120, 220, 16);
  else ctx.rect(60, statsY, W-120, 220);
  ctx.fillStyle = statsBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,27,35,.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const statsArr: {l:string;v:string}[] = [
    { l:'EXERCÍCIOS', v:String(entries.length) },
    { l:'SÉRIES',     v:String(totalSets) },
    { l:'VOLUME',     v: totalVol > 0 ? Math.round(totalVol)+'kg' : '—' },
  ];
  if(session.duration && session.duration > 0)
    statsArr.push({ l:'DURAÇÃO', v:fmtTime(session.duration) });

  statsArr.forEach((st, i) => {
    const cols = statsArr.length;
    const x = 60 + (W-120)/cols * i + (W-120)/cols/2;
    ctx.textAlign = 'center';

    // Valor grande
    ctx.save();
    ctx.shadowColor = 'rgba(227,27,35,.6)';
    ctx.shadowBlur  = 18;
    ctx.font = `900 ${cols > 3 ? 74 : 82}px "Barlow Condensed", "Arial Black", sans-serif`;
    ctx.fillStyle = '#e31b23';
    ctx.fillText(st.v, x, statsY + 128);
    ctx.restore();

    // Label
    ctx.font = '600 24px "Barlow Condensed", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillText(st.l, x, statsY + 170);

    // Divisor vertical entre colunas
    if(i < cols - 1) {
      const dvX = 60 + (W-120)/cols * (i+1);
      ctx.strokeStyle = 'rgba(227,27,35,.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dvX, statsY + 24);
      ctx.lineTo(dvX, statsY + 196);
      ctx.stroke();
    }
  });

  // ── BARRA VERMELHA INFERIOR ──────────────────────────────────────
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, H - 8, W, 8);
  const barGlowBot = ctx.createLinearGradient(0, H - 60, 0, H - 8);
  barGlowBot.addColorStop(0, 'transparent');
  barGlowBot.addColorStop(1, 'rgba(227,27,35,.3)');
  ctx.fillStyle = barGlowBot;
  ctx.fillRect(0, H - 60, W, 52);

  // ── RODAPÉ ───────────────────────────────────────────────────────
  ctx.font = '600 28px "Barlow Condensed", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.textAlign = 'center';
  ctx.fillText('#DarkSet · darksetapp.com', W/2, H - 28);
}

interface Props { session: { planName?:string; day?:string; entries:{name:string;sets:{w:string;r:string}[]}[]; duration?:number }; onClose: ()=>void; }

export default function ShareWorkoutModal({ session, onClose }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement|null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [busy,  setBusy]  = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2800); };

  useEffect(()=>{
    const full = document.createElement('canvas');
    buildCanvas(session, full).then(()=>{
      canvasRef.current = full;
      const prev = previewRef.current;
      if(!prev) return;
      const SCALE = 390/1080;
      prev.width  = 390;
      prev.height = Math.round(1920*SCALE);
      const pCtx = prev.getContext('2d')!;
      pCtx.drawImage(full, 0, 0, 390, Math.round(1920*SCALE));
      setReady(true);
    });
  },[]);

  const handleShare = async () => {
    setBusy(true);
    try {
      const full = canvasRef.current!;
      const blob = await new Promise<Blob>(res=>full.toBlob(b=>res(b!),'image/png',.93));
      const file = new File([blob],'darkset-treino.png',{type:'image/png'});
      if(navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({title:'Meu treino — DarkSet',text:`${session.entries.length} exercícios concluídos 💪 #DarkSet`,files:[file]});
        showToast('Compartilhado! 🚀');
        setTimeout(onClose,1200);
      } else {
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url; a.download='darkset-treino.png'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url),5000);
        showToast('Imagem salva! 📸');
      }
    } catch(e:any){ if(e?.name!=='AbortError') showToast('Erro ao gerar imagem'); }
    setBusy(false);
  };

  const entries = session.entries||[];
  const totalSets = entries.reduce((a,en)=>a+(en.sets||[]).filter(s=>s.r).length,0);
  const totalVol  = entries.reduce((a,en)=>a+(en.sets||[]).reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0),0);

  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.88)',backdropFilter:'blur(14px)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 env(safe-area-inset-bottom,1rem)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    >
      <motion.div
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:300,damping:32}}
        style={{width:'min(480px,100vw)',background:'#0f0f13',borderTop:'1px solid rgba(227,27,35,.25)',borderRadius:'24px 24px 0 0',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column'}}
      >
        {/* Handle */}
        <div style={{display:'flex',justifyContent:'center',padding:'12px 0 0'}}>
          <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2}}/>
        </div>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 1.25rem .5rem'}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
              Compartilhar <span style={{color:'#e31b23'}}>Treino</span>
            </div>
            <div style={{fontSize:'.7rem',color:'#7a7a8a',marginTop:'2px'}}>Imagem 9:16 pronta para Stories</div>
          </div>
          <motion.button whileTap={{scale:.9}} onClick={onClose}
            style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',color:'#7a7a8a',fontSize:'.9rem',cursor:'pointer',outline:'none'}}>✕</motion.button>
        </div>

        <div style={{overflowY:'auto',flex:1,padding:'0 1.25rem 1.25rem'}}>

          {/* Preview */}
          <motion.div
            initial={{opacity:0,scale:.95}} animate={{opacity:ready?1:0,scale:ready?1:.95}} transition={{duration:.35}}
            style={{position:'relative',borderRadius:16,overflow:'hidden',marginBottom:'1rem',border:'1px solid rgba(227,27,35,.25)',boxShadow:'0 12px 48px rgba(227,27,35,.2)'}}
          >
            <canvas ref={previewRef} style={{width:'100%',height:'auto',display:'block'}}/>
            {!ready && (
              <div style={{position:'absolute',inset:0,background:'#1a1a20',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'.75rem'}}>
                <motion.div animate={{rotate:360}} transition={{duration:.7,repeat:Infinity,ease:'linear'}}
                  style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
                <div style={{fontSize:'.72rem',color:'#484858'}}>Gerando imagem…</div>
              </div>
            )}
            <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'3px 8px',fontSize:'.58rem',color:'rgba(255,255,255,.55)',fontWeight:700,letterSpacing:'.05em'}}>
              9:16 · STORIES
            </div>
          </motion.div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.4rem',marginBottom:'1rem'}}>
            {[
              ['🏋️',String(entries.length),'Exerc.'],
              ['📊',String(totalSets),'Séries'],
              ['⚖️',totalVol>0?Math.round(totalVol)+'kg':'—','Volume'],
              ['⏱',session.duration?fmtTime(session.duration):'—','Tempo'],
            ].map(([icon,val,lbl])=>(
              <motion.div key={lbl} whileTap={{scale:.97}}
                style={{background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:10,padding:'.5rem .3rem',textAlign:'center'}}>
                <div style={{fontSize:'.9rem'}}>{icon}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#e31b23',lineHeight:1}}>{val}</div>
                <div style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.04em',marginTop:'1px'}}>{lbl}</div>
              </motion.div>
            ))}
          </div>

          {/* Lista resumo */}
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:12,padding:'.65rem .75rem',marginBottom:'1rem',display:'grid',gap:'.35rem'}}>
            <div style={{fontSize:'.58rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.2rem'}}>
              {entries.length} exercício(s) · {session.planName||'Treino Livre'}
            </div>
            {entries.slice(0,5).map((en,i)=>{
              const valid=(en.sets||[]).filter(s=>s.r);
              const bestW=valid.length?Math.max(0,...valid.map(s=>parseFloat(s.w)||0)):0;
              return (
                <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*.04}}
                  style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <span style={{fontSize:'.6rem',color:'#e31b23',fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",width:16,textAlign:'right',flexShrink:0}}>{i+1}</span>
                  <span style={{flex:1,fontSize:'.8rem',color:'#c0c0cc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{en.name}</span>
                  <span style={{fontSize:'.65rem',color:'#484858',fontWeight:700,flexShrink:0}}>
                    {bestW>0?`${bestW}kg · `:''}{valid.length}s
                  </span>
                </motion.div>
              );
            })}
            {entries.length>5 && <div style={{fontSize:'.7rem',color:'#484858',textAlign:'center',paddingTop:'.2rem'}}>+{entries.length-5} mais</div>}
          </div>

          {/* Botões */}
          <div style={{display:'grid',gap:'.5rem'}}>
            <motion.button whileTap={{scale:.97}} onClick={handleShare} disabled={busy||!ready}
              style={{width:'100%',background:busy||!ready?'rgba(227,27,35,.35)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:busy||!ready?'not-allowed':'pointer',boxShadow:busy||!ready?'none':'0 4px 20px rgba(227,27,35,.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.6rem',outline:'none'}}>
              {busy ? (
                <><motion.div animate={{rotate:360}} transition={{duration:.7,repeat:Infinity,ease:'linear'}}
                  style={{width:18,height:18,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%'}}/>Gerando…</>
              ) : <>📸 Compartilhar nos Stories</>}
            </motion.button>
            <motion.button whileTap={{scale:.97}} onClick={onClose}
              style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:12,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
              Agora não
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
              style={{position:'absolute',bottom:'5.5rem',left:'50%',transform:'translateX(-50%)',background:'rgba(34,197,94,.12)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.4rem 1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap',backdropFilter:'blur(8px)'}}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
