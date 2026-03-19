'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SetLog = { w: string; r: string };
type Entry  = { name: string; exId?: string; sets: SetLog[] };
type Session = {
  planName?: string;
  day?: string;
  entries: Entry[];
  duration?: number;
  savedAt?: number;
};

const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

function buildCanvas(session: Session, canvas: HTMLCanvasElement) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#0a0a0f');
  bg.addColorStop(0.5, '#0f0f16');
  bg.addColorStop(1,   '#08080e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,.025)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 72) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y = 0; y < H; y += 72) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const topGlow = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, 600);
  topGlow.addColorStop(0, 'rgba(227,27,35,.35)');
  topGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, 600);

  const botGlow = ctx.createRadialGradient(W/2, H, 0, W/2, H, 500);
  botGlow.addColorStop(0, 'rgba(227,27,35,.2)');
  botGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = botGlow;
  ctx.fillRect(0, H-500, W, 500);

  const topLine = ctx.createLinearGradient(0, 0, W, 0);
  topLine.addColorStop(0, 'transparent');
  topLine.addColorStop(0.3, '#e31b23');
  topLine.addColorStop(0.7, '#e31b23');
  topLine.addColorStop(1, 'transparent');
  ctx.fillStyle = topLine;
  ctx.fillRect(0, 0, W, 6);

  ctx.textAlign = 'center';
  ctx.font = '900 120px "Barlow Condensed", "Arial Black", sans-serif';
  ctx.fillStyle = '#f0f0f2';
  ctx.fillText('DARK', W/2 - 108, 158);
  ctx.fillStyle = '#e31b23';
  ctx.fillText('SET', W/2 + 116, 158);

  ctx.font = '600 32px "Barlow Condensed", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillText('SEU TREINO · SUA EVOLUÇÃO', W/2, 208);

  const hoje = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long'});
  ctx.font = '700 36px "Barlow Condensed", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillText(hoje.toUpperCase(), W/2, 268);

  const planName = (session.planName || 'TREINO LIVRE').toUpperCase();
  ctx.font = '900 82px "Barlow Condensed", "Arial Black", sans-serif';
  ctx.fillStyle = '#fff';
  const truncated = planName.length > 20 ? planName.slice(0, 20) + '…' : planName;
  ctx.fillText(truncated, W/2, 368);

  ctx.strokeStyle = 'rgba(227,27,35,.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(80, 410); ctx.lineTo(W-80, 410); ctx.stroke();
  ctx.setLineDash([]);

  const entries = session.entries || [];
  const startY = 450;
  const maxEntries = Math.min(entries.length, 12);
  const lineH = Math.min(112, (H - startY - 480) / Math.max(maxEntries, 1));

  entries.slice(0, maxEntries).forEach((en, i) => {
    const y = startY + i * lineH;
    const valid = (en.sets || []).filter(s => s.r);
    const bestW = Math.max(0, ...valid.map(s => parseFloat(s.w) || 0));
    const vol = valid.reduce((a, s) => a + (parseFloat(s.w)||0)*(parseFloat(s.r)||0), 0);

    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.055)' : 'rgba(255,255,255,.025)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(60, y + 3, W - 120, lineH - 8, 10);
    else ctx.rect(60, y + 3, W - 120, lineH - 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(227,27,35,.7)';
    ctx.font = `900 ${Math.round(lineH*.38)}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${i+1}`, 88, y + lineH * .65);

    ctx.fillStyle = '#e8e8f0';
    ctx.font = `700 ${Math.round(lineH*.38)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    let nm = en.name || '';
    const maxW = W - 420;
    while (ctx.measureText(nm).width > maxW && nm.length > 4) nm = nm.slice(0, -1);
    if (nm !== en.name) nm += '…';
    ctx.fillText(nm, 130, y + lineH * .65);

    ctx.fillStyle = 'rgba(227,27,35,.85)';
    ctx.font = `700 ${Math.round(lineH*.32)}px "Barlow Condensed", Arial, sans-serif`;
    ctx.textAlign = 'right';
    const statStr = bestW > 0
      ? `${bestW}kg · ${valid.length}s · ${Math.round(vol)}kg vol`
      : `${valid.length} séries`;
    ctx.fillText(statStr, W - 88, y + lineH * .65);
  });

  if (entries.length > maxEntries) {
    const y = startY + maxEntries * lineH + 20;
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.font = '600 32px "Barlow Condensed", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${entries.length - maxEntries} exercícios`, W/2, y);
  }

  const totalSets = entries.reduce((a, en) => a + (en.sets||[]).filter(s=>s.r).length, 0);
  const totalVol  = entries.reduce((a, en) => a + (en.sets||[]).reduce((b,s) => b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0), 0), 0);

  const statsY = H - 420;

  const sepGrad = ctx.createLinearGradient(80, 0, W-80, 0);
  sepGrad.addColorStop(0, 'transparent');
  sepGrad.addColorStop(0.5, 'rgba(227,27,35,.4)');
  sepGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = sepGrad;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(80, statsY - 20); ctx.lineTo(W-80, statsY - 20); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,.04)';
  if (ctx.roundRect) ctx.roundRect(60, statsY, W-120, 200, 14);
  else ctx.rect(60, statsY, W-120, 200);
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,27,35,.15)';
  ctx.lineWidth = 1;
  if (ctx.roundRect) ctx.roundRect(60, statsY, W-120, 200, 14);
  else ctx.rect(60, statsY, W-120, 200);
  ctx.stroke();

  const stats: {l:string;v:string}[] = [
    { l: 'EXERCÍCIOS', v: String(entries.length) },
    { l: 'SÉRIES',     v: String(totalSets) },
    { l: 'VOLUME',     v: totalVol > 0 ? Math.round(totalVol) + 'kg' : '—' },
  ];
  if (session.duration && session.duration > 0) {
    stats.push({ l: 'DURAÇÃO', v: fmtTime(session.duration) });
  }

  stats.forEach((st, i) => {
    const cols = stats.length;
    const x = 60 + (W - 120) / cols * i + (W - 120) / cols / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e31b23';
    ctx.font = `900 ${stats.length > 3 ? 68 : 76}px "Barlow Condensed", "Arial Black", sans-serif`;
    ctx.fillText(st.v, x, statsY + 120);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '600 26px "Barlow Condensed", Arial, sans-serif';
    ctx.fillText(st.l, x, statsY + 158);
  });

  ctx.fillStyle = topLine;
  ctx.fillRect(0, H - 6, W, 6);

  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.font = '600 30px "Barlow Condensed", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('#DarkSet · darksetapp.com', W/2, H - 52);
}

