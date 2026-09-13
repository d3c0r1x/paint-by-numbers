# Paint by Numbers Studio 1.1

Browser-first Paint by Numbers Studio with a curated gallery, user photo generation, persistent projects, history, Smart Fill / Assisted Brush, and Russian / English UI.

## One-click Windows launch

1. Install Node.js 22 LTS or newer.
2. Double-click `start.bat`.
3. The script creates the local data folders, starts the SQLite-backed server, waits for `/api/health`, and opens the browser.
4. `stop.bat` stops the local server.

There are no required third-party runtime dependencies. The database uses Node 22+'s built-in `node:sqlite`.

Default address: `http://127.0.0.1:4173`

## Included capabilities

- Russian / English interface with persistent language selection.
- Username/password registration, login, logout and secure scrypt password hashing.
- HttpOnly SameSite session cookies.
- Curated catalog with categories, search and favorites.
- Preloaded **Golden Portrait** demo based on the third supplied image (`public/demo/portrait-girl.jpg`).
- Precomputed numbered template for the demo: 400×600, 14 colors, 694 regions.
- User photo → paint-by-numbers generation in the browser.
- Adjustable detail / color budget.
- True template canvas by default; original image is available as a separate Reference view.
- Smart Fill, Assisted Brush and free Brush modes.
- Color Assistant with Find All / highlight.
- Zoom, fit, focus mode and minimap.
- Auto-save and persistent project state.
- Painting events and history.
- Artist profile and project statistics.
- PNG template export and Web Share / clipboard fallback.
- PWA manifest.

## Demo workflow

The first featured card in the catalog is `Golden Portrait`. Open it and the editor starts in the **numbered template**, not the original photo. The `Reference` control toggles the original portrait on/off for comparison.

## Data

- `data/pbn.sqlite` — local SQLite database created on first run.
- `data/uploads/` — user-uploaded images.
- `public/demo/` — preloaded demo image and precomputed template.

## QA

Run:

```bash
npm run check
```

The server smoke test covers health, static serving, registration, session auth, catalog seeding, favorite toggle, project CRUD, photo upload persistence, event history, logout and auth guard.

The repository also contains `QA_REPORT.md` with the environment limitation for full interactive Chromium navigation in the supplied sandbox.
