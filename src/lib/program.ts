import { db, type ExerciseDef, type ProgramDay, type Profile } from './db';

const ex = (
  id: string,
  name: string,
  sets: number,
  repMin: number,
  repMax: number,
  opts: Partial<ExerciseDef> = {},
): ExerciseDef => ({
  id,
  name,
  sets,
  repMin,
  repMax,
  startWeight: 0,
  main: false,
  lower: false,
  restSec: 90,
  ...opts,
});

/** Upper/Lower 4-day split for rebuilding strength while cutting. */
export const DEFAULT_PROGRAM: ProgramDay[] = [
  {
    id: 'UA', name: 'Upper A', subtitle: 'Heavy', order: 0,
    exercises: [
      ex('bench', 'Bench press', 4, 5, 5, { startWeight: 145, main: true, restSec: 180 }),
      ex('row', 'Barbell row', 4, 6, 6, { startWeight: 135, main: true, restSec: 150 }),
      ex('ohp', 'Overhead press', 3, 6, 8, { startWeight: 95, main: true, restSec: 150 }),
      ex('pulldown', 'Pull-ups or lat pulldown', 3, 8, 10),
      ex('pushdown', 'Triceps pushdown', 3, 10, 12),
      ex('ezcurl', 'EZ-bar curl', 3, 10, 12),
    ],
  },
  {
    id: 'LA', name: 'Lower A', subtitle: 'Heavy', order: 1,
    exercises: [
      ex('squat', 'Back squat', 4, 5, 5, { startWeight: 205, main: true, lower: true, restSec: 180 }),
      ex('rdl', 'Romanian deadlift', 3, 6, 8, { startWeight: 185, main: true, lower: true, restSec: 150 }),
      ex('legpress', 'Leg press', 3, 10, 10, { lower: true }),
      ex('legcurl', 'Lying leg curl', 3, 10, 12, { lower: true }),
      ex('calf', 'Standing calf raise', 3, 12, 15, { lower: true, restSec: 60 }),
      ex('plank', 'Plank (seconds)', 3, 45, 60, { lower: true, restSec: 60, note: 'Log seconds as reps' }),
    ],
  },
  {
    id: 'UB', name: 'Upper B', subtitle: 'Volume', order: 2,
    exercises: [
      ex('incdb', 'Incline dumbbell press', 4, 8, 10),
      ex('cablerow', 'Chest-supported or cable row', 4, 8, 10),
      ex('dbpress', 'Dumbbell shoulder press', 3, 8, 10),
      ex('lateral', 'Lateral raise', 3, 12, 15, { restSec: 60 }),
      ex('dips', 'Dips or close-grip bench', 3, 8, 10),
      ex('hammer', 'Hammer curl', 3, 10, 12),
      ex('facepull', 'Face pull', 3, 15, 15, { restSec: 60 }),
    ],
  },
  {
    id: 'LB', name: 'Lower B', subtitle: 'Volume', order: 3,
    exercises: [
      ex('deadlift', 'Deadlift', 3, 5, 5, {
        startWeight: 225, main: true, lower: true, restSec: 180,
        note: 'Week 1: find a weight where 5 reps feel solid but not all-out',
      }),
      ex('bss', 'Bulgarian split squat (per leg)', 3, 8, 8, { lower: true }),
      ex('hipthrust', 'Hip thrust', 3, 10, 10, { lower: true }),
      ex('legext', 'Leg extension', 3, 12, 15, { lower: true }),
      ex('seatcalf', 'Seated calf raise', 3, 15, 15, { lower: true, restSec: 60 }),
      ex('hlr', 'Hanging leg raise', 3, 10, 15, { lower: true, restSec: 60 }),
    ],
  },
];

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  name: '',
  heightIn: 70,
  age: 25,
  sex: 'male',
  goalWeightLb: 185,
  calorieAdjust: 0,
  goals: { bench: 225, squat: 315 },
  scaleAppUrl: 'vesync://',
};

/** Seed the database the first time the app opens. */
export async function ensureSeeded() {
  await db.transaction('rw', db.profile, db.program, async () => {
    if (!(await db.profile.get('me'))) await db.profile.put(DEFAULT_PROFILE);
    if ((await db.program.count()) === 0) await db.program.bulkPut(DEFAULT_PROGRAM);
  });
}
