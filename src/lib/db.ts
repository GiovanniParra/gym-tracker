import Dexie, { type EntityTable } from 'dexie';

export type Sex = 'male' | 'female';

export interface Profile {
  id: 'me';
  name: string;
  heightIn: number;
  age: number;
  sex: Sex;
  goalWeightLb: number;
  /** Manual calorie adjustment applied by weekly check-ins (kcal/day). */
  calorieAdjust: number;
  /** Old personal records to rebuild toward, keyed by exercise id. */
  goals: Record<string, number>;
  /** Link the "Open VeSync" button opens. */
  scaleAppUrl: string;
  /** Weigh-in id the last check-in suggestion was handled for. */
  checkinHandledFor?: number;
}

export interface ExerciseDef {
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Suggested first-session weight in lb (0 = bodyweight / choose yourself). */
  startWeight: number;
  /** Main barbell lift: linear progression. Otherwise double progression. */
  main: boolean;
  lower: boolean;
  restSec: number;
  note?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  subtitle: string;
  order: number;
  exercises: ExerciseDef[];
}

export interface Workout {
  id?: number;
  dayId: string;
  dayName: string;
  startedAt: number;
  finishedAt?: number;
  effort?: Effort;
  kcal?: number;
  minutes?: number;
}

export type Effort = 'light' | 'moderate' | 'vigorous';

export interface SetEntry {
  id?: number;
  workoutId: number;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  weight: number;
  reps: number;
  done: boolean;
  ts: number;
}

export interface Cardio {
  id?: number;
  ts: number;
  type: string;
  minutes: number;
  met: number;
  kcal: number;
}

export interface FoodEntry {
  id?: number;
  ts: number;
  date: string;
  label: string;
  kcal: number;
  protein: number;
}

export interface BodyMetric {
  id?: number;
  ts: number;
  weightLb: number;
  bodyFatPct?: number;
}

export const db = new Dexie('sage-gym') as Dexie & {
  profile: EntityTable<Profile, 'id'>;
  program: EntityTable<ProgramDay, 'id'>;
  workouts: EntityTable<Workout, 'id'>;
  sets: EntityTable<SetEntry, 'id'>;
  cardio: EntityTable<Cardio, 'id'>;
  food: EntityTable<FoodEntry, 'id'>;
  body: EntityTable<BodyMetric, 'id'>;
};

db.version(1).stores({
  profile: 'id',
  program: 'id, order',
  workouts: '++id, dayId, startedAt, finishedAt',
  sets: '++id, workoutId, exerciseId, ts, [exerciseId+workoutId]',
  cardio: '++id, ts',
  food: '++id, date, ts',
  body: '++id, ts',
});

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
