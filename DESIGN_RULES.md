# Design Rules & Standards

This document establishes the mandatory design standards and rules for all UI, components, animations, and visual assets across the entire repository. Every engineer and AI agent contributing to this project must follow these rules strictly.

---

## 0. Purpose
This project must **NOT** look like a default AI-generated landing page. Every page and component should look like it was designed by a professional designer for **THIS specific product and domain**. 

When in doubt, choose the more distinctive, more human, more readable option. These rules apply to every page, component, animation, and asset, including future ones.

---

## 1. Banned Colors and Backgrounds (Never Use)
- **Near-black or very dark page backgrounds**: Banned values include `#050505`, `#0A0A0A`, `#0F0F0F`, `#111`, `#111111`, `#121212`, charcoal, and "dark mode by default" themes.
- **Dark saturated backgrounds**: Dark navy or dark blue shades, dark green shades, dark purple or indigo shades as page backgrounds or section fills.
- **Generic tech gradients**: Purple, violet, indigo, blue, or cyan gradients; any purple-to-blue or blue-to-cyan gradient; no gradient-filled headline words.
- **Glow effects**: Radial gradient glows behind hero sections, blurred glowing blobs or orbs, glowing shadows around cards or buttons, neon glow effects.
- **Generic background textures**: Grid or dot-grid backgrounds, particle effects, noise-over-dark textures, and floating decorative shapes with no meaning.
- **Glassmorphism**: No semi-transparent card backgrounds (`rgba(255, 255, 255, 0.05)`, etc.), no `backdrop-blur`, and no thin 1px white or gray translucent borders on dark surfaces.
- **Low-contrast text**: Gray low-contrast paragraph text is prohibited. Secondary text must pass WCAG AA contrast (4.5:1 minimum, aim for 7:1 on body text).

---

## 2. Banned Components and Treatments (Never Use in Generic Form)
- **Generic uppercase eyebrow labels**: Small uppercase eyebrow labels above headings (such as `AI POWERED`, `FEATURES`, `PLATFORM`).
- **Low-opacity tinted pills and badges**: Colored text on faint translucent colored backgrounds (`LIVE`, `NEW`, `BETA`, `TRENDING`, `+24.5%`). If a status label is needed, use plain readable text, a solid high-contrast chip, or an icon plus a word, always at a readable size.
- **Sub-14px microcopy**: Any text smaller than the minimum sizes specified in Section 4.
- **Glow buttons**: Pill-shaped buttons with glow on hover; hover glows in general.
- **Cliché hero layout**: The generic "huge hero heading + short gray subtitle + two buttons + floating dashboard preview" layout.
- **Symmetrical 3-column card grid**: Identical rounded cards (12 to 24px radius) in a symmetrical 3-column grid, each with an icon on top, heading, gray description, and an arrow. Also avoid a generic bento grid of equal-looking glass tiles.
- **Icon spam**: No row of generic icons (Sparkles, Zap, Shield, Brain, Globe, Chart), no gradient circular icon containers, and no decorative checkmark lists used as filler. Use an icon only when it carries real meaning, and keep it a consistent size and style.
- **Generic footer**: The standard SaaS footer (four link columns plus copyright) and a mandatory "footer CTA" band. Design the footer specifically for this product.
- **Gratuitous animations**: Fade-up-on-scroll applied to every element, animated counters for the sake of it, floating or bobbing cards, 3D orbs, and animated particles.
- **Filler marketing copy**: Buzzwords and fluff such as *"Revolutionize"*, *"Supercharge"*, *"Next-generation"*, *"Seamless"*, *"Unlock the power of"*. Write specific, concrete copy about what the product actually does.

---

## 3. Required Direction Instead (What to Do)
- **Default to a LIGHT theme**: Warm off-white, cream, paper, or soft tinted neutral backgrounds, paired with dark ink text for strong contrast. Use full-width solid color sections (flat, saturated, or earthy) to create rhythm. Colors must come from the project's domain (see [`docs/DESIGN_BRIEF.md`](./docs/DESIGN_BRIEF.md)), not from a generic tech palette.
- **Domain design tokens**: One neutral family, one primary color, one secondary color, and one signal color for alerts. Define them as design tokens (CSS variables mapped in the Tailwind config) so the whole site can be re-themed in minutes. Never hard-code hex values inside components.
- **Typography carries the design**: Choose a distinctive display typeface paired with a highly readable text typeface (from Google Fonts or Fontshare, self-chosen per project, not Inter or Roboto by default). Use strong size contrast between headings and body, tight but comfortable line heights, and real typographic hierarchy.
- **Editorial & asymmetric layout**: Use editorial and asymmetric layouts, large blocks of solid color, big type, generous whitespace, strong alignment to a grid, and varied section structures. No two sections should have the same layout. Visual hierarchy must allow a viewer to understand the page in 5 seconds.
- **Crisp surfaces**: Use flat solid fills, clear solid borders (1 to 2px, high contrast) or no borders, and hard offset shadows or no shadows. Corner radius should follow a deliberate system (for example 0, 4, or 8px, or a bold large radius used consistently), never an arbitrary default.
- **Authentic imagery**: Use real or realistic content (real screenshots of the product, real photos, illustrations, or diagrams drawn specifically for the domain). Never use placeholder gradient boxes as imagery.
- **Purposeful motion (GSAP)**: Motion must explain or guide, not decorate. Use it for page-load sequences, scroll storytelling in one or two key sections, state transitions, and live agent step traces. Respect `prefers-reduced-motion`. Keep durations short (0.2s to 0.6s) and easing curves natural.
- **Clear data and product UI**: Prioritize clarity for dashboards, chat, and agent step views: large readable numbers, labeled charts, plain-language statuses, visible loading, empty and error states, and obvious primary actions.

