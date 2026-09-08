## What and why

<!-- One concern per PR. Link the issue: Fixes #123 -->

## Checklist

- [ ] `npm run lint` green (hard gate)
- [ ] `npm run i18n:check` green — new strings added in **both** `en` and `bs`
- [ ] `npm run test:all` green (or: no logic touched — pure docs/markup)
- [ ] Changelog updated in **both** `CHANGELOG.md` and `src/lib/changelog.ts`
- [ ] `DATASET_VERSION` bumped (only if profiles/materials/densities changed)
- [ ] Synced-entity normalizers updated (only if a synced field was added —
      see `src/lib/sync/collections.ts`)
- [ ] Screenshots attached (desktop **and** 390px phone, for UI changes)
- [ ] No secrets committed (`.env*` stays untracked)

## Screenshots

<!-- Before/after for UI changes, otherwise delete this section -->
