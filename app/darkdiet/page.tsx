'use client';
import { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/layout/PageShell';

const REFEICOES_PADRAO = ['Café da manhã','Almoço','Pré-treino','Pós-treino','Jantar','Lanche'];

const ALIMENTOS_MOCK = [
  {nome:'Frango grelhado',   cal:165, prot:31, carb:0,  gord:3.6, por:100, icon:'🍗'},
  {nome:'Arroz integral',    cal:216, prot:5,  carb:45, gord:1.8, por:100, icon:'🍚'},
  {nome:'Ovo inteiro',       cal:155, prot:13, carb:1,  gord:11,  por:100, icon:'🥚'},
  {nome:'Batata doce',       cal:86,  prot:1.6,carb:20, gord:0.1, por:100, icon:'🍠'},
  {nome:'Whey protein',      cal:400, prot:80, carb:8,  gord:6,   por:100, icon:'💪'},
  {nome:'Aveia',             cal:389, prot:17, carb:66, gord:7,   por:100, icon:'🥣'},
  {nome:'Banana',            cal:89,  prot:1.1,carb:23, gord:0.3, por:100, icon:'🍌'},
  {nome:'Brócolis',          cal:34,  prot:2.8,carb:7,  gord:0.4, por:100, icon:'🥦'},
  {nome:'Salmão',            cal:208, prot:20, carb:0,  gord:13,  por:100, icon:'🐟'},
  {nome:'Feijão cozido',     cal:127, prot:8.7,carb:23, gord:0.5, por:100, icon:'🫘'},
  {nome:'Pasta de amendoim', cal:588, prot:25, carb:20, gord:50,  por:100, icon:'🥜'},
  {nome:'Iogurte grego',     cal:97,  prot:9,  carb:4,  gord:5,   por:100, icon:'🥛'},
];

type Alimento = typeof ALIMENTOS_MOCK[0];
type ItemRefeicao = Alimento & {porcao:number; id:string};
type Refeicao = {nome:string; itens:ItemRefeicao[]};
type DiaRegistro = {data:string; refeicoes:Refeicao[]; agua:number; metaCal:number};

const META_CAL_PADRAO = 2400;
const META_AGUA       = 8; // copos

const calcMacros = (itens:ItemRefeicao[]) => itens.reduce(
  (acc,it)=>({
    cal:  acc.cal  + Math.round(it.cal  * it.porcao/100),
    prot: acc.prot + Math.round(it.prot * it.porcao/100),
    carb: acc.carb + Math.round(it.carb * it.porcao/100),
    gord: acc.gord + Math.round(it.gord * it.porcao/100),
  }),
  {cal:0,prot:0,carb:0,gord:0}
);

const hoje = () => new Date().toISOString().slice(0,10);
const fmtData = (d:string) => {
  const dt = new Date(d+'T12:00:00');
  const h = hoje();
  if(d===h) return 'Hoje';
  const on = new Date(); on.setDate(on.getDate()-1);
  if(d===on.toISOString().slice(0,10)) return 'Ontem';
  return dt.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
};

const diaVazio = (data:string):DiaRegistro => ({
  data, agua:0, metaCal:META_CAL_PADRAO,
  refeicoes: REFEICOES_PADRAO.map(n=>({nome:n,itens:[]})),
});

export default function DarkDietPage() {
  const [dia, setDia]               = useState<DiaRegistro>(diaVazio(hoje()));
  const [historico, setHistorico]   = useState<DiaRegistro[]>([]);
  const [view, setView]             = useState<'home'|'historico'|'meta'>('home');
  const [modalRef, setModalRef]     = useState<number|null>(null); // índice da refeição
  const [busca, setBusca]           = useState('');
  const [alimentoSel, setAlimentoSel] = useState<Alimento|null>(null);
  const [porcao, setPorcao]         = useState('100');
  const [editMeta, setEditMeta]     = useState(String(META_CAL_PADRAO));

  const totais = calcMacros(dia.refeicoes.flatMap(r=>r.itens));
  const pctCal = Math.min(100, Math.round((totais.cal / dia.metaCal) * 100));
  const alimentosFiltrados = ALIMENTOS_MOCK.filter(a=>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const addItem = () => {
    if(!alimentoSel || modalRef===null) return;
    const item:ItemRefeicao = {...alimentoSel, porcao:parseFloat(porcao)||100, id:Date.now().toString()};
    setDia(d=>{
      const refs = d.refeicoes.map((r,i)=>
        i===modalRef ? {...r,itens:[...r.itens,item]} : r
      );
      return {...d,refeicoes:refs};
    });
    setAlimentoSel(null); setPorcao('100'); setBusca('');
  };

  const removeItem = (refIdx:number, itemId:string) => {
    setDia(d=>({
      ...d,
      refeicoes:d.refeicoes.map((r,i)=>
        i===refIdx?{...r,itens:r.itens.filter(it=>it.id!==itemId)}:r
      ),
    }));
  };

  const addAgua = () => setDia(d=>({...d,agua:Math.min(META_AGUA,d.agua+1)}));
  const remAgua = () => setDia(d=>({...d,agua:Math.max(0,d.agua-1)}));

  const salvarDia = () => {
    setHistorico(h=>{
      const sem = h.filter(d=>d.data!==dia.data);
      return [dia,...sem].sort((a,b)=>b.data.localeCompare(a.data));
    });
  };

  // ── MODAL busca alimento ─────────────────────────────────────────────
  const ModalBusca = () => (
    <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end'}}>
      <div style={{background:'#0e0e11',borderTop:'1px solid #202028',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'85vh',display:'flex',flexDirection:'column',padding:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.85rem'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2'}}>
            Adicionar a: {modalRef!==null?dia.refeicoes[modalRef].nome:''}
          </div>
          <button onClick={()=>{setModalRef(null);setAlimentoSel(null);setBusca('');}} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',color:'#9898a8',fontSize:'1rem',cursor:'pointer'}}>✕</button>
        </div>

        {!alimentoSel ? (
          <>
            <input value={busca} onChange={e=>setBusca(e.target.value)}
              placeholder="Buscar alimento..."
              style={{background:'#111115',border:'1px solid #222227',borderRadius:'10px',color:'#eaeaea',padding:'10px 13px',fontSize:'.9rem',outline:'none',marginBottom:'.75rem'}}/>
            <div style={{overflowY:'auto',display:'grid',gap:'.4rem'}}>
              {alimentosFiltrados.map((a,i)=>(
                <button key={i} onClick={()=>setAlimentoSel(a)} style={{
                  background:'rgba(255,255,255,.03)',border:'1px solid #202028',
                  borderRadius:'10px',padding:'.75rem 1rem',textAlign:'left',cursor:'pointer',
                  display:'flex',alignItems:'center',gap:'.75rem',
                }}>
                  <span style={{fontSize:'1.3rem'}}>{a.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'.9rem',fontWeight:600,color:'#f0f0f2'}}>{a.nome}</div>
                    <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'2px'}}>
                      {a.cal}kcal · P:{a.prot}g · C:{a.carb}g · G:{a.gord}g (por 100g)
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{display:'grid',gap:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'.75rem',background:'rgba(255,255,255,.04)',border:'1px solid #202028',borderRadius:'12px',padding:'1rem'}}>
              <span style={{fontSize:'2rem'}}>{alimentoSel.icon}</span>
              <div>
                <div style={{fontWeight:700,fontSize:'1rem',color:'#f0f0f2'}}>{alimentoSel.nome}</div>
                <div style={{fontSize:'.68rem',color:'#5a5a6a'}}>por 100g</div>
              </div>
            </div>
            <div>
              <label style={{fontSize:'.68rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'5px'}}>Porção (gramas)</label>
              <input type="number" value={porcao} onChange={e=>setPorcao(e.target.value)}
                style={{width:'100%',background:'#111115',border:'1px solid #222227',borderRadius:'10px',color:'#eaeaea',padding:'11px 13px',fontSize:'1.1rem',outline:'none',fontWeight:600}}/>
            </div>
            {/* Preview macros */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'.4rem'}}>
              {[
                {val:Math.round(alimentoSel.cal*parseFloat(porcao||'0')/100),  lbl:'kcal', cor:'#e31b23'},
                {val:Math.round(alimentoSel.prot*parseFloat(porcao||'0')/100), lbl:'prot',  cor:'#60a5fa'},
                {val:Math.round(alimentoSel.carb*parseFloat(porcao||'0')/100), lbl:'carb',  cor:'#34d399'},
                {val:Math.round(alimentoSel.gord*parseFloat(porcao||'0')/100), lbl:'gord',  cor:'#f472b6'},
              ].map((m,i)=>(
                <div key={i} style={{background:'rgba(0,0,0,.3)',borderRadius:'8px',padding:'.5rem',textAlign:'center'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:m.cor}}>{m.val}</div>
                  <div style={{fontSize:'.52rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.lbl}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'.5rem'}}>
              <button onClick={()=>setAlimentoSel(null)} style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'10px',padding:'12px',color:'#9898a8',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer'}}>← Voltar</button>
              <button onClick={addItem} style={{flex:2,background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'12px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',boxShadow:'0 4px 16px rgba(227,27,35,.28)'}}>Adicionar ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── HISTÓRICO ─────────────────────────────────────────────────────────
  if(view==='historico') return (
    <PageShell>
      <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
        <button onClick={()=>setView('home')} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.4rem .8rem',color:'#9898a8',fontSize:'.8rem',fontWeight:700,cursor:'pointer'}}>← Voltar</button>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#f0f0f2'}}>Histórico</div>
      </div>
      {historico.length===0?(
        <div style={{textAlign:'center',padding:'3rem',border:'1px dashed #202028',borderRadius:'12px'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'.75rem'}}>📅</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.4rem'}}>Nenhum registro ainda</div>
          <div style={{fontSize:'.8rem',color:'#5a5a6a'}}>Salve o dia atual para ver o histórico</div>
        </div>
      ):(
        <div style={{display:'grid',gap:'.6rem'}}>
          {historico.map((d,i)=>{
            const t=calcMacros(d.refeicoes.flatMap(r=>r.itens));
            return(
              <div key={i} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'12px',padding:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.6rem'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#f0f0f2'}}>{fmtData(d.data)}</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:t.cal<=d.metaCal?'#22c55e':'#e31b23'}}>{t.cal} kcal</div>
                </div>
                <div style={{background:'#16161c',borderRadius:'3px',height:'3px',marginBottom:'.5rem'}}>
                  <div style={{height:'100%',borderRadius:'3px',background:t.cal<=d.metaCal?'#22c55e':'#e31b23',width:`${Math.min(100,Math.round(t.cal/d.metaCal*100))}%`}}/>
                </div>
                <div style={{display:'flex',gap:'1rem'}}>
                  {[['P',t.prot+'g','#60a5fa'],['C',t.carb+'g','#34d399'],['G',t.gord+'g','#f472b6']].map(([l,v,c])=>(
                    <div key={l} style={{fontSize:'.72rem',color:'#5a5a6a'}}><span style={{color:c,fontWeight:700}}>{l}</span> {v}</div>
                  ))}
                  <div style={{fontSize:'.72rem',color:'#5a5a6a',marginLeft:'auto'}}>💧 {d.agua}/{META_AGUA}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );

  // ── HOME ──────────────────────────────────────────────────────────────
  return (
    <>
      {modalRef!==null && <ModalBusca/>}
      <PageShell>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',lineHeight:1}}>
              DARK<span style={{color:'#22c55e'}}>DIET</span>
            </div>
            <div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'3px'}}>{fmtData(dia.data)}</div>
          </div>
          <div style={{display:'flex',gap:'.4rem'}}>
            <button onClick={()=>setView('historico')} style={{background:'rgba(255,255,255,.06)',border:'1px solid #202028',borderRadius:'8px',padding:'.4rem .7rem',color:'#9898a8',fontSize:'.72rem',fontWeight:700,cursor:'pointer'}}>📅</button>
            <button onClick={salvarDia} style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.25)',borderRadius:'8px',padding:'.4rem .7rem',color:'#22c55e',fontSize:'.72rem',fontWeight:700,cursor:'pointer'}}>Salvar</button>
          </div>
        </div>

        {/* Resumo calórico */}
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'16px',padding:'1.1rem',marginBottom:'.75rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'.75rem'}}>
            <div>
              <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'2px'}}>Calorias hoje</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2.2rem',color:pctCal>=100?'#e31b23':'#22c55e',lineHeight:1}}>
                {totais.cal}
                <span style={{fontSize:'1rem',color:'#5a5a6a',marginLeft:'4px'}}>/ {dia.metaCal}</span>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',color:pctCal>=100?'#e31b23':''}}>{pctCal}%</div>
              <div style={{fontSize:'.58rem',color:'#5a5a6a'}}>da meta</div>
            </div>
          </div>
          <div style={{background:'#16161c',borderRadius:'4px',height:'6px',marginBottom:'.75rem'}}>
            <div style={{height:'100%',borderRadius:'4px',background:pctCal>=100?'#e31b23':'linear-gradient(90deg,#22c55e,#4ade80)',width:`${pctCal}%`,transition:'width .4s',boxShadow:pctCal>=100?'0 0 12px rgba(227,27,35,.4)':'0 0 12px rgba(34,197,94,.35)'}}/>
          </div>
          {/* Macros */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.5rem'}}>
            {[
              {lbl:'Proteína',val:totais.prot,meta:180, cor:'#60a5fa', unit:'g'},
              {lbl:'Carboidrato',val:totais.carb,meta:300,cor:'#34d399',unit:'g'},
              {lbl:'Gordura',val:totais.gord,meta:65,  cor:'#f472b6', unit:'g'},
            ].map((m,i)=>(
              <div key={i} style={{background:'rgba(0,0,0,.3)',borderRadius:'10px',padding:'.6rem .5rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',color:m.cor,lineHeight:1}}>{m.val}<span style={{fontSize:'.65rem'}}>{m.unit}</span></div>
                <div style={{background:'rgba(255,255,255,.06)',borderRadius:'3px',height:'3px',margin:'.3rem 0'}}>
                  <div style={{height:'100%',borderRadius:'3px',background:m.cor,width:`${Math.min(100,Math.round(m.val/m.meta*100))}%`}}/>
                </div>
                <div style={{fontSize:'.52rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Água */}
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'14px',padding:'1rem',marginBottom:'.75rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
            <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em'}}>💧 Água</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',color:'#38bdf8'}}>{dia.agua}/{META_AGUA} copos</div>
          </div>
          <div style={{display:'flex',gap:'.3rem',marginBottom:'.6rem'}}>
            {Array.from({length:META_AGUA}).map((_,i)=>(
              <div key={i} style={{flex:1,height:'28px',borderRadius:'5px',background:i<dia.agua?'#38bdf8':'rgba(255,255,255,.06)',border:`1px solid ${i<dia.agua?'rgba(56,189,248,.4)':'#202028'}`,transition:'all .2s'}}/>
            ))}
          </div>
          <div style={{display:'flex',gap:'.5rem'}}>
            <button onClick={remAgua} style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid #202028',borderRadius:'8px',padding:'.45rem',color:'#9898a8',fontSize:'.9rem',cursor:'pointer',fontWeight:700}}>−</button>
            <button onClick={addAgua} style={{flex:2,background:'rgba(56,189,248,.12)',border:'1px solid rgba(56,189,248,.25)',borderRadius:'8px',padding:'.45rem',color:'#38bdf8',fontSize:'.82rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase',letterSpacing:'.04em'}}>+ 1 Copo</button>
          </div>
        </div>

        {/* Refeições */}
        <div style={{fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#5a5a6a',marginBottom:'.6rem'}}>Refeições</div>
        <div style={{display:'grid',gap:'.65rem'}}>
          {dia.refeicoes.map((ref,ri)=>{
            const macRef = calcMacros(ref.itens);
            return(
              <div key={ri} style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'14px',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.85rem 1rem',borderBottom:ref.itens.length>0?'1px solid #1a1a20':'none'}}>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1rem',textTransform:'uppercase',color:'#f0f0f2',letterSpacing:'.04em'}}>{ref.nome}</div>
                    {macRef.cal>0&&<div style={{fontSize:'.65rem',color:'#5a5a6a',marginTop:'1px'}}>{macRef.cal} kcal · P:{macRef.prot}g · C:{macRef.carb}g</div>}
                  </div>
                  <button onClick={()=>setModalRef(ri)} style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.25)',borderRadius:'8px',padding:'.35rem .7rem',color:'#22c55e',fontSize:'.75rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase',letterSpacing:'.04em'}}>+ Add</button>
                </div>
                {ref.itens.map((it,ii)=>(
                  <div key={it.id} style={{display:'flex',alignItems:'center',gap:'.65rem',padding:'.6rem 1rem',borderBottom:ii<ref.itens.length-1?'1px solid #111':'none'}}>
                    <span style={{fontSize:'1.1rem'}}>{it.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'.85rem',fontWeight:600,color:'#f0f0f2'}}>{it.nome}</div>
                      <div style={{fontSize:'.62rem',color:'#5a5a6a'}}>{it.porcao}g · {Math.round(it.cal*it.porcao/100)} kcal</div>
                    </div>
                    <button onClick={()=>removeItem(ri,it.id)} style={{background:'none',border:'none',color:'#323240',fontSize:'1rem',cursor:'pointer',padding:'.2rem'}}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Meta calórica */}
        <div style={{background:'#0e0e11',border:'1px solid #202028',borderRadius:'14px',padding:'1rem',marginTop:'.75rem'}}>
          <div style={{fontSize:'.62rem',color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.6rem'}}>🎯 Meta calórica</div>
          <div style={{display:'flex',gap:'.5rem'}}>
            <input type="number" value={editMeta} onChange={e=>setEditMeta(e.target.value)}
              style={{flex:1,background:'#111115',border:'1px solid #222227',borderRadius:'10px',color:'#eaeaea',padding:'10px 13px',fontSize:'1rem',outline:'none',fontWeight:600}}/>
            <button onClick={()=>setDia(d=>({...d,metaCal:parseInt(editMeta)||META_CAL_PADRAO}))} style={{background:'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'10px',padding:'10px 1.1rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer'}}>Salvar</button>
          </div>
        </div>
      </PageShell>
    </>
  );
}
