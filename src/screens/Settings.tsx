import { useEffect, useState } from 'react';
import { db, type ExerciseDef, type Profile, type ProgramDay } from '../lib/db';
import { go, useProfile, useProgram, useTargets } from '../lib/hooks';
import { DEFAULT_PROGRAM } from '../lib/program';
import { BackIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { toast } from '../App';

const TABLES = ['profile', 'program', 'workouts', 'sets', 'cardio', 'food', 'body'] as const;

export default function Settings() {
  const profile = useProfile();
  const program = useProgram();
  const t = useTargets();
  if (!profile || !t) return null;
  return (
    <main className="screen">
      <div className="row">
        <button className="icon-btn" aria-label="Back" onClick={() => go('home')}><BackIcon /></button>
        <h1 className="title" style={{ fontSize: 28 }}>Settings</h1>
      </div>
      <ProfileForm profile={profile} />
      <section className="card">
        <p style={{ fontWeight: 600 }}>Your numbers</p>
        <div className="between small"><span>Maintenance (estimate)</span><span>{t.maintenance.toLocaleString()} kcal</span></div>
        <div className="between small"><span>Check-in adjustment</span><span>{profile.calorieAdjust > 0 ? '+' : ''}{profile.calorieAdjust} kcal</span></div>
        <div className="between small"><span><strong>Daily target</strong></span><span><strong>{t.calories.toLocaleString()} kcal · {t.protein} g protein</strong></span></div>
        {profile.calorieAdjust !== 0 && (
          <button className="btn ghost sm" onClick={() => db.profile.update('me', { calorieAdjust: 0 })}>Reset adjustment</button>
        )}
        <p className="small muted">Maintenance = Mifflin–St Jeor BMR × 1.55, using your latest weigh-in ({t.weightLb} lb). Target = maintenance − 500.</p>
      </section>
      <ProgramEditor program={program} />
      <Backup />
      <section className="card">
        <p style={{ fontWeight: 600 }}>Put the app on your Home Screen</p>
        <p className="small muted">In Safari: tap Share, then "Add to Home Screen". Open it from the icon from then on; your data is saved on this phone.</p>
      </section>
    </main>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const [p, setP] = useState(profile);
  useEffect(() => setP(profile), [profile]);
  const num = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Number(e.target.value) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await db.profile.put(p);
    toast('Saved');
  }

  return (
    <form className="card" onSubmit={save} aria-label="Profile">
      <p style={{ fontWeight: 600 }}>Profile</p>
      <div className="grid2">
        <label className="field">Name<input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
        <label className="field">Age<input className="input" type="number" inputMode="numeric" value={p.age} onChange={num('age')} /></label>
        <label className="field">Height (inches)<input className="input" type="number" inputMode="numeric" value={p.heightIn} onChange={num('heightIn')} /></label>
        <label className="field">Goal weight (lb)<input className="input" type="number" inputMode="decimal" value={p.goalWeightLb} onChange={num('goalWeightLb')} /></label>
        <label className="field">Old bench PR (lb)<input className="input" type="number" inputMode="numeric" value={p.goals.bench ?? ''} onChange={(e) => setP({ ...p, goals: { ...p.goals, bench: Number(e.target.value) } })} /></label>
        <label className="field">Old squat PR (lb)<input className="input" type="number" inputMode="numeric" value={p.goals.squat ?? ''} onChange={(e) => setP({ ...p, goals: { ...p.goals, squat: Number(e.target.value) } })} /></label>
      </div>
      <div className="field">Sex
        <div className="seg" role="group" aria-label="Sex">
          <button type="button" aria-pressed={p.sex === 'male'} onClick={() => setP({ ...p, sex: 'male' })}>Male</button>
          <button type="button" aria-pressed={p.sex === 'female'} onClick={() => setP({ ...p, sex: 'female' })}>Female</button>
        </div>
      </div>
      <label className="field">"Open VeSync" button link
        <input className="input" value={p.scaleAppUrl} onChange={(e) => setP({ ...p, scaleAppUrl: e.target.value })} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      <p className="small muted">
        If the button doesn't open VeSync, make an iPhone Shortcut named <strong>Open VeSync</strong> (one action: Open App → VeSync) and paste this link instead:
        <br /><code style={{ fontSize: 12 }}>shortcuts://run-shortcut?name=Open%20VeSync</code>
      </p>
      <button className="btn" type="submit">Save profile</button>
    </form>
  );
}

function ProgramEditor({ program }: { program: ProgramDay[] }) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  async function updateEx(day: ProgramDay, i: number, patch: Partial<ExerciseDef>) {
    const exercises = day.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e));
    await db.program.update(day.id, { exercises });
  }
  async function removeEx(day: ProgramDay, i: number) {
    if (!confirm(`Remove ${day.exercises[i].name} from ${day.name}?`)) return;
    await db.program.update(day.id, { exercises: day.exercises.filter((_, j) => j !== i) });
  }
  async function addEx(day: ProgramDay) {
    const ex: ExerciseDef = {
      id: `custom-${Date.now()}`, name: 'New exercise', sets: 3, repMin: 8, repMax: 12,
      startWeight: 0, main: false, lower: day.id.startsWith('L'), restSec: 90,
    };
    await db.program.update(day.id, { exercises: [...day.exercises, ex] });
  }
  async function move(day: ProgramDay, i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= day.exercises.length) return;
    const exercises = [...day.exercises];
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
    await db.program.update(day.id, { exercises });
  }
  async function resetProgram() {
    if (!confirm('Reset every day back to the original Upper/Lower program? Your logged workouts are kept.')) return;
    await db.program.bulkPut(DEFAULT_PROGRAM);
    toast('Program reset');
  }

  return (
    <section className="card" aria-label="Program">
      <p style={{ fontWeight: 600 }}>Program</p>
      <p className="small muted">Upper/Lower, 4 days. Tap a day to swap exercises or change sets and reps.</p>
      {program.map((day) => (
        <div key={day.id} className="stack">
          <button className="list-item" aria-expanded={openDay === day.id} onClick={() => setOpenDay(openDay === day.id ? null : day.id)}>
            <span><strong>{day.name}</strong> <span className="muted">· {day.subtitle}</span></span>
            <span className="small muted">{day.exercises.length} exercises</span>
          </button>
          {openDay === day.id && (
            <div className="stack" style={{ gap: 12 }}>
              {day.exercises.map((ex, i) => (
                <div key={ex.id} className="stack" style={{ gap: 6, padding: 12, background: 'var(--bg)', borderRadius: 14 }}>
                  <label className="field">Exercise
                    <input className="input" value={ex.name} onChange={(e) => updateEx(day, i, { name: e.target.value })} />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                    <label className="field">Sets<input className="input" type="number" inputMode="numeric" value={ex.sets} onChange={(e) => updateEx(day, i, { sets: Number(e.target.value) })} /></label>
                    <label className="field">Reps min<input className="input" type="number" inputMode="numeric" value={ex.repMin} onChange={(e) => updateEx(day, i, { repMin: Number(e.target.value) })} /></label>
                    <label className="field">Reps max<input className="input" type="number" inputMode="numeric" value={ex.repMax} onChange={(e) => updateEx(day, i, { repMax: Number(e.target.value) })} /></label>
                    <label className="field">Rest (s)<input className="input" type="number" inputMode="numeric" value={ex.restSec} onChange={(e) => updateEx(day, i, { restSec: Number(e.target.value) })} /></label>
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <label className="field" style={{ flex: 1, minWidth: 120 }}>Start weight (lb)<input className="input" type="number" inputMode="numeric" value={ex.startWeight} onChange={(e) => updateEx(day, i, { startWeight: Number(e.target.value) })} /></label>
                    <div className="field" style={{ flex: 1, minWidth: 140 }}>Progression
                      <div className="seg" role="group" aria-label="Progression type">
                        <button type="button" aria-pressed={ex.main} onClick={() => updateEx(day, i, { main: true })}>Main</button>
                        <button type="button" aria-pressed={!ex.main} onClick={() => updateEx(day, i, { main: false })}>Accessory</button>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <button className="btn ghost sm" onClick={() => move(day, i, -1)} disabled={i === 0}>Move up</button>
                    <button className="btn ghost sm" onClick={() => move(day, i, 1)} disabled={i === day.exercises.length - 1}>Move down</button>
                    <span style={{ flex: 1 }} />
                    <button className="btn ghost sm" aria-label={`Remove ${ex.name}`} onClick={() => removeEx(day, i)}><TrashIcon /></button>
                  </div>
                </div>
              ))}
              <button className="btn soft sm" onClick={() => addEx(day)}><PlusIcon /> Add exercise</button>
            </div>
          )}
        </div>
      ))}
      <button className="btn ghost sm" onClick={resetProgram}>Reset to original program</button>
    </section>
  );
}

