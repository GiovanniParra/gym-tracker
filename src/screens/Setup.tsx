import { useState } from 'react';
import { db, type Sex } from '../lib/db';
import { dailyTargets } from '../lib/logic';
import { DEFAULT_PROFILE } from '../lib/program';

export default function Setup() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [ft, setFt] = useState('5');
  const [inch, setInch] = useState('10');
  const [sex, setSex] = useState<Sex>('male');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('185');

  const valid = name.trim() && Number(age) > 10 && Number(weight) > 60 && Number(goal) > 60;
  const heightIn = Number(ft) * 12 + Number(inch);
  const preview = valid
    ? dailyTargets({ ...DEFAULT_PROFILE, age: Number(age), heightIn, sex, goalWeightLb: Number(goal) }, Number(weight))
    : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    await db.transaction('rw', db.profile, db.body, async () => {
      const cur = (await db.profile.get('me')) ?? DEFAULT_PROFILE;
      await db.profile.put({
        ...cur,
        name: name.trim(),
        age: Number(age),
        heightIn,
        sex,
        goalWeightLb: Number(goal),
      });
      await db.body.add({ ts: Date.now(), weightLb: Number(weight) });
    });
  }

  return (
    <form className="screen" style={{ paddingBottom: 40 }} onSubmit={save}>
      <div className="stack" style={{ gap: 6, marginTop: 12 }}>
        <p className="eyebrow">Welcome</p>
        <h1 className="title">Let's set you up</h1>
        <p className="muted small">This sets your calorie and protein targets. You can change any of it later in Settings.</p>
      </div>

      <div className="card">
        <label className="field">First name<input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /></label>
        <div className="grid2">
          <label className="field">Age<input className="input" type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} /></label>
          <div className="field">Sex
            <div className="seg" role="group" aria-label="Sex">
              <button type="button" aria-pressed={sex === 'male'} onClick={() => setSex('male')}>Male</button>
              <button type="button" aria-pressed={sex === 'female'} onClick={() => setSex('female')}>Female</button>
            </div>
          </div>
        </div>
        <div className="grid2">
          <label className="field">Height (ft)<input className="input" type="number" inputMode="numeric" value={ft} onChange={(e) => setFt(e.target.value)} /></label>
          <label className="field">Height (in)<input className="input" type="number" inputMode="numeric" value={inch} onChange={(e) => setInch(e.target.value)} /></label>
        </div>
        <div className="grid2">
          <label className="field">Weight today (lb)<input className="input" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
          <label className="field">Goal weight (lb)<input className="input" type="number" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
        </div>
      </div>

      {preview && (
        <div className="card tint">
          <p className="eyebrow">Your daily targets</p>
          <div className="grid2">
            <div><p className="big-num">{preview.calories.toLocaleString()}</p><p className="small muted">kcal (maintenance {preview.maintenance.toLocaleString()} − 500)</p></div>
            <div><p className="big-num">{preview.protein} g</p><p className="small muted">protein</p></div>
          </div>
        </div>
      )}

      <button className="btn lg block" type="submit" disabled={!valid}>Start training</button>
    </form>
  );
}
