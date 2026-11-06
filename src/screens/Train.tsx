import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Effort, type ProgramDay, type SetEntry, type Workout } from '../lib/db';
import {
  exerciseHistory, go, safeStore, suggestionFor, useActiveWorkout, useLatestWeigh, useNextDay, useNow, useProgram,
} from '../lib/hooks';
import { CARDIO_TYPES, EFFORT_MET, inferEffort, kcalFor } from '../lib/logic';
import { BackIcon, CheckIcon, NextIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { toast } from '../App';

/** Create a workout with every set pre-filled from the progression rules. */
export async function startWorkout(day: ProgramDay) {
  const suggestions = await Promise.all(day.exercises.map((ex) => suggestionFor(ex)));
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const workoutId = (await db.workouts.add({ dayId: day.id, dayName: day.name, startedAt: Date.now() })) as number;
    const rows: SetEntry[] = [];
    day.exercises.forEach((ex, i) => {
      for (let s = 0; s < ex.sets; s++) {
        rows.push({
          workoutId, exerciseId: ex.id, exerciseName: ex.name, setIndex: s,
          weight: suggestions[i].weight, reps: ex.repMin, done: false, ts: 0,
        });
      }
    });
    await db.sets.bulkAdd(rows);
  });
  safeStore.set('exIdx', '0');
  safeStore.set('restEnd', null);
}

export default function Train() {
  const active = useActiveWorkout();
  if (active === undefined) return null;
  return active ? <Logger workout={active} /> : <Picker />;
}

// ---------------- Choose a workout + cardio ----------------

