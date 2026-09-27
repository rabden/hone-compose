# Hone Dashboard Template — Porting Tracker

Next.js (App Router) + React + Tailwind v4 replica of the Hone extension's
settings dashboard (`src/options/`), standalone in the browser with local
persistence instead of `chrome.storage` / `chrome.runtime`.

## Packages (package.json)

- [x] next (15.5), react, react-dom, typescript
- [x] tailwindcss + @tailwindcss/postcss (v4), tw-animate-css
- [x] @hugeicons/react, @hugeicons/core-free-icons
- [x] lucide-react
- [x] motion + framer-motion
- [x] radix-ui + @radix-ui/react-{dialog,dropdown-menu,select,slot,tooltip}
- [x] class-variance-authority, clsx, tailwind-merge
- [x] @fontsource-variable/geist, @fontsource-variable/noto-sans
- [x] @material/web
- [x] shadcn (index.css imports `shadcn/tailwind.css`)
- Skipped (non-UI, per plan non-goals): ai SDKs, harper.js, nspell,
  dictionary-en, @tanstack/react-virtual (unused), @types/chrome

## Foundations

- [x] `src/index.css` — theme tokens copied as-is (Tailwind v4 `@import`s,
  Geist/Noto fontsource, dotmatrix-loader.css)
- [x] `public/theme-init.js` — dark-mode bootstrap, loaded via
  `next/script` beforeInteractive in `src/app/layout.tsx`
- [x] `src/components/material-registry.tsx` — already client/dynamic-import
  based (SSR-safe as copied)
- [x] `src/lib/utils.ts` (cn), `src/hooks/use-mobile.ts`

## UI components (`src/components/ui/*`, copied wholesale)

- [x] sidebar, tooltip, ripple, sheet, skeleton, separator
- [x] material-design-3-button, material-design-3-switch, menu, select
- [x] material-dialog, input, label, textarea, slider
- [x] radio-card, switch-card, tag, badge, button (shadcn)
- [x] expanding-search-dock, scroll-area, tabs, modern-dropdown
- [x] hugeicons wrapper, dotm-square-12
- Adapted for SSR: `ripple.tsx` + `menu.tsx` static `@material/web` imports →
  dynamic imports inside `useEffect`

## Shared modules

- [x] `src/lib/shortcuts.ts`, `src/lib/action-icons.tsx`,
  `src/lib/dotmatrix-core/*`, `src/lib/dotmatrix-hooks.ts`
- [x] `src/components/hone-logo.tsx` (adapted: Next static image import yields
  `StaticImageData`, not a URL string)
- [x] `src/components/history-list.tsx`, `action-icon-select.tsx`
- [x] `src/providers.ts`, `src/content/builtin-defaults.ts`
- [x] `src/assets/` (hone-logo.png + others)

## Options UI (`src/options/*`)

- [x] `tabs/DashboardTab.tsx`, `ApiProvidersTab.tsx`, `KeyBindingsTab.tsx`,
  `CustomizationsTab.tsx`, `HistoryTab.tsx`, `ActionsStudioTab.tsx` — copied
- [x] `tabs/actionstudio/*` (OverviewView, EditorView, MarketplaceView,
  MarketplaceContent, ActionCardGrid, constants, getRounded, types) — copied
- [x] `options-context.tsx` — NEW: options.tsx state container (all settings
  state, auto-save effects, key recording, history handlers, toasts)
- [x] `options-shell.tsx` — NEW: header + collapsible icon sidebar + rounded
  card content area + toast; nav wired to Next routing
- Original `options.tsx` replaced by the context + shell pair (single page
  with `useState("dashboard")` → six routed pages sharing one provider)

## Persistence (chrome-free)

- [x] `src/lib/settings-store.ts` — NEW: localStorage-backed settings
  key/value store (chrome.storage.local replacement; unit-tested)
- [x] `src/content/storage.ts` — NEW: same export surface as the extension
  storage module; settings/action configs via settings-store, history via
  IndexedDB (same DB schema), history-update events replace the
  HISTORY_UPDATED runtime message
- [x] `src/content/local-runtime.ts` — NEW: local stand-in for
  `chrome.runtime.sendMessage` (marketplace catalog fetch/install, test
  playground) with identical response shapes
- [x] `ActionsStudioTab.tsx` — 4 `chrome.runtime.sendMessage` call sites →
  `sendLocalMessage` (only edit to a copied tab)
- Zero `chrome.` references remain in template source

## Routes (`src/app/*`)

- [x] `/` Dashboard ("Your Hone Control Panel" hero)
- [x] `/api` API Providers
- [x] `/shortcut` Key Bindings
- [x] `/customizations` Customizations
- [x] `/history` Rewrite History
- [x] `/actions` Actions Studio (overview / editor / marketplace views)

## Tests

- [x] `tests/settings-store.test.ts` — write→read round-trip of the shipped
  settings store under a localStorage shim (`node --test`)
