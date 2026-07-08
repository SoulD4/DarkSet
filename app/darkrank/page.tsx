'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import Spinner from '@/components/core/Spinner';
import PageHeader from '@/components/core/PageHeader';
import EmptyState from '@/components/core/EmptyState';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { getLiga, fmtPontos, LIGAS, type RankScore } from '@/lib/rankSystem';
import { useRankSync } from '@/lib/useRankSync';
import { Crown, Medal, Dumbbell, Flame, Globe, Zap } from 'lucide-react';

/** Ícone de pódio (top 3) ou número da posição. */
function Posicao({ i }: { i: number }) {
  if (i === 0) return <Crown size={18} className="text-warn" />;
  if (i === 1) return <Medal size={16} className="text-ink-2" />;
  if (i === 2) return <Medal size={16} className="text-warn opacity-60" />;
  return <span className="font-display font-bold text-[0.85rem] text-ink-3 tnum">#{i + 1}</span>;
}

export default function DarkRankPage() {
  const [uid,            setUid]            = useState<string|null>(null);
  const [userName,       setUserName]       = useState('');
  const [userInitials,   setUserInitials]   = useState('');
  const [meuRank,        setMeuRank]        = useState<RankScore|null>(null);
  const [globalRank,     setGlobalRank]     = useState<(RankScore&{posicao:number})[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);

  useRankSync(uid, userName, userInitials);

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){setLoading(false);return;}
      setUid(u.uid);
      try {
        const userSnap = await getDoc(doc(db,'users',u.uid));
        const d = userSnap.exists()?userSnap.data():{} as any;
        const name = (d.name||u.displayName||'Atleta').split(' ')[0];
        setUserName(name);
        setUserInitials(name.slice(0,2).toUpperCase());
        const rSnap = await getDoc(doc(db,'globalRank',u.uid));
        if(rSnap.exists()) setMeuRank(rSnap.data() as RankScore);
      } catch(e){console.error(e);}
      setLoading(false);
    });
  },[]);

  useEffect(()=>{
    const load = async()=>{
      setLoadingRanking(true);
      try {
        const snap = await getDocs(query(collection(db,'globalRank'),orderBy('pontos','desc'),limit(50)));
        setGlobalRank(snap.docs.map((d,i)=>({...d.data() as RankScore,posicao:i+1})));
      } catch(e){console.error(e);}
      setLoadingRanking(false);
    };
    load();
  },[]);

  const liga     = getLiga(meuRank?.pontos||0);
  const proxLiga = LIGAS.find(l=>l.min>(meuRank?.pontos||0));
  const ligaPct  = proxLiga
    ? Math.min(100,Math.round(((meuRank?.pontos||0)-liga.min)/(proxLiga.min-liga.min)*100))
    : 100;

  if(loading) return (
    <PageShell>
      <Spinner full />
    </PageShell>
  );

  return (
    <PageShell>
      <PageHeader
        title="DarkRank"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <Globe size={12} /> Ranking global de atletas DarkSet
          </span>
        }
      />

      {/* Card do seu rank — cores da liga são dinâmicas (exceção permitida) */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="relative overflow-hidden rounded-2xl border p-4 mb-4 shadow-card"
        style={{ background: liga.corBg, borderColor: liga.corBorder }}
      >
        <div className="absolute -top-5 -right-5 opacity-[0.06] pointer-events-none">
          <Globe size={110} color={liga.cor} />
        </div>

        <div className="relative flex items-start justify-between gap-3 mb-3.5">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-1.5 mb-1" style={{ color: liga.cor }}>
              <Globe size={10} /> Seu rank global
            </div>
            <div className="font-display font-bold text-[1.8rem] leading-none tracking-tight" style={{ color: liga.cor }}>
              {liga.nome}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display font-bold text-[1.6rem] leading-none tnum" style={{ color: liga.cor }}>
              {fmtPontos(meuRank?.pontos||0)}
            </div>
            <div className="eyebrow mt-1">pontos</div>
            {meuRank?.posicao && (
              <div className="text-[0.7rem] font-bold mt-0.5 tnum" style={{ color: liga.cor }}>
                #{meuRank.posicao} no ranking
              </div>
            )}
          </div>
        </div>

        {/* Progresso para a próxima liga */}
        <div className="relative h-1.5 rounded-full bg-surface-3 overflow-hidden mb-1.5">
          <motion.div
            animate={{ width: `${ligaPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: liga.cor, boxShadow: `0 0 10px ${liga.cor}88` }}
          />
        </div>
        <div className="relative flex justify-between text-[0.62rem] text-ink-3">
          <span className="font-bold" style={{ color: liga.cor }}>{liga.nome}</span>
          <span className="tnum">
            {proxLiga ? `${proxLiga.min-(meuRank?.pontos||0)} pts para ${proxLiga.nome}` : 'Liga máxima atingida!'}
          </span>
        </div>

        {/* Stats do usuário */}
        {meuRank && (
          <div className="relative flex gap-4 mt-3.5 pt-3.5 border-t border-line">
            {[
              { val: meuRank.treinos,                  lbl: 'Treinos', Icon: Dumbbell },
              { val: meuRank.streak+'d',               lbl: 'Streak',  Icon: Flame    },
              { val: fmtPontos(meuRank.volumeKg||0),   lbl: 'Volume',  Icon: Zap      },
            ].map((s,i)=>(
              <div key={i} className="flex-1 text-center">
                <s.Icon size={14} className="mx-auto mb-1" color={liga.cor} />
                <div className="font-display font-bold text-[1.1rem] leading-none tnum" style={{ color: liga.cor }}>
                  {s.val}
                </div>
                <div className="eyebrow mt-1">{s.lbl}</div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Legenda de ligas */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-1.5 mb-6"
      >
        {LIGAS.map(l=>(
          <span
            key={l.nome}
            className="rounded-md border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide"
            style={{ background: l.corBg, borderColor: l.corBorder, color: l.cor }}
          >
            {l.nome}
          </span>
        ))}
      </motion.div>

      {/* Ranking top 50 */}
      <p className="eyebrow mb-2.5">Top 50 atletas</p>
      <div className="grid gap-2">
        {loadingRanking && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {!loadingRanking && globalRank.length===0 && (
          <EmptyState
            icon={<Globe size={36} strokeWidth={1.5} />}
            title="Nenhum atleta ainda"
            subtitle="Complete treinos para aparecer no ranking!"
          />
        )}

        {globalRank.map((r,i)=>{
          const rLiga = getLiga(r.pontos);
          const isMe  = r.uid===uid;
          const podio = i<3;
          return (
            <motion.div
              key={r.uid}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i*0.04, 0.4) }}
              className={`relative overflow-hidden rounded-xl border ${isMe||podio ? '' : 'card'}`}
              style={isMe ? { background: rLiga.corBg, borderColor: rLiga.corBorder } : undefined}
            >
              {podio && !isMe && <div className="absolute inset-0 bg-surface-2 -z-10" />}
              {/* Faixa lateral na cor da liga */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: rLiga.cor }} />
              <div className="flex items-center gap-2.5 py-3 pr-3.5 pl-4">
                {/* Posição */}
                <div className="w-6 flex justify-center shrink-0">
                  <Posicao i={i} />
                </div>
                {/* Avatar */}
                <div
                  className="w-[34px] h-[34px] rounded-full border flex items-center justify-center shrink-0 font-display font-bold text-[0.8rem]"
                  style={{ background: `${rLiga.cor}22`, borderColor: `${rLiga.cor}44`, color: rLiga.cor }}
                >
                  {r.initials}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-display font-semibold text-[0.9rem] truncate ${isMe ? '' : 'text-ink-1'}`}
                      style={isMe ? { color: rLiga.cor } : undefined}
                    >
                      {r.nome}
                    </span>
                    {isMe && (
                      <span
                        className="shrink-0 rounded border px-1 text-[0.5rem] font-bold uppercase"
                        style={{ borderColor: rLiga.corBorder, color: rLiga.cor }}
                      >
                        você
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="rounded border px-1 py-px text-[0.52rem] font-bold uppercase"
                      style={{ background: rLiga.corBg, borderColor: rLiga.corBorder, color: rLiga.cor }}
                    >
                      {rLiga.nome}
                    </span>
                    <span className="flex items-center gap-0.5 text-[0.58rem] text-ink-3 tnum">
                      <Dumbbell size={9} />{r.treinos}
                    </span>
                    <span className="flex items-center gap-0.5 text-[0.58rem] text-ink-3 tnum">
                      <Flame size={9} />{r.streak}d
                    </span>
                  </div>
                </div>
                {/* Pontos */}
                <div className="text-right shrink-0">
                  <div
                    className={`font-display font-bold text-[1.15rem] leading-none tnum ${isMe ? '' : 'text-ink-1'}`}
                    style={isMe ? { color: rLiga.cor } : undefined}
                  >
                    {fmtPontos(r.pontos)}
                  </div>
                  <div className="eyebrow mt-0.5">pts</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
