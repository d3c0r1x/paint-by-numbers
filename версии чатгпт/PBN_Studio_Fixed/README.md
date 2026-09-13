# Paint by Numbers Studio 2.0

## One-click Windows launch

1. Install Node.js 22+ once.
2. Double-click `start.bat`.
3. The app starts a local SQLite-backed server and opens the preloaded **Golden Portrait** demo in the real numbered-template editor.
4. Click **Gallery** / back to browse the catalog, or sign in to save progress.

The project does not require Docker, PostgreSQL, npm install, Python, or a cloud account for local use.

## Demo

The supplied portrait photo is bundled in `public/demo/portrait-girl.jpg`. The bundled template is a real region mask with 14 colors and 694 connected regions. The editor opens the **Template** view by default; the original photo is available through **Reference**.

## Auth

Registration and login use username/password. Passwords are stored as scrypt hashes. Sessions use HttpOnly cookies.

## Language

Use the EN/RU selector in the header; the setting is persisted in the browser.

## Stop

Run `stop.bat`.

## Local data

SQLite database: `data/pbn.sqlite`
Uploads: `data/uploads/`
