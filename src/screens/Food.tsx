import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayKey, type FoodEntry } from '../lib/db';
import { useTargets, useTodayFood } from '../lib/hooks';
import { TrashIcon } from '../components/Icons';
import { toast } from '../App';

export default function Food() {
  const t = useTargets();
  const today = useTodayFood();
  const [label, setLabel] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');

  // Recent distinct meals for one-tap re-logging.
  const recent = useLiveQuery(async () => {
    const list = await db.food.orderBy('ts').reverse().limit(60).toArray();
    const seen = new Set<string>();
    return list.filter((f) => {
      const key = `${f.label}|${f.kcal}|${f.protein}`;
      if (!f.label || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [], [] as FoodEntry[]);

  if (!t) return null;
  const eaten = today.reduce((a, f) => a + f.kcal, 0);
  const prot = today.reduce((a, f) => a + f.protein, 0);

  async function add(entry: { label: string; kcal: number; protein: number }) {
    await db.food.add({ ...entry, ts: Date.now(), date: todayKey() });
    toast(`Added ${entry.label || 'entry'}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = Number(kcal) || 0;
    const p = Number(protein) || 0;
    if (!k && !p) return;
    await add({ label: label.trim(), kcal: k, protein: p });
    setLabel(''); setKcal(''); setProtein('');
  }

  return (
    <main className="screen">
      <div>
        <p className="eyebrow">Food</p>
        <h1 className="title">Today's fuel</h1>
      </div>

      <div className="grid2">
        <section className="card">
          <p className="small muted">Calories</p>
          <p className="big-num">{eaten.toLocaleString()}</p>
          <div className="bar"><div style={{ width: `${Math.min(100, (eaten / t.calories) * 100)}%` }} /></div>
          <p className="small muted">target {t.calories.toLocaleString()}</p>
        </section>
        <section className="card">
          <p className="small muted">Protein</p>
          <p className="big-num">{prot} g</p>
          <div className="bar"><div style={{ width: `${Math.min(100, (prot / t.protein) * 100)}%` }} /></div>
          <p className="small muted">target {t.protein} g</p>
        </section>
      </div>
      <p className="small muted">Keep fat at {t.fatMin} g or more; the rest of your calories go to carbs, with more on lifting days.</p>

      <form className="card" onSubmit={submit} aria-label="Add food">
        <p style={{ fontWeight: 600 }}>Add food</p>
        <label className="field">What (optional)<input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Chicken bowl" /></label>
        <div className="grid2">
          <label className="field">Calories<input className="input" type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
          <label className="field">Protein (g)<input className="input" type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} /></label>
        </div>
        <button className="btn" type="submit" disabled={!Number(kcal) && !Number(protein)}>Add</button>
      </form>

      {recent.length > 0 && (
        <section className="stack">
          <p className="eyebrow">Tap to add again</p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {recent.map((f) => (
              <button key={f.id} className="btn soft sm" onClick={() => add({ label: f.label, kcal: f.kcal, protein: f.protein })}>
                {f.label} · {f.kcal} / {f.protein}g
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="stack">
        <p className="eyebrow">Logged today</p>
        {today.length === 0 && <p className="empty">Nothing logged yet today.</p>}
        {[...today].reverse().map((f) => (
          <div key={f.id} className="list-item">
            <span><strong>{f.label || 'Entry'}</strong> <span className="muted">· {new Date(f.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span></span>
            <span className="row" style={{ gap: 4 }}>
              <span className="muted small">{f.kcal} kcal · {f.protein} g</span>
              <button className="btn ghost sm" aria-label={`Delete ${f.label || 'entry'}`} onClick={() => db.food.delete(f.id!)}><TrashIcon /></button>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
