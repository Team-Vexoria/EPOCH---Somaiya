/**
 * Design Tokens for EPOCH---Somaiya
 * 
 * Sourced from docs/DESIGN_BRIEF.md.
 * DO NOT hardcode hex colors or arbitrary values inside UI components.
 * Banned: Near-black backgrounds, dark themes by default, purple/blue/cyan tech gradients.
 */

export const colors = {
  // Utility values
  transparent: 'transparent',
  current: 'currentColor',

  // Neutral Family (Default Light Theme: warm off-white / paper background + deep ink text)
  // TODO: Set final hex values from docs/DESIGN_BRIEF.md
  neutral: {
    bg: '#FBF9F5',         // TODO: Warm off-white / paper background
    surface: '#FFFFFF',    // TODO: Crisp solid surface
    border: '#E2DED4',     // TODO: Solid 1-2px high-contrast border
    muted: '#737067',      // TODO: Readable dark-muted secondary text (min 4.5:1 WCAG AA)
    ink: '#1C1917',        // TODO: Deep ink text (never near-black or dark backgrounds)
  },

  // Primary Domain Color
  // TODO: Set final hex value and shades from docs/DESIGN_BRIEF.md
  primary: {
    DEFAULT: '#B44A28',    // TODO: Domain-specific primary (e.g. terracotta red)
    hover: '#9C3D1F',      // TODO: Hover state shift
    fg: '#FFFFFF',         // TODO: High contrast text on primary
  },

  // Secondary Domain Color
  // TODO: Set final hex value and shades from docs/DESIGN_BRIEF.md
  secondary: {
    DEFAULT: '#2F4858',    // TODO: Domain-specific secondary (e.g. deep slate forest)
    hover: '#233743',      // TODO: Hover state shift
    fg: '#FFFFFF',         // TODO: High contrast text on secondary
  },

  // Signal Color (Alerts, warnings, errors)
  // TODO: Set final hex value from docs/DESIGN_BRIEF.md
  signal: {
    DEFAULT: '#D9381E',    // TODO: Direct high-contrast alert
    fg: '#FFFFFF',         // TODO: High contrast text on signal
  },
};

export const fontSize = {
  // Section 4 Hard Rule: NOTHING smaller than 14px in the interface
  xs: ['14px', { lineHeight: '20px' }],    // Remapped: 14px minimum
  sm: ['14px', { lineHeight: '20px' }],    // 14px minimum (secondary, captions, form hints)
  base: ['16px', { lineHeight: '24px' }],  // 16px minimum (body text desktop & mobile)
  lg: ['18px', { lineHeight: '28px' }],    // Preferred long reading body
  xl: ['20px', { lineHeight: '28px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['30px', { lineHeight: '36px' }],
  '4xl': ['36px', { lineHeight: '40px' }],
  '5xl': ['48px', { lineHeight: '1.1' }],
  '6xl': ['60px', { lineHeight: '1.05' }],
  '7xl': ['72px', { lineHeight: '1' }],
};

export const boxShadow = {
  // Deliberate shadow tokens: hard offset or none. No soft blurred glows.
  none: 'none',
  hard: '2px 2px 0px 0px rgba(28, 25, 23, 1)',
  'hard-md': '4px 4px 0px 0px rgba(28, 25, 23, 1)',
  'hard-lg': '6px 6px 0px 0px rgba(28, 25, 23, 1)',
};
