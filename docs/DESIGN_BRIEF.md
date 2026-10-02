# Design Brief Template

> Fill in each section before designing or building any page or component. This brief grounds all visual and interaction decisions in the specific domain of this product.

---

## 1. Product & Problem Statement
*Write one concise paragraph describing what the product actually does, what core problem it solves, and the measurable result it produces.*

- **Summary**: <!-- Fill in one paragraph describing the product and problem statement -->

---

## 2. Domain & Users
*Specify target audience attributes, expectations, and context.*

- **Target Audience**: <!-- Who they are (e.g. logistics coordinators, research scientists, finance managers) -->
- **Language & Tone**: <!-- Domain-specific terminology, technical level, readability tone -->
- **Primary Devices**: <!-- Mobile-first, desktop workstation, tablet on-field, multi-monitor -->
- **Technical Comfort**: <!-- Novice, general consumer, power user, developer -->

---

## 3. Brand Personality
*Choose 3 distinct adjectives that describe the visual feel, and 3 adjectives to explicitly avoid.*

- **Core Adjectives (Aim for)**:
  1. <!-- e.g., Editorial -->
  2. <!-- e.g., Precise -->
  3. <!-- e.g., Warm -->
- **Anti-Adjectives (Avoid)**:
  1. <!-- e.g., Generic-SaaS -->
  2. <!-- e.g., Cyberpunk/Glowy -->
  3. <!-- e.g., Playful/Toy-like -->

---

## 4. Color Tokens & Domain Rationale
*Define the token colors. Default to a light theme. Hex values must be grounded in domain imagery and context, never a generic tech gradient or AI purple/cyan.*

- **Neutral Family** (Off-white / cream / paper background + deep ink text):
  - Background (`--color-background`): `<!-- e.g., #FBF9F5 (warm paper) -->`
  - Surface (`--color-surface`): `<!-- e.g., #FFFFFF (pure solid) -->`
  - Text Primary (`--color-text-primary`): `<!-- e.g., #1A1A1A (deep ink) -->`
  - Text Secondary (`--color-text-secondary`): `<!-- e.g., #4A4A4A (readable dark gray, passes 4.5:1 WCAG AA) -->`
  - Border (`--color-border`): `<!-- e.g., #E2DED4 (solid, high-contrast border) -->`
- **Primary Color** (`--color-primary`): `<!-- e.g., #B44A28 (Terracotta red) -->`
  - *Domain Rationale*: <!-- Why does this color represent the domain? -->
- **Secondary Color** (`--color-secondary`): `<!-- e.g., #2F4858 (Deep slate forest) -->`
  - *Domain Rationale*: <!-- Why does this color represent the domain? -->
- **Signal Color** (`--color-signal`): `<!-- e.g., #D9381E (Direct alert red) -->`
  - *Domain Rationale*: <!-- Purpose and alert state logic -->

---

## 5. Typography
*Select a distinctive display typeface paired with a readable body typeface (from Google Fonts or Fontshare). Do not use Inter or Roboto by default.*

- **Display Typeface**: `<!-- e.g., Instrument Serif, Cabinet Grotesk, Fraunces -->`
- **Text / Body Typeface**: `<!-- e.g., General Sans, Plus Jakarta Sans, Newsreader -->`
- **Typographic Scale**:
  - `Display / Hero`: `clamp(48px, 6vw, 80px)`
  - `H1`: `clamp(36px, 4vw, 56px)`
  - `H2`: `clamp(28px, 3vw, 40px)`
  - `H3`: `clamp(22px, 2vw, 28px)`
  - `Body`: `16px minimum (17px - 18px preferred for long reading)`
  - `Secondary / Captions / Badges`: `14px minimum (strictly nothing below 14px)`

---

## 6. Layout & Grid Approach
*Describe the layout architecture, asymmetric compositions, grid divisions, and spacing rhythm.*

- **Grid System**: <!-- e.g., 12-column editorial grid, asymmetric 7:5 split -->
- **Rhythm & Whitespace**: <!-- e.g., Generous 96px - 128px section margins, alternating full-bleed solid color blocks -->
- **Section Layout Plan**:
  - Section 1 (Hero): <!-- Layout structure -->
  - Section 2: <!-- Distinct layout structure (must not duplicate Section 1) -->
  - Section 3: <!-- Distinct layout structure -->

---

## 7. Reference Benchmarks & Adopted Principles
*List 2 to 3 real-world, professionally designed sites studied for inspiration and note the specific design principles adopted (never copy code, layouts, or brand assets).*

1. **Reference Site 1**: `<!-- Site URL / Name -->`
   - *Principles Adopted*: <!-- e.g., High-contrast monochrome borders, dramatic scale contrast in typography -->
2. **Reference Site 2**: `<!-- Site URL / Name -->`
   - *Principles Adopted*: <!-- e.g., Editorial asymmetric split hero with structured metadata sidebar -->

---

## 8. The Memorable Domain Ideas
*Every major page must have an original, domain-specific visual or interactive concept.*

- **Hero Concept**: <!-- e.g., An interactive architectural blueprint ledger rather than a floating dashboard mock -->
- **Product Screen / Core Interface Concept**: <!-- e.g., Step-by-step physical timeline cards showing live agent verification -->

---

## 9. Motion Plan (GSAP)
*Define where and why motion is applied. Motion must guide or explain, not decorate.*

- **Page Load Sequence**: <!-- Timeline choreography, duration 0.2s - 0.5s -->
- **Scroll Storytelling (1 - 2 key moments)**: <!-- Purposeful scroll trigger explaining product workflow -->
- **State Changes / Transitions**: <!-- Micro-interactions on buttons, drawer expands -->
- **Reduced Motion Strategy**: <!-- Fallbacks when prefers-reduced-motion is true -->

---

## 10. Component Style Decisions
*Establish systematic visual choices for components.*

- **Corner Radius**: `<!-- e.g., Systematic 4px crisp radius / 0px sharp corners -->`
- **Borders**: `<!-- e.g., Solid 1px or 2px high contrast border (#E2DED4) -->`
- **Shadows**: `<!-- e.g., Hard offset 3px 3px 0px #1A1A1A or none; no soft blurred glows -->`
- **Button System**: `<!-- e.g., Solid primary fill with 1px border, 48px height, 16px font-weight medium, 2px translateY on active -->`

---

## 11. Pre-Launch Checklist
Verify before shipping any page built with this brief:
- [ ] No banned colors, gradients, glow or blur utilities used.
- [ ] Light theme default with warm off-white/paper tones and ink text.
- [ ] Minimum font size is 14px; body text is 16px minimum.
- [ ] No two consecutive sections share the same layout structure.
- [ ] Automated verification passes: `npm run design:check` reports 0 errors.
