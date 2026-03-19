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

  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, W, H);

  for(let i = 0; i < 22000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random()*.04})`;
    ctx.fillRect(Math.random()*W, Math.random()*H, 1.2, 1.2);
  }

  const depthGrad = ctx.createRadialGradient(W/2,H*.4,0,W/2,H*.4,W*.85);
  depthGrad.addColorStop(0,'rgba(40,8,10,.0)');
  depthGrad.addColorStop(0.6,'rgba(15,5,5,.4)');
  depthGrad.addColorStop(1,'rgba(0,0,0,.7)');
  ctx.fillStyle = depthGrad; ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.018)'; ctx.lineWidth = 1;
  for(let i = -H; i < W+H; i += 54) {
    ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+H,H); ctx.stroke();
  }
  ctx.restore();

  const topBar = ctx.createLinearGradient(0,0,W,0);
  topBar.addColorStop(0,'transparent');
  topBar.addColorStop(0.1,'#c0121a');
  topBar.addColorStop(0.5,'#ff2d35');
  topBar.addColorStop(0.9,'#c0121a');
  topBar.addColorStop(1,'transparent');
  ctx.fillStyle = topBar; ctx.fillRect(0,0,W,10);
  const topBarGlow = ctx.createLinearGradient(0,10,0,120);
  topBarGlow.addColorStop(0,'rgba(227,27,35,.5)');
  topBarGlow.addColorStop(1,'transparent');
  ctx.fillStyle = topBarGlow; ctx.fillRect(0,10,W,110);

  const glowTop = ctx.createRadialGradient(W/2,200,0,W/2,200,600);
  glowTop.addColorStop(0,'rgba(227,27,35,.3)');
  glowTop.addColorStop(0.5,'rgba(180,10,18,.1)');
  glowTop.addColorStop(1,'transparent');
  ctx.fillStyle = glowTop; ctx.fillRect(0,0,W,500);

  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = 'rgba(227,27,35,.9)'; ctx.shadowBlur = 50;
  ctx.font = '900 148px "Barlow Condensed","Arial Black",sans-serif';
  ctx.fillStyle = '#f0f0f2'; ctx.fillText('DARK', W/2-148, 195);
  ctx.fillStyle = '#e31b23'; ctx.fillText('SET', W/2+140, 195);
  ctx.restore();

  const underLine = ctx.createLinearGradient(0,0,W,0);
  underLine.addColorStop(0,'transparent');
  underLine.addColorStop(.25,'rgba(227,27,35,.0)');
  underLine.addColorStop(.5,'rgba(255,50,60,.7)');
  underLine.addColorStop(.75,'rgba(227,27,35,.0)');
  underLine.addColorStop(1,'transparent');
  ctx.fillStyle = underLine; ctx.fillRect(0,205,W,3);

  ctx.font = '600 28px "Barlow Condensed",Arial,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.letterSpacing = '8px';
  ctx.fillText('SEU TREINO · SUA EVOLUÇÃO', W/2, 250);
  ctx.letterSpacing = '0px';

  const hoje = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  ctx.font = '700 32px "Barlow Condensed",Arial,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.38)';
  ctx.fillText(hoje.toUpperCase(), W/2, 294);

  const planName = (session.planName||'TREINO LIVRE').toUpperCase();
  const truncPlan = planName.length > 22 ? planName.slice(0,22)+'…' : planName;
  ctx.save();
  const planBoxGrad = ctx.createLinearGradient(60,320,W-60,420);
  planBoxGrad.addColorStop(0,'rgba(227,27,35,.25)');
  planBoxGrad.addColorStop(.5,'rgba(200,20,28,.15)');
  planBoxGrad.addColorStop(1,'rgba(100,5,10,.1)');
  if(ctx.roundRect) ctx.roundRect(60,322,W-120,96,14);
  else ctx.rect(60,322,W-120,96);
  ctx.fillStyle = planBoxGrad; ctx.fill();
  const planBoxBorder = ctx.createLinearGradient(60,0,W-60,0);
  planBoxBorder.addColorStop(0,'rgba(227,27,35,.1)');
  planBoxBorder.addColorStop(.5,'rgba(255,60,70,.5)');
  planBoxBorder.addColorStop(1,'rgba(227,27,35,.1)');
  ctx.strokeStyle = planBoxBorder; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = 'rgba(227,27,35,.4)'; ctx.shadowBlur = 16;
  ctx.font = '900 78px "Barlow Condensed","Arial Black",sans-serif';
  ctx.fillStyle = '#ffffff'; ctx.fillText(truncPlan, W/2, 393);
  ctx.restore();

  const sepY = 452;
  const lGrad = ctx.createLinearGradient(80,0,W/2-30,0);
  lGrad.addColorStop(0,'transparent'); lGrad.addColorStop(1,'rgba(227,27,35,.55)');
  ctx.strokeStyle = lGrad; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(80,sepY); ctx.lineTo(W/2-28,sepY); ctx.stroke();
  const rGrad = ctx.createLinearGradient(W/2+30,0,W-80,0);
  rGrad.addColorStop(0,'rgba(227,27,35,.55)'); rGrad.addColorStop(1,'transparent');
  ctx.strokeStyle = rGrad;
  ctx.beginPath(); ctx.moveTo(W/2+28,sepY); ctx.lineTo(W-80,sepY); ctx.stroke();
  ctx.save();
  ctx.fillStyle = '#e31b23';
  ctx.shadowColor = 'rgba(227,27,35,.8)'; ctx.shadowBlur = 12;
  ctx.translate(W/2,sepY); ctx.rotate(Math.PI/4);
  ctx.fillRect(-9,-9,18,18);
  ctx.restore();

  const listTop = 480, listBot = 1380, listH = listBot-listTop;
  const maxEx   = Math.min(entries.length, 12);
  const rowH    = entries.length>0 ? Math.floor(listH/Math.max(maxEx,1)) : listH;

  entries.slice(0,maxEx).forEach((en,i)=>{
    const ry    = listTop + i*rowH;
    const valid = (en.sets||[]).filter(s=>s.r);
    const bestW = valid.length?Math.max(0,...valid.map(s=>parseFloat(s.w)||0)):0;
    const vol   = valid.reduce((a,s)=>a+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0);
    const totalReps = valid.reduce((a,s)=>a+(parseInt(s.r)||0),0);
    const midY  = ry+rowH*.52;
    const fs    = Math.min(46,Math.max(30,Math.round(rowH*.34)));

    ctx.save();
    const rowGrad = ctx.createLinearGradient(60,ry,W-60,ry);
    if(i%2===0){
      rowGrad.addColorStop(0,'rgba(255,255,255,.075)');
      rowGrad.addColorStop(.6,'rgba(255,255,255,.05)');
      rowGrad.addColorStop(1,'rgba(255,255,255,.02)');
    } else {
      rowGrad.addColorStop(0,'rgba(255,255,255,.035)');
      rowGrad.addColorStop(1,'rgba(255,255,255,.01)');
    }
    if(ctx.roundRect) ctx.roundRect(60,ry+5,W-120,rowH-10,10);
    else ctx.rect(60,ry+5,W-120,rowH-10);
    ctx.fillStyle = rowGrad; ctx.fill();
    ctx.fillStyle = i===0?'#e31b23':'rgba(227,27,35,.45)';
    if(ctx.roundRect) ctx.roundRect(60,ry+5,4,rowH-10,2);
    else ctx.rect(60,ry+5,4,rowH-10);
    ctx.fill();
    ctx.restore();

    ctx.font = `900 ${fs}px "Barlow Condensed",sans-serif`;
    ctx.fillStyle = i===0?'#e31b23':'rgba(227,27,35,.7)';
    ctx.textAlign = 'left';
    ctx.fillText(`${i+1}`, 86, midY);

    ctx.font = `700 ${fs}px "Barlow Condensed","Arial Narrow",sans-serif`;
    ctx.fillStyle = i===0?'#ffffff':'#d8d8e4';
    let nm = en.name||'';
    const maxNmW = W-480;
    while(ctx.measureText(nm).width>maxNmW&&nm.length>3) nm=nm.slice(0,-1);
    if(nm!==en.name) nm+='…';
    ctx.fillText(nm, 130, midY);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(227,27,35,.9)';
    ctx.font = `700 ${Math.round(fs*.82)}px "Barlow Condensed",Arial,sans-serif`;
    const stat = bestW>0?`${bestW}kg · ${valid.length}s · ${Math.round(vol)}kg`:`${valid.length} séries`;
    ctx.fillText(stat, W-84, midY-(rowH>80?fs*.28:0));

    if(rowH>80&&totalReps>0){
      ctx.font = `500 ${Math.round(fs*.55)}px Arial,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.fillText(`${totalReps} reps totais`, W-84, midY+fs*.55);
    }
  });

  if(entries.length>maxEx){
    ctx.font = '600 30px "Barlow Condensed",Arial,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.textAlign = 'center';
    ctx.fillText(`▸  +${entries.length-maxEx} exercícios`, W/2, listTop+maxEx*rowH+36);
  }

  const statsBoxTop = 1400;
  ctx.save();
  const div2 = ctx.createLinearGradient(80,0,W-80,0);
  div2.addColorStop(0,'transparent');
  div2.addColorStop(.2,'rgba(227,27,35,.5)');
  div2.addColorStop(.8,'rgba(227,27,35,.5)');
  div2.addColorStop(1,'transparent');
  ctx.strokeStyle=div2; ctx.lineWidth=1; ctx.setLineDash([5,5]);
  ctx.beginPath(); ctx.moveTo(80,statsBoxTop-16); ctx.lineTo(W-80,statsBoxTop-16); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  const glowBot = ctx.createRadialGradient(W/2,H,0,W/2,H,700);
  glowBot.addColorStop(0,'rgba(227,27,35,.45)');
  glowBot.addColorStop(.5,'rgba(180,10,18,.15)');
  glowBot.addColorStop(1,'transparent');
  ctx.fillStyle=glowBot; ctx.fillRect(0,H-700,W,700);

  ctx.save();
  const statsBg = ctx.createLinearGradient(60,statsBoxTop,W-60,statsBoxTop+220);
  statsBg.addColorStop(0,'rgba(227,27,35,.16)');
  statsBg.addColorStop(.5,'rgba(160,15,20,.08)');
  statsBg.addColorStop(1,'rgba(227,27,35,.12)');
  if(ctx.roundRect) ctx.roundRect(60,statsBoxTop,W-120,228,16);
  else ctx.rect(60,statsBoxTop,W-120,228);
  ctx.fillStyle=statsBg; ctx.fill();
  const statsBorder = ctx.createLinearGradient(60,0,W-60,0);
  statsBorder.addColorStop(0,'rgba(227,27,35,.08)');
  statsBorder.addColorStop(.5,'rgba(255,50,60,.3)');
  statsBorder.addColorStop(1,'rgba(227,27,35,.08)');
  ctx.strokeStyle=statsBorder; ctx.lineWidth=1.2; ctx.stroke();
  ctx.restore();

  const statsArr:{l:string;v:string}[] = [
    {l:'EXERCÍCIOS',v:String(entries.length)},
    {l:'SÉRIES',v:String(totalSets)},
    {l:'VOLUME',v:totalVol>0?Math.round(totalVol)+'kg':'—'},
  ];
  if(session.duration&&session.duration>0) statsArr.push({l:'DURAÇÃO',v:fmtTime(session.duration)});
  const cols = statsArr.length;
  statsArr.forEach((st,i)=>{
    const x = 60+(W-120)/cols*i+(W-120)/cols/2;
    ctx.textAlign='center';
    ctx.save();
    ctx.shadowColor='rgba(227,27,35,.7)'; ctx.shadowBlur=22;
    ctx.font=`900 ${cols>3?72:82}px "Barlow Condensed","Arial Black",sans-serif`;
    ctx.fillStyle='#e31b23'; ctx.fillText(st.v,x,statsBoxTop+138);
    ctx.restore();
    ctx.font='600 24px "Barlow Condensed",Arial,sans-serif';
    ctx.fillStyle='rgba(255,255,255,.32)';
    ctx.fillText(st.l,x,statsBoxTop+176);
    if(i<cols-1){
      const dvx=60+(W-120)/cols*(i+1);
      ctx.strokeStyle='rgba(227,27,35,.18)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(dvx,statsBoxTop+28); ctx.lineTo(dvx,statsBoxTop+200); ctx.stroke();
    }
  });

  ctx.fillStyle=topBar; ctx.fillRect(0,H-10,W,10);
  const botGlow=ctx.createLinearGradient(0,H-80,0,H-10);
  botGlow.addColorStop(0,'transparent'); botGlow.addColorStop(1,'rgba(227,27,35,.35)');
  ctx.fillStyle=botGlow; ctx.fillRect(0,H-80,W,70);
  ctx.font='600 26px "Barlow Condensed",Arial,sans-serif';
  ctx.fillStyle='rgba(255,255,255,.2)';
  ctx.textAlign='center';
  ctx.fillText('#DarkSet · darksetapp.com',W/2,H-26);
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

  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),2800);};

  useEffect(()=>{
    const full=document.createElement('canvas');
    buildCanvas(session,full).then(()=>{
      canvasRef.current=full;
      const prev=previewRef.current;
      if(!prev) return;
      const SCALE=390/1080;
      prev.width=390; prev.height=Math.round(1920*SCALE);
      prev.getContext('2d')!.drawImage(full,0,0,390,Math.round(1920*SCALE));
      setReady(true);
    });
  },[]);

  const handleShare=async()=>{
    setBusy(true);
    try{
      const blob=await new Promise<Blob>(res=>canvasRef.current!.toBlob(b=>res(b!),'image/png',.93));
      const file=new File([blob],'darkset-treino.png',{type:'image/png'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({title:'Meu treino — DarkSet',text:`${session.entries.length} exercícios 💪 #DarkSet`,files:[file]});
        showToast('Compartilhado! 🚀');
        setTimeout(onClose,1200);
      } else {
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url; a.download='darkset-treino.png'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url),5000);
        showToast('Imagem salva! 📸');
      }
    }catch(e:any){if(e?.name!=='AbortError')showToast('Erro ao gerar imagem');}
    setBusy(false);
  };

  const entries=session.entries||[];
  const totalSets=entries.reduce((a,en)=>a+(en.sets||[]).filter(s=>s.r).length,0);
  const totalVol=entries.reduce((a,en)=>a+(en.sets||[]).reduce((b,s)=>b+(parseFloat(s.w)||0)*(parseFloat(s.r)||0),0),0);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.88)',backdropFilter:'blur(14px)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 env(safe-area-inset-bottom,1rem)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',stiffness:300,damping:32}}
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
            style={{position:'relative',borderRadius:16,overflow:'hidden',marginBottom:'1rem',border:'1px solid rgba(227,27,35,.25)',boxShadow:'0 12px 48px rgba(227,27,35,.2)'}}>
            <canvas ref={previewRef} style={{width:'100%',height:'auto',display:'block'}}/>
            {!ready&&(
              <div style={{position:'absolute',inset:0,minHeight:280,background:'#12121a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'.75rem'}}>
                <motion.div animate={{rotate:360}} transition={{duration:.7,repeat:Infinity,ease:'linear'}}
                  style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%'}}/>
                <div style={{fontSize:'.72rem',color:'#484858'}}>Gerando imagem…</div>
              </div>
            )}
            <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'3px 8px',fontSize:'.58rem',color:'rgba(255,255,255,.55)',fontWeight:700,letterSpacing:'.05em'}}>
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
            <div style={{fontSize:'.58rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.2rem'}}>{entries.length} exercício(s) · {session.planName||'Treino Livre'}</div>
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
            {entries.length>5&&<div style={{fontSize:'.7rem',color:'#484858',textAlign:'center',paddingTop:'.2rem'}}>+{entries.length-5} mais</div>}
          </div>
          <div style={{display:'grid',gap:'.5rem'}}>
            <motion.button whileTap={{scale:.97}} onClick={handleShare} disabled={busy||!ready}
              style={{width:'100%',background:busy||!ready?'rgba(227,27,35,.35)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.05rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:busy||!ready?'not-allowed':'pointer',boxShadow:busy||!ready?'none':'0 4px 20px rgba(227,27,35,.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.6rem',outline:'none'}}>
              {busy?<><motion.div animate={{rotate:360}} transition={{duration:.7,repeat:Infinity,ease:'linear'}} style={{width:18,height:18,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%'}}/>Gerando…</>:<>📸 Compartilhar nos Stories</>}
            </motion.button>
            <motion.button whileTap={{scale:.97}} onClick={onClose}
              style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid #2e2e38',borderRadius:12,padding:'12px',color:'#7a7a8a',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.88rem',textTransform:'uppercase',cursor:'pointer',outline:'none'}}>
              Agora não
            </motion.button>
          </div>
        </div>
        <AnimatePresence>
          {toast&&(
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
