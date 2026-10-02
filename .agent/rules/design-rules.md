# Design Rules & Standards (Antigravity Workspace Rule)

Before building or editing ANY UI, read [DESIGN_RULES.md](../../DESIGN_RULES.md) and [docs/DESIGN_BRIEF.md](../../docs/DESIGN_BRIEF.md) and follow them strictly.

## 0. Purpose
This project must NOT look like a default AI-generated landing page. Every page and component should look like it was designed by a professional designer for THIS specific product and domain. When in doubt, choose the more distinctive, more human, more readable option.

## 1. Banned Colors and Backgrounds (Never Use)
- Near-black or very dark page backgrounds: `#050505`, `#0A0A0A`, `#0F0F0F`, `#111`, `#111111`, `#121212`, charcoal, and "dark mode by default".
- Dark navy, dark blue, dark green, dark purple, or indigo backgrounds or section fills.
- Purple, violet, indigo, blue, or cyan gradients; any purple-to-blue or blue-to-cyan gradient; no gradient-filled headline words.
- Radial gradient glows behind hero sections, blurred glowing blobs or orbs, glowing shadows around cards or buttons, neon glow effects.
- Grid or dot-grid backgrounds, particle effects, noise-over-dark textures, floating decorative shapes with no meaning.
- Glassmorphism: no semi-transparent card backgrounds (`rgba(255, 255, 255, 0.05)`, etc.), no `backdrop-blur`, no thin 1px white/gray translucent borders on dark surfaces.
- Gray low-contrast paragraph text. All text must pass WCAG AA contrast (4.5:1 minimum, aim for 7:1 on body text).

## 2. Banned Components and Treatments (Never Use in Generic Form)
- Generic uppercase eyebrow labels above headings (`AI POWERED`, `FEATURES`, `PLATFORM`).
- Low-opacity tinted pills and badges (`LIVE`, `NEW`, `BETA`, `TRENDING`, `+24.5%`). Use plain readable text, a solid high-contrast chip, or an icon plus a word.
- Text smaller than 14px anywhere in the interface.
- Pill-shaped buttons with hover glow; hover glows in general.
- The "huge hero heading + short gray subtitle + two buttons + floating dashboard preview" layout.
- Identical rounded cards (12 to 24px radius) in a symmetrical 3-column grid; generic bento grid of equal glass tiles.
- Icon spam: row of generic icons (Sparkles, Zap, Shield, Brain, Globe, Chart), gradient circular containers, decorative checkmark filler.
- Standard SaaS footer (four link columns plus copyright) and mandatory footer CTA band.
- Fade-up-on-scroll applied to every element, animated counters for the sake of it, floating or bobbing cards, 3D orbs, animated particles.
- Filler marketing copy (*"Revolutionize"*, *"Supercharge"*, *"Next-generation"*, *"Seamless"*, *"Unlock the power of"*).

## 3. Required Direction Instead (What to Do)
- Default to a LIGHT theme: warm off-white, cream, paper, or soft tinted neutral backgrounds with dark ink text. Full-width solid color sections. Domain colors from `docs/DESIGN_BRIEF.md`.
- Palette: one neutral family, one primary, one secondary, and one signal color defined as design tokens (CSS variables mapped in Tailwind config). Never hard-code hex values in components.
- Typography: distinctive display typeface + highly readable text typeface. Strong size contrast between headings and body, tight comfortable line heights.
- Layout: editorial, asymmetric layouts, large blocks of solid color, big type, generous whitespace, strong alignment to a grid. Varied section structure—no two sections share the same layout.
- Surfaces: flat solid fills, clear solid borders (1-2px high contrast) or no borders, hard offset shadows or no shadows. Deliberate corner radius system.
- Imagery: authentic screenshots, photos, illustrations, or diagrams drawn for the domain. Never placeholder gradient boxes.
- Motion (GSAP): explain or guide, not decorate. Respect `prefers-reduced-motion`. Keep durations short (0.2s - 0.6s) and eases natural.
- Data and product UI: large readable numbers, labeled charts, plain-language statuses, visible loading/empty/error states, obvious primary actions.

## 4. Minimum Sizes and Accessibility (Hard Rules)
- Body text: 16px minimum desktop and mobile (prefer 17px - 18px).
- Secondary text, captions, table cells, form hints: 14px minimum. NOTHING < 14px.
- Buttons and inputs: text >= 16px; tap targets >= 44px high.
- Contrast: WCAG AA minimum for all text and UI components. Visible focus states on all interactive elements. Alt text on images. Full keyboard navigation.
- Fully responsive from 360px wide up.

## 5. Enforcement
After every UI change, run `npm run design:check` and fix every violation before reporting the task done. Violations must be fixed, not suppressed.
