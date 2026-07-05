# ICS Tracking & Monitoring Tool
### Phase 1: Core Layout

A clean, offline-first, responsive Inventory Custodian Slip (ICS) tracking and monitoring system built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no dependencies.

---

## Project Structure

```
DSIS simplified/
├── index.html              # Entry point — shell scaffold + script loading order
├── css/
│   └── styles.css          # Design system: tokens, layout, components, responsive
└── js/
    ├── router.js           # Hash-based SPA router
    ├── components.js       # Reusable UI component factories + SVG icon library
    ├── app.js              # Application orchestrator (bootstrap, sidebar, header, etc.)
    └── pages/
        ├── dashboard.js    # Dashboard page module
        ├── records.js      # ICS Records page module
        ├── new-ics.js      # New ICS (step wizard) page module
        ├── notifications.js # Notifications page module
        ├── reports.js      # Reports page module
        └── settings.js     # Settings page module
```

---

## How to Run

Open `index.html` directly in any modern browser. No server, build step, or installation required.

```
Double-click index.html  — or —  drag it into a browser tab
```

Works fully offline after first load (fonts served from Google Fonts on first load; rest is local).

---

## Navigation

| URL Hash         | Page            |
|------------------|-----------------|
| `#dashboard`     | Dashboard       |
| `#records`       | ICS Records     |
| `#new`           | New ICS Record  |
| `#notifications` | Notifications   |
| `#reports`       | Reports         |
| `#settings`      | Settings        |

---

## Keyboard Shortcuts

| Shortcut     | Action             |
|--------------|--------------------|
| `⌘K` / `Ctrl+K` | Focus global search |
| `Escape`     | Close open drawers  |

---

## Responsive Behavior

| Breakpoint     | Layout |
|----------------|--------|
| Desktop ≥1024px | Sidebar (240px expanded / 72px collapsed) + Workspace + Context Panel (360px) |
| Tablet ≤1024px  | Sidebar collapsed (icons only) + Workspace; Context Panel → slide-over drawer |
| Mobile ≤768px   | Sidebar → hamburger menu; Bottom navigation bar; Context Panel → full drawer  |

---

## Architecture for Future Phases

### Adding a new page (Phase 2+)

1. Create `js/pages/your-page.js` exporting a `render(workspace, contextBody)` function.
2. Register it in `PAGE_REGISTRY` in `app.js`.
3. Add a nav item entry in the `navItems` array in `buildSidebar()`.

### Adding database / CRUD (Phase 2)

- Create `js/db/` — IndexedDB wrappers using the idb-keyval pattern.
- Import and call from page modules without touching layout files.

### Adding forms (Phase 2)

- New ICS form connects to `js/pages/new-ics.js` — the step wizard UI is already scaffolded.
- Each wizard step renders into the existing `formArea` container.

---

## Design System

All design tokens are in `css/styles.css` under `:root {}`.

| Token group   | Variable prefix       |
|---------------|-----------------------|
| Colors        | `--color-*`           |
| Spacing       | `--space-*`           |
| Typography    | `--font-size-*`, `--font-weight-*` |
| Border radius | `--radius-*`          |
| Shadows       | `--shadow-*`          |
| Transitions   | `--transition-*`      |
| Z-index       | `--z-*`               |
| Layout        | `--sidebar-*`, `--header-height`, `--context-panel-width` |

---

## Phase Roadmap

| Phase | Focus                      | Status         |
|-------|----------------------------|----------------|
| 1     | Core Layout & UI Shell     | ✅ Complete     |
| 2     | ICS Database & CRUD Forms  | 🔜 Next        |
| 3     | Reports & Print Engine     | Planned        |
| 4     | Notifications Engine       | Planned        |
| 5     | Import / Export            | Planned        |
