# JASIC PWA Runbook

Date: 2026-07-11

JASIC can be delivered as a Progressive Web App before doing App Store / Google Play development.

This is the recommended mobile-first path when the goal is:

- open by URL
- install to phone home screen
- avoid App Store / Google Play review
- keep one deploy target for desktop web and mobile web

## Public PWA URL

```text
https://yipojacky-wq.github.io/jasic-app/
```

## Build and verify

```bash
npm run build:web:github-pages
npm run doctor:pwa
npm run smoke:public-preview -- --offline
npm run smoke:public-preview
```

## What the PWA build adds

The GitHub Pages build post-process creates:

- `dist/manifest.webmanifest`
- `dist/service-worker.js`
- `dist/pwa-icon.png`
- `dist/apple-touch-icon.png`
- manifest link in `index.html`
- iOS home-screen meta tags
- Service Worker registration
- `.nojekyll` for GitHub Pages `_expo` assets

## Install on iPhone

1. Open Safari.
2. Go to `https://yipojacky-wq.github.io/jasic-app/`.
3. Tap Share.
4. Tap Add to Home Screen.
5. Open JASIC from the home-screen icon.

## Install on Android

1. Open Chrome.
2. Go to `https://yipojacky-wq.github.io/jasic-app/`.
3. Tap the browser menu.
4. Tap Install app or Add to Home screen.
5. Open JASIC from the home-screen icon.

## Current PWA scope

Included:

- installable home-screen experience
- standalone display mode
- app manifest
- basic offline shell cache
- safe demo mode support
- same public URL as web preview

Not included yet:

- push notifications
- background sync
- app-store native APIs
- automatic trading
- guaranteed-profit claims

## Recommended next step

Use PWA for the first external mobile preview. Defer EAS native builds until there is a clear need for store distribution, native push notifications, or native-only device capabilities.

