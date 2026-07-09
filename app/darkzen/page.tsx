'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import Button from '@/components/core/Button';
import Spinner from '@/components/core/Spinner';
import PageHeader from '@/components/core/PageHeader';
import StatTile from '@/components/core/StatTile';
import EmptyState from '@/components/core/EmptyState';
import { useToast, ToastViewport } from '@/components/core/Toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  X, Play, Pause, ChevronRight, ChevronLeft,
  History, Clock, CheckCircle2, Flame, Zap,
  Wind, Waves, Brain, Leaf, Moon, Sunrise,
  Music, Droplet, Trees, RefreshCw, Flower2,
  StretchHorizontal, Activity, Volume2, VolumeX,
  Sparkles, HelpCircle,
  type LucideIcon,
} from 'lucide-react';

// ── Sub-acento calmo do DarkZen (tokens, nunca hex) ────────────
type ZTone = 'info' | 'zen';
const TVAR: Record<ZTone, string> = { info: 'var(--info)', zen: 'var(--chart-6)' };
const mix = (v: string, p: number) => `color-mix(in srgb, ${v} ${p}%, transparent)`;

// ── Áudio zen — URLs reais CC0/Public Domain ──────────────────
// Fontes: Wikimedia Commons (CC0) e upload.wikimedia.org
const AMBIENT_URLS: Record<string, string> = {
  chuva:   '/sounds/chuva.ogg',
  floresta:'/sounds/floresta.ogg',
  ondas:   '/sounds/ondas.ogg',
  bowls:   '/sounds/bowls.ogg',
  vento:   '/sounds/vento.ogg',
};

let _ambientAudio: HTMLAudioElement | null = null;

function stopAmbient() {
  if(_ambientAudio){
    _ambientAudio.pause();
    _ambientAudio.src = '';
    _ambientAudio = null;
  }
}

function playAmbient(id: string) {
  stopAmbient();
  if(id === 'silencio') return;
  const url = AMBIENT_URLS[id];
  if(!url) return;
  try {
    const audio = new Audio(url);
    audio.loop  = true;
    audio.volume = 0.35;
    audio.play().catch(()=>{});
    _ambientAudio = audio;
  } catch(_){}
}

function playBell(freq = 528, dur = 1.2) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch(_){}
}

function vibrate(ms: number | number[] = 40) {
  try { navigator.vibrate?.(ms); } catch(_){}
}

// ── Tipos ──────────────────────────────────────────────────────
type ZenSession = {
  id: string; sessaoId: string; sessaoNome: string;
  modal: string; duracao: number; date: string; savedAt: number;
};

const MODALIDADES: { id:string; nome:string; Icon:LucideIcon; tone:ZTone; desc:string }[] = [
  { id:'yoga',        nome:'Yoga',         Icon:Flower2,           tone:'zen',  desc:'Equilíbrio corpo e mente'   },
  { id:'alongamento', nome:'Alongamento',  Icon:StretchHorizontal, tone:'info', desc:'Flexibilidade e mobilidade' },
  { id:'meditacao',   nome:'Meditação',    Icon:Brain,             tone:'zen',  desc:'Foco e clareza mental'      },
  { id:'respiracao',  nome:'Respiração',   Icon:Wind,              tone:'info', desc:'Controle e calma'           },
  { id:'pilates',     nome:'Pilates',      Icon:Activity,          tone:'zen',  desc:'Core e postura'             },
  { id:'mobilidade',  nome:'Mobilidade',   Icon:RefreshCw,         tone:'info', desc:'Amplitude de movimento'     },
];

const toneVar = (modalId: string) =>
  TVAR[MODALIDADES.find(m=>m.id===modalId)?.tone ?? 'info'];

const SONS: { id:string; nome:string; Icon:LucideIcon }[] = [
  { id:'silencio', nome:'Silêncio',      Icon:VolumeX },
  { id:'chuva',    nome:'Chuva',         Icon:Droplet },
  { id:'floresta', nome:'Floresta',      Icon:Trees   },
  { id:'ondas',    nome:'Ondas',         Icon:Waves   },
  { id:'bowls',    nome:'Tibetan Bowls', Icon:Music   },
  { id:'vento',    nome:'Vento',         Icon:Wind    },
];

