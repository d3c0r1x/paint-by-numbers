# Paint by Numbers Studio — QA report

## Build
Version: 1.1 Demo + i18n + true template canvas

## Verified
- `node --check public/app.js` — PASS
- `node --check server.mjs` — PASS
- `npm run check` / `scripts/smoke.mjs` — PASS
- Demo catalog entry present — PASS
- Demo source asset served from `/demo/portrait-girl.jpg` — PASS
- Demo numbered template JSON loads and label buffer matches `400 × 600 × 4` bytes — PASS
- 694 unique regions used by the demo template — PASS
- Demo palette: 14 colors — PASS
- Auth modal click propagation fix applied — PASS by code-path inspection
- Language selector persisted through `localStorage` — PASS by code-path inspection
- Editor defaults to real paint-by-numbers template (not the source photo) — PASS by code-path inspection
- Reference toggle restores the original photo as a separate view — PASS by code-path inspection

## Browser environment limitation
The provided Linux environment has an organization browser policy that blocks navigation to loopback/private URLs from Chromium. Because of that policy, a full interactive Chromium click-through against the running local server cannot be claimed as completed here. Server/API and engine tests were executed directly.

## Demo
Preloaded user-supplied third image:
`public/demo/portrait-girl.jpg`

Precomputed template:
`public/demo/portrait-girl.json`

QA preview:
`public/demo/portrait-girl-template.png`
