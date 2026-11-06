import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db, type SetEntry, type Workout } from '../lib/db';
import { useBodyHistory, useProfile, useProgram } from '../lib/hooks';
import { e1rm, weeklyCheckin } from '../lib/logic';
import { TrashIcon } from '../components/Icons';

type View = 'lifts' | 'body' | 'history';

const shortDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const axis = { stroke: 'var(--line)', tick: { fill: 'var(--muted)', fontSize: 11 }, tickLine: false };

function ChartTip({ active, payload, unit }: { active?: boolean; payload?: { payload: { ts: number; value: number; detail?: string } }[]; unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div className="muted" style={{ fontSize: 12 }}>{shortDate(p.ts)}</div>
      <div style={{ fontWeight: 600 }}>{p.value} {unit}</div>
      {p.detail && <div className="muted" style={{ fontSize: 12 }}>{p.detail}</div>}
    </div>
  );
}

function TrendChart({ data, unit, goal, goalLabel }: { data: { ts: number; value: number; detail?: string }[]; unit: string; goal?: number; goalLabel?: string }) {
  const values = data.map((d) => d.value).concat(goal ? [goal] : []);
  const min = Math.floor((Math.min(...values) - 5) / 5) * 5;
  const max = Math.ceil((Math.max(...values) + 5) / 5) * 5;
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
          <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={shortDate} {...axis} minTickGap={24} />
          <YAxis domain={[min, max]} {...axis} axisLine={false} width={48} />
          {goal && (
            <ReferenceLine y={goal} stroke="var(--brass)" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: goalLabel ?? `Goal ${goal}`, position: 'insideTopRight', fill: 'var(--muted)', fontSize: 11 }} />
          )}
          <Tooltip content={<ChartTip unit={unit} />} cursor={{ stroke: 'var(--sage)', strokeWidth: 1 }} />
          <Line type="monotone" dataKey="value" stroke="var(--moss)" strokeWidth={2}
            dot={{ r: 4, fill: 'var(--moss)', stroke: 'var(--card)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--ink)', stroke: 'var(--card)', strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Progress() {
  const [view, setView] = useState<View>('lifts');
  return (
    <main className="screen">
      <div>
        <p className="eyebrow">Progress</p>
        <h1 className="title">How you're trending</h1>
      </div>
      <div className="seg" role="group" aria-label="View">
        <button aria-pressed={view === 'lifts'} onClick={() => setView('lifts')}>Lifts</button>
        <button aria-pressed={view === 'body'} onClick={() => setView('body')}>Body</button>
        <button aria-pressed={view === 'history'} onClick={() => setView('history')}>History</button>
      </div>
      {view === 'lifts' && <Lifts />}
      {view === 'body' && <Body />}
      {view === 'history' && <History />}
    </main>
  );
}

function Lifts() {
  const program = useProgram();
  const profile = useProfile();
  const exercises = program.flatMap((d) => d.exercises);
  const [exId, setExId] = useState('bench');
  const ex = exercises.find((e) => e.id === exId);

  const sessions = useLiveQuery(async () => {
    const sets = await db.sets.where('exerciseId').equals(exId).filter((s) => s.done).toArray();
    const by = new Map<number, SetEntry[]>();
    sets.forEach((s) => by.set(s.workoutId, [...(by.get(s.workoutId) ?? []), s]));
    return [...by.values()]
      .map((list) => {
        const best = list.reduce((a, s) => (e1rm(s.weight, s.reps) > e1rm(a.weight, a.reps) ? s : a));
        return { ts: Math.max(...list.map((s) => s.ts)), value: e1rm(best.weight, best.reps), detail: `Best set ${best.weight} × ${best.reps}`, top: best };
      })
      .sort((a, b) => a.ts - b.ts);
  }, [exId], []);

  const goal = profile?.goals[exId];
  const best = sessions.reduce<(typeof sessions)[number] | null>((a, s) => (!a || s.value > a.value ? s : a), null);

  return (
    <>
      <label className="field">Exercise
        <select className="input" value={exId} onChange={(e) => setExId(e.target.value)}>
          {exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
      <section className="card">
        <div className="between">
          <div>
            <p className="small muted">Estimated 1-rep max</p>
            <p className="big-num">{best ? `${best.value} lb` : '—'}</p>
          </div>
          {goal && <div style={{ textAlign: 'right' }}><p className="small muted">Old PR</p><p className="big-num" style={{ color: 'var(--brass)' }}>{goal} lb</p></div>}
        </div>
        {sessions.length >= 2 ? (
          <TrendChart data={sessions} unit="lb est. 1RM" goal={goal} goalLabel={goal ? `Old PR ${goal}` : undefined} />
        ) : (
          <p className="empty">{sessions.length === 1 ? 'One session logged. The chart appears after your second.' : `No ${ex?.name ?? 'sessions'} logged yet.`}</p>
        )}
        {best && <p className="small muted">Best set: {best.top.weight} lb × {best.top.reps} on {shortDate(best.ts)} · {sessions.length} sessions</p>}
      </section>
      {sessions.length > 0 && (
        <section className="stack" aria-label="Sessions table">
          <p className="eyebrow">Sessions</p>
          {[...sessions].reverse().slice(0, 12).map((s) => (
            <div key={s.ts} className="list-item small">
              <span>{shortDate(s.ts)}</span><span className="muted">{s.detail}</span><span><strong>{s.value}</strong> e1RM</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function Body() {
  const body = useBodyHistory();
  const profile = useProfile();
  if (!body.length) return <p className="empty">No weigh-ins yet.</p>;
  const first = body[0];
  const latest = body[body.length - 1];
  const change = Math.round((latest.weightLb - first.weightLb) * 10) / 10;
  const checkin = weeklyCheckin(body);

  return (
    <>
      <div className="grid2">
        <section className="card">
          <p className="small muted">Current</p>
          <p className="big-num">{latest.weightLb} lb</p>
          <p className="small muted">{change <= 0 ? '' : '+'}{change} lb since {shortDate(first.ts)}</p>
        </section>
        <section className="card">
          <p className="small muted">Goal</p>
          <p className="big-num">{profile?.goalWeightLb} lb</p>
          <p className="small muted">{profile ? Math.max(0, Math.round((latest.weightLb - profile.goalWeightLb) * 10) / 10) : '—'} lb to go</p>
        </section>
      </div>
      <section className="card">
        <p style={{ fontWeight: 600 }}>Body weight</p>
        {body.length >= 2 ? (
          <TrendChart data={body.map((b) => ({ ts: b.ts, value: b.weightLb, detail: b.bodyFatPct ? `${b.bodyFatPct}% body fat` : undefined }))} unit="lb" goal={profile?.goalWeightLb} goalLabel={`Goal ${profile?.goalWeightLb}`} />
        ) : (
          <p className="empty">The chart appears after your second weigh-in.</p>
        )}
        {checkin && <p className="small muted">Trend: {checkin.ratePerWeek > 0 ? '+' : ''}{checkin.ratePerWeek.toFixed(1)} lb/week (target −0.5 to −1.5)</p>}
      </section>
      <section className="stack" aria-label="Weigh-ins">
        <p className="eyebrow">Weigh-ins</p>
        {[...body].reverse().map((b) => (
          <div key={b.id} className="list-item small">
            <span>{shortDate(b.ts)}</span>
            <span><strong>{b.weightLb} lb</strong>{b.bodyFatPct ? <span className="muted"> · {b.bodyFatPct}%</span> : null}</span>
            <button className="btn ghost sm" aria-label={`Delete weigh-in from ${shortDate(b.ts)}`} onClick={() => confirm('Delete this weigh-in?') && db.body.delete(b.id!)}><TrashIcon /></button>
          </div>
        ))}
      </section>
    </>
  );
}

function History() {
  const workouts = useLiveQuery(
    async () => (await db.workouts.orderBy('startedAt').reverse().toArray()).filter((w) => w.finishedAt),
    [], [] as Workout[],
  );
  const [open, setOpen] = useState<number | null>(null);
  if (!workouts.length) return <p className="empty">Finished workouts show up here.</p>;
  return (
    <div className="stack">
      {workouts.map((w) => (
        <div key={w.id} className="stack" style={{ gap: 0 }}>
          <button className="list-item" aria-expanded={open === w.id} onClick={() => setOpen(open === w.id ? null : w.id!)}>
            <span><strong>{w.dayName}</strong> <span className="muted">· {shortDate(w.startedAt)}</span></span>
            <span className="small muted">{w.minutes ?? Math.round((w.finishedAt! - w.startedAt) / 60000)} min · {w.kcal ?? 0} kcal</span>
          </button>
          {open === w.id && <WorkoutDetail workout={w} />}
        </div>
      ))}
    </div>
  );
}

function WorkoutDetail({ workout }: { workout: Workout }) {
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id!).toArray(), [workout.id], [] as SetEntry[]);
  const groups = new Map<string, SetEntry[]>();
  sets.sort((a, b) => a.ts - b.ts).forEach((s) => groups.set(s.exerciseName, [...(groups.get(s.exerciseName) ?? []), s]));

  async function remove() {
    if (!confirm(`Delete this ${workout.dayName} workout?`)) return;
    await db.transaction('rw', db.workouts, db.sets, async () => {
      await db.sets.where('workoutId').equals(workout.id!).delete();
      await db.workouts.delete(workout.id!);
    });
  }

  return (
    <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -1 }}>
      {[...groups.entries()].map(([name, list]) => (
        <div key={name} className="between small">
          <span>{name}</span>
          <span className="muted" style={{ textAlign: 'right' }}>{list.map((s) => `${s.weight}×${s.reps}`).join(', ')}</span>
        </div>
      ))}
      <button className="btn danger sm" onClick={remove}><TrashIcon /> Delete workout</button>
    </div>
  );
}
