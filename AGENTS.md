# Agent Guidelines

Before building or editing ANY UI, read [DESIGN_RULES.md](./DESIGN_RULES.md) and [docs/DESIGN_BRIEF.md](./docs/DESIGN_BRIEF.md) and follow them strictly.
This project must NOT look like a default AI-generated landing page.
Every page and component must look designed by a professional for this specific domain.
When in doubt, choose the more distinctive, human, and readable option.
Never use generic AI templates, tech gradients, or unstyled dark themes.
All typography, colors, spacing, and layout must stem directly from domain design tokens.

## Hardest Rules (Summary of Sections 1 - 3)
- **No Dark Mode / Near-Black Backgrounds**: Never use `#050505`, `#0A0A0A`, `#0F0F0F`, `#111`, `#111111`, `#121212`, charcoal, or dark purple/navy/blue/green fills. Light theme is default.
- **No Generic Tech Gradients or Glows**: Banned purple/cyan gradients, radial hero glows, glowing buttons/cards, glassmorphism, `backdrop-blur`, and dot grids.
- **No Sub-14px Text & Minimum 16px Body**: Absolutely nothing below 14px anywhere. Body text must be >= 16px. All text must pass WCAG AA contrast.
- **No AI Clichés or Generic Components**: No uppercase eyebrow labels (`AI POWERED`), low-opacity tinted status pills, 3-column identical card grids, or filler buzzwords (*"Revolutionize"*, *"Supercharge"*, *"Seamless"*).
- **Asymmetric Editorial Layout**: High contrast, crisp 1-2px solid borders or hard offset shadows, varied section structures, and real domain-driven imagery/content.

## Enforcement
After every UI change, run `npm run design:check` and fix every violation before reporting the task done. Violations must be fixed, not suppressed.
