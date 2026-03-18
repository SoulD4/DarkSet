'use client';
import { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

type Ex = {id:string;name:string;primary:string;equipment:string;difficulty:string};
type Item = {exId:string;name:string;setsPlanned:number;repsTarget:string};
type Plan = {id:string;name:string;byDay:Record<string,Item[]>};

const mkEx = (name:string,primary:string,equipment:string,difficulty='intermediário'):Ex => ({
  id: name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''),
  name, primary, equipment, difficulty
});

const EXS:Ex[] = [
  mkEx('Supino reto barra','Peito','Barra'),
  mkEx('Supino reto halteres','Peito','Halteres'),
  mkEx('Supino inclinado barra','Peito','Barra'),
  mkEx('Supino inclinado halteres','Peito','Halteres'),
  mkEx('Supino declinado barra','Peito','Barra'),
  mkEx('Crucifixo reto halteres','Peito','Halteres','iniciante'),
  mkEx('Crucifixo inclinado halteres','Peito','Halteres','iniciante'),
  mkEx('Crucifixo Máquina','Peito','Máquina','iniciante'),
  mkEx('Crossover polia alta','Peito','Cabo/Crossover'),
  mkEx('Flexão de braço','Peito','Peso corporal','iniciante'),
  mkEx('Desenvolvimento barra','Ombro','Barra'),
  mkEx('Desenvolvimento halteres','Ombro','Halteres'),
  mkEx('Desenvolvimento máquina','Ombro','Máquina','iniciante'),
  mkEx('Elevação lateral halteres','Ombro','Halteres','iniciante'),
  mkEx('Elevação lateral polia','Ombro','Cabo/Crossover','iniciante'),
  mkEx('Elevação frontal halteres','Ombro','Halteres','iniciante'),
  mkEx('Crucifixo inverso halteres','Ombro','Halteres','iniciante'),
  mkEx('Face Pull corda','Ombro','Cabo/Crossover','iniciante'),
  mkEx('Arnold press halteres','Ombro','Halteres','avançado'),
  mkEx('Encolhimento barra','Trapézio','Barra','iniciante'),
  mkEx('Encolhimento halteres','Trapézio','Halteres','iniciante'),
  mkEx('Barra fixa','Costas','Peso corporal','avançado'),
  mkEx('Pulldown','Costas','Cabo/Crossover','iniciante'),
  mkEx('Puxada alta aberta','Costas','Cabo/Crossover'),
  mkEx('Puxada fechada','Costas','Cabo/Crossover','iniciante'),
  mkEx('Remada curvada barra','Costas','Barra'),
  mkEx('Remada curvada halteres','Costas','Halteres'),
  mkEx('Remada serrote halteres','Costas','Halteres','iniciante'),
  mkEx('Remada baixa polia','Costas','Cabo/Crossover'),
  mkEx('Remada articulada','Costas','Máquina'),
  mkEx('Rosca direta barra','Bíceps','Barra'),
  mkEx('Rosca direta halteres','Bíceps','Halteres'),
  mkEx('Rosca alternada halteres','Bíceps','Halteres'),
  mkEx('Rosca martelo halteres','Bíceps','Halteres'),
  mkEx('Rosca concentrada halteres','Bíceps','Halteres','iniciante'),
  mkEx('Rosca Scott máquina','Bíceps','Máquina','iniciante'),
  mkEx('Tríceps pulley barra reta','Tríceps','Cabo/Crossover','iniciante'),
  mkEx('Tríceps pulley corda','Tríceps','Cabo/Crossover','iniciante'),
  mkEx('Tríceps francês barra','Tríceps','Barra'),
  mkEx('Tríceps francês halteres','Tríceps','Halteres'),
  mkEx('Tríceps testa barra W','Tríceps','Barra'),
  mkEx('Paralelas','Tríceps','Peso corporal','avançado'),
  mkEx('Agachamento livre','Quadríceps','Barra','avançado'),
  mkEx('Agachamento hack máquina','Quadríceps','Máquina','iniciante'),
  mkEx('Leg press 45','Quadríceps','Máquina'),
  mkEx('Cadeira extensora','Quadríceps','Máquina','iniciante'),
  mkEx('Afundo com halteres','Quadríceps','Halteres'),
  mkEx('Stiff barra','Posterior de Coxa','Barra'),
  mkEx('Stiff halteres','Posterior de Coxa','Halteres'),
  mkEx('Cadeira flexora','Posterior de Coxa','Máquina','iniciante'),
  mkEx('Mesa flexora','Posterior de Coxa','Máquina'),
  mkEx('Hip Thrust barra','Glúteo','Barra'),
  mkEx('Hip Thrust máquina','Glúteo','Máquina','iniciante'),
  mkEx('Extensão lombar máquina','Lombar','Máquina','iniciante'),
  mkEx('Panturrilha em pé máquina','Panturrilha','Máquina','iniciante'),
  mkEx('Panturrilha sentado','Panturrilha','Máquina','iniciante'),
  mkEx('Abdominal crunch','Abdômen','Peso corporal','iniciante'),
  mkEx('Prancha','Abdômen','Peso corporal','iniciante'),
  mkEx('Abdominal máquina','Abdômen','Máquina','iniciante'),
];