---

## 4. Minimum Sizes and Accessibility (Hard Rules)
- **Body text**: 16px minimum on desktop and mobile; prefer 17px to 18px for long reading.
- **Secondary text, captions, table cells, form hints**: 14px minimum. **NOTHING in the interface may be smaller than 14px**, including labels, badges, chips, footers, tooltips, and chart text.
- **Buttons and inputs**: Text at least 16px; tap targets at least 44px high.
- **Headings**: Clear, fluid scale with `clamp()` (for example `h1` 48px to 80px, `h2` 32px to 48px, `h3` 22px to 28px).
- **Contrast**: WCAG AA at minimum for all text and UI components (4.5:1 minimum, aim for 7:1 on body text). Never convey meaning by color alone.
- **Interactive accessibility**: Visible focus states on every interactive element; full keyboard navigation support; informative `alt` text on all images.
- **Responsive design**: Fully responsive from 360px wide up. Test mobile viewports first.

---

## 5. Inspiration Process (Required Before Designing Any Page)
- **Define direction first**: Before building any page or component, define the design direction using [`docs/DESIGN_BRIEF.md`](./docs/DESIGN_BRIEF.md).
- **Study professional benchmarks**: Take inspiration from the structure, typography, pacing, and interaction ideas of professionally designed websites: award-winning sites, editorial and magazine layouts, well-designed product sites, and recognized design systems. Study principles such as hierarchy, spacing, rhythm, motion, and copywriting, and document the adopted principles in [`docs/DESIGN_BRIEF.md`](./docs/DESIGN_BRIEF.md).
- **No verbatim copying**: Never copy a site's code, assets, brand, exact layout, or wording. Create an original solution tailored to this product and its users.
- **One memorable idea**: Each major page needs one memorable, original idea (for example an unusual layout, a strong typographic treatment, a purposeful interaction, or a story-driven scroll section) fitting the domain.

---

## 6. Component Rules
- **Buttons**: Clear solid fills with strong contrast, rectangular or consistently rounded corners per the chosen system, visible pressed and hover states using color shifts or micro-movement of a few pixels (no glow), and readable label text of at least 16px.
- **Cards**: Only use cards when grouping truly needs a visual container; vary size and visual emphasis; avoid repeating the same card structure more than 3 times in a row.
- **Navigation**: Simple, readable navigation with the current page clearly marked. No sticky translucent blurred navbar.
- **Forms**: Visible labels above fields (not placeholder-only), clear inline error messages, and large input heights (>= 44px).
- **Tabs, tables, and lists**: Readable row heights and font sizes; use subtle zebra rows or clear solid dividers with solid fills and high contrast.
- **States**: Empty, loading, and error states must be intentionally designed, never falling back to generic default spinners.

---

## 7. Content and Copy Rules
- **Specific, plain, human copy**: Clearly state what the product does, for whom, and the measurable outcome.
- **Concrete headlines**: Headlines must be concrete statements, not buzzwords. Avoid generic taglines, fake statistics, fake testimonials, and lorem ipsum text in final pages.
- **Scannable rhythm**: Keep sentences short, concise, and scannable.

---

## 8. Technical Rules for Frontend
- **Tech stack**: Vite, React, Tailwind CSS, GSAP, React Router, shadcn/ui (heavily customized to eliminate default shadcn styling), and Lucide icons used sparingly.
- **Token centralization**: All colors, fonts, spacing, radius, and shadow values live in design tokens (Tailwind theme and CSS variables) defined in a single source of truth.
- **Component library location**: Custom UI components live in `frontend/src/components/ui` and must follow these rules strictly.
- **No decorative libraries**: Do not install or import decorative libraries (particles, 3D orbs, glow effect packages).

---

## 9. Design Brief
Every design initiative must have an active design brief documented in [`docs/DESIGN_BRIEF.md`](./docs/DESIGN_BRIEF.md) prior to UI implementation. Fill out the brief template before building any page.

---

## 10. Pre-Completion Checklist
Before marking ANY UI task as complete, verify and affirm every item:
- [ ] No banned color, gradient, glow, blur, glass, grid, or particle effect is present.
- [ ] No text below 14px; body text is at least 16px; contrast passes WCAG AA.
- [ ] No low-opacity tinted pills or generic uppercase eyebrow labels.
- [ ] No section reuses the same layout as the previous one; no row of identical feature cards.
- [ ] Colors and fonts come from tokens and match [`docs/DESIGN_BRIEF.md`](./docs/DESIGN_BRIEF.md).
- [ ] The page has one original, domain-specific idea.
- [ ] Motion is purposeful, explains or guides, and respects `prefers-reduced-motion`.
- [ ] Layout is fully responsive and verified at 360px, 768px, and 1440px widths.
- [ ] Automated check passes: `npm run design:check` was executed and reported 0 violations.

---

## 11. Enforcement
To ensure banned styles fail loudly rather than relying on memory:
- **Automated check script**: Run `npm run design:check` (or `node scripts/design-check.mjs`). It scans all frontend files for banned colors, gradients, blurs, microcopy, arbitrary styles, and generic copy phrases.
- **Zero-tolerance policy**: After every UI change, run `npm run design:check` and fix every violation before reporting the task done. Violations must be fixed, not suppressed.
- **Pre-commit hook**: Git pre-commit hooks and the frontend build pipeline automatically run `design:check` and block commits or builds if violations are detected.
- **Documented escape hatch**: In the rare event an exception is necessary, add a comment `/* design-check-ignore: <reason> */` or `// design-check-ignore: <reason>` on the exact line, and document the rationale in [`docs/DESIGN_EXCEPTIONS.md`](./docs/DESIGN_EXCEPTIONS.md).
