import type { BodyMetric, Effort, ExerciseDef, Profile } from './db';

// ---------- Progression ----------

/** One past session of an exercise: the working weight and reps of each completed set. */
export interface PastSession {
  weight: number;
  reps: number[];
}

export interface Suggestion {
  weight: number;
  reason: string;
}

export const roundTo5 = (n: number) => Math.round(n / 5) * 5;

function hitAll(ex: ExerciseDef, s: PastSession) {
  const target = ex.main ? ex.repMin : ex.repMax;
  return s.reps.length >= ex.sets && s.reps.every((r) => r >= target);
}

/**
 * Next-session weight.
 * Main lifts: linear (+5 upper, +10 lower until the first miss, then +5); two misses at the same weight → drop 10%.
 * Accessories: double progression (+5 once every set reaches the top of the rep range).
 * `history` is newest first.
 */
export function suggestWeight(ex: ExerciseDef, history: PastSession[]): Suggestion {
  const last = history[0];
  if (!last) {
    return ex.startWeight
      ? { weight: ex.startWeight, reason: 'Starting weight' }
      : { weight: 0, reason: 'Pick a weight you can do with good form' };
  }
  if (hitAll(ex, last)) {
    let inc = 5;
    if (ex.main && ex.lower) {
      const everMissed = history.some((s) => !hitAll(ex, s));
      inc = everMissed ? 5 : 10;
    }
    return {
      weight: last.weight + inc,
      reason: ex.main ? `Hit every rep last time: +${inc} lb` : `Top of the rep range hit: +${inc} lb`,
    };
  }
  if (ex.main) {
    const prev = history[1];
    if (prev && prev.weight === last.weight && !hitAll(ex, prev)) {
      return { weight: roundTo5(last.weight * 0.9), reason: 'Missed twice: drop 10% and build back up' };
    }
    return { weight: last.weight, reason: 'Same weight: finish every rep this time' };
  }
  return { weight: last.weight, reason: `Same weight: work up to ${ex.repMax} reps` };
}

/** Estimated 1-rep max (Epley). */
export const e1rm = (weight: number, reps: number) =>
  reps <= 1 ? weight : Math.round(weight * (1 + reps / 30));

// ---------- Calories ----------

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

/** Mifflin–St Jeor resting burn. */
export function bmr(p: Profile, weightLb: number) {
  const kg = weightLb * LB_TO_KG;
  const cm = p.heightIn * IN_TO_CM;
  return 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

/** Maintenance for someone training 4 days a week (moderately active). */
export const maintenance = (p: Profile, weightLb: number) => bmr(p, weightLb) * 1.55;

export const round10 = (n: number) => Math.round(n / 10) * 10;

export function dailyTargets(p: Profile, weightLb: number) {
  return {
    maintenance: round10(maintenance(p, weightLb)),
    calories: round10(maintenance(p, weightLb) - 500 + p.calorieAdjust),
    protein: Math.round(p.goalWeightLb),
    fatMin: 65,
  };
}

export const EFFORT_MET: Record<Effort, number> = { light: 3.5, moderate: 5.0, vigorous: 6.0 };

/** Guess workout intensity from how many sets were done per minute. */
export function inferEffort(setsDone: number, minutes: number): Effort {
  if (minutes <= 0) return 'moderate';
  const density = setsDone / minutes;
  if (density >= 0.4) return 'vigorous';
  if (density < 0.25) return 'light';
  return 'moderate';
}

/** Calories = MET × kg × hours. */
export const kcalFor = (met: number, weightLb: number, minutes: number) =>
  Math.round(met * weightLb * LB_TO_KG * (minutes / 60));

export const CARDIO_TYPES: { type: string; met: number }[] = [
  { type: 'Incline walk', met: 5.5 },
  { type: 'Walk', met: 3.5 },
  { type: 'Bike', met: 6.8 },
  { type: 'Elliptical', met: 5.0 },
  { type: 'Stair climber', met: 8.0 },
  { type: 'Run', met: 9.8 },
];

// ---------- Weigh-ins ----------

const DAY = 86_400_000;

export function weighInDue(latest: BodyMetric | undefined, now = Date.now()) {
  return !latest || now - latest.ts >= 7 * DAY - 6 * 3_600_000; // allow a few hours early
}

export interface Checkin {
  ratePerWeek: number; // negative = losing
  adjust: -150 | 0 | 150;
  message: string;
  basedOn: number; // id of latest weigh-in
}

/**
 * Compare the latest weigh-in with the one about two weeks earlier.
 * Target loss is 0.5–1.5 lb per week.
 */
export function weeklyCheckin(entries: BodyMetric[]): Checkin | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.ts - b.ts);
  const latest = sorted[sorted.length - 1];
  const base =
    [...sorted].reverse().find((e) => latest.ts - e.ts >= 12 * DAY) ?? null;
  if (!base) return null;
  const weeks = (latest.ts - base.ts) / (7 * DAY);
  const rate = (latest.weightLb - base.weightLb) / weeks;
  const loss = -rate;
  if (loss < 0.5) {
    return {
      ratePerWeek: rate, adjust: -150, basedOn: latest.id!,
      message: `You're losing ${Math.max(loss, 0).toFixed(1)} lb/week, slower than the 0.5–1.5 target. Eat 150 kcal less per day?`,
    };
  }
  if (loss > 1.5) {
    return {
      ratePerWeek: rate, adjust: 150, basedOn: latest.id!,
      message: `You're losing ${loss.toFixed(1)} lb/week, fast enough to cost strength. Eat 150 kcal more per day?`,
    };
  }
  return {
    ratePerWeek: rate, adjust: 0, basedOn: latest.id!,
    message: `Losing ${loss.toFixed(1)} lb/week, right on target. Keep calories the same.`,
  };
}
