import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { go, safeStore, useActiveWorkout, useBodyHistory, useNextDay, useTargets, useTodayFood } from '../lib/hooks';
import { weeklyCheckin, weighInDue } from '../lib/logic';
import { ExternalIcon, GearIcon, ScaleIcon } from '../components/Icons';
import { startWorkout } from './Train';
import { toast } from '../App';

const AWAIT_KEY = 'awaitingWeighIn';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const t = useTargets();
  const body = useBodyHistory();
  const food = useTodayFood();
  const active = useActiveWorkout();
  const next = useNextDay();
  const [entering, setEntering] = useState(false);
  const [weight, setWeight] = useState('');
  const [bf, setBf] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Coming back from the scale app → open the entry box with the keyboard ready.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && safeStore.get(AWAIT_KEY)) {
        safeStore.set(AWAIT_KEY, null);
        setEntering(true);
        setTimeout(() => inputRef.current?.focus(), 250);
      }
    };
    onVisible();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const weekStats = useLiveQuery(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
    const ws = await db.workouts.where('startedAt').aboveOrEqual(start.getTime()).filter((w) => !!w.finishedAt).toArray();
    const cardio = await db.cardio.where('ts').aboveOrEqual(start.getTime()).toArray();
    return {
      workouts: ws.length,
      kcal: ws.reduce((a, w) => a + (w.kcal ?? 0), 0) + cardio.reduce((a, c) => a + c.kcal, 0),
    };
  }, [], { workouts: 0, kcal: 0 });

  const prBars = useLiveQuery(async () => {
    if (!t) return [];
    const days = await db.program.toArray();
    const all = days.flatMap((d) => d.exercises);
    return Promise.all(
      Object.entries(t.profile.goals).map(async ([id, goal]) => {
        const ex = all.find((e) => e.id === id);
        const sets = await db.sets.where('exerciseId').equals(id).filter((s) => s.done).sortBy('ts');
        const current = sets.length ? Math.max(...sets.slice(-8).map((s) => s.weight)) : ex?.startWeight ?? 0;
        return { id, name: ex?.name.replace(/ press| \(.*\)/i, '') ?? id, current, goal };
      }),
    );
  }, [t?.profile.goals], []);

  if (!t) return null;
  const latest = body[body.length - 1];
  const due = weighInDue(latest);
  const checkin = weeklyCheckin(body);
  const showCheckin = checkin && t.profile.checkinHandledFor !== checkin.basedOn;
  const eaten = food.reduce((a, f) => a + f.kcal, 0);
  const protein = food.reduce((a, f) => a + f.protein, 0);
  const left = t.calories - eaten;

  async function saveWeigh(e: React.FormEvent) {
    e.preventDefault();
    const w = Number(weight);
    if (!(w > 60 && w < 700)) return;
    await db.body.add({ ts: Date.now(), weightLb: w, bodyFatPct: bf ? Number(bf) : undefined });
    setEntering(false);
    setWeight('');
    setBf('');
    toast('Weigh-in saved. Targets updated.');
  }

  function openScale() {
    safeStore.set(AWAIT_KEY, '1');
    window.location.href = t!.profile.scaleAppUrl || 'vesync://';
  }

  async function handleCheckin(apply: boolean) {
    if (!checkin) return;
    await db.profile.update('me', {
      checkinHandledFor: checkin.basedOn,
      calorieAdjust: t!.profile.calorieAdjust + (apply ? checkin.adjust : 0),
    });
    if (apply && checkin.adjust) toast(`Daily target ${checkin.adjust > 0 ? 'raised' : 'lowered'} by 150 kcal`);
  }

  async function start() {
    if (active) return go('train');
    if (!next) return;
    await startWorkout(next);
    go('train');
  }

  return (
    <main className="screen">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <p className="small muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <h1 className="title">{greeting()}, {t.profile.name}</h1>
        </div>
        <a className="icon-btn" href="#/settings" aria-label="Settings"><GearIcon /></a>
      </div>

      {(due || entering) && (
        <section className="card" aria-label="Weigh-in">
          <div className="row">
            <ScaleIcon style={{ color: 'var(--moss)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600 }}>{due ? 'Weekly weigh-in due' : 'Add a weigh-in'}</p>
              <p className="small muted">Morning, before eating. Check the scale, then add it here.</p>
            </div>
          </div>
          {entering ? (
            <form className="stack" onSubmit={saveWeigh}>
              <div className="grid2">
                <label className="field">Weight (lb)
                  <input ref={inputRef} className="input" type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={latest ? String(latest.weightLb) : '000.0'} />
                </label>
                <label className="field">Body fat % (optional)
                  <input className="input" type="number" inputMode="decimal" step="0.1" value={bf} onChange={(e) => setBf(e.target.value)} />
                </label>
              </div>
              <div className="row">
                <button type="button" className="btn ghost" onClick={() => setEntering(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ flex: 1 }} disabled={!(Number(weight) > 60)}>Save weigh-in</button>
              </div>
            </form>
          ) : (
            <div className="row">
              <button type="button" className="btn outline" style={{ flex: 1, height: 44 }} onClick={openScale}>Open VeSync <ExternalIcon /></button>
              <button type="button" className="btn" style={{ flex: 1, height: 44 }} onClick={() => setEntering(true)}>Enter weight</button>
            </div>
          )}
        </section>
      )}

      {showCheckin && (
        <section className="card tint" aria-label="Weekly check-in">
          <p className="eyebrow">Weekly check-in</p>
          <p style={{ fontSize: 15 }}>{checkin.message}</p>
          {checkin.adjust !== 0 ? (
            <div className="row">
              <button className="btn ghost" onClick={() => handleCheckin(false)}>Not now</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => handleCheckin(true)}>
                {checkin.adjust > 0 ? 'Add 150 kcal' : 'Cut 150 kcal'}
              </button>
            </div>
          ) : (
            <button className="btn soft" onClick={() => handleCheckin(false)}>Got it</button>
          )}
        </section>
      )}

      <section className="card dark" aria-label="Today's workout">
        <div className="between">
          <p className="eyebrow">{active ? 'In progress' : 'Up next'}</p>
          <p className="small muted">{weekStats.workouts} of 4 this week</p>
        </div>
        <div>
          <h2 className="title" style={{ fontSize: 30 }}>{active ? active.dayName : next?.name ?? '—'}</h2>
          {!active && next && (
            <p className="small muted" style={{ marginTop: 4 }}>
              {next.exercises.slice(0, 3).map((e) => e.name.replace(/ \(.*\)/, '')).join(' · ')}
              {next.exercises.length > 3 ? ` · +${next.exercises.length - 3} more` : ''}
            </p>
          )}
        </div>
        <button className="btn light lg block" onClick={start}>{active ? 'Continue workout' : 'Start workout'}</button>
      </section>

      <div className="grid2">
        <section className="card" aria-label="Calories">
          <p className="small muted">Calories left</p>
          <p className="big-num" style={{ color: left < 0 ? 'var(--danger)' : undefined }}>{left.toLocaleString()}</p>
          <div className="bar"><div style={{ width: `${Math.min(100, (eaten / t.calories) * 100)}%` }} /></div>
          <p className="small muted">{eaten.toLocaleString()} of {t.calories.toLocaleString()}</p>
        </section>
        <section className="card" aria-label="Protein">
          <p className="small muted">Protein</p>
          <p className="big-num">{protein}<span className="small muted" style={{ fontFamily: 'var(--sans)', fontWeight: 500 }}> / {t.protein} g</span></p>
          <div className="bar"><div style={{ width: `${Math.min(100, (protein / t.protein) * 100)}%` }} /></div>
          <a className="btn soft sm" href="#/food">+ Log food</a>
        </section>
      </div>

      {prBars.length > 0 && (
        <section className="card" aria-label="Road back to your PRs">
          <div className="between">
            <p style={{ fontWeight: 600 }}>Road back to your PRs</p>
            <p className="small muted">{Math.round(weekStats.kcal).toLocaleString()} kcal burned this week</p>
          </div>
          {prBars.map((b) => (
            <div key={b.id} className="stack" style={{ gap: 6 }}>
              <div className="between small"><span>{b.name}</span><span className="muted">{b.current} → {b.goal} lb</span></div>
              <div className="bar thick brass"><div style={{ width: `${Math.min(100, (b.current / b.goal) * 100)}%` }} /></div>
            </div>
          ))}
        </section>
      )}

      {!due && !entering && latest && (
        <button className="list-item" onClick={() => setEntering(true)}>
          <span>Last weigh-in: <strong>{latest.weightLb} lb</strong> · {new Date(latest.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span className="small muted">Add</span>
        </button>
      )}
    </main>
  );
}
