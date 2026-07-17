---
name: Dashbored Geist Console
version: 1.0.0
reference: Vercel Dashboard and Geist Design System
---

# 1. Principles

The interface is quiet infrastructure. Information density, clarity, and predictable interaction take priority over decoration. Use color only to communicate state, selection, or a primary action. Keep hierarchy in typography, spacing, and borders.

# 2. Color

- Background 100: `#ffffff` for content and controls.
- Background 200: `#fafafa` for the sidebar, table headers, and secondary regions.
- Gray 100: `#f2f2f2` for active navigation and subtle fills.
- Gray 200: `#ebebeb` for hairline borders.
- Gray 500: `#c9c9c9` for stronger borders and disabled details.
- Gray 700: `#8f8f8f` for secondary labels.
- Gray 900: `#666666` for secondary copy.
- Gray 1000: `#171717` for primary text and dark controls.
- Blue: `#0070f3` for charts, links, and focused data emphasis.
- Green: `#1a7f37`; Amber: `#d97706`; Red: `#e5484d` for semantic status only.

# 3. Typography

Use Geist Sans for all interface copy and Geist Mono only for technical values such as endpoints, timestamps, and identifiers. Default body and control text is 14px. Navigation and secondary copy is 13px. Page titles are 20–24px with tight but restrained tracking. Avoid uppercase except for established protocol or product acronyms.

# 4. Layout and spacing

Use a 240px desktop sidebar and a fluid content region. Main content is capped at 1400px with 24–32px padding. Base spacing is 4px; common gaps are 8, 12, 16, 24, and 32px. Cards and controls use 6px radii. Group related regions with shared borders instead of separate floating surfaces.

# 5. Components and interaction

Cards have a white fill, 1px `#ebebeb` border, and no resting shadow. Hover uses a stronger border or subtle gray fill, never translation. Buttons are 32–36px high with 6px radii; the primary button is black. Inputs are white with gray borders and a black focus ring. Motion is limited to 150ms state transitions and functional overlays.

# 6. Responsive and accessibility

Desktop presents the full console. Below the desktop breakpoint the sidebar becomes an overlay and dense tables collapse into stacked rows. Maintain visible focus, semantic headings, labeled icon controls, live status text in addition to color, and reduced-motion behavior.
