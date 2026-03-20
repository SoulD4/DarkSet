'use client';
import { useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calcPontos, getLiga } from '@/lib/rankSystem';

export function useRankSync(uid: string|null, nome: string, initials: string) {
  useEffect(()=>{
    if(!uid||!nome) return;
    const sync = async () => {
      try {
        // Busca histórico de treinos
        const histSnap = await getDoc(doc(db,'users',uid,'data','history'));
        const hist = histSnap.exists() ? JSON.parse(histSnap.data().payload||'{}') : {};
        const treinos = Object.keys(hist).length;

        // Calcula volume total (soma de todos os sets)
        let volumeKg = 0;
        Object.values(hist).forEach((sessao: any)=>{
          if(sessao?.exercicios) {
            sessao.exercicios.forEach((ex: any)=>{
              if(ex?.sets) {
                ex.sets.forEach((s: any)=>{
                  volumeKg += (parseFloat(s.kg)||0) * (parseInt(s.reps)||0);
                });
              }
            });
          }
        });

        // Streak atual
        let streak = 0;
        const hoje = new Date();
        for(let i=0; i<365; i++){
          const d = new Date(hoje);
          d.setDate(d.getDate()-i);
          const key = d.toISOString().slice(0,10);
          if(hist[key]) streak++;
          else if(i>0) break;
        }

        // Desafios completados (por enquanto 0 — implementar depois)
        const desafios = 0;

        const pontos = calcPontos({treinos, volumeKg, streak, desafios});
        const liga = getLiga(pontos);

        await setDoc(doc(db,'globalRank',uid),{
          uid, nome, initials, pontos,
          treinos, volumeKg: Math.round(volumeKg),
          streak, desafios,
          liga: liga.nome, ligaCor: liga.cor,
          updatedAt: Date.now(),
        });
      } catch(e){ console.error('rankSync error',e); }
    };
    sync();
  },[uid,nome,initials]);
}