const SESSOES = [
  { id:'1',  modal:'yoga',        nome:'Saudação ao Sol',        duracao:15, nivel:'Iniciante',     Icon:Sunrise as LucideIcon,
    desc:'Sequência clássica para energizar o dia',
    passos:['Tadasana — posição da montanha','Urdhva Hastasana — braços ao alto','Uttanasana — flexão à frente','Plank — prancha','Chaturanga — flexão baixa','Urdhva Mukha — cachorro olhando pra cima','Adho Mukha — cachorro olhando pra baixo','Voltar ao início'] },
  { id:'2',  modal:'yoga',        nome:'Yoga Noturno',           duracao:20, nivel:'Iniciante',     Icon:Moon as LucideIcon,
    desc:'Relaxe antes de dormir com posturas restaurativas',
    passos:['Balasana — posição da criança','Supta Baddha Konasana','Viparita Karani — pernas na parede','Savasana — relaxamento final'] },
  { id:'3',  modal:'meditacao',   nome:'Meditação Mindfulness',  duracao:10, nivel:'Iniciante',     Icon:Brain as LucideIcon,
    desc:'Atenção plena no momento presente',
    passos:['Sente-se confortavelmente','Feche os olhos suavemente','Foque na respiração','Observe os pensamentos sem julgamento','Retorne ao presente','Abra os olhos lentamente'] },
  { id:'4',  modal:'meditacao',   nome:'Body Scan',              duracao:15, nivel:'Intermediário', Icon:Flower2 as LucideIcon,
    desc:'Consciência corporal de pés à cabeça',
    passos:['Deite-se confortavelmente','Atenção nos pés','Suba pelos tornozelos e pernas','Pelve e abdômen','Peito e ombros','Pescoço e cabeça','Sensação do corpo inteiro'] },
  { id:'5',  modal:'respiracao',  nome:'Respiração 4-7-8',       duracao:5,  nivel:'Iniciante',     Icon:Wind as LucideIcon,
    desc:'Técnica para relaxamento imediato',
    passos:['Inspire pelo nariz por 4 segundos','Segure por 7 segundos','Expire pela boca por 8 segundos','Repita 4 vezes'] },
  { id:'6',  modal:'respiracao',  nome:'Respiração Box',         duracao:8,  nivel:'Intermediário', Icon:Droplet as LucideIcon,
    desc:'4 tempos iguais para equilíbrio',
    passos:['Inspire por 4 segundos','Segure por 4 segundos','Expire por 4 segundos','Segure vazio por 4 segundos','Repita 6 vezes'] },
  { id:'7',  modal:'alongamento', nome:'Alongamento Pós-Treino', duracao:10, nivel:'Iniciante',     Icon:StretchHorizontal as LucideIcon,
    desc:'Essencial após musculação',
    passos:['Alongamento de quadríceps — 30s cada','Flexão de isquiotibiais — 30s','Abertura de peito — 30s','Rotação de ombros — 20s cada','Alongamento de pescoço — 20s cada','Posição fetal — 30s'] },
  { id:'8',  modal:'alongamento', nome:'Mobilidade Matinal',     duracao:8,  nivel:'Iniciante',     Icon:Sunrise as LucideIcon,
    desc:'Acorde o corpo com leveza',
    passos:['Círculos de pescoço — 10x cada lado','Rotação de ombros — 10x','Torção de tronco sentado — 30s','Abertura de quadril — 30s cada','Agachamento profundo — 30s','Respiração final'] },
  { id:'9',  modal:'pilates',     nome:'Core Pilates',           duracao:20, nivel:'Intermediário', Icon:Activity as LucideIcon,
    desc:'Fortaleça o centro do corpo',
    passos:['The Hundred — ativação do core','Roll Up — 10 repetições','Single Leg Stretch — 10 cada','Double Leg Stretch — 10x','Criss Cross — 10 cada','Plank — 3x 30s'] },
  { id:'10', modal:'mobilidade',  nome:'Mobilidade de Quadril',  duracao:12, nivel:'Iniciante',     Icon:RefreshCw as LucideIcon,
    desc:'Libere a tensão do quadril',
    passos:['Pigeon Pose direito — 1 min','Pigeon Pose esquerdo — 1 min','Frog Pose — 1 min','Hip Circles — 10x cada','Lateral lunge — 30s cada','Squat profundo — 1 min'] },
  { id:'11', modal:'yoga',        nome:'Yoga para Atletas',      duracao:25, nivel:'Intermediário', Icon:Leaf as LucideIcon,
    desc:'Recuperação e performance',
    passos:['Downward Dog — 1 min','Warrior I — 30s cada','Warrior II — 30s cada','Triangle Pose — 30s cada','Pigeon Pose — 1 min cada','Savasana — 2 min'] },
  { id:'12', modal:'meditacao',   nome:'Visualização Esportiva', duracao:10, nivel:'Intermediário', Icon:Brain as LucideIcon,
    desc:'Mental training para atletas',
    passos:['Respire fundo 3x','Visualize seu objetivo','Sinta o movimento perfeito','Veja-se alcançando a meta','Retorne ao presente','Afirmação final'] },
];

