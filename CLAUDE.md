# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`atoz-taxation-console` — the React web + Android console for ATOZ Taxation's
WhatsApp bot. It is the UI half of a two-repo system; the backend is the
**`judwa-whatsapp`** Python/Flask app (usually at `../judwa-whatsapp`), deployed
on Render at `https://judwa-whatsapp-1.onrender.com`. This repo only talks to
that backend over HTTP — it has no server code of its own.

Staff use this console to run the WhatsApp inbox, manage clients, and work the
CRM (filings, payments, registrations, follow-ups, tasks).

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # production build → dist/
npm run preview   # serve the built dist/
```

There is **no lint, no test, and no typecheck script** — `vite build` is the
only check. `tsconfig.app.json` is `strict` but with `noUnusedLocals` and
`noUnusedParameters` turned off, so unused vars will not fail the build.

### Android (Capacitor)

`capacitor.config.ts` wraps the built `dist/` as `com.atoz.taxation`. Build the
web app first (`npm run build`), then `npx cap sync` / `npx cap open android`.
Capacitor CLI is a dependency but there is no `android/` folder checked in.

### Deploy

Netlify (`netlify.toml`): `npm run build && cp public/* dist/` → publish `dist/`.
`VITE_API_URL` is set there to the Render backend. `public/*` (service worker,
icons, etc.) is copied into `dist/` because Vite does not emit it by default with
this config.

## Environment variables

All read via `import.meta.env` at build time:

- `VITE_API_URL` — backend origin (required; everything breaks without it).
- `VITE_VAPID_PUBLIC_KEY` — Web Push; if unset, push setup silently no-ops.

## Architecture

### Two separate API layers — do not mix them

- **`src/services/api.ts`** — WhatsApp chat + legacy console endpoints:
  `/api/...`, `/chat/api/...`, `/returns/...`. Used by the Chat shell, Dashboard,
  Analytics, ReturnsCampaigns, and bot-pause / templates / push features.
- **`src/services/crmApi.ts`** — the CRM, all under `/api/crm/...`. Used by
  everything in `src/components/crm/`.

Both define their own `API_BASE` and their own fetch wrapper. When adding a call,
put it in the layer that matches the endpoint prefix.

### Auth

Token-based, no login form state beyond a single string. The backend-issued
token lives in `localStorage["console_token"]` and is sent on every request as
the **`X-Console-Token`** header. A `403` means the token is dead: the wrappers
clear it and (`api.ts`) throw `"UNAUTHORIZED"` / (`crmApi.ts`) also dispatch a
`window` `"auth-failed"` event. `App.tsx` listens and drops back to
`TokenLogin`. Treat `"UNAUTHORIZED"` as a sentinel — most `api.ts` helpers catch
all other errors and return empty defaults, but re-throw this one.

### CRM data flow — one bootstrap, then optimistic local patches

`CrmProvider` (`src/services/crmStore.tsx`) loads the **entire** CRM dataset once
via `fetchBootstrap()` (`GET /api/crm/bootstrap`) into one `Bootstrap` object
(clients, filings, payments, registrations, tasks, staff, services, notes,
followups, escalations, autopilot_pending). Every CRM screen reads from
`useCrm()`; there is no per-screen fetching.

To mutate: call the write endpoint, then **either**
- `reload()` to re-fetch the whole bootstrap, **or**
- `patchLocal(table, id, partial)` / `removeLocal(table, id)` for instant UI
  without waiting for the server (the "demo-style renderAll" pattern noted in the
  file comments).

`useCrm().toast(msg, undo?)` shows a 5s toast with an optional UNDO that runs the
callback then `reload()`.

### Cross-component navigation uses `window` CustomEvents, not a router

There is no react-router. `App.tsx` is a tab shell driven by `useState`.
Components coordinate by dispatching DOM events, e.g. `openChat(mobile)` in
`crmApi.ts` fires `"judwa-open-chat"`, which the shell listens for to switch to
the Chat tab and select that thread. Search for `dispatchEvent` /
`addEventListener` to trace these flows.

### Business logic is centralized in `src/services/crmLogic.ts`

Periods, GST cadence, fee/billing rules, defaulter detection, due dates, and all
the status enums (`FILING_STATUSES`, `TASK_STATUSES`, `REG_STATUSES`, etc.) live
here so every screen computes the same answer. A fee only becomes "due" once work
is billable (`FILING_BILLABLE` / `TASK_BILLABLE`); amounts show greyed before
that. GST filing cadence is derived from `business_type`. Change rules here, not
inside components.

## Conventions

- Code comments and much UI copy are in **Hinglish** (Hindi in Latin script).
  Match that style when editing existing files.
- Styling is Tailwind only; the brand palette is hard-coded hex in classes
  (e.g. `#1D2420`, `#8FE3BE`) rather than theme tokens.
- Icons come from `lucide-react` (excluded from Vite dep-optimization).

## Stale / duplicate files — ignore, don't edit

These are old copies kept around and are **not** imported anywhere:
`src/1`, `src/components/crm/1`, `src/components/crm/ClientForm-1.tsx`.
The live versions are the non-suffixed files. Don't "fix" the `-1` copies.
