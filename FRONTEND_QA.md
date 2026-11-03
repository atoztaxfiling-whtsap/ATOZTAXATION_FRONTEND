# QA Review — ATOZTAXATION_FRONTEND

Date: 2026-11-03 · Reviewer: Claude (QA, read-only) · Target: whole frontend repo
Nothing changed. Findings: severity + confidence (1–10) + file:line proof. This is the QA report —
implementation happens in the separate chat.

---

## Headline

One real **functional bug** (AI command box doesn't refresh data / swallows feedback), plus
resilience gaps (no error boundary, no tests, no env guard) and a couple of **correctness edge cases**
in the billing/period math worth confirming. The money math itself (ledger/FIFO) looks sound.

---

## 🔴 Functional bugs

### [CRITICAL] (confidence: 9/10) src/App.tsx:204 + src/components/crm/AiBox.tsx:48-54 — AI box reload & toast are dead
`App.tsx:204` renders the AI command box without wiring the store:
```
{ai && <AiBox onClose={() => setAi(false)} />}
```
`AiBox` falls back to window events when no `reload`/`toast` prop is passed (AiBox.tsx:48-54):
```
const reload = async () => { if (reloadProp) { await reloadProp(); return; } window.dispatchEvent(new Event("crm-reload")); };
const toast  = (m) =>        { if (toastProp)  { toastProp(m); return; }      window.dispatchEvent(new CustomEvent("crm-toast", { detail: m })); };
```
**Nothing in the app listens for `crm-reload` or `crm-toast`** (grep-confirmed: only these two dispatch
sites exist, zero `addEventListener`). So after an AI action runs (AiBox.tsx:80, 92) or an undo (:107-108):
- The CRM store never refreshes → the console shows **stale data**; staff may think the action failed and
  redo it (double-write risk on money/filings).
- Toasts are swallowed → success/undo/error messages (AiBox.tsx:107, 109) never appear.

`App` is already inside `CrmProvider` and uses `useCrm()`, so the fix is one line: pass
`reload={reload} toast={toast}` to `<AiBox>` (or add window listeners in the provider). Trivial, high impact.

---

## 🟠 Correctness edge cases (confirm intent)

### [INFORMATIONAL] (confidence: 7/10) src/services/crmLogic.ts:296-301 — `isDefaulter` never fires for monthly-mode clients
```
export function isDefaulter(c, map) {
  const q = clientPeriods(c).filter(p => p.cycle === "quarterly");
  const last3 = q.slice(-3);
  if (last3.length < 3) return false;
  ...
}
```
For a `manual-monthly` client, `clientPeriods` returns only monthly periods → `q` is empty → always
returns `false`. So monthly filers can never be flagged defaulters. If that's intended, fine; if not,
it's a silent gap in the defaulter list. Confirm.

### [INFORMATIONAL] (confidence: 6/10) src/services/crmLogic.ts:133, 327 — period & due-date math uses the device's local timezone
`todayIndex()` (`new Date().getMonth()`) and `idxToDate()` (`new Date(y, m, day)`) run in the browser's
local timezone. The app targets IST users, but on an Android/desktop clock set to a non-IST zone, near a
month boundary the "current period" and GST due dates can land one month off. Low for IST-only users; worth
pinning to IST if the mobile app ships to varied clocks.

---

## 🟠 Resilience / quality

### [INFORMATIONAL] (confidence: 8/10) whole app — No React error boundary
No `ErrorBoundary` / `componentDidCatch` anywhere (grep-confirmed). A single render-time exception in any
component (e.g. a malformed row from the API) white-screens the entire console with no fallback UI. Add one
boundary at the shell so one bad screen doesn't take down the whole app.

### [INFORMATIONAL] (confidence: 8/10) src/services/crmApi.ts:6, api.ts:1, push.ts:1 — `VITE_API_URL` has no guard
`const API_BASE = import.meta.env.VITE_API_URL;` with no fallback or check. If the env var is missing at
build time, every call hits `undefined/api/...` and fails silently — no "backend not configured" message,
just broken screens. Add a startup guard that surfaces a clear error.

### [INFORMATIONAL] (confidence: 9/10) package.json — Build is the only safety gate
Scripts are `dev`/`build`/`preview` only — no lint, no typecheck step, no tests. `tsconfig.app.json` is
`strict` but `noUnusedLocals`/`noUnusedParameters` are off. For a money/customer-facing console, at least a
`tsc --noEmit` typecheck in CI and a few unit tests on `crmLogic.ts` (ledger/FIFO, `isDefaulter`, period math)
would catch regressions the build won't.

### [INFORMATIONAL] (confidence: 6/10) services — No request cancellation / stale-response guard
No `AbortController` anywhere. Rapid tab switches or a `reload()` racing an in-flight fetch can land an older
response after a newer one. Low frequency, but possible with the single-shared-store design.

### [INFORMATIONAL] (confidence: 7/10) src/services/crmStore.tsx — Entire CRM held in one in-memory object
Mirrors the backend `/bootstrap` design: the whole active dataset lives in one `Bootstrap` object and most
screens read from it. Fine today; as clients/filings/payments grow, memory and re-render cost scale linearly,
and every `reload()` re-fetches everything. The existing `patchLocal`/`removeLocal` already help — prefer them
over `reload()` for single-row mutations to reduce full refetches.

### [INFORMATIONAL] (confidence: 6/10) src/services/crmApi.ts:75-77 — inconsistent `encodeURIComponent` on `mobile`
`fetchBotNotes`/`addBotNote`/`deleteBotNote` interpolate `mobile` into the path raw, while `api.ts` paths use
`encodeURIComponent`. Mobile is digits so low risk, but inconsistent; normalize for safety.

---

## ✅ Checked and clean
- No token in URL/query; no `dangerouslySetInnerHTML`; portal password is behind a show/hide toggle
  (ClientDrawer.tsx:150). 403 → token cleared + `auth-failed` → back to login (crmApi.ts:13, App.tsx:88).
- `judwa-open-chat` event IS wired (App.tsx:104 switches tab, Chat.tsx:73-74 selects thread) — not dead.
- Ledger/FIFO money math (crmLogic.ts:229-269) reads correct: billable-gating, firm-paid vs client buckets,
  FIFO oldest-first.

---

## 🧹 Housekeeping
### [INFORMATIONAL] (confidence: 10/10) Dead/duplicate files
`src/1` (2 bytes), `src/components/crm/1` (2 bytes), `src/components/crm/ClientForm-1.tsx` (9KB) are not
imported anywhere. Delete to avoid editing the wrong copy.

---

## Priority order (recommendation)
| # | Finding | Severity | Why |
|---|---------|----------|-----|
| 1 | AiBox reload/toast dead (App.tsx:204) | 🔴 functional | Stale data + double-write risk; 1-line fix |
| 2 | Add ErrorBoundary | 🟠 resilience | Stops full white-screen crashes |
| 3 | `VITE_API_URL` guard | 🟠 resilience | Clear failure instead of silent breakage |
| 4 | Confirm `isDefaulter` monthly behavior | 🟠 correctness | Possible missing defaulters |
| 5 | Typecheck in CI + crmLogic unit tests | 🟠 quality | Protects money math |
| 6 | Delete dead files | 🧹 | Removes edit-wrong-file hazard |
| 7 | Timezone pin to IST | 🟡 | Edge-case period/due-date drift |

(Items 1 and 6 are near-free.)
