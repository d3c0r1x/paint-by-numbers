# QA Report — 2.0.1

## Verified locally
- Node syntax: server.mjs / app.js PASS
- Fresh SQLite database boot PASS
- `/api/health` PASS
- Demo catalog upsert PASS
- Golden Portrait present as featured catalog item PASS
- Demo template: 400×600, 14 palette colors, 694 connected regions PASS
- Template preview is line art with decimal color numbers PASS
- Registration modal structure and focus handling reviewed; backdrop is no longer a click-action ancestor
- Template canvas no longer paints the whole image with the source colors; source is only shown in Reference mode
- Correct-color guard on Smart Fill/Assisted Brush PASS
- JS source cache disabled for app.js/styles.css to prevent stale browser UI

## Environment limitation
A real macOS/Xcode/iPadOS build is not executable in this Linux environment. Browser Chromium execution may also be restricted by the host sandbox. The production project is designed to run from Windows via `start.bat` with Node.js 22+ and no npm install required.
