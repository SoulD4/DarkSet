// ── Sistema de Rank Global DarkSet ────────────────────────────

export type Liga = {
  nome: string;
  min: number;
  max: number;
  cor: string;
  corBg: string;
  corBorder: string;
};

export const LIGAS: Liga[] = [
  { nome:'Frango',    min:0,    max:99,   cor:'#9ca3af', corBg:'rgba(156,163,175,.1)', corBorder:'rgba(156,163,175,.25)' },
  { nome:'Iniciante',     min:100,  max:249,  cor:'#b45309', corBg:'rgba(180,83,9,.1)',    corBorder:'rgba(180,83,9,.25)'    },
  { nome:'Dedicado',      min:250,  max:499,  cor:'#1d4ed8', corBg:'rgba(29,78,216,.1)',   corBorder:'rgba(29,78,216,.25)'   },
  { nome:'Bruto',  min:500,  max:999,  cor:'#7c3aed', corBg:'rgba(124,58,237,.1)',  corBorder:'rgba(124,58,237,.25)'  },
  { nome:'Monstro',     min:1000, max:1999, cor:'#dc2626', corBg:'rgba(220,38,38,.1)',   corBorder:'rgba(220,38,38,.25)'   },
  { nome:'Mutante',min:2000, max:99999,cor:'#d97706', corBg:'rgba(217,119,6,.1)',   corBorder:'rgba(217,119,6,.25)'   },
];

export type RankScore = {
  uid: string;
  nome: string;
  initials: string;
  pontos: number;
  treinos: number;
  volumeKg: number;
  streak: number;
  desafios: number;
  liga: string;
  ligaCor: string;
  posicao?: number;
  updatedAt: number;
};

export const getLiga = (pontos: number): Liga => {
  return LIGAS.slice().reverse().find(l => pontos >= l.min) || LIGAS[0];
};

// Fórmula de pontos
export const calcPontos = (params: {
  treinos: number;    // +10 pts cada
  volumeKg: number;   // +1 pt a cada 1000kg
  streak: number;     // +5 pts por dia consecutivo
  desafios: number;   // +50 pts cada
}): number => {
  return (
    params.treinos  * 10 +
    Math.floor(params.volumeKg / 1000) +
    params.streak   * 5 +
    params.desafios * 50
  );
};

export const fmtPontos = (p: number) =>
  p >= 1000 ? `${(p/1000).toFixed(1)}k` : String(p);
