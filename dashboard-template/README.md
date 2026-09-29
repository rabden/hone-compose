# Hone — Settings Dashboard Template

A standalone, pixel-faithful settings-dashboard template for browser extensions and web apps — Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + TypeScript, with Radix UI, Material Web, Hugeicons and Motion.

Six settings tabs plus a live component gallery:

- **Dashboard** (`/`) — quick-actions bento, recent-activity feed, and the component gallery: 14 live component families rendered straight from `src/components`
- **API Providers** (`/api`) — provider picker with grouped radio cards
- **Customizations** (`/customizations`) — grouped switch cards and toggles
- **Actions Studio** (`/actions`) — action grid, action editor, marketplace
- **History** (`/history`) — rewrite history with once-only demo seeding
- **Key Bindings** (`/shortcut`) — shortcut configuration

> The package ships "Hone" as the demo brand, with demo history entries and sample actions. Replace them when you rebrand (see Customizing).

## Quick start

```bash
npm install
npm run dev      # dev server on http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm test         # unit tests (node:test)
```

## Structure

- `src/app/` — one route per tab, plus `theme-init.js` dark-mode bootstrap in `public/`
- `src/options/` — the dashboard shell and the six tab screens
- `src/components/ui/` — the component library the dashboard is built from
- `src/components/gallery/` — the component gallery (`component-samples.tsx` defines the families, `ComponentGallery.tsx` renders the grid)
- `src/content/storage.ts` — local persistence layer: settings store on `localStorage`, rewrite history on IndexedDB, with the same call signatures as the original extension storage API
- `PORTING.md` — internal tracker documenting how the UI was ported

## Customizing

### 1. Theme — `src/index.css`

Theme tokens are shadcn-compatible HSL variables (Tailwind v4 `@import` style). Fonts load via `@fontsource-variable` packages (Geist, Noto Sans) at the top of the same file.

### 2. Tabs — `src/options/tabs/`

Each tab is a self-contained component; `src/options/options-shell.tsx` wires the sidebar to the routes. Edit copy inline, reorder or replace tabs freely.

### 3. Gallery — `src/components/gallery/component-samples.tsx`

Add a family by appending `{ id, name, sample }` to `COMPONENT_FAMILIES`; the grid, corner rounding and header adapt automatically. The sample well renders any React node, so family samples can be interactive.

### 4. Persistence — `src/content/storage.ts`

Settings and action configs persist through the settings store (`localStorage`); rewrite history persists in IndexedDB. Demo history entries seed exactly once through the real history API (a flag in the settings store prevents re-seeding), so the History tab always has content on first run.

### 5. Brand

Page metadata lives in `src/app/layout.tsx`; the demo brand, provider names and sample action/history content live inline in the tabs, the gallery samples and the history seeder.

## Verifying the build

```bash
npm run build && npm run start   # terminal 1
node verify/launch_check.mjs     # terminal 2 — asserts every route answers 200 and renders its headline
```

`BASE_URL` overrides `http://localhost:3000`. The check is dependency-free (plain `fetch`).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

This template is licensed, not sold. Your purchase tier determines which license applies:

- [`LICENSE-PERSONAL.txt`](./LICENSE-PERSONAL.txt) — one (1) personal project
- [`LICENSE-AGENCY.txt`](./LICENSE-AGENCY.txt) — unlimited projects, agency & client work
