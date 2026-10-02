# Design Brief — Sell Smart (कृषी बाजार सल्लागार)

> Grounded design specifications for the "Where & When to Sell" Agri-Decision Advisory for Farmers & FPOs in Maharashtra.

---

## 1. Product & Problem Statement
Smallholder farmers and Farmer Producer Organisations (FPOs) across Maharashtra consistently lose 15%–35% of their crop value to harvest-time distress sales because localized arrivals depress local mandi prices. Existing tools only show today's spot rate or isolated price forecasts, failing to account for transport expenses and perishability decay. 

**Sell Smart** is a decision-support advisory that calculates actual **net money in hand** across 10–15 regional mandis over a 1–3 week horizon by computing:
$$\text{Net Return} = \text{Forecasted Price} \times (1 - \text{Spoilage Loss}) - \text{Transport Cost} - \text{Storage Cost}$$
It delivers unequivocal advice (e.g., *"Hold 8 days, sell at Lasalgaon APMC, expected net gain ₹185/quintal"*) via an editorial web dashboard and a zero-friction WhatsApp/Voice note interface in Marathi and Hindi.

---

## 2. Domain & Users
- **Target Audience**:
  1. *Marginal & Smallholder Farmers* (0.5 – 5 acres): Need quick binary clarity (*Sell today nearby vs. wait & truck 40km away*), accessible via simple Marathi/Hindi WhatsApp audio or text.
  2. *FPO Directors & Aggregators* (50 – 500 member farmers): Need bulk multi-truck dispatch optimization, split loads across high-absorbing terminal mandis (e.g., Vashi vs. Pune vs. Lasalgaon), and verifiable backtested ledger proofs.
- **Language & Tone**: High-contrast, vernacular-first Marathi (मराठी) and Hindi (हिंदी) with English toggle. Zero jargon; simple financial rupee metrics (नफा / तोटा, प्रति क्विंटल निव्वळ नफा).
- **Primary Devices**: Mobile-first for farmers (WhatsApp simulation & mobile browser 360px+), desktop workstation for FPO managers planning freight logistics.
- **Technical Comfort**: Low-to-moderate for individual farmers; moderate for FPO managers.

---

## 3. Brand Personality
- **Core Adjectives**:
  1. *Earthy & Agricultural* (Grounded in fertile soil, harvest grains, and rural mandis; never tech-sterile).
  2. *Decisive & Honest* (Shows price uncertainty ranges and spoilage risks plainly rather than false single-point certainty).
  3. *Editorial & Utilitarian* (High contrast, clean ledger grids, bold typographic hierarchy, functional and crisp).
- **Anti-Adjectives (Avoid)**:
  1. *Generic AI / Neon-Cyberpunk* (No purple gradients, glowing borders, or dark AI themes).
  2. *SaaS Fluff* (No buzzwords like "supercharge", "revolutionize", or fake testimonials).
  3. *Gimmicky / Toy-like* (No infantilizing cartoon illustrations or low-contrast cards).

---

## 4. Color Tokens & Domain Rationale
*Defaulting strictly to a warm Light Theme. Hex values reflect the soil, harvest, and ledger books of Maharashtra agriculture.*

- **Neutral Family**:
  - Background (`--color-neutral-bg`): `#FBF9F5` (Warm off-white unbleached paper)
  - Surface (`--color-neutral-surface`): `#FFFFFF` (Solid crisp paper card)
  - Ink (`--color-neutral-ink`): `#1C1917` (Deep charcoal ink, strong contrast AA compliant)
  - Muted (`--color-neutral-muted`): `#6E6A61` (Readable slate gray for captions and metadata, 4.8:1 ratio)
  - Border (`--color-neutral-border`): `#DDD8CB` (Crisp 1px - 2px solid ledger dividers)
- **Primary Color — Harvest Terracotta (`--color-primary`)**:
  - Value: `#B44A28` (Warm baked terracotta / Maharashtra red soil & ripe tomato)
  - *Domain Rationale*: Reflects harvest fertility, clay pottery, and agricultural vibrancy without eye fatigue.
- **Secondary Color — Deep Monsoon Slate (`--color-secondary`)**:
  - Value: `#2D5A27` (Deep agricultural foliage / soybean canopy) with slate accent `#2F4858`
  - *Domain Rationale*: Symbolizes healthy crop yield and trustworthy institutional advisory.
