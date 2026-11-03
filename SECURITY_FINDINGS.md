# Security Findings — ATOZTAXATION_FRONTEND

Date: 2026-11-04 · Source: `/cso` static run (gstack-cso) + manual QA · Read-only, nothing changed.

> **/cso run status: `partial`.** Static snapshot taken (secrets redacted); targeted static investigation.
> Scanners (gitleaks/osv/semgrep) + dependency CVEs NOT run (need Docker). This is a client-side static pass.

## Context
This is a **React SPA** (Vite build, Netlify/Capacitor). It has no server of its own — all sensitive
logic, data and auth live in the **backend** (`judwa-whatsapp`), which has its own
[SECURITY_FINDINGS.md](../judwa-whatsapp/SECURITY_FINDINGS.md). So a frontend security audit is inherently
thin: the real attack surface is the API, not this bundle.

## Supported findings: none server-side. Client-side observations below.

### [INFORMATIONAL] (confidence: 7/10) src/services/* — Auth token in `localStorage`
`console_token` is stored in `localStorage` (crmApi.ts:8, api.ts). If any XSS ever lands in the console,
the token is directly exfiltratable (localStorage is readable by any script on the origin). Mitigations in
place: no `dangerouslySetInnerHTML` anywhere, no `eval`, React escapes by default — so **no XSS sink found**
today. Residual risk is future XSS. (Alternative: httpOnly cookie, but that needs backend changes.) Low now.

### [INFORMATIONAL] (confidence: 6/10) ClientDrawer.tsx:150 — portal credentials rendered client-side
The console displays clients' `portal_username` / `portal_password` (behind a show/hide toggle) and
`other_logins`. This is expected console functionality, but means real GST-portal credentials travel to the
browser and sit in memory / the `/bootstrap` payload. Acceptable for an internal staff tool; just be aware
anyone with console access (or a token) can read every client's portal password.

### Checked — clean
- **No hardcoded secrets in source.** The scanner flagged `ClientForm.tsx` but that's a false positive —
  `portal_password: <value> || ""` is a form-state init (field name contains "password"), not a key.
- Only `VITE_API_URL` / `VITE_VAPID_PUBLIC_KEY` are embedded in the build — both are public by design.
- No `dangerouslySetInnerHTML`, no token in URL/query, 403 → token cleared.

## Dependency CVEs — NOT ASSESSED
`npm audit` / `osv` not run (ancient local Node v6 + no Docker). Worth running `npm audit` once Node is
upgraded, or let Netlify/Dependabot flag them.

## Bottom line
Frontend is a thin client; no server-side security findings. The security that matters is in the backend
(see its SECURITY_FINDINGS.md — the `/media` path traversal and plaintext-password items). Frontend's one
real functional bug (AiBox reload/toast) is in [FRONTEND_QA.md](FRONTEND_QA.md), not a security issue.