function Picker() {
  const program = useProgram();
  const next = useNextDay();
  const latest = useLatestWeigh();
  const [type, setType] = useState(CARDIO_TYPES[0].type);
  const [minutes, setMinutes] = useState('30');
  const recentCardio = useLiveQuery(() => db.cardio.orderBy('ts').reverse().limit(5).toArray(), [], []);

  async function begin(day: ProgramDay) {
    await startWorkout(day);
  }

  async function addCardio(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(minutes);
    if (!(m > 0)) return;
    const met = CARDIO_TYPES.find((c) => c.type === type)?.met ?? 5;
    const kcal = kcalFor(met, latest?.weightLb ?? 200, m);
    await db.cardio.add({ ts: Date.now(), type, minutes: m, met, kcal });
    toast(`${type} saved: ${kcal} kcal`);
  }

  return (
    <main className="screen">
      <div>
        <p className="eyebrow">Train</p>
        <h1 className="title">Pick today's session</h1>
      </div>

      {next && (
        <section className="card dark">
          <p className="eyebrow">Up next in your split</p>
          <h2 className="title" style={{ fontSize: 30 }}>{next.name}</h2>
          <div className="stack" style={{ gap: 4 }}>
            {next.exercises.map((e) => (
              <div key={e.id} className="between small">
                <span>{e.name}</span>
                <span className="muted">{e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}</span>
              </div>
            ))}
          </div>
          <button className="btn light lg block" onClick={() => begin(next)}>Start {next.name}</button>
        </section>
      )}

      <p className="eyebrow" style={{ marginTop: 4 }}>Or do a different day</p>
      <div className="stack">
        {program.filter((d) => d.id !== next?.id).map((d) => (
          <button key={d.id} className="list-item" onClick={() => begin(d)}>
            <span><strong>{d.name}</strong> <span className="muted">· {d.subtitle}</span></span>
            <span className="small muted">Start</span>
          </button>
        ))}
      </div>

      <section className="card" style={{ marginTop: 6 }} aria-label="Log cardio">
        <p style={{ fontWeight: 600 }}>Log cardio</p>
        <p className="small muted">Plan: 3 × 25–35 min incline walk per week, plus 8–10k steps a day.</p>
        <form className="stack" onSubmit={addCardio}>
          <div className="grid2">
            <label className="field">Type
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {CARDIO_TYPES.map((c) => <option key={c.type}>{c.type}</option>)}
              </select>
            </label>
            <label className="field">Minutes
              <input className="input" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
          </div>
          <button className="btn soft" type="submit">Save cardio</button>
        </form>
        {recentCardio.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {recentCardio.map((c) => (
              <div key={c.id} className="between small">
                <span>{c.type} · {c.minutes} min <span className="muted">· {new Date(c.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></span>
                <span className="row" style={{ gap: 4 }}>
                  <span className="muted">{c.kcal} kcal</span>
                  <button className="btn ghost sm" aria-label={`Delete ${c.type}`} onClick={() => db.cardio.delete(c.id!)}><TrashIcon /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ---------------- Live workout ----------------

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Logger({ workout }: { workout: Workout }) {
  const program = useProgram();
  const day = program.find((d) => d.id === workout.dayId);
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id!).toArray(), [workout.id], [] as SetEntry[]);
  const [idx, setIdx] = useState(() => Number(safeStore.get('exIdx') ?? 0) || 0);
  const [restEnd, setRestEnd] = useState<number | null>(() => Number(safeStore.get('restEnd')) || null);
  const [finishing, setFinishing] = useState(false);
  const now = useNow(1000);

  // Exercises in program order, plus any extra the program no longer has.
  const exercises = day?.exercises ?? [];
  const cur = exercises[Math.min(idx, exercises.length - 1)];

  useEffect(() => safeStore.set('exIdx', String(idx)), [idx]);
  useEffect(() => safeStore.set('restEnd', restEnd ? String(restEnd) : null), [restEnd]);

  const history = useLiveQuery(
    async () => (cur ? exerciseHistory(cur.id, workout.id) : []),
    [cur?.id, workout.id],
    [],
  );
  const suggestion = useLiveQuery(async () => (cur ? suggestionFor(cur, workout.id) : null), [cur?.id, workout.id], null);

  if (!day || !cur) {
    return (
      <main className="screen">
        <p className="empty">This workout's program day was removed.</p>
        <button className="btn danger" onClick={() => discard(workout.id!)}>Discard workout</button>
      </main>
    );
  }

  const curSets = sets.filter((s) => s.exerciseId === cur.id).sort((a, b) => a.setIndex - b.setIndex);
  const doneCount = sets.filter((s) => s.done).length;
  const elapsedMin = (now - workout.startedAt) / 60000;
  const restLeft = restEnd ? (restEnd - now) / 1000 : 0;
  const isLast = idx >= exercises.length - 1;

  async function toggle(s: SetEntry) {
    const done = !s.done;
    await db.sets.update(s.id!, { done, ts: done ? Date.now() : 0 });
    if (done) setRestEnd(Date.now() + cur.restSec * 1000);
  }

  async function addSet() {
    const last = curSets[curSets.length - 1];
    await db.sets.add({
      workoutId: workout.id!, exerciseId: cur.id, exerciseName: cur.name,
      setIndex: (last?.setIndex ?? -1) + 1, weight: last?.weight ?? suggestion?.weight ?? 0,
      reps: last?.reps ?? cur.repMin, done: false, ts: 0,
    });
  }

  async function removeSet() {
    const last = curSets[curSets.length - 1];
    if (last) await db.sets.delete(last.id!);
  }

  const lastTime = history[0];

  return (
    <main className="screen">
      <div className="between">
        <div>
          <h1 className="title" style={{ fontSize: 28 }}>{workout.dayName}</h1>
          <p className="small muted">Exercise {idx + 1} of {exercises.length} · {fmt(elapsedMin * 60)} elapsed · {doneCount} sets done</p>
        </div>
      </div>

      <div className="row" style={{ overflowX: 'auto', gap: 6, paddingBottom: 2, margin: '0 -18px', padding: '0 18px' }} role="tablist" aria-label="Exercises">
        {exercises.map((e, i) => {
          const allDone = sets.filter((s) => s.exerciseId === e.id).every((s) => s.done) && sets.some((s) => s.exerciseId === e.id);
          return (
            <button
              key={e.id}
              role="tab"
              aria-selected={i === idx}
              onClick={() => setIdx(i)}
              className="pill"
              style={{
                border: 0, height: 34, cursor: 'pointer', flexShrink: 0,
                background: i === idx ? 'var(--ink)' : allDone ? 'var(--sage)' : 'var(--card)',
                color: i === idx ? 'var(--on-ink)' : 'var(--ink)',
                outline: i === idx ? 'none' : '1px solid var(--line)',
              }}
            >
              {i + 1}. {e.name.replace(/ \(.*\)| or .*/i, '')}
            </button>
          );
        })}
      </div>

      <section className="card" aria-label={cur.name}>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 className="title">{cur.name}</h2>
            <p className="small muted" style={{ marginTop: 4 }}>
              {cur.sets} × {cur.repMin === cur.repMax ? cur.repMin : `${cur.repMin}–${cur.repMax}`}
              {cur.note ? ` · ${cur.note}` : ''}
            </p>
          </div>
          <span className="pill">{cur.main ? 'Main lift' : 'Accessory'}</span>
        </div>

        {suggestion && (
          <p className="small" style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>
            {suggestion.weight ? <><strong>{suggestion.weight} lb</strong> · </> : null}{suggestion.reason}
          </p>
        )}

        <div className="set-row small muted" style={{ padding: '0 4px', textAlign: 'center' }}>
          <span>Set</span><span>lb</span><span>Reps</span><span>Done</span>
        </div>
        {curSets.map((s, i) => <SetRow key={s.id} set={s} n={i + 1} onToggle={() => toggle(s)} />)}

        <div className="row">
          <button className="btn soft sm" onClick={addSet}><PlusIcon /> Add set</button>
          {curSets.length > 0 && <button className="btn ghost sm" onClick={removeSet}>Remove set</button>}
        </div>

        <p className="small muted">
          {lastTime ? `Last time: ${lastTime.weight} lb × ${lastTime.reps.join(', ')}` : 'First time logging this exercise.'}
        </p>
      </section>

      {restEnd && (
        <section className="card dark rest-bar" aria-live="polite">
          <div className="row" style={{ gap: 14 }}>
            <div style={{ flex: 1 }}>
              <p className="small muted">{restLeft > 0 ? 'Rest' : 'Rest done, next set'}</p>
              <p className="serif" style={{ fontSize: 34 }}>{restLeft > 0 ? fmt(restLeft) : '0:00'}</p>
            </div>
            <button className="btn sm" style={{ border: '1px solid var(--on-ink-muted)', background: 'transparent' }} onClick={() => setRestEnd(Math.max(restEnd, Date.now()) + 30_000)}>+30s</button>
            <button className="btn light sm" onClick={() => setRestEnd(null)}>{restLeft > 0 ? 'Skip' : 'Close'}</button>
          </div>
        </section>
      )}

      <div className="row" style={{ marginTop: 4 }}>
        <button className="btn outline lg" disabled={idx === 0} onClick={() => setIdx(idx - 1)} aria-label="Previous exercise"><BackIcon /></button>
        {isLast ? (
          <button className="btn lg" style={{ flex: 1 }} onClick={() => setFinishing(true)}>Finish workout</button>
        ) : (
          <button className="btn lg" style={{ flex: 1 }} onClick={() => setIdx(idx + 1)}>Next: {exercises[idx + 1].name.replace(/ \(.*\)/, '')} <NextIcon /></button>
        )}
      </div>
      {!isLast && <button className="btn ghost" onClick={() => setFinishing(true)}>Finish early</button>}

      {finishing && <FinishSheet workout={workout} doneSets={doneCount} minutes={elapsedMin} onClose={() => setFinishing(false)} />}
    </main>
  );
}

function SetRow({ set, n, onToggle }: { set: SetEntry; n: number; onToggle: () => void }) {
  const [w, setW] = useState(String(set.weight || ''));
  const [r, setR] = useState(String(set.reps || ''));
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    if (!focus) {
      setW(String(set.weight || ''));
      setR(String(set.reps || ''));
    }
  }, [set.weight, set.reps, focus]);

  const save = (field: 'weight' | 'reps', v: string) => {
    const num = Number(v);
    if (v === '' || Number.isFinite(num)) db.sets.update(set.id!, { [field]: v === '' ? 0 : num });
  };

  return (
    <div className={`set-row${set.done ? ' done' : ''}`}>
      <span style={{ fontWeight: 600, textAlign: 'center' }}>{n}</span>
      <input
        className="num-input" type="number" inputMode="decimal" step="any" aria-label={`Set ${n} weight in pounds`}
        value={w} onFocus={(e) => { setFocus(true); e.target.select(); }} onBlur={() => setFocus(false)}
        onChange={(e) => { setW(e.target.value); save('weight', e.target.value); }}
      />
      <input
        className="num-input" type="number" inputMode="numeric" aria-label={`Set ${n} reps`}
        value={r} onFocus={(e) => { setFocus(true); e.target.select(); }} onBlur={() => setFocus(false)}
        onChange={(e) => { setR(e.target.value); save('reps', e.target.value); }}
      />
      <button className="check" aria-pressed={set.done} aria-label={`Mark set ${n} done`} onClick={onToggle}><CheckIcon /></button>
    </div>
  );
}

async function discard(id: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete();
    await db.workouts.delete(id);
  });
  safeStore.set('restEnd', null);
}

function FinishSheet({ workout, doneSets, minutes, onClose }: { workout: Workout; doneSets: number; minutes: number; onClose: () => void }) {
  const latest = useLatestWeigh();
  const realMin = minutes > 5 ? Math.min(minutes, 180) : doneSets * 3;
  const [mins, setMins] = useState(String(Math.round(realMin)));
  const [effort, setEffort] = useState<Effort>(inferEffort(doneSets, realMin));
  const weight = latest?.weightLb ?? 200;
  const kcal = kcalFor(EFFORT_MET[effort], weight, Number(mins) || 0);

  async function save() {
    await db.transaction('rw', db.workouts, db.sets, async () => {
      await db.sets.where('workoutId').equals(workout.id!).filter((s) => !s.done).delete();
      await db.workouts.update(workout.id!, { finishedAt: Date.now(), effort, kcal, minutes: Number(mins) || 0 });
    });
    safeStore.set('restEnd', null);
    safeStore.set('exIdx', '0');
    toast(`${workout.dayName} saved: ${kcal} kcal burned`);
    go('home');
  }

  async function onDiscard() {
    if (!confirm('Delete this workout and every set in it?')) return;
    await discard(workout.id!);
    go('home');
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Finish workout" onClick={(e) => e.stopPropagation()}>
        <h2 className="title">Finish {workout.dayName}</h2>
        <p className="small muted">{doneSets} sets done. Sets you didn't check off won't be saved.</p>
        <label className="field">Duration (minutes)
          <input className="input" type="number" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} />
        </label>
        <div className="field">How hard was it?
          <div className="seg" role="group" aria-label="Effort">
            {(['light', 'moderate', 'vigorous'] as Effort[]).map((e) => (
              <button key={e} type="button" aria-pressed={effort === e} onClick={() => setEffort(e)} style={{ textTransform: 'capitalize' }}>{e}</button>
            ))}
          </div>
        </div>
        <div className="card tint">
          <p className="small muted">Estimated burn</p>
          <p className="big-num">{kcal} kcal</p>
          <p className="small muted">MET {EFFORT_MET[effort]} × {weight} lb × {mins || 0} min. An estimate, ±20–30%.</p>
        </div>
        <button className="btn lg block" onClick={save}>Save workout</button>
        <div className="row">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>Keep training</button>
          <button className="btn danger sm" onClick={onDiscard}>Discard</button>
        </div>
      </div>
    </div>
  );
}
