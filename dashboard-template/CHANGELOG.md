# Changelog

All notable changes to the Hone — Settings Dashboard Template are documented here.

## [1.0.0] — 2026-09-27

### Added
- Settings dashboard with six tabs: Dashboard, API Providers, Customizations,
  Actions Studio, History and Key Bindings, ported 1:1 from the Hone
  extension's options UI to a standalone Next.js app.
- Component gallery on the dashboard route: 14 live component families
  (Material Design 3 button and switch, material dialog, dot-matrix loader,
  expanding search dock, ripple, radio card group, switch card group, modern
  dropdown, tag, badge, action icon select, skeleton, action card grid).
- Local persistence layer (`src/content/storage.ts`): settings store on
  `localStorage`, rewrite history on IndexedDB — drop-in replacement for the
  extension storage API with identical call signatures.
- Once-only demo history seeding through the real history API.
- Dark-mode bootstrap via `public/theme-init.js`.
- Unit tests (`npm test`, node:test) covering the history seeding logic.
- Two-tier commercial license (`LICENSE-PERSONAL.txt` / `LICENSE-AGENCY.txt`),
  buyer-oriented README, changelog, route launch check
  (`verify/launch_check.mjs`) and app icon.
