# Sage: Gym Tracker

A personal workout, weight and calorie tracker that installs on iPhone as a Home Screen app (PWA).

**Live app:** https://giovanniparra.github.io/gym-tracker/

## Install on iPhone
1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open it from the icon from then on. Data is stored on the phone (IndexedDB). Use **Settings → Save backup** now and then.

## What's in it
- Upper/Lower 4-day program, preloaded and editable
- Automatic progression: main lifts +5 lb (upper) / +10 lb (lower, +5 after the first miss), drop 10% after two misses; accessories use double progression
- Rest timer, set logging, history, estimated 1RM charts against old PRs
- Weekly weigh-in with an "Open VeSync" shortcut, body-weight trend and a weekly calorie check-in
- Calorie targets (Mifflin–St Jeor × 1.55 − 500) and protein target, quick food logging, cardio logging

## Develop
```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```
Pushing to `main` deploys automatically through GitHub Actions → GitHub Pages.

The app icon comes from `public/icon.svg`; regenerate the PNGs with `node scripts/make-icons.mjs`.
