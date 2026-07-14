---
name: header-compact-modifier-pattern
description: Established pattern for compact card headers/badges (Vélib originated it) and a CSS cascade gotcha with same-specificity modifier order
metadata:
  type: project
---

Compact card header sizing pattern, originated by `.card-header--velib` /
`.line-badge--velib` in `src/public/css/dashboard.css`: default
`.card-header` uses `min-height: var(--touch)` (48px) and default
`.line-badge` is 46px; the compact variant drops to `min-height: 40px` /
34px badge. As of 2026-07-10 there's a shared generic
`.card-header--compact` / `.line-badge--compact` pair (not `--velib`-named)
used by Tempo and Métro9 (line-status) cards, added when those two cards
were shrunk to sit side-by-side under RER D.

Gotcha: some widgets add a second modifier class on the badge for custom
background color (e.g. `.tempo-badge` sets width/height/font-size too).
Same-specificity same-property CSS rules resolve by **source order in the
stylesheet**, not by HTML class order. So a shared `--compact` rule must be
placed *after* any widget-specific badge rule (like `.tempo-badge`) in
dashboard.css, or it will lose the cascade and the badge won't actually
shrink. Check this whenever adding a new compact-badge usage on a widget
that already has its own badge color/size class.

`.line-status` widget (`src/widgets/lineStatus.js`) is currently only
configured once, for Métro9 (`status-metro9` in config/dashboard.js) — safe
to have touched its default markup, but a scoped modifier class was used
anyway (not a blind default-size change) in case a second line-status
module gets added later with different header requirements.

See also [[dashboard-grid-layout]].
