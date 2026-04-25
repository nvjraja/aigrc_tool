# AI GRC Platform — Standalone HTML Demo

A zero-install demo of the AI GRC tool, written in plain HTML / CSS / JavaScript. **No Node.js, Docker, or Python required.**

## Run it

Just open `index.html` in any modern browser (Chrome, Edge, Firefox):

- Double-click `demo/index.html`, **or**
- Drag it onto a browser window

That's it. All data is kept in the browser's `localStorage`, so changes persist across page reloads on the same machine / browser.

## Features (parity with the React app)

- **Dashboard** — KPIs + per-framework compliance
- **AI Systems Inventory** — register / edit / delete systems with EU AI Act classification
- **Risk Management** — 1–5 × 1–5 risk scoring, inherent & residual scores, status filter
- **Frameworks & Controls** — three tabbed frameworks with 150+ pre-seeded controls:
  - ISO/IEC 42001:2023
  - EU AI Act
  - NIST AI RMF 1.0
- **Incidents** — AI incident register
- **Policies** — governance documents with **PDF / DOC / DOCX upload** (stored in `localStorage` as base64, 5 MB cap for demo)

## Reset data

Click **"Reset demo data"** in the sidebar footer to clear `localStorage` and restore the seed data.

## Layout

```
demo/
├── index.html           # single-page shell
├── css/
│   └── style.css
└── js/
    ├── data.js          # seed frameworks + controls + sample policies
    ├── store.js         # localStorage-backed CRUD (mirrors backend API)
    ├── ui.js            # tiny DOM + modal helpers
    ├── pages.js         # page renderers (dashboard, systems, risks, …)
    └── app.js           # hash-router + bootstrap
```

## Notes

- `localStorage` is limited to ~5-10 MB depending on the browser. The upload cap in the demo is set to 5 MB per file.
- This demo is **not** a replacement for the full stack (FastAPI + React + Docker) — it just lets anyone try the UX on a laptop with no tooling.
- To run the full stack: see the project root `README.md`.
