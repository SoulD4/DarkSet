'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SetLog = { w: string; r: string };
type Entry  = { name: string; exId?: string; sets: SetLog[] };
type Session = { planName?: string; day?: string; entries: Entry[]; duration?: number };

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

async function buildCanvas(session: Session, canvas: HTMLCanvasElement) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const entries   = session.entries || [];
  const totalSets = entries.reduce((a,en)=>a+(en.sets||[]).filter(s=>s.r).length, 0);
  const totalVol  = entries.reduce((a,en)=>a+(en.sets||[]).reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0), 0);

  // ── FUNDO ESCURO BASE ────────────────────────────────────────────
  ctx.fillStyle = '#08080c';
  ctx.fillRect(0, 0, W, H);

  // Textura ruído sutil
  for(let i = 0; i < 14000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random()*.028})`;
    ctx.fillRect(Math.random()*W, Math.random()*H, 1, 1);
  }

  // Gradiente escuro de vinheta nas bordas
  const vignette = ctx.createRadialGradient(W/2, H/2, H*.2, W/2, H/2, H*.85);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0,0,0,.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Linhas diagonais bem sutis
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.015)';
  ctx.lineWidth = 1;
  for(let i = -H; i < W+H; i += 60) {
    ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+H,H); ctx.stroke();
  }
  ctx.restore();

  // ── BARRA TOPO ────────────────────────────────────────────────────
  const topBar = ctx.createLinearGradient(0,0,W,0);
  topBar.addColorStop(0,'transparent');
  topBar.addColorStop(0.15,'#b01018');
  topBar.addColorStop(0.5,'#e31b23');
  topBar.addColorStop(0.85,'#b01018');
  topBar.addColorStop(1,'transparent');
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, W, 8);

  // Glow PEQUENO sob barra — só 80px, não 500
  const topGlow = ctx.createLinearGradient(0, 8, 0, 88);
  topGlow.addColorStop(0, 'rgba(227,27,35,.22)');
  topGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 8, W, 80);

  // ── LOGO ──────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.font = '900 140px "Barlow Condensed","Arial Black",sans-serif';
  // Sombra controlada — não espalhar demais
  ctx.save();
  ctx.shadowColor = 'rgba(227,27,35,.5)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#f0f0f2';
  ctx.fillText('DARK', W/2 - 140, 190);
  ctx.fillStyle = '#e31b23';
  ctx.fillText('SET', W/2 + 132, 190);
  ctx.restore();

  // Linha fina sob logo
  const logoLine = ctx.createLinearGradient(0,0,W,0);
  logoLine.addColorStop(0,'transparent');
  logoLine.addColorStop(.35,'rgba(227,27,35,.0)');
  logoLine.addColorStop(.5,'rgba(227,27,35,.55)');
  logoLine.addColorStop(.65,'rgba(227,27,35,.0)');
  logoLine.addColorStop(1,'transparent');
  ctx.fillStyle = logoLine;
  ctx.fillRect(0, 200, W, 2);

  // Tagline
  ctx.font = '600 28px "Barlow Condensed",Arial,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.letterSpacing = '7px';
  ctx.fillText('SEU TREINO · SUA EVOLUÇÃO', W/2, 246);
  ctx.letterSpacing = '0px';

  // Data
  const hoje = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  ctx.font = '600 30px "Barlow Condensed",Arial,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillText(hoje.toUpperCase(), W/2, 286);

  // ── NOME DA FICHA ─────────────────────────────────────────────────
  const planName = (session.planName||'TREINO LIVRE').toUpperCase();
  const truncPlan = planName.length > 22 ? planName.slice(0,22)+'…' : planName;

  // Fundo caixa — gradiente escuro, não vermelho
  ctx.save();
  const planBg = ctx.createLinearGradient(60,315,W-60,410);
  planBg.addColorStop(0, 'rgba(227,27,35,.18)');
  planBg.addColorStop(1, 'rgba(180,10,15,.08)');
  if(ctx.roundRect) ctx.roundRect(60, 318, W-120, 90, 12);
  else ctx.rect(60, 318, W-120, 90);
  ctx.fillStyle = planBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,27,35,.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.font = '900 76px "Barlow Condensed","Arial Black",sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncPlan, W/2, 385);

  // ── SEPARADOR ─────────────────────────────────────────────────────
  const sepY = 442;
  const lG = ctx.createLinearGradient(80,0,W/2-30,0);
  lG.addColorStop(0,'transparent'); lG.addColorStop(1,'rgba(227,27,35,.4)');
  ctx.strokeStyle = lG; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80,sepY); ctx.lineTo(W/2-24,sepY); ctx.stroke();
  const rG = ctx.createLinearGradient(W/2+30,0,W-80,0);
  rG.addColorStop(0,'rgba(227,27,35,.4)'); rG.addColorStop(1,'transparent');
  ctx.strokeStyle = rG;
  ctx.beginPath(); ctx.moveTo(W/2+24,sepY); ctx.lineTo(W-80,sepY); ctx.stroke();
  ctx.save();
  ctx.fillStyle = '#e31b23';
  ctx.translate(W/2,sepY); ctx.rotate(Math.PI/4);
  ctx.fillRect(-7,-7,14,14);
  ctx.restore();

  // ── LISTA EXERCÍCIOS — zona fixa 468→1382 ────────────────────────
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
    const fs    = Math.min(44, Math.max(28, Math.round(rowH * .33)));

    // Fundo linha — cinza escuro, não vermelho
    ctx.save();
    if(i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.06)';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.03)';
    }
    if(ctx.roundRect) ctx.roundRect(60, ry+5, W-120, rowH-10, 8);
    else ctx.rect(60, ry+5, W-120, rowH-10);
    ctx.fill();

    // Borda esquerda vermelha FINA
    ctx.fillStyle = 'rgba(227,27,35,.6)';
    ctx.fillRect(60, ry+5, 3, rowH-10);
    ctx.restore();

    // Número
    ctx.font = `900 ${fs}px "Barlow Condensed",sans-serif`;
    ctx.fillStyle = 'rgba(227,27,35,.75)';
    ctx.textAlign = 'left';
    ctx.fillText(`${i+1}`, 84, midY);

    // Nome
    ctx.font = `700 ${fs}px "Barlow Condensed","Arial Narrow",sans-serif`;
    ctx.fillStyle = '#dde0ea';
    let nm = en.name||'';
    while(ctx.measureText(nm).width > W-470 && nm.length>3) nm = nm.slice(0,-1);
    if(nm !== en.name) nm += '…';
    ctx.fillText(nm, 126, midY);

    // Stats — direita
    ctx.textAlign = 'right';
    if(bestW > 0 || valid.length > 0) {
      ctx.font = `700 ${Math.round(fs*.78)}px "Barlow Condensed",Arial,sans-serif`;
      ctx.fillStyle = '#e31b23';
      const stat = bestW>0
        ? `${bestW}kg · ${valid.length}s · ${Math.round(vol)}kg`
        : `${valid.length} séries`;
      const subY = rowH > 80 ? midY - fs*.25 : midY;
      ctx.fillText(stat, W-82, subY);

      // Reps totais segunda linha
      if(rowH > 85 && totalReps > 0) {
        ctx.font = `400 ${Math.round(fs*.5)}px Arial,sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.fillText(`${totalReps} reps totais`, W-82, midY + fs*.52);
      }
    }
  });

  if(entries.length > maxEx) {
    ctx.font = '500 28px "Barlow Condensed",Arial,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${entries.length-maxEx} exercícios`, W/2, listTop + maxEx*rowH + 32);
  }

  // ── SEPARADOR ANTES STATS ─────────────────────────────────────────
  const statsTop = 1400;
  ctx.save();
  const divG = ctx.createLinearGradient(80,0,W-80,0);
  divG.addColorStop(0,'transparent');
  divG.addColorStop(.25,'rgba(227,27,35,.4)');
  divG.addColorStop(.75,'rgba(227,27,35,.4)');
  divG.addColorStop(1,'transparent');
  ctx.strokeStyle = divG; ctx.lineWidth = 1; ctx.setLineDash([5,5]);
  ctx.beginPath(); ctx.moveTo(80,statsTop-18); ctx.lineTo(W-80,statsTop-18); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── GLOW INFERIOR — controlado ───────────────────────────────────
  const botGlow = ctx.createRadialGradient(W/2, H, 0, W/2, H, 560);
  botGlow.addColorStop(0, 'rgba(227,27,35,.28)');
  botGlow.addColorStop(.5, 'rgba(180,10,18,.08)');
  botGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = botGlow;
  ctx.fillRect(0, H-560, W, 560);

  // ── BLOCO STATS ───────────────────────────────────────────────────
  ctx.save();
  // Fundo cinza escuro com leve toque vermelho
  const statsBg = ctx.createLinearGradient(60, statsTop, W-60, statsTop+220);
  statsBg.addColorStop(0, 'rgba(40,12,14,.95)');
  statsBg.addColorStop(1, 'rgba(30,8,10,.95)');
  if(ctx.roundRect) ctx.roundRect(60, statsTop, W-120, 220, 14);
  else ctx.rect(60, statsTop, W-120, 220);
  ctx.fillStyle = statsBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,27,35,.25)';
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
    ctx.shadowColor = 'rgba(227,27,35,.4)';
    ctx.shadowBlur = 12;
    ctx.font = `900 ${cols>3?70:78}px "Barlow Condensed","Arial Black",sans-serif`;
    ctx.fillStyle = '#e31b23';
    ctx.fillText(st.v, x, statsTop+130);
    ctx.restore();

    // Label
    ctx.font = '600 22px "Barlow Condensed",Arial,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillText(st.l, x, statsTop+168);

    // Divisor vertical
    if(i < cols-1) {
      const dvx = 60 + (W-120)/cols*(i+1);
      ctx.strokeStyle = 'rgba(227,27,35,.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dvx, statsTop+28); ctx.lineTo(dvx, statsTop+192); ctx.stroke();
    }
  });

  // ── BARRA INFERIOR + FOOTER ───────────────────────────────────────
  ctx.fillStyle = topBar;
  ctx.fillRect(0, H-8, W, 8);

  ctx.font = '500 24px "Barlow Condensed",Arial,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.textAlign = 'center';
  ctx.fillText('#DarkSet · darksetapp.com', W/2, H-22);
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
  const [toast,setToast] = useState('');

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
      prev.getContext('2d')!.drawImage(full, 0, 0, 390, Math.round(1920*SCALE));
      setReady(true);
    });
  },[]);

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await new Promise<Blob>(res=>canvasRef.current!.toBlob(b=>res(b!),'image/png',.93));
      const file = new File([blob],'darkset-treino.png',{type:'image/png'});
      if(navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({title:'Meu treino — DarkSet',text:`${session.entries.length} exercícios 💪 #DarkSet`,files:[file]});
        showToast('Compartilhado! 🚀');
        setTimeout(onClose,1200);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download='darkset-treino.png'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url),5000);
        showToast('Imagem salva! 📸');
      }
    } catch(e:any){ if(e?.name!=='AbortError') showToast('Erro ao gerar imagem'); }
    setBusy(false);
  };

  const entries   = session.entries||[];
  const totalSets = entries.reduce((a,en)=>a+(en.sets||[]).filter(s=>s.r).length,0);
  const totalVol  = entries.reduce((a,en)=>a+(en.sets||[]).reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0),0);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.88)',backdropFilter:'blur(14px)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 env(safe-area-inset-bottom,1rem)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:300,damping:32}}
        style={{width:'min(480px,100vw)',background:'#0f0f13',borderTop:'1px solid rgba(227,27,35,.25)',borderRadius:'24px 24px 0 0',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column'}}>

        <div style={{display:'flex',justifyContent:'center',padding:'12px 0 0'}}>
          <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2}}/>
        </div>

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

          <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:ready?1:0,scale:ready?1:.95}} transition={{duration:.35}}
            style={{position:'relative',borderRadius:16,overflow:'hidden',marginBottom:'1rem',border:'1px solid rgba(227,27,35,.2)',boxShadow:'0 8px 32px rgba(0,0,0,.6)'}}>
            <canvas ref={previewRef} style={{width:'100%',height:'auto',display:'block'}}/>
            {!ready && (
              <div style={{position:'absolute',inset:0,minHeight:260,background:'#12121a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'.75rem'}}>
                <motion.div animate={{rotate:360}} transition={{duration:.7,repeat:Infinity,ease:'linear'}}
                  style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
                <div style={{fontSize:'.72rem',color:'#484858'}}>Gerando imagem…</div>
              </div>
            )}
            <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'3px 8px',fontSize:'.58rem',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:'.05em'}}>
              9:16 · STORIES
            </div>
          </motion.div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.4rem',marginBottom:'1rem'}}>
            {[['🏋️',String(entries.length),'Exerc.'],['📊',String(totalSets),'Séries'],['⚖️',totalVol>0?Math.round(totalVol)+'kg':'—','Volume'],['⏱',session.duration?fmtTime(session.duration):'—','Tempo']].map(([icon,val,lbl])=>(
              <div key={lbl} style={{background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:10,padding:'.5rem .3rem',textAlign:'center'}}>
                <div style={{fontSize:'.9rem'}}>{icon}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.1rem',color:'#e31b23',lineHeight:1}}>{val}</div>
                <div style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.04em',marginTop:'1px'}}>{lbl}</div>
              </div>
            ))}
          </div>

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
                  <span style={{fontSize:'.65rem',color:'#484858',fontWeight:700,flexShrink:0}}>{bestW>0?`${bestW}kg · `:''}{valid.length}s</span>
                </motion.div>
              );
            })}
            {entries.length>5 && <div style={{fontSize:'.7rem',color:'#484858',textAlign:'center',paddingTop:'.2rem'}}>+{entries.length-5} mais</div>}
          </div>

          <div style={{display:'grid',gap:'.5rem'}}>
            <motion.button whileTap={{scale:.97}} onClick={handleShare} disabled={busy||!ready}
              style={{width:'100%',background:busy||!ready?'rgba(227,27,35,.35)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:busy||!ready?'not-allowed':'pointer',boxShadow:busy||!ready?'none':'0 4px 20px rgba(227,27,35,.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.6rem',outline:'none'}}>
              {busy ? <><motion.div animate={{rotate:360}} transition={{duration:.7,repeat:Infinity,ease:'linear'}} style={{width:18,height:18,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%'}}/>Gerando…</> : <>📸 Compartilhar nos Stories</>}
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
