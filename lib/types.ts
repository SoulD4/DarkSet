// Tipos centralizados do DarkSet

export type SetEntry = {
  w: string;
  r: string;
  done?: boolean;
};

export type ExerciseEntry = {
  name: string;
  exId?: string;
  sets: SetEntry[];
};

export type TrainingSession = {
  planId?: string;
  planName?: string;
  day?: string;
  entries: ExerciseEntry[];
  duration?: number;
  savedAt?: number;
};

export type TrainingHistory = Record<string, TrainingSession>;

export type PlanItem = {
  exId: string;
  name: string;
  setsPlanned: number;
  repsTarget: string;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  byDay: Record<string, PlanItem[]>;
};

export type PlansPayload = {
  list: WorkoutPlan[];
  activeId: string | null;
};

export type UserData = {
  name: string;
  photoURL: string | null;
  weeklyGoal: number;
  trainDays: number[];
  notifications: boolean;
  vibration: boolean;
  weightUnit: 'kg' | 'lbs';
  planData: { tier: 'free' | 'pro' | 'elite' | 'darkgod' };
};

export type BodyMeasurement = {
  date: string;
  weight?: number;
  bodyFat?: number;
  waist?: number;
  hip?: number;
  arm?: number;
  thigh?: number;
};

export type CardioSession = {
  type: string;
  duration: number;
  distance?: number;
  calories?: number;
  pace?: number;
  savedAt: number;
};

// Utilitários de parsing seguros
export const parseNum = (v: unknown): number => {
  const n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? n : 0;
};

export const safeJsonParse = <T>(raw: string | undefined, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const calcSessionVolume = (session: TrainingSession): number =>
  (session.entries ?? []).reduce(
    (total, ex) =>
      total +
      (ex.sets ?? []).reduce((sum, s) => sum + parseNum(s.w) * parseNum(s.r), 0),
    0,
  );
