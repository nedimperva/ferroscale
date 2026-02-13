# Advanced Metal Calculator

Public EU-focused web app for fast, accurate metal profile weight and price estimates.

## What is implemented

- Next.js (App Router) + TypeScript project.
- 12 core profile types (manual + EN standard-size profiles).
- Steel, stainless, and aluminum grade datasets.
- Weight/price calculation engine with strict validation.
- Weight-, length-, and piece-based pricing modes.
- Optional waste and VAT handling.
- Optional custom density mode.
- Per-field rounding controls.
- Expandable calculation breakdown and reference labels.
- Local browser history (last 10 calculations).
- Result CSV export.
- Clear-history control for local calculation history.
- Contact form API with in-memory rate limiting + CAPTCHA challenge.
- Basic SEO metadata, robots, and sitemap.
- PWA manifest + service worker with offline app-shell caching.
- Test suite including 200+ benchmark calculation cases.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Environment variables

- `NEXT_PUBLIC_SITE_URL`: Public site URL used for sitemap/robots metadata.

## API endpoints

- `GET /api/health`
- `GET /api/captcha`
- `POST /api/contact`

## Offline/PWA notes

- Service worker file: `public/sw.js`
- Offline fallback page: `public/offline.html`
- Manifest route: `src/app/manifest.ts`
- Offline mode is active after the app is loaded once online in production.

## Tracking and roadmap

- Plan and milestone tracker: `docs/PROJECT_TRACKER.md`
- Prioritized improvements backlog: `docs/FEATURE_IMPROVEMENTS.md`