function Backup() {
  async function exportData() {
    const data: Record<string, unknown> = { app: 'sage-gym', version: 1, exportedAt: new Date().toISOString() };
    for (const t of TABLES) data[t] = await db.table(t).toArray();
    const name = `sage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Sage backup' });
        return;
      } catch { /* user cancelled: fall through to download */ }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'sage-gym') throw new Error('Not a Sage backup file');
      if (!confirm('Replace everything in the app with this backup?')) return;
      await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
        for (const t of TABLES) {
          await db.table(t).clear();
          if (Array.isArray(data[t])) await db.table(t).bulkPut(data[t]);
        }
      });
      toast('Backup restored');
    } catch (err) {
      alert(`Couldn't restore: ${(err as Error).message}`);
    }
  }

  return (
    <section className="card" aria-label="Backup">
      <p style={{ fontWeight: 600 }}>Backup</p>
      <p className="small muted">Your data lives on this phone. Save a backup to Files or iCloud Drive every few weeks.</p>
      <div className="row">
        <button className="btn soft" style={{ flex: 1 }} onClick={exportData}>Save backup</button>
        <label className="btn outline" style={{ flex: 1 }}>
          Restore
          <input type="file" accept="application/json,.json" onChange={importData} className="sr-only" />
        </label>
      </div>
    </section>
  );
}