// ── Descrições dos movimentos ─────────────────────────────────
const MOVIMENTOS: Record<string, { titulo: string; desc: string; dica: string }> = {
  'Tadasana — posição da montanha':         { titulo:'Tadasana', desc:'Fique em pé, pés paralelos e juntos. Distribua o peso igualmente nos dois pés. Alongue a coluna, relaxe os ombros e mantenha o olhar ao horizonte. Respire profundamente.', dica:'Ative o core suavemente. Imagine que um fio te puxa pelo topo da cabeça.' },
  'Urdhva Hastasana — braços ao alto':      { titulo:'Urdhva Hastasana', desc:'A partir de Tadasana, inspire e eleve os braços acima da cabeça com as palmas voltadas uma para a outra. Estique bem os dedos, eleve levemente o olhar.', dica:'Não deixe os ombros subirem em direção às orelhas. Mantenha o core firme.' },
  'Uttanasana — flexão à frente':           { titulo:'Uttanasana', desc:'Expire e dobre o tronco para frente a partir dos quadris. Deixe a cabeça pender livremente. Você pode dobrar os joelhos levemente se necessário.', dica:'O objetivo é soltar a tensão da lombar, não tocar o chão. Respire fundo.' },
  'Plank — prancha':                        { titulo:'Prancha', desc:'Apoie as mãos no chão, ombros acima dos pulsos. Corpo reto como uma tábua, desde a cabeça até os calcanhares. Ative abdômen e glúteos.', dica:'Não deixe o quadril cair nem subir. Olhe para o chão, mantendo a nuca alinhada.' },
  'Chaturanga — flexão baixa':              { titulo:'Chaturanga', desc:'A partir da prancha, dobre os cotovelos a 90° e desça o corpo em linha reta. Cotovelos próximos ao corpo, peito quase tocando o chão.', dica:'É um dos movimentos mais difíceis do yoga. Adapte apoiando os joelhos se precisar.' },
  'Urdhva Mukha — cachorro olhando pra cima':{ titulo:'Cachorro Olhando pra Cima', desc:'Vire o dorso dos pés para o chão. Endireite os braços, eleve o peito e olhe para cima. Coxas e joelhos suspensos do chão.', dica:'Abra bem o peito e os ombros. Evite comprimir a lombar demais.' },
  'Adho Mukha — cachorro olhando pra baixo':{ titulo:'Cachorro Olhando pra Baixo', desc:'Eleve o quadril formando um V invertido. Afaste bem os dedos das mãos, pressione o chão e tente aproximar os calcanhares do solo.', dica:'Dobre levemente os joelhos se os isquiotibiais forem muito tensos. Respire pelo nariz.' },
  'Balasana — posição da criança':          { titulo:'Balasana', desc:'Sente-se sobre os calcanhares, estenda os braços à frente e apoie a testa no chão. Respire para as costas, sentindo o abdômen pressionar as coxas.', dica:'Posição de descanso e recuperação. Fique aqui o tempo que precisar.' },
  'Supta Baddha Konasana':                  { titulo:'Supta Baddha Konasana', desc:'Deite de costas, junte as plantas dos pés e deixe os joelhos abrirem para os lados. Coloque as mãos na barriga ou ao lado do corpo.', dica:'Use almofadas sob os joelhos se sentir desconforto no quadril.' },
  'Viparita Karani — pernas na parede':     { titulo:'Pernas na Parede', desc:'Deite próximo a uma parede e apoie as pernas contra ela. O quadril pode estar encostado ou próximo da parede. Feche os olhos.', dica:'Excelente para reduzir o inchaço nas pernas e acalmar o sistema nervoso.' },
  'Savasana — relaxamento final':           { titulo:'Savasana', desc:'Deite de costas, braços levemente afastados do corpo com as palmas voltadas para cima. Pés relaxados. Feche os olhos e libere qualquer tensão.', dica:'A postura mais importante do yoga. Não se mova. Apenas respire e observe.' },
  'Sente-se confortavelmente':              { titulo:'Posição de Meditação', desc:'Sente-se em uma cadeira ou no chão com a coluna ereta. Cruze as pernas se estiver no chão, ou apoie os pés inteiros no chão se estiver na cadeira.', dica:'O importante é estar confortável e com a coluna reta. Use almofadas se precisar.' },
  'Feche os olhos suavemente':              { titulo:'Fechar os Olhos', desc:'Feche os olhos sem forçar. O fechamento suave ajuda a remover estímulos visuais e redirecionar a atenção para o interior.', dica:'Se não conseguir fechar os olhos, direcione o olhar para um ponto fixo no chão.' },
  'Foque na respiração':                    { titulo:'Foco na Respiração', desc:'Observe a respiração natural, sem modificar. Perceba o ar entrando pelas narinas, o peito ou barriga subindo e descendo, e o ar saindo.', dica:'Quando a mente divagar — e vai divagar — gentilmente traga o foco de volta para a respiração. Sem julgamentos.' },
  'Observe os pensamentos sem julgamento':  { titulo:'Observação dos Pensamentos', desc:'Imagine que os pensamentos são nuvens passando no céu. Você os observa, mas não os segue. Não os classifique como bons ou ruins, simplesmente deixe-os ir.', dica:'A meditação não é esvaziar a mente. É aprender a não se prender aos pensamentos.' },
  'Inspire pelo nariz por 4 segundos':      { titulo:'Inspiração 4s', desc:'Respire pelo nariz de forma lenta e controlada, contando mentalmente 1-2-3-4. Sinta o abdômen expandir antes do peito.', dica:'Respire pelo abdômen (diafragma), não pelo peito. Isso ativa o sistema nervoso parassimpático.' },
  'Segure por 7 segundos':                  { titulo:'Retenção 7s', desc:'Após inspirar, segure o ar suavemente sem tensionar os músculos. Conte mentalmente 1-2-3-4-5-6-7.', dica:'Não aperte a glote ou feche a garganta com força. A retenção deve ser confortável.' },
  'Expire pela boca por 8 segundos':        { titulo:'Expiração 8s', desc:'Expire pela boca fazendo um suave som de "whoosh". Esvaze completamente os pulmões nos 8 segundos. Esta é a fase mais importante.', dica:'A expiração mais longa que a inspiração ativa o nervo vago e induz relaxamento.' },
  'Inspire por 4 segundos':                 { titulo:'Inspiração 4s', desc:'Respire pelo nariz contando 4 segundos. Expanda o abdômen primeiro, depois o peito. Respiração lenta e controlada.', dica:'Visualize o ar como energia positiva entrando no seu corpo.' },
  'Segure por 4 segundos':                  { titulo:'Retenção 4s', desc:'Segure o ar por 4 segundos. Mantenha o corpo relaxado, apenas a respiração está suspensa.', dica:'A retenção na respiração box cria um estado de equilíbrio entre inspiração e expiração.' },
  'Expire por 4 segundos':                  { titulo:'Expiração 4s', desc:'Expire pelo nariz por 4 segundos, esvaziando completamente os pulmões de forma controlada.', dica:'Imagine que está liberando toda a tensão do dia a cada expiração.' },
  'Vazio por 4 segundos':                   { titulo:'Vazio 4s', desc:'Após expirar, fique sem ar por 4 segundos. Este é o momento de maior calma do ciclo.', dica:'Esta fase é a mais difícil. Se 4s for muito, comece com 2s e aumente gradualmente.' },
  'Downward Dog — 1 min':                   { titulo:'Cachorro Olhando pra Baixo', desc:'V invertido com as mãos e pés no chão. Eleve o quadril, pressione as palmas e tente aproximar os calcanhares do solo. Fique 1 minuto respirando.', dica:'Alterne dobrando um joelho de cada vez para aquecer os isquiotibiais.' },
  'Warrior I — 30s cada':                   { titulo:'Guerreiro I', desc:'Passo largo para frente, joelho da frente dobrado a 90°, pé de trás virado 45°. Braços acima da cabeça, quadril voltado para frente.', dica:'Mantenha o joelho da frente acima do tornozelo, nunca além dele.' },
  'Warrior II — 30s cada':                  { titulo:'Guerreiro II', desc:'Posição similar ao Guerreiro I, mas os braços se abrem para os lados, paralelos ao chão. Olhe por cima da mão da frente.', dica:'O quadril se abre para o lado nesta postura. Braços fortes e ativos.' },
  'Pigeon Pose — 1 min cada':               { titulo:'Pombo', desc:'A partir do cachorro olhando pra baixo, traga um joelho para frente e apoie a canela no chão em diagonal. O quadril da perna de trás afunda em direção ao chão.', dica:'Coloque uma almofada sob o quadril se houver dificuldade. É uma abertura intensa de quadril.' },
  'The Hundred — ativação do core':         { titulo:'The Hundred', desc:'Deite de costas, eleve pernas a 45° e cabeça e ombros do chão. Braços paralelos ao chão, pulse-os para cima e para baixo 100 vezes enquanto respira.', dica:'Inspire por 5 batidas e expire por 5 batidas. Mantenha o queixo próximo ao peito.' },
  'Roll Up — 10 repetições':                { titulo:'Roll Up', desc:'Deite de costas, braços acima da cabeça. Inspire e aos poucos suba articulando cada vértebra da coluna até sentar completamente. Retorne.', dica:'Se não conseguir fazer completo, use as mãos para ajudar. O objetivo é mobilidade da coluna.' },
  'Single Leg Stretch — 10 cada':           { titulo:'Single Leg Stretch', desc:'Deite e eleve cabeça e ombros. Traga um joelho ao peito enquanto a outra perna estende. Alterne as pernas como se fosse pedalar.', dica:'Mantenha o core ativado e a lombar na esteira durante todo o exercício.' },
  'Pigeon Pose direito — 1 min':            { titulo:'Pombo Direito', desc:'A partir de quatro apoios, traga o joelho direito para frente e apoie a canela diagonal no chão. Afunde o quadril direito. Fique 1 minuto.', dica:'Respire profundamente para o quadril. A cada expiração, deixe o corpo afundar um pouco mais.' },
  'Pigeon Pose esquerdo — 1 min':           { titulo:'Pombo Esquerdo', desc:'Repita o mesmo do lado esquerdo, trazendo o joelho esquerdo para frente. Fique 1 minuto no mesmo lado antes de trocar.', dica:'É normal um lado ser mais tenso que o outro. Respeite os limites do seu corpo.' },
  'Frog Pose — 1 min':                      { titulo:'Frog Pose', desc:'De quatro apoios, afaste os joelhos o máximo possível, apontando os pés para fora. Afunde o quadril em direção ao chão. Fique 1 minuto.', dica:'Uma das posturas mais intensas para abertura de quadril. Respire e relaxe ativamente.' },
  'Squat profundo — 1 min':                 { titulo:'Agachamento Profundo (Malasana)', desc:'Coloque os pés na largura dos ombros levemente abertos. Agache profundamente mantendo os calcanhares no chão. Junte as mãos e use os cotovelos para abrir os joelhos.', dica:'Se os calcanhares não ficam no chão, coloque um suporte embaixo deles.' },
  'Alongamento de quadríceps — 30s cada':   { titulo:'Quadríceps', desc:'Em pé, dobre um joelho e segure o tornozelo com a mão do mesmo lado. Mantenha os joelhos juntos e o quadril empurrado para frente. 30s cada lado.', dica:'Apoie-se em uma parede se necessário. Não arqueie demais a lombar.' },
  'Flexão de isquiotibiais — 30s':          { titulo:'Isquiotibiais', desc:'Em pé ou sentado, estenda uma perna e incline o tronco em direção ao pé sem arredondar as costas. 30s cada lado.', dica:'O objetivo é sentir o alongamento na parte de trás da coxa, não tocar o pé.' },
  'Abertura de peito — 30s':               { titulo:'Abertura de Peito', desc:'Entrelaça os dedos atrás das costas, endireite os braços e abra o peito elevando levemente os braços. Olhe para cima.', dica:'Ótimo para contrariar a postura fechada que ficamos ao usar o celular e computador.' },
};

