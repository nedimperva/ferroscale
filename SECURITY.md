# Security Policy

## Supported versions

FerroScale is a continuously deployed web app. Only the latest `master`
is supported — update and re-test against it before reporting.

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting**
(Repo → Security → Report a vulnerability). Do not open a public issue
for anything that leaks data, bypasses rate limits, or affects the sync
layer. Expect an initial response within 7 days.

## Design notes (what reviewers should know)

- **Local-first.** Calculations, library, projects, and settings live in
  `localStorage`. No account, no analytics, no third-party trackers.
- **Bring-your-own Drive sync.** Google OAuth uses the narrow
  `drive.appdata` scope (the app's own hidden folder only — it cannot
  see the rest of your Drive). Snapshots are **AES-GCM encrypted
  client-side** before upload; the server never holds keys.
- **Secrets stay out of the repo.** `.env*` is gitignored. Builds need
  no secrets: sync routes read env at request time, and the contact
  form degrades to logging without `RESEND_*`.
- **Contact form abuse controls:** rate limiting plus a CAPTCHA
  challenge flow (`GET /api/captcha`, `POST /api/contact`). Note the
  limiter is currently in-memory and resets on redeploy — see
  `docs/FEATURE_IMPROVEMENTS.md` (Technical Debt).
- **Supply chain is intentionally thin.** Runtime dependencies are
  `next`, `next-intl`, `react`, `react-dom` — nothing else. Dependency
  updates arrive via Dependabot; CodeQL scans every push and PR.

## After an incident

Rotate any exposed credential immediately (`GOOGLE_CLIENT_SECRET`,
`SYNC_COOKIE_SECRET`, `RESEND_*`), then report. `.env` has never been
committed to git history — keep it that way.