const MUSCLES = Array.from(new Set(EXS.map(e=>e.primary)));
const EQUIPS  = Array.from(new Set(EXS.map(e=>e.equipment)));
const GROUP_ORDER = ['Peito','Ombro','Trapézio','Costas','Bíceps','Tríceps','Quadríceps','Posterior de Coxa','Glúteo','Lombar','Panturrilha','Abdômen'];

const emptyByDay = ():Record<string,Item[]> => Object.fromEntries(DAYS.map(d=>[d,[]]));

const PRESET_PLANS:Plan[] = [
  {
    id:'preset_abc', name:'ABC — Clássico',
    byDay:{
      Segunda:[
        {exId:'supino_reto_barra',name:'Supino reto barra',setsPlanned:4,repsTarget:'8-12'},
        {exId:'supino_inclinado_halteres',name:'Supino inclinado halteres',setsPlanned:3,repsTarget:'10-12'},
        {exId:'crucifixo_reto_halteres',name:'Crucifixo reto halteres',setsPlanned:3,repsTarget:'12'},
        {exId:'paralelas',name:'Paralelas',setsPlanned:3,repsTarget:'10'},
      ],
      Terça:[
        {exId:'remada_curvada_barra',name:'Remada curvada barra',setsPlanned:4,repsTarget:'8-12'},
        {exId:'pulldown',name:'Pulldown',setsPlanned:3,repsTarget:'10-12'},
        {exId:'remada_serrote_halteres',name:'Remada serrote halteres',setsPlanned:3,repsTarget:'12'},
        {exId:'barra_fixa',name:'Barra fixa',setsPlanned:3,repsTarget:'8'},
      ],
      Quarta:[
        {exId:'agachamento_livre',name:'Agachamento livre',setsPlanned:4,repsTarget:'8-12'},
        {exId:'leg_press_45',name:'Leg press 45',setsPlanned:4,repsTarget:'10-12'},
        {exId:'cadeira_extensora',name:'Cadeira extensora',setsPlanned:3,repsTarget:'12'},
        {exId:'stiff_barra',name:'Stiff barra',setsPlanned:3,repsTarget:'12'},
      ],
      Quinta:[],Sexta:[],Sábado:[],Domingo:[],
    }
  },
];