- **Signal Color — Alert Crimson (`--color-signal`)**:
  - Value: `#D9381E` (Clear distress sale alert & high spoilage risk warning)

---

## 5. Typography
- **Display Typeface**: *Space Grotesk* (Bold, modern geometric numbers and headings reminiscent of agricultural ledgers).
- **Text / Body Typeface**: *Plus Jakarta Sans* (High legibility at 16px minimum, supports Devanagari numerals and crisp mobile rendering).
- **Typographic Scale**:
  - Hero Numbers: `clamp(36px, 5vw, 56px)` font-weight 700
  - H1 / Mandi Names: `clamp(26px, 3.5vw, 36px)` font-weight 700
  - H2 / Section Titles: `clamp(20px, 2.5vw, 26px)` font-weight 600
  - Body Text: `16px` minimum desktop & mobile
  - Metadata & Badges: `14px` minimum (Strictly zero text below 14px)

---

## 6. Layout & Grid Approach
- **Asymmetric Editorial Layout**: 12-column responsive grid with an asymmetric 7:5 split between the active Recommendation Ledger and the Spatial Distance Matrix.
- **Hard Offset Surfaces**: Flat solid cards with `2px solid #1C1917` borders and hard offset box shadows (`shadow-hard: 3px 3px 0px #1C1917`).
- **No Consecutive Symmetrical Grids**: Visual rhythm alternates between the Decision Hero, the Comparative Mandi Matrix, the WhatsApp Audio Console, and the Historical Backtest Graph.

---

## 7. Reference Benchmarks & Adopted Principles
1. **Agmarknet & MSAMB (Maharashtra State Agricultural Marketing Board)**:
   - *Adopted*: Real modal prices, arrival volumes (quintals), and authentic mandi hub names.
   - *Refined*: Replaced bureaucratic dense text tables with a real-time net-margin calculator and spatial transport cost deductions.
2. **Gov.uk & Financial Times Editorial Ledgers**:
   - *Adopted*: Ultra-readable monochrome borders, high-contrast numerical hierarchy, and plain-language summaries (*"Hold 8 days..."*).

---

## 8. The Memorable Domain Ideas
- **Idea 1 (Farmer View)**: The **Net-Rupee Decision Barometer** — Directly contrasts "Sell Today at Nearest Mandi" vs "Optimized Mandi & Holding Plan", showing the exact rupee difference in prominent 36px ink typography.
- **Idea 2 (WhatsApp Voice Simulator)**: An interactive phone mockup that plays simulated Marathi/Hindi farmer voice queries and responds with structured vernacular text and audio readout.
- **Idea 3 (FPO Logistics Matrix)**: Multi-truck allocation planner that prevents market saturation by distributing 100 quintals across 3 complementary mandis.

---

## 9. Motion Plan (GSAP)
- **Rhythm & Page Flow**: Subtle 0.3s staggered reveal of mandi cards sorted by Net Realized Price.
- **Slider Dynamics**: When the farmer adjusts the "Holding Days" slider, net return recalculates smoothly, visually showing the spoilage decay curve intersecting the price rise.
- **Reduced Motion**: All animations immediately disable when `prefers-reduced-motion` is active.

---

## 10. Component Decisions
- **Buttons**: Flat solid `#B44A28` (Primary) or `#2D5A27` (Secondary) with `2px solid #1C1917` border, 48px height, 16px font-weight bold, and 2px translation on active press.
- **Cards**: Flat white `#FFFFFF` surface with `1-2px solid #DDD8CB` or `#1C1917` border and `shadow-hard`.
- **Badges**: Solid high-contrast chips (e.g. `HIGH CONFIDENCE`, `SPOILAGE WARNING`), text size strictly 14px.

---

## 11. Pre-Launch Checklist
- [x] Warm off-white light theme default (`#FBF9F5`), ink text (`#1C1917`).
- [x] Zero gradients, glows, or glassmorphism.
- [x] Minimum text size is 14px; body is 16px.
- [x] All 3 target crops (Tomato, Onion, Soybean) and 12 Maharashtra mandis configured.
- [x] `npm run design:check` passes with 0 violations.