type Sessao = typeof SESSOES[0];
const fmt = (s:number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const todayKey = () => new Date().toISOString().slice(0,10);

// ── Timer Respiração ───────────────────────────────────────────
function TimerRespiracao({ sessao, onFim }: { sessao:Sessao; onFim:()=>void }) {
  const FASES_478 = [
    {nome:'Inspire', cor:'var(--ok)',      seg:4},
    {nome:'Segure',  cor:'var(--info)',    seg:7},
    {nome:'Expire',  cor:'var(--chart-6)', seg:8},
  ];
  const FASES_BOX = [
    {nome:'Inspire', cor:'var(--ok)',      seg:4},
    {nome:'Segure',  cor:'var(--info)',    seg:4},
    {nome:'Expire',  cor:'var(--chart-6)', seg:4},
    {nome:'Vazio',   cor:'var(--ink-2)',   seg:4},
  ];
  const fases       = sessao.id==='6' ? FASES_BOX : FASES_478;
  const totalCiclos = sessao.id==='6' ? 6 : 4;

  const [fase,     setFase]     = useState(0);
  const [conta,    setConta]    = useState(fases[0].seg);
  const [ciclo,    setCiclo]    = useState(0);
  const [concluido,setConcluido]= useState(false);
  const faseAtual = fases[fase];
  const pct = faseAtual ? ((faseAtual.seg - conta) / faseAtual.seg) * 100 : 0;

  // Usando useCallback para evitar o warning de deps
  const tick = useCallback(()=>{
    setConta(c=>{
      if(c > 1) return c-1;
      // Troca de fase
      playBell(faseAtual.nome==='Inspire'?528:faseAtual.nome==='Expire'?396:440, .6);
      vibrate(30);
      const nextFase = (fase+1) % fases.length;
      setFase(nextFase);
      if(nextFase===0){
        const nextCiclo = ciclo+1;
        if(nextCiclo >= totalCiclos){ setConcluido(true); return 0; }
        setCiclo(nextCiclo);
      }
      return fases[nextFase].seg;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fase, ciclo, faseAtual]);

  useEffect(()=>{
    if(concluido) return;
    const t = setInterval(tick, 1000);
    return ()=>clearInterval(t);
  },[tick, concluido]);

  if(concluido) return (
    <PageShell hideBottomNav>
      <motion.div initial={{opacity:0}} animate={{opacity:1}}
        className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:200,delay:.1}}
          style={{color:'var(--chart-6)'}}>
          <CheckCircle2 size={64}/>
        </motion.div>
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.2}}>
          <div className="font-display font-bold text-[1.7rem] tracking-tight leading-tight text-ink-1">Sessão concluída</div>
          <div className="text-[0.85rem] text-ink-2 mt-1.5">Parabéns pela prática!</div>
        </motion.div>
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.35}}>
          <Button size="lg" onClick={onFim}>Finalizar</Button>
        </motion.div>
      </motion.div>
    </PageShell>
  );

  return (
    <PageShell hideBottomNav>
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="eyebrow flex items-center gap-1.5">
          <Wind size={12}/> Ciclo {ciclo+1} de {totalCiclos}
        </div>

        {/* Círculo SVG */}
        <div className="relative w-[220px] h-[220px]">
          <svg width={220} height={220} className="absolute inset-0 -rotate-90">
            <circle cx={110} cy={110} r={96} fill="none" stroke="var(--surface-3)" strokeWidth={10}/>
            <motion.circle cx={110} cy={110} r={96} fill="none" stroke={faseAtual?.cor} strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*96}`}
              animate={{strokeDashoffset:`${2*Math.PI*96*(pct/100)}`}}
              transition={{duration:.9, ease:'linear'}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div key={`${fase}-${conta}`} initial={{scale:1.1,opacity:.7}} animate={{scale:1,opacity:1}} transition={{duration:.25}}
              className="font-display font-bold text-[4.5rem] leading-none tnum" style={{color:faseAtual?.cor}}>
              {conta}
            </motion.div>
            <div className="eyebrow mt-1">{faseAtual?.nome}</div>
          </div>
        </div>

        {/* Nome sessão */}
        <div className="font-display font-bold text-[1.3rem] tracking-tight text-ink-1">{sessao.nome}</div>

        {/* Indicadores de fase */}
        <div className="flex gap-1.5">
          {fases.map((_,i)=>(
            <motion.div key={i} animate={{width:i===fase?24:8}}
              className="h-2 rounded-full"
              style={{background:i===fase?faseAtual?.cor:'var(--surface-3)',transition:'background .3s'}}/>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onFim}>
          <X size={14}/> Encerrar
        </Button>
      </div>
    </PageShell>
  );
}

// ── Timer Sessão ───────────────────────────────────────────────
function TimerSessao({ sessao, somAtivoInicial, onFim, onSalvar }: {
  sessao:Sessao; somAtivoInicial:string; onFim:()=>void; onSalvar:(dur:number)=>void;
}) {
  const [passoAtual,   setPassoAtual]   = useState(0);
  const [modalPasso,   setModalPasso]   = useState<string|null>(null);
  const [somLocal,     setSomLocal]     = useState(somAtivoInicial);
  const [elapsed,    setElapsed]    = useState(0);
  const [running,    setRunning]    = useState(true);
  const [concluido,  setConcluido]  = useState(false);
  const tsRef    = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout|null>(null);
  const total    = sessao.duracao * 60;
  const pct      = Math.min(100,(elapsed/total)*100);
  const modal    = MODALIDADES.find(m=>m.id===sessao.modal);
  const SessIcon = sessao.Icon;
  const tvar     = toneVar(sessao.modal);

  useEffect(()=>{
    if(running){
      if(!tsRef.current) tsRef.current = Date.now();
      timerRef.current = setInterval(()=>setElapsed(Math.floor((Date.now()-tsRef.current)/1000)),500);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
    }
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[running]);

  useEffect(()=>{ if(elapsed>=total){ setRunning(false); } },[elapsed, total]);

  const concluir = () => {
    setConcluido(true);
    playBell(528, 2);
    vibrate([100,50,100,50,200]);
    onSalvar(elapsed);
  };

  if(concluido) return (
    <PageShell hideBottomNav>
      <motion.div initial={{opacity:0}} animate={{opacity:1}}
        className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
        <motion.div initial={{scale:0,rotate:-20}} animate={{scale:1,rotate:0}} transition={{type:'spring',stiffness:200,delay:.1}}
          style={{color:tvar}}>
          <SessIcon size={64}/>
        </motion.div>
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.25}}>
          <div className="font-display font-bold text-[1.7rem] tracking-tight leading-tight text-ink-1">Sessão concluída</div>
          <div className="text-[0.85rem] text-ink-2 mt-1.5 tnum">{fmt(elapsed)} de prática</div>
        </motion.div>
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.4}}>
          <Button size="lg" onClick={onFim}>Finalizar</Button>
        </motion.div>
      </motion.div>
    </PageShell>
  );

  return (
    <PageShell hideBottomNav>
      {/* Header da sessão */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
        className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{background:mix(tvar,14),border:`1px solid ${mix(tvar,32)}`,color:tvar}}>
            <SessIcon size={20}/>
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[1.1rem] leading-tight text-ink-1 truncate">{sessao.nome}</div>
            <div className="text-[0.66rem] text-ink-3 mt-0.5">{sessao.duracao} min · {modal?.nome}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onFim} className="shrink-0">
          <X size={13}/> Sair
        </Button>
      </motion.div>

      {/* Timer + progresso */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.06}}
        className="card p-6 text-center relative overflow-hidden mb-3">
        <div className="absolute inset-0 pointer-events-none"
          style={{background:`radial-gradient(circle at 50% 0%, ${mix(tvar,8)}, transparent 60%)`}}/>
        <motion.div key={Math.floor(elapsed/60)} initial={{scale:1.05}} animate={{scale:1}}
          className="relative font-display font-bold text-[3.6rem] leading-none tnum" style={{color:tvar}}>
          {fmt(elapsed)}
        </motion.div>
        <div className="eyebrow mt-2 flex items-center justify-center gap-1">
          <Clock size={10}/> de {fmt(total)}
        </div>
        <div className="relative mt-4 bg-surface-3 rounded-full h-1 overflow-hidden">
          <motion.div animate={{width:`${pct}%`}} transition={{duration:.5,ease:'easeOut'}}
            className="h-full rounded-full" style={{background:tvar}}/>
        </div>
        <div className="relative flex justify-center mt-4">
          {running
            ? <Button variant="ghost" onClick={()=>setRunning(r=>!r)}><Pause size={16}/> Pausar</Button>
            : <Button onClick={()=>setRunning(r=>!r)}><Play size={16}/> Retomar</Button>}
        </div>
      </motion.div>

      {/* Som ambiente */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.1}}
        className="card p-3.5 mb-3">
        <div className="eyebrow mb-2.5 flex items-center gap-1.5">
          <Volume2 size={12}/> Som ambiente
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {SONS.map(s=>{
            const SIcon = s.Icon;
            const on = somLocal===s.id;
            return (
              <motion.button key={s.id} whileTap={{scale:.93}}
                onClick={()=>{setSomLocal(s.id);playAmbient(s.id);}}
                className={`shrink-0 flex flex-col items-center justify-center gap-1 w-[68px] h-[62px] rounded-xl border text-[0.58rem] font-semibold transition-colors
                  ${on?'bg-info-soft border-info/30 text-info':'bg-surface-2 border-line text-ink-3'}`}>
                <SIcon size={18}/>
                <span className="whitespace-nowrap">{s.nome}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Passos */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.14}}
        className="card p-3.5">
        <div className="eyebrow mb-2.5">Sequência</div>

        {/* Modal explicação do passo */}
        <AnimatePresence>
          {modalPasso && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setModalPasso(null)}
              className="fixed inset-0 z-[300] backdrop-blur-md flex items-end justify-center"
              style={{background:'color-mix(in srgb, var(--bg) 85%, transparent)',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
              <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                transition={{type:'spring',stiffness:300,damping:32}}
                onClick={e=>e.stopPropagation()}
                className="w-[min(480px,100vw)] bg-surface-1 border-t border-line rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
                {/* Handle */}
                <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-5"/>
                {/* Conteúdo */}
                {(() => {
                  const info = MOVIMENTOS[modalPasso];
                  if(!info) return (
                    <div>
                      <div className="font-display font-bold text-[1.3rem] tracking-tight text-ink-1 mb-3">{modalPasso.split(' — ')[0]}</div>
                      <div className="text-[0.88rem] text-ink-2 leading-relaxed">Siga as instruções do instrutor e mantenha a respiração constante durante o movimento.</div>
                    </div>
                  );
                  return (
                    <div className="grid gap-4">
                      <div>
                        <div className="eyebrow mb-1" style={{color:tvar}}>Movimento</div>
                        <div className="font-display font-bold text-[1.5rem] tracking-tight leading-tight text-ink-1">{info.titulo}</div>
                      </div>
                      <div className="card-2 p-3.5 border-l-2" style={{borderLeftColor:tvar}}>
                        <div className="eyebrow mb-2 flex items-center gap-1.5">
                          <CheckCircle2 size={11}/> Como fazer
                        </div>
                        <div className="text-[0.88rem] text-ink-1 leading-relaxed">{info.desc}</div>
                      </div>
                      <div className="rounded-xl p-3.5 border"
                        style={{background:mix(tvar,10),borderColor:mix(tvar,28)}}>
                        <div className="eyebrow mb-2 flex items-center gap-1.5" style={{color:tvar}}>
                          <Zap size={11}/> Dica
                        </div>
                        <div className="text-[0.85rem] text-ink-1 leading-relaxed">{info.dica}</div>
                      </div>
                      <Button full onClick={()=>setModalPasso(null)}>Entendido</Button>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-1.5">
          {sessao.passos.map((passo,i)=>{
            const done  = i<passoAtual;
            const atual = i===passoAtual;
            return (
              <motion.div key={i} whileTap={{scale:.98}} role="button" tabIndex={0}
                onClick={()=>{setPassoAtual(i);vibrate(20);}}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer
                  ${atual?'border-transparent':'bg-surface-2 border-line'}`}
                style={atual?{background:mix(tvar,10),borderColor:mix(tvar,30)}:undefined}>
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[0.65rem] font-bold tnum
                    ${done?'bg-ok-soft text-ok border border-ok/30':atual?'':'bg-surface-3 text-ink-3 border border-line'}`}
                  style={atual?{background:mix(tvar,18),color:tvar,border:`1px solid ${mix(tvar,35)}`}:undefined}>
                  {done ? <CheckCircle2 size={13}/> : i+1}
                </div>
                <div className={`flex-1 text-[0.82rem] ${atual?'text-ink-1 font-semibold':done?'text-ink-3':'text-ink-2'}`}>{passo}</div>
                {/* Botão info */}
                <motion.button whileTap={{scale:.88}}
                  aria-label={`Como fazer: ${passo}`}
                  onClick={e=>{e.stopPropagation();setModalPasso(passo);vibrate(15);}}
                  className="w-6 h-6 rounded-full shrink-0 bg-surface-3 border border-line text-ink-3 flex items-center justify-center">
                  <HelpCircle size={13}/>
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-3">
          <Button variant="ghost" className="flex-1" disabled={passoAtual===0}
            onClick={()=>{setPassoAtual(p=>Math.max(0,p-1));vibrate(20);}}>
            <ChevronLeft size={15}/> Ant.
          </Button>
          {passoAtual < sessao.passos.length-1 ? (
            <Button className="flex-[2]" onClick={()=>{setPassoAtual(p=>p+1);vibrate(20);}}>
              Próximo <ChevronRight size={15}/>
            </Button>
          ) : (
            <Button className="flex-[2]" onClick={concluir}>
              <CheckCircle2 size={15}/> Concluir
            </Button>
          )}
        </div>
      </motion.div>
    </PageShell>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function DarkZenPage() {
  const [uid,          setUid]         = useState<string|null>(null);
  const [sessions,     setSessions]    = useState<ZenSession[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [modalSel,     setModalSel]    = useState<string|null>(null);
  const [sessaoAtiva,  setSessaoAtiva] = useState<Sessao|null>(null);
  const [somAtivo,     setSomAtivo]    = useState('silencio');
  const [view,         setView]        = useState<'home'|'historico'>('home');
  const [timerResp,    setTimerResp]   = useState<Sessao|null>(null);
  const { toast, show } = useToast();

  // Parar som ao sair da página (trocar aba, navegar, etc)
  useEffect(()=>{
    const handleHide = () => stopAmbient();
    const handleUnload = () => stopAmbient();
    document.addEventListener('visibilitychange', handleHide);
    window.addEventListener('beforeunload', handleUnload);
    return ()=>{
      stopAmbient();
      document.removeEventListener('visibilitychange', handleHide);
      window.removeEventListener('beforeunload', handleUnload);
    };
  },[]);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){ setLoading(false); return; }
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db,'users',u.uid,'data','darkzen'));
        if(snap.exists()) setSessions(JSON.parse(snap.data().payload||'[]'));
      } catch(e){ console.error(e); }
      setLoading(false);
    });
  },[]);

  const salvarSessao = async (sessao:Sessao, dur:number) => {
    const s: ZenSession = {
      id: String(Date.now()),
      sessaoId: sessao.id, sessaoNome: sessao.nome,
      modal: sessao.modal, duracao: Math.round(dur/60),
      date: todayKey(), savedAt: Date.now(),
    };
    const newSessions = [s, ...sessions];
    setSessions(newSessions);
    if(uid){
      try {
        await setDoc(doc(db,'users',uid,'data','darkzen'),{payload:JSON.stringify(newSessions),updatedAt:Date.now()});
      } catch(e){ console.error(e); }
    }
    show('Prática registrada!');
  };

  // Streak
  const streak = (() => {
    const dates = Array.from(new Set(sessions.map(s=>s.date))).sort().reverse();
    let count=0; let expect=todayKey();
    for(const d of dates){
      if(d===expect){ count++; const dt=new Date(d+'T12:00:00'); dt.setDate(dt.getDate()-1); expect=dt.toISOString().slice(0,10); }
      else break;
    }
    return count;
  })();

  const totalMin   = sessions.reduce((a,s)=>a+s.duracao,0);
  const thisMonth  = sessions.filter(s=>s.date.slice(0,7)===todayKey().slice(0,7)).length;

  const sessoesFiltradas = modalSel ? SESSOES.filter(s=>s.modal===modalSel) : SESSOES;

  const iniciar = (s:Sessao) => {
    if(s.modal==='respiracao'){ setTimerResp(s); return; }
    setSessaoAtiva(s);
  };

  if(loading) return (
    <PageShell>
      <Spinner full/>
    </PageShell>
  );

  if(timerResp) return <TimerRespiracao sessao={timerResp} onFim={()=>{ stopAmbient(); salvarSessao(timerResp,timerResp.duracao*60); setTimerResp(null); }}/>;

  if(sessaoAtiva) return (
    <TimerSessao sessao={sessaoAtiva} somAtivoInicial={somAtivo}
      onFim={()=>{stopAmbient();setSessaoAtiva(null);}}
      onSalvar={(dur)=>salvarSessao(sessaoAtiva,dur)}/>
  );

  return (
    <PageShell>
      <ToastViewport toast={toast}/>

      <PageHeader
        title="DarkZen"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={12}/> Mente e corpo em equilíbrio
          </span>
        }
        right={
          <Button variant="ghost" size="sm" onClick={()=>setView(v=>v==='home'?'historico':'home')}>
            {view==='home' ? <><History size={14}/> Histórico</> : <><ChevronLeft size={14}/> Voltar</>}
          </Button>
        }
      />

      <AnimatePresence mode="wait">
        {view==='historico' ? (
          <motion.div key="hist" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
            {sessions.length===0 ? (
              <EmptyState
                icon={<Flower2 size={44}/>}
                title="Nenhuma prática ainda"
                subtitle="Complete uma sessão para ver o histórico aqui."
              />
            ) : (
              <div className="grid gap-2.5">
                {sessions.map((s,i)=>{
                  const modal = MODALIDADES.find(m=>m.id===s.modal);
                  const MIcon = modal?.Icon || Flower2;
                  const tvar  = TVAR[modal?.tone ?? 'info'];
                  return (
                    <motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                      transition={{delay:Math.min(i*.04,.4)}}>
                      <div className="card p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{background:mix(tvar,14),border:`1px solid ${mix(tvar,30)}`,color:tvar}}>
                          <MIcon size={19}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-semibold text-[0.98rem] leading-tight text-ink-1 truncate">{s.sessaoNome}</div>
                          <div className="text-[0.64rem] text-ink-3 mt-0.5 flex items-center gap-1">
                            <Clock size={10}/>{s.date} · {modal?.nome}
                          </div>
                        </div>
                        <div className="font-display font-bold text-[1.05rem] tnum shrink-0" style={{color:tvar}}>{s.duracao} min</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="home" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}>

            {/* Stats */}
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.08}}
              className="grid grid-cols-3 gap-2.5 mb-6">
              <StatTile value={streak} label="Streak dias" tone={streak>0?'info':'default'} icon={<Flame size={16}/>}/>
              <StatTile value={thisMonth} label="Este mês" tone="info" icon={<Sparkles size={16}/>}/>
              <StatTile value={`${totalMin}min`} label="Tempo total" icon={<Clock size={16}/>}/>
            </motion.div>

            {/* Som ambiente */}
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.12}}
              className="card p-4 mb-6">
              <div className="eyebrow mb-2.5 flex items-center gap-1.5">
                <Volume2 size={12}/> Som ambiente
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {SONS.map(s=>{
                  const SIcon = s.Icon;
                  const on = somAtivo===s.id;
                  return (
                    <motion.button key={s.id} whileTap={{scale:.93}}
                      onClick={()=>{setSomAtivo(s.id);playAmbient(s.id);}}
                      className={`shrink-0 flex flex-col items-center justify-center gap-1 w-[72px] h-[66px] rounded-xl border text-[0.58rem] font-semibold transition-colors
                        ${on?'bg-info-soft border-info/30 text-info':'bg-surface-2 border-line text-ink-3'}`}>
                      <SIcon size={20}/>
                      <span className="whitespace-nowrap">{s.nome}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Filtro modalidades */}
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.16}}>
              <div className="eyebrow mb-2.5">Modalidades</div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-6">
                <motion.button whileTap={{scale:.95}} onClick={()=>setModalSel(null)}
                  className={`shrink-0 whitespace-nowrap ${!modalSel?'chip chip-active':'chip'}`}>
                  Todos
                </motion.button>
                {MODALIDADES.map(m=>{
                  const MIcon = m.Icon;
                  const on = modalSel===m.id;
                  const tvar = TVAR[m.tone];
                  return (
                    <motion.button key={m.id} whileTap={{scale:.95}}
                      onClick={()=>setModalSel(m.id===modalSel?null:m.id)}
                      className={`chip shrink-0 whitespace-nowrap ${on?'border-transparent':''}`}
                      style={on?{background:mix(tvar,15),borderColor:mix(tvar,40),color:tvar}:undefined}>
                      <MIcon size={14}/>{m.nome}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Grid sessões */}
            <div className="grid gap-2.5">
              {sessoesFiltradas.map((s,i)=>{
                const modal = MODALIDADES.find(m=>m.id===s.modal);
                const SIcon = s.Icon;
                const tvar  = TVAR[modal?.tone ?? 'info'];
                return (
                  <motion.div key={s.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                    transition={{delay:Math.min(.18+i*.04,.4)}} whileTap={{scale:.98}}>
                    <div onClick={()=>iniciar(s)}
                      className="card p-4 cursor-pointer border-l-2 transition-colors hover:bg-surface-2"
                      style={{borderLeftColor:tvar}}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{background:mix(tvar,14),border:`1px solid ${mix(tvar,30)}`,color:tvar}}>
                            <SIcon size={20}/>
                          </div>
                          <div className="min-w-0">
                            <div className="font-display font-semibold text-[1.02rem] leading-tight text-ink-1 truncate">{s.nome}</div>
                            <div className="text-[0.64rem] font-semibold mt-0.5 flex items-center gap-1" style={{color:tvar}}>
                              {modal && <modal.Icon size={10}/>}{modal?.nome}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center gap-1 font-display font-semibold text-[0.95rem] tnum" style={{color:tvar}}>
                            <Clock size={12}/>{s.duracao} min
                          </div>
                          <div className="mt-1">
                            <span className="chip text-[0.52rem] py-0.5 px-2">{s.nivel}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[0.76rem] text-ink-2 leading-relaxed mb-2.5">{s.desc}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.passos.slice(0,3).map((p,pi)=>(
                          <span key={pi} className="chip text-[0.56rem] py-0.5 px-2">{p.split(' — ')[0]}</span>
                        ))}
                        {s.passos.length>3 && <span className="text-[0.6rem] text-ink-3">+{s.passos.length-3}</span>}
                        <ChevronRight size={14} className="ml-auto text-ink-3"/>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
