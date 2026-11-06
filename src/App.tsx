import { lazy, Suspense, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { FoodIcon, HomeIcon, ProgressIcon, TrainIcon } from './components/Icons';
import { useHashRoute, useProfile } from './lib/hooks';
import Home from './screens/Home';
import Train from './screens/Train';
const Progress = lazy(() => import('./screens/Progress'));
import Food from './screens/Food';
import Settings from './screens/Settings';
import Setup from './screens/Setup';

const TABS = [
  { route: 'home', label: 'Home', Icon: HomeIcon },
  { route: 'train', label: 'Train', Icon: TrainIcon },
  { route: 'progress', label: 'Progress', Icon: ProgressIcon },
  { route: 'food', label: 'Food', Icon: FoodIcon },
];

/** Show a short message at the bottom of the screen. */
export const toast = (msg: string) => window.dispatchEvent(new CustomEvent('app-toast', { detail: msg }));

export default function App() {
  const route = useHashRoute();
  const profile = useProfile();
  const [msg, setMsg] = useState<string | null>(null);
  useRegisterSW({ immediate: true });

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener('app-toast', on);
    return () => window.removeEventListener('app-toast', on);
  }, []);

  if (profile === undefined) return null;
  if (!profile.name) return <Setup />;

  const tab = TABS.some((t) => t.route === route) ? route : route === 'settings' ? 'settings' : 'home';

  return (
    <div className="app">
      {tab === 'home' && <Home />}
      {tab === 'train' && <Train />}
      {tab === 'progress' && <Suspense fallback={null}><Progress /></Suspense>}
      {tab === 'food' && <Food />}
      {tab === 'settings' && <Settings />}

      <div className="tabbar">
        <nav aria-label="Main">
          {TABS.map(({ route: r, label, Icon }) => (
            <a key={r} href={`#/${r}`} aria-current={tab === r ? 'page' : undefined}>
              <Icon />
              {label}
            </a>
          ))}
        </nav>
      </div>
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}
