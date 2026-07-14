---
name: dashboard-grid-layout
description: How config/dashboard.js `layout` strings map to CSS grid classes in dashboard.css, and the current portrait-first (single-column) grid
metadata:
  type: project
---

`config/dashboard.js` module `layout: 'row-main'` (space-joined multi-word
values too, e.g. old `'col-x row-y'`) strings are converted to
`layout-<value-with-spaces-as-hyphens>` CSS classes by
`src/core/dashboardRenderer.js` (`layout.replace(/\s+/g,'-')`). Any new
layout string must have a matching `.layout-*` rule in
`src/public/css/dashboard.css` or the module falls into `.layout-default`
(full width, no assigned row/col).

As of 2026-07-10 the dashboard is genuinely portrait-first (tablet held
vertically). `.dashboard-grid` is a single default grid — no
`@media (orientation: portrait)` override needed, that IS the base grid now:
2 columns × 4 rows, `grid-template-rows: minmax(0, 1fr) auto auto auto`.
Layout classes (in module order, order matters for CSS grid auto-placement):
- `row-main` (RER D departures) — `grid-column: 1 / -1`, row 1, the `1fr`
  row so it grows to fill remaining viewport height (main/hero card).
- `row-split-left` / `row-split-right` (Tempo EDF / Métro9 line-status) —
  one column each, row 2, sit side by side.
- `row-weather` (weather) — full width, row 3, `auto` height.
- `row-velib` (velib) — full width, row 4, `auto` height.

An **optional** `@media (orientation: landscape)` fallback recreates a
3-column layout close to the old design (in case the tablet is ever
rotated), but portrait is the only layout that matters in practice — don't
spend design effort polishing the landscape fallback without being asked.

Card height mechanics: `.card { height: 100%; }` fills whatever the grid
row gives it. Row 1 (`row-main`) is the only row sized via `1fr`, so it's
the only card that visually grows — the RER D `.passage-list` has
`overflow-y: auto` so it scrolls internally rather than pushing the grid.
Rows 2-4 are `auto` height (content-driven), matching the compact
side-by-side pattern in [[header-compact-modifier-pattern]].

Previous (pre-2026-07-10) layout used `col-left row-top` / `col-right
row-top-left` etc. naming with a bolted-on portrait media-query override —
that whole scheme was replaced, not extended. If you see references to
`col-left`/`col-right`/`row-extra` anywhere (docs, old branches), they are
stale.