interface Props {
  session: Session;
  onClose: () => void;
}

export default function ShareWorkoutModal({ session, onClose }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement|null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    const full = document.createElement('canvas');
    buildCanvas(session, full);
    canvasRef.current = full;

    const prev = previewRef.current;
    if (!prev) return;
    const SCALE = 390 / 1080;
    prev.width  = 390;
    prev.height = Math.round(1920 * SCALE);
    const pCtx = prev.getContext('2d')!;
    pCtx.drawImage(full, 0, 0, 390, Math.round(1920 * SCALE));
    setReady(true);
  }, []);

  const handleShare = async () => {
    setBusy(true);
    try {
      const full = canvasRef.current!;
      const blob = await new Promise<Blob>(res => full.toBlob(b => res(b!), 'image/png', 0.92));
      const file = new File([blob], 'darkset-treino.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Meu treino — DarkSet',
          text: `${session.entries.length} exercícios concluídos 💪 #DarkSet`,
          files: [file],
        });
        showToast('Compartilhado! 🚀');
        setTimeout(onClose, 1200);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'darkset-treino.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        showToast('Imagem salva! 📸');
      }
    } catch(e: any) {
      if (e?.name !== 'AbortError') showToast('Erro ao gerar imagem');
    }
    setBusy(false);
  };

  const entries = session.entries || [];
  const totalSets = entries.reduce((a, en) => a + (en.sets||[]).filter(s=>s.r).length, 0);
  const totalVol  = entries.reduce((a, en) => a + (en.sets||[]).reduce((b,s) => b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0), 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.85)', backdropFilter:'blur(12px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 0 env(safe-area-inset-bottom, 1rem)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        style={{ width:'min(480px,100vw)', background:'#0f0f13', borderTop:'1px solid rgba(227,27,35,.2)', borderRadius:'24px 24px 0 0', overflow:'hidden', maxHeight:'92vh', display:'flex', flexDirection:'column' }}
      >
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 0' }}>
          <div style={{ width:40, height:4, background:'rgba(255,255,255,.15)', borderRadius:2 }}/>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem .5rem' }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'1.5rem', textTransform:'uppercase', color:'#f0f0f2', lineHeight:1 }}>
              Compartilhar <span style={{ color:'#e31b23' }}>Treino</span>
            </div>
            <div style={{ fontSize:'.7rem', color:'#7a7a8a', marginTop:'2px' }}>Gera uma imagem 9:16 para Stories</div>
          </div>
          <motion.button whileTap={{ scale:.9 }} onClick={onClose}
            style={{ background:'rgba(255,255,255,.06)', border:'1px solid #2e2e38', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', color:'#7a7a8a', fontSize:'.9rem', cursor:'pointer', outline:'none' }}>
            ✕
          </motion.button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'0 1.25rem 1.25rem' }}>

          <motion.div
            initial={{ opacity:0, scale:.96 }}
            animate={{ opacity: ready ? 1 : 0, scale: ready ? 1 : .96 }}
            transition={{ duration:.3 }}
            style={{ position:'relative', borderRadius:16, overflow:'hidden', marginBottom:'1rem', border:'1px solid rgba(227,27,35,.2)', boxShadow:'0 8px 40px rgba(227,27,35,.15)' }}
          >
            <canvas ref={previewRef} style={{ width:'100%', height:'auto', display:'block' }}/>
            {!ready && (
              <div style={{ position:'absolute', inset:0, background:'#1e1e24', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <motion.div animate={{ rotate:360 }} transition={{ duration:.7, repeat:Infinity, ease:'linear' }}
                  style={{ width:28, height:28, border:'3px solid rgba(255,255,255,.08)', borderTopColor:'#e31b23', borderRadius:'50%' }}/>
              </div>
            )}
            <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, padding:'3px 8px', fontSize:'.6rem', color:'rgba(255,255,255,.6)', fontWeight:700, letterSpacing:'.04em' }}>
              9:16 · STORIES
            </div>
          </motion.div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'.4rem', marginBottom:'1rem' }}>
            {[
              ['🏋️', String(entries.length), 'Exerc.'],
              ['📊', String(totalSets), 'Séries'],
              ['⚖️', totalVol > 0 ? Math.round(totalVol)+'kg' : '—', 'Volume'],
              ['⏱', session.duration ? fmtTime(session.duration) : '—', 'Tempo'],
            ].map(([icon, val, lbl]) => (
              <div key={lbl} style={{ background:'rgba(255,255,255,.04)', border:'1px solid #2e2e38', borderRadius:10, padding:'.5rem .3rem', textAlign:'center' }}>
                <div style={{ fontSize:'.9rem' }}>{icon}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'1.1rem', color:'#e31b23', lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:'.52rem', color:'#484858', textTransform:'uppercase', letterSpacing:'.04em', marginTop:'1px' }}>{lbl}</div>
              </div>
            ))}
          </div>

          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid #2e2e38', borderRadius:12, padding:'.65rem .75rem', marginBottom:'1rem', display:'grid', gap:'.35rem' }}>
            <div style={{ fontSize:'.58rem', color:'#484858', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.2rem' }}>
              {entries.length} exercício(s) · {session.planName || 'Treino Livre'}
            </div>
            {entries.slice(0, 5).map((en, i) => {
              const valid = (en.sets||[]).filter(s=>s.r);
              const bestW = Math.max(0, ...valid.map(s => parseFloat(s.w)||0));
              return (
                <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*.04 }}
                  style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                  <span style={{ fontSize:'.6rem', color:'#e31b23', fontWeight:800, fontFamily:"'Barlow Condensed',sans-serif", width:16, textAlign:'right', flexShrink:0 }}>{i+1}</span>
                  <span style={{ flex:1, fontSize:'.8rem', color:'#c0c0cc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{en.name}</span>
                  <span style={{ fontSize:'.65rem', color:'#484858', fontWeight:700, flexShrink:0 }}>
                    {bestW > 0 ? `${bestW}kg · ` : ''}{valid.length}s
                  </span>
                </motion.div>
              );
            })}
            {entries.length > 5 && (
              <div style={{ fontSize:'.7rem', color:'#484858', textAlign:'center', paddingTop:'.2rem' }}>+{entries.length - 5} mais</div>
            )}
          </div>

          <div style={{ display:'grid', gap:'.5rem' }}>
            <motion.button whileTap={{ scale:.97 }} onClick={handleShare} disabled={busy || !ready}
              style={{ width:'100%', background: busy||!ready ? 'rgba(227,27,35,.35)' : 'linear-gradient(135deg,#e31b23,#b31217)', border:'none', borderRadius:12, padding:'14px', color:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'1.05rem', textTransform:'uppercase', letterSpacing:'.05em', cursor: busy||!ready ? 'not-allowed' : 'pointer', boxShadow: busy||!ready ? 'none' : '0 4px 20px rgba(227,27,35,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:'.6rem', outline:'none' }}>
              {busy ? (
                <>
                  <motion.div animate={{ rotate:360 }} transition={{ duration:.7, repeat:Infinity, ease:'linear' }}
                    style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%' }}/>
                  Gerando…
                </>
              ) : <>📸 Compartilhar nos Stories</>}
            </motion.button>
            <motion.button whileTap={{ scale:.97 }} onClick={onClose}
              style={{ width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid #2e2e38', borderRadius:12, padding:'12px', color:'#7a7a8a', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:'.88rem', textTransform:'uppercase', cursor:'pointer', outline:'none' }}>
              Agora não
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}
              style={{ position:'absolute', bottom:'5.5rem', left:'50%', transform:'translateX(-50%)', background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', borderRadius:'999px', padding:'.4rem 1rem', fontSize:'.82rem', color:'#4ade80', fontWeight:600, whiteSpace:'nowrap', backdropFilter:'blur(8px)' }}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