// ── BUILDER ──────────────────────────────────────────────────────────────
function Builder({plan, onSave, onBack}:{plan:Plan; onSave:(p:Plan)=>Promise<void>; onBack:()=>void}) {
  const [local, setLocal]         = useState<Plan>(JSON.parse(JSON.stringify(plan)));
  const [day, setDay]             = useState(DAYS[0]);
  const [tab, setTab]             = useState<'ficha'|'buscar'>('ficha');
  const [busca, setBusca]         = useState('');
  const [filtMuscle, setFiltMuscle] = useState('');
  const [filtEquip, setFiltEquip]   = useState('');
  const [saving, setSaving]       = useState(false);

  const dayItems = local.byDay[day] || [];

  const exsFiltrados = useMemo(()=>
    EXS.filter(ex=>
      ex.name.toLowerCase().includes(busca.toLowerCase()) &&
      (!filtMuscle || ex.primary===filtMuscle) &&
      (!filtEquip  || ex.equipment===filtEquip)
    ).sort((a,b)=>GROUP_ORDER.indexOf(a.primary)-GROUP_ORDER.indexOf(b.primary)||a.name.localeCompare(b.name,'pt'))
  ,[busca,filtMuscle,filtEquip]);

  const addEx = (ex:Ex) => {
    setLocal(prev=>{
      const copy = JSON.parse(JSON.stringify(prev));
      if(copy.byDay[day].some((it:Item)=>it.exId===ex.id)) return prev;
      copy.byDay[day].push({exId:ex.id,name:ex.name,setsPlanned:3,repsTarget:'10-12'});
      return copy;
    });
  };
  const removeItem = (i:number) => setLocal(prev=>{const copy=JSON.parse(JSON.stringify(prev));copy.byDay[day].splice(i,1);return copy;});
  const updateSets = (i:number,val:string) => setLocal(prev=>{const copy=JSON.parse(JSON.stringify(prev));copy.byDay[day][i].setsPlanned=Math.max(1,Math.min(10,parseInt(val)||3));return copy;});
  const updateReps = (i:number,val:string) => setLocal(prev=>{const copy=JSON.parse(JSON.stringify(prev));copy.byDay[day][i].repsTarget=val;return copy;});
  const move = (i:number,dir:number) => setLocal(prev=>{const copy=JSON.parse(JSON.stringify(prev));const arr=copy.byDay[day];const j=i+dir;if(j<0||j>=arr.length)return prev;[arr[i],arr[j]]=[arr[j],arr[i]];return copy;});

  const inp = {background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'6px',color:'#fff',outline:'none',textAlign:'center' as const};

  return (
    <PageShell>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
          <button onClick={onBack} style={{background:'rgba(255,255,255,.06)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .8rem',color:'#7a7a8a',fontSize:'.8rem',fontWeight:700,cursor:'pointer'}}>
            Voltar
          </button>
          <div>
            <div style={{fontSize:'.58rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.1em'}}>Editando</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{local.name}</div>
          </div>
        </div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',color:'#e31b23'}}>
          {Object.values(local.byDay).flat().length}<span style={{fontSize:'.75rem',color:'#484858'}}>ex</span>
        </div>
      </div>

      {/* Dias */}
      <div style={{display:'flex',gap:'.35rem',overflowX:'auto',marginBottom:'.75rem',paddingBottom:'.2rem'}}>
        {DAYS.map(dy=>{
          const count = local.byDay[dy]?.length||0;
          const active = day===dy;
          return (
            <button key={dy} onClick={()=>setDay(dy)} style={{
              flexShrink:0,padding:'.4rem .75rem',borderRadius:'10px',cursor:'pointer',
              background:active?'#e31b23':'rgba(255,255,255,.04)',
              border:'1px solid '+(active?'#e31b23':'#2e2e38'),
              color:active?'#fff':'#7a7a8a',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
              fontSize:'.82rem',textTransform:'uppercase',letterSpacing:'.04em',
              position:'relative',
            }}>
              {dy.slice(0,3)}
              {count>0 && (
                <span style={{position:'absolute',top:-6,right:-6,background:active?'#fff':'#e31b23',color:active?'#e31b23':'#fff',borderRadius:'50%',width:16,height:16,fontSize:'.55rem',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tabs builder */}
      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'3px',gap:'3px',marginBottom:'.75rem'}}>
        <button onClick={()=>setTab('ficha')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.8rem',textTransform:'uppercase',letterSpacing:'.04em',background:tab==='ficha'?'rgba(227,27,35,.15)':'transparent',color:tab==='ficha'?'#e31b23':'#7a7a8a',boxShadow:tab==='ficha'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none'}}>
          Ficha {day.slice(0,3)} ({dayItems.length})
        </button>
        <button onClick={()=>setTab('buscar')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.8rem',textTransform:'uppercase',letterSpacing:'.04em',background:tab==='buscar'?'rgba(227,27,35,.15)':'transparent',color:tab==='buscar'?'#e31b23':'#7a7a8a',boxShadow:tab==='buscar'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none'}}>
          + Adicionar
        </button>
      </div>

      {/* TAB FICHA */}
      {tab==='ficha' && (
        <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'12px',overflow:'hidden'}}>
          {dayItems.length===0 ? (
            <div style={{textAlign:'center',padding:'2.5rem 1rem'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.5rem',textTransform:'uppercase',color:'#484858',marginBottom:'.4rem'}}>Vazio</div>
              <div style={{fontSize:'.82rem',color:'#484858',marginBottom:'1rem'}}>Nenhum exercício para {day}</div>
              <button onClick={()=>setTab('buscar')} style={{background:'#e31b23',border:'none',borderRadius:'10px',padding:'.6rem 1.25rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer'}}>
                + Adicionar Exercício
              </button>
            </div>
          ) : (
            <div style={{padding:'.5rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 2.5rem 2.8rem 2rem 1.8rem',gap:'.4rem',padding:'.3rem .5rem',marginBottom:'.2rem'}}>
                {['#','EXERCÍCIO','SÉR','REPS','',''].map((h,i)=>(
                  <div key={i} style={{fontSize:'.52rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em'}}>{h}</div>
                ))}
              </div>
              {dayItems.map((it,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1.5rem 1fr 2.5rem 2.8rem 2rem 1.8rem',gap:'.4rem',alignItems:'center',background:'rgba(0,0,0,.25)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'.55rem .5rem',marginBottom:'.35rem'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',color:'#484858',textAlign:'center'}}>{i+1}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:'.82rem',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</div>
                    <div style={{fontSize:'.6rem',color:'#484858',marginTop:'1px'}}>{EXS.find(e=>e.id===it.exId)?.primary} · {EXS.find(e=>e.id===it.exId)?.equipment}</div>
                  </div>
                  <input type="number" min="1" max="10" value={it.setsPlanned} onChange={e=>updateSets(i,e.target.value)} style={{...inp,width:'100%',padding:'.3rem .2rem',fontSize:'.82rem'}}/>
                  <input type="text" maxLength={6} value={it.repsTarget} placeholder="reps" onChange={e=>updateReps(i,e.target.value)} style={{...inp,width:'100%',padding:'.3rem .2rem',fontSize:'.82rem'}}/>
                  <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                    <button onClick={()=>move(i,-1)} disabled={i===0} style={{background:'none',border:'1px solid #2e2e38',borderRadius:'4px',color:i===0?'#2e2e38':'#7a7a8a',padding:'2px 5px',cursor:i===0?'default':'pointer',fontSize:'.7rem',lineHeight:1}}>↑</button>
                    <button onClick={()=>move(i,1)} disabled={i===dayItems.length-1} style={{background:'none',border:'1px solid #2e2e38',borderRadius:'4px',color:i===dayItems.length-1?'#2e2e38':'#7a7a8a',padding:'2px 5px',cursor:i===dayItems.length-1?'default':'pointer',fontSize:'.7rem',lineHeight:1}}>↓</button>
                  </div>
                  <button onClick={()=>removeItem(i)} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.2)',borderRadius:'6px',color:'#e31b23',padding:'.35rem .3rem',cursor:'pointer',fontSize:'.75rem',fontWeight:700,lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB BUSCAR */}
      {tab==='buscar' && (
        <div style={{background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'12px',overflow:'hidden'}}>
          <div style={{padding:'.75rem'}}>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar exercício…" style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',color:'#f0f0f2',padding:'10px 13px',fontSize:'.9rem',outline:'none',marginBottom:'.5rem'}}/>
            <div style={{display:'flex',gap:'.4rem',marginBottom:'.5rem'}}>
              <select value={filtMuscle} onChange={e=>setFiltMuscle(e.target.value)} style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .6rem',fontSize:'.78rem',color:filtMuscle?'#f0f0f2':'#7a7a8a',cursor:'pointer',outline:'none'}}>
                <option value="">Músculo</option>
                {MUSCLES.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filtEquip} onChange={e=>setFiltEquip(e.target.value)} style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .6rem',fontSize:'.78rem',color:filtEquip?'#f0f0f2':'#7a7a8a',cursor:'pointer',outline:'none'}}>
                <option value="">Equipamento</option>
                {EQUIPS.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{fontSize:'.62rem',color:'#484858',textTransform:'uppercase',letterSpacing:'.07em'}}>{exsFiltrados.length} exercício(s)</div>
          </div>
          <div style={{maxHeight:380,overflowY:'auto',padding:'0 .75rem .75rem'}}>
            {(()=>{
              const rows:React.ReactNode[] = [];
              let lastGroup = '';
              exsFiltrados.forEach((ex,idx)=>{
                if(ex.primary!==lastGroup){
                  lastGroup=ex.primary;
                  rows.push(<div key={'g_'+ex.primary} style={{fontSize:'.62rem',fontWeight:800,color:'#e31b23',textTransform:'uppercase',letterSpacing:'.1em',padding:'.4rem .3rem .2rem',borderBottom:'1px solid rgba(227,27,35,.15)',marginTop:idx?'.4rem':0}}>{ex.primary}</div>);
                }
                const added = dayItems.some(it=>it.exId===ex.id);
                rows.push(
                  <button key={ex.id} onClick={()=>!added&&addEx(ex)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:added?'rgba(34,197,94,.06)':'rgba(255,255,255,.02)',border:'1px solid '+(added?'rgba(34,197,94,.2)':'#2e2e38'),borderRadius:'8px',padding:'.55rem .75rem',textAlign:'left',cursor:added?'default':'pointer',marginBottom:'.3rem'}}>
                    <div>
                      <div style={{fontSize:'.85rem',fontWeight:600,color:added?'#4ade80':'#f0f0f2'}}>{ex.name}</div>
                      <div style={{fontSize:'.62rem',color:'#484858',marginTop:'1px'}}>{ex.equipment} · {ex.difficulty}</div>
                    </div>
                    <span style={{fontSize:'.9rem',color:added?'#4ade80':'#484858',flexShrink:0}}>{added?'✓':'+'}</span>
                  </button>
                );
              });
              return rows;
            })()}
          </div>
        </div>
      )}

      <button onClick={async()=>{setSaving(true);await onSave(local);setSaving(false);onBack();}} disabled={saving} style={{width:'100%',marginTop:'.85rem',background:saving?'rgba(227,27,35,.4)':'linear-gradient(135deg,#e31b23,#b31217)',border:'none',borderRadius:'14px',padding:'14px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1rem',textTransform:'uppercase',letterSpacing:'.05em',cursor:saving?'not-allowed':'pointer',boxShadow:saving?'none':'0 4px 20px rgba(227,27,35,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
        {saving && <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spinCw .6s linear infinite'}}/>}
        Salvar Ficha
      </button>
    </PageShell>
  );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────
export default function TreinoPage() {
  const [uid, setUid]             = useState<string|null>(null);
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [activeId, setActiveId]   = useState<string|null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [newName, setNewName]     = useState('');
  const [editPlan, setEditPlan]   = useState<Plan|null>(null);
  const [tab, setTab]             = useState<'minhas'|'prontas'>('minhas');
  const [previewId, setPreviewId] = useState<string|null>(null);
  const [renameId, setRenameId]   = useState<string|null>(null);
  const [toast, setToast]         = useState('');

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const d = await getDoc(doc(db,'users',u.uid,'data','plans'));
        if(d.exists()){
          const p = d.data().payload ? JSON.parse(d.data().payload) : {list:[],activeId:null};
          setPlans(p.list||[]);
          setActiveId(p.activeId||null);
        }
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  const savePlans = async (newList:Plan[], newActive:string|null) => {
    if(!uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db,'users',uid,'data','plans'),{payload:JSON.stringify({list:newList,activeId:newActive}),updatedAt:Date.now()});
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const createPlan = async () => {
    const name = newName.trim() || ('Minha Ficha '+(plans.length+1));
    const plan:Plan = {id:'plan_'+Date.now(),name,byDay:emptyByDay()};
    const newList = [...plans,plan];
    const newActive = activeId||plan.id;
    setPlans(newList); setActiveId(newActive); setNewName('');
    await savePlans(newList,newActive);
    setEditPlan(plan);
  };

  const handleSavePlan = async (updated:Plan) => {
    const newList = plans.map(p=>p.id===updated.id?updated:p);
    setPlans(newList);
    await savePlans(newList,activeId);
    showToast('Ficha salva!');
  };

  const deletePlan = async (id:string) => {
    const newList = plans.filter(p=>p.id!==id);
    const newActive = activeId===id?(newList[0]?.id||null):activeId;
    setPlans(newList); setActiveId(newActive);
    await savePlans(newList,newActive);
    showToast('Ficha excluída');
  };

  const importPreset = async (preset:Plan) => {
    const plan:Plan = {...JSON.parse(JSON.stringify(preset)),id:'plan_'+Date.now()};
    const newList = [...plans,plan];
    const newActive = activeId||plan.id;
    setPlans(newList); setActiveId(newActive);
    await savePlans(newList,newActive);
    showToast('Ficha importada!');
    setTab('minhas');
  };

  const totalExsByDay = (pl:Plan) => Object.values(pl.byDay).flat().length;

  if(editPlan) return <Builder plan={editPlan} onSave={handleSavePlan} onBack={()=>setEditPlan(null)}/>;

  if(loading) return (
    <PageShell>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
        <div style={{width:32,height:32,border:'3px solid rgba(255,255,255,.08)',borderTopColor:'#e31b23',borderRadius:'50%',animation:'spinCw .65s linear infinite'}}/>
      </div>
    </PageShell>
  );

  const card = {background:'#1e1e24',border:'1px solid #2e2e38',borderRadius:'14px'};

  return (
    <PageShell>
      {toast && (
        <div style={{position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(34,197,94,.15)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'999px',padding:'.45rem 1rem',fontSize:'.82rem',color:'#4ade80',fontWeight:600,whiteSpace:'nowrap'}}>
          {toast}
        </div>
      )}

      <div style={{marginBottom:'1.25rem'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>
          Fichas de Treino
        </div>
        <div style={{fontSize:'.65rem',color:'#7a7a8a',marginTop:'3px'}}>{plans.length} ficha(s) salva(s)</div>
      </div>

      {/* Nova ficha */}
      <div style={{...card,padding:'1rem',marginBottom:'.75rem'}}>
        <div style={{fontSize:'.62rem',color:'#7a7a8a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.5rem'}}>Nova ficha</div>
        <div style={{display:'flex',gap:'.5rem'}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPlan()} placeholder="Nome da ficha…" style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'10px 13px',fontSize:'.9rem',color:'#f0f0f2',outline:'none'}}/>
          <button onClick={createPlan} disabled={saving} style={{flexShrink:0,background:'#e31b23',border:'none',borderRadius:'10px',padding:'10px 16px',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.9rem',textTransform:'uppercase',cursor:'pointer'}}>
            + Criar
          </button>
        </div>
      </div>

      {/* Tabs principais */}
      <div style={{display:'flex',background:'rgba(0,0,0,.4)',border:'1px solid #2e2e38',borderRadius:'10px',padding:'3px',gap:'3px',marginBottom:'.75rem'}}>
        <button onClick={()=>setTab('minhas')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',letterSpacing:'.04em',background:tab==='minhas'?'rgba(227,27,35,.15)':'transparent',color:tab==='minhas'?'#e31b23':'#7a7a8a',boxShadow:tab==='minhas'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none'}}>
          Minhas Fichas
        </button>
        <button onClick={()=>setTab('prontas')} style={{flex:1,padding:'.44rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'.82rem',textTransform:'uppercase',letterSpacing:'.04em',background:tab==='prontas'?'rgba(227,27,35,.15)':'transparent',color:tab==='prontas'?'#e31b23':'#7a7a8a',boxShadow:tab==='prontas'?'inset 0 0 0 1px rgba(227,27,35,.3)':'none'}}>
          Fichas Prontas
        </button>
      </div>

      {/* MINHAS FICHAS */}
      {tab==='minhas' && (
        plans.length===0 ? (
          <div style={{textAlign:'center',padding:'3rem 1rem',border:'1px dashed #2e2e38',borderRadius:'12px'}}>
            <div style={{fontSize:'3rem',marginBottom:'.75rem'}}>📋</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.3rem',textTransform:'uppercase',color:'#f0f0f2',marginBottom:'.4rem'}}>Sem fichas ainda</div>
            <div style={{fontSize:'.82rem',color:'#7a7a8a',marginBottom:'1rem'}}>Crie uma ficha ou importe uma pronta</div>
            <button onClick={()=>setTab('prontas')} style={{background:'#e31b23',border:'none',borderRadius:'10px',padding:'.6rem 1.25rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.85rem',textTransform:'uppercase',cursor:'pointer'}}>
              Ver fichas prontas
            </button>
          </div>
        ) : (
          <div style={{display:'grid',gap:'.65rem'}}>
            {plans.map(pl=>{
              const isActive = activeId===pl.id;
              return (
                <div key={pl.id} style={{...card,padding:'1rem',borderLeft:'2px solid '+(isActive?'#e31b23':'transparent')}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'.6rem'}}>
                    <button onClick={async()=>{const nA=isActive?null:pl.id;setActiveId(nA);await savePlans(plans,nA);}} style={{width:20,height:20,borderRadius:'50%',flexShrink:0,cursor:'pointer',background:isActive?'#e31b23':'transparent',border:'2px solid '+(isActive?'#e31b23':'#484858'),display:'flex',alignItems:'center',justifyContent:'center',boxShadow:isActive?'0 0 8px rgba(227,27,35,.4)':'none'}}>
                      {isActive && <div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                    </button>
                    {renameId===pl.id ? (
                      <input autoFocus value={pl.name} onChange={e=>setPlans(prev=>prev.map(p=>p.id===pl.id?{...p,name:e.target.value}:p))} onBlur={async()=>{setRenameId(null);await savePlans(plans,activeId);}} onKeyDown={e=>{if(e.key==='Enter'){setRenameId(null);savePlans(plans,activeId);}}} style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid #e31b23',borderRadius:'8px',padding:'.4rem .7rem',fontSize:'.95rem',color:'#f0f0f2',fontWeight:600,outline:'none'}}/>
                    ) : (
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {pl.name}
                          {isActive && <span style={{marginLeft:'.5rem',fontSize:'.55rem',color:'#e31b23',fontWeight:700,letterSpacing:'.06em',verticalAlign:'middle'}}>ATIVA</span>}
                        </div>
                        <div style={{fontSize:'.68rem',color:'#484858',marginTop:'1px'}}>{totalExsByDay(pl)} exercício(s)</div>
                      </div>
                    )}
                  </div>

                  <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.75rem'}}>
                    {DAYS.map(d=>{
                      const n = pl.byDay?.[d]?.length||0;
                      return n>0 ? (
                        <span key={d} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.18)',borderRadius:'5px',padding:'2px 7px',fontSize:'.62rem',color:'#e31b23',fontWeight:700}}>{d.slice(0,3)} {n}</span>
                      ) : (
                        <span key={d} style={{background:'rgba(255,255,255,.03)',border:'1px solid #2e2e38',borderRadius:'5px',padding:'2px 7px',fontSize:'.62rem',color:'#2e2e38'}}>{d.slice(0,3)}</span>
                      );
                    })}
                  </div>

                  <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap'}}>
                    <button onClick={()=>setEditPlan(pl)} style={{background:'#e31b23',border:'none',borderRadius:'8px',padding:'.4rem .85rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.75rem',textTransform:'uppercase',cursor:'pointer'}}>Editar</button>
                    <button onClick={()=>setRenameId(renameId===pl.id?null:pl.id)} style={{background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .75rem',color:'#7a7a8a',fontSize:'.75rem',fontWeight:600,cursor:'pointer'}}>Renomear</button>
                    <button onClick={async()=>{const clone={...JSON.parse(JSON.stringify(pl)),id:'plan_'+Date.now(),name:pl.name+' (cópia)'};const nl=[...plans,clone];setPlans(nl);await savePlans(nl,activeId);showToast('Duplicada!');}} style={{background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.4rem .75rem',color:'#7a7a8a',fontSize:'.75rem',fontWeight:600,cursor:'pointer'}}>Duplicar</button>
                    <button onClick={()=>deletePlan(pl.id)} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.18)',borderRadius:'8px',padding:'.4rem .6rem',color:'#e31b23',fontSize:'.75rem',fontWeight:700,cursor:'pointer'}}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* FICHAS PRONTAS */}
      {tab==='prontas' && (
        <div style={{display:'grid',gap:'.65rem'}}>
          {PRESET_PLANS.map(preset=>(
            <div key={preset.id} style={{...card,padding:'1rem'}}>
              <div style={{marginBottom:'.6rem'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.1rem',textTransform:'uppercase',color:'#f0f0f2',lineHeight:1}}>{preset.name}</div>
                <div style={{fontSize:'.68rem',color:'#7a7a8a',marginTop:'3px'}}>{totalExsByDay(preset)} exercícios</div>
              </div>
              <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.75rem'}}>
                {DAYS.filter(d=>preset.byDay[d]?.length>0).map(d=>(
                  <span key={d} style={{background:'rgba(227,27,35,.08)',border:'1px solid rgba(227,27,35,.18)',borderRadius:'5px',padding:'2px 7px',fontSize:'.62rem',color:'#e31b23',fontWeight:700}}>
                    {d.slice(0,3)} {preset.byDay[d].length}ex
                  </span>
                ))}
              </div>
              <div style={{display:'flex',gap:'.5rem'}}>
                <button onClick={()=>setPreviewId(previewId===preset.id?null:preset.id)} style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid #2e2e38',borderRadius:'8px',padding:'.5rem',color:'#7a7a8a',fontSize:'.78rem',fontWeight:700,cursor:'pointer'}}>
                  {previewId===preset.id?'Fechar':'Ver exercícios'}
                </button>
                <button onClick={()=>importPreset(preset)} style={{flex:1,background:'#e31b23',border:'none',borderRadius:'8px',padding:'.5rem',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'.82rem',textTransform:'uppercase',cursor:'pointer'}}>
                  + Usar ficha
                </button>
              </div>
              {previewId===preset.id && (
                <div style={{marginTop:'.75rem',borderTop:'1px solid #2e2e38',paddingTop:'.75rem',display:'grid',gap:'.4rem'}}>
                  {DAYS.filter(d=>preset.byDay[d]?.length>0).map(d=>(
                    <div key={d}>
                      <div style={{fontSize:'.62rem',color:'#e31b23',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.25rem'}}>{d}</div>
                      {preset.byDay[d].map((ex,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'.2rem 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                          <span style={{fontSize:'.8rem',color:'#f0f0f2'}}>{ex.name}</span>
                          <span style={{fontSize:'.72rem',color:'#7a7a8a',fontWeight:600}}>{ex.setsPlanned}x {ex.repsTarget}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
