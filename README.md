# Cawang v1 — app

React app for Cawang (Catat Keuangan), version 1 (v1). The version lives in `package.json` and is shown
in Settings, the menu and the landing footer. Design and domain language live one level up:
[`../docs/spec.md`](../docs/spec.md), [`../GLOSSARY.md`](../GLOSSARY.md), [`../docs/adr/`](../docs/adr/).

## Documentation

Full app documentation (Indonesian) lives in [`docs/`](docs/README.md): user guide, architecture,
database and development.

## Setup

Follow [`supabase/README.md`](supabase/README.md) (Supabase project, `schema.sql`, Google login,
`.env.local`), then run it locally. Deploying: [`DEPLOY.md`](DEPLOY.md).

```bash
pnpm install
pnpm dev        # http://localhost:8888
```

## Scripts

| Command | What |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Typecheck + production build to `dist/` |
| `pnpm test` | Vitest unit tests (domain logic in `src/lib`) |
| `pnpm typecheck` | TypeScript only |
| `pnpm lint` | oxlint |

## Layout

| Path | What |
| --- | --- |
| `supabase/schema.sql` | Whole database: tables, `account_balances` view, RLS, triggers, RPCs |
| `src/lib/` | Framework-free logic: Cycle math, dates, IDR formatting, error codes |
| `src/features/` | Data hooks and widgets per domain area (profile, accounts, cycle, …) |
| `src/pages/` | One folder per route |
| `src/layouts/` | App shell (sidebar, mobile top bar + bottom nav), auth layout |
| `src/components/ui/` | shadcn/ui components (generated, lightly tuned) |
| `src/i18n/` | EN/ID messages; `en.ts` defines the keys |
| `src/pages/landing/` | Public landing page (taste-skill page direction in `.taste-skill/landing/`) |
| `public/landing/` | Landing photographs from Wikimedia Commons, credits in `credits.json` and the page footer |
| `.claude/skills/` | Project-local Claude skills (taste-skill `design-taste-frontend`) |

UI follows taste-skill's app style **pastel-consumer** (tokens in `src/index.css`). The app is a PWA
(`vite-plugin-pwa`): installable, `start_url` `/dashboard`, read-only offline cache of Supabase reads.
