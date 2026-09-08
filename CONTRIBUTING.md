# Contributing to FerroScale

Thanks for looking. This is a small, review-heavy codebase — the notes below
are what keeps `master` green. `AGENTS.md` in the repo root is the full
contributor manual (architecture, command flow, sync layer); this file is
the short path.

## Setup

```bash
npm install
npm run dev        # http://localhost:3000/en (root / only redirects)
```

No database, no Docker, no required env vars. `RESEND_*` affect only the
contact form, `GOOGLE_*` only Drive sync.

## Gates (CI runs all of these)

```bash
npm run lint       # hard gate — keep it green
npm run i18n:check # en/bs parity — fails when locales drift
npm run test:all   # web + metal-core suites
npm run build      # production build
```

Run one test file: `npx vitest run src/lib/calculator/engine.test.ts`.
E2E: `npx playwright test` (`PLAYWRIGHT_CHROMIUM_EXECUTABLE` reuses a
system Chromium).

## Rules that bite

1. **i18n** — every user-facing string needs keys in **both**
   `messages/en.json` and `messages/bs.json`. metal-core stays i18n-free;
   parser issues carry a `code` the web maps to `command.issues.*`.
2. **Changelog** — every user-visible change updates **both**
   `CHANGELOG.md` (Keep-a-Changelog) and `src/lib/changelog.ts`
   (in-app viewer source of truth).
3. **Datasets** — changing profiles/materials/densities means bumping
   `DATASET_VERSION` in
   `packages/metal-core/src/datasets/version.ts` (it busts the SW cache).
4. **Synced entities** — adding a field takes **two** edits: the type in
   its hook **and** the whitelist normalizer in
   `src/lib/sync/collections.ts` (`normalizeProject` /
   `normalizeSavedEntry`). Unlisted fields are dropped on reload.
5. **New profile** — `ProfileId` in metal-core types, definition with
   `area`/`perimeter` (+ `validateGeometry` if needed), drawing geometry
   in `src/lib/calculator/profile-specs.ts`, command aliases in
   `packages/metal-core/src/command/aliases.ts` (no alias = saved entries
   can't restore), engine test cases with an **independent** oracle.

## Pull requests

- One concern per PR, small diffs preferred.
- Fill in `.github/pull_request_template.md` — the checklist is the review.
- UI changes need a screenshot or clip (desktop **and** 390px phone).
- Dataset corrections need a citable EN reference (standard + table),
  never a plausible-looking number.
- Never commit secrets: `.env*` is gitignored. Design prototypes live
  outside the repo (`.design-fetch/` is ignored).
