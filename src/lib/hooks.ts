import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, todayKey, type ProgramDay, type SetEntry } from './db';
import { dailyTargets, suggestWeight, type PastSession } from './logic';
import type { ExerciseDef } from './db';

export const useProfile = () => useLiveQuery(() => db.profile.get('me'));

export const useLatestWeigh = () => useLiveQuery(() => db.body.orderBy('ts').last(), [], null);

export const useBodyHistory = () => useLiveQuery(() => db.body.orderBy('ts').toArray(), [], []);

export const useProgram = () =>
  useLiveQuery(() => db.program.orderBy('order').toArray(), [], [] as ProgramDay[]);

export const useActiveWorkout = () =>
  useLiveQuery(
    async () => (await db.workouts.orderBy('startedAt').reverse().toArray()).find((w) => !w.finishedAt) ?? null,
    [],
    undefined,
  );

/** Today's targets from the latest weigh-in (falls back to 200 lb before the first one). */
export function useTargets() {
  const profile = useProfile();
  const latest = useLatestWeigh();
  if (!profile) return null;
  const weightLb = latest?.weightLb ?? 200;
  return { profile, weightLb, hasWeigh: !!latest, ...dailyTargets(profile, weightLb) };
}

export function useTodayFood() {
  return useLiveQuery(() => db.food.where('date').equals(todayKey()).toArray(), [], []);
}

/** The program day after the last finished workout. */
export async function nextProgramDay(): Promise<ProgramDay | undefined> {
  const days = await db.program.orderBy('order').toArray();
  if (!days.length) return undefined;
  const finished = (await db.workouts.orderBy('startedAt').reverse().toArray()).find((w) => w.finishedAt);
  if (!finished) return days[0];
  const idx = days.findIndex((d) => d.id === finished.dayId);
  return days[(idx + 1) % days.length];
}

export const useNextDay = () => useLiveQuery(nextProgramDay, [], undefined);

/** Past sessions of an exercise, newest first, excluding the given workout. */
export async function exerciseHistory(exerciseId: string, excludeWorkoutId?: number): Promise<PastSession[]> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).filter((s) => s.done).toArray();
  const byWorkout = new Map<number, SetEntry[]>();
  for (const s of sets) {
    if (s.workoutId === excludeWorkoutId) continue;
    byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s]);
  }
  const sessions = [...byWorkout.values()]
    .map((list) => {
      const top = Math.max(...list.map((s) => s.weight));
      return { ts: Math.max(...list.map((s) => s.ts)), weight: top, reps: list.filter((s) => s.weight === top).map((s) => s.reps) };
    })
    .sort((a, b) => b.ts - a.ts);
  return sessions.map(({ weight, reps }) => ({ weight, reps }));
}

export async function suggestionFor(ex: ExerciseDef, excludeWorkoutId?: number) {
  return suggestWeight(ex, await exerciseHistory(ex.id, excludeWorkoutId));
}

/** Re-render every `ms` (for timers). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (route: string) => {
  window.location.hash = `#/${route}`;
  window.scrollTo(0, 0);
};

/** localStorage that never throws (private mode etc.). */
export const safeStore = {
  get(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, val: string | null) {
    try {
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch { /* ignore */ }
  },
};
