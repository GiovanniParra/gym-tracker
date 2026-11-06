import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './styles.css';
import App from './App';
import { ensureSeeded } from './lib/program';

// Ask iOS to keep this app's data even when storage runs low.
navigator.storage?.persist?.().catch(() => {});

ensureSeeded().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
