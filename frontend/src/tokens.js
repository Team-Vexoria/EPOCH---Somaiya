/**
 * Design Tokens for Mohra (EPOCH---Somaiya)
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
  neutral: {
    bg: '#FBF9F5',         // Warm off-white / paper background
    surface: '#FFFFFF',    // Crisp solid surface
    border: '#E2DED4',     // Solid 1-2px high-contrast border
    muted: '#737067',      // Readable dark-muted secondary text (min 4.5:1 WCAG AA)
    ink: '#1C1917',        // Deep ink text (never near-black or dark backgrounds)
  },

  // Primary Domain Color (Agricultural Green / Trust)
  primary: {
    DEFAULT: '#1E6B2D',    // Deep agricultural foliage green
    hover: '#155523',      // Hover state
    fg: '#FFFFFF',         // High contrast white text
    subtle: '#EBF5ED',     // Solid high-contrast light green fill
  },

  // Secondary Domain Color (Harvest Terracotta / Earth)
  secondary: {
    DEFAULT: '#B44A28',    // Terracotta earth / harvest red
    hover: '#9C3D1F',      // Hover state
    fg: '#FFFFFF',         // High contrast white text
    subtle: '#FDF2EE',     // Solid high-contrast light terracotta
  },

  // Decision & Advisory Action Colors
  sell: {
    DEFAULT: '#15803D',    // Sell Now (Forest Green)
    fg: '#FFFFFF',
    bg: '#DCFCE7',
  },

  hold: {
    DEFAULT: '#B45309',    // Hold Produce (Amber Ochre)
    fg: '#FFFFFF',
    bg: '#FEF3C7',
  },

  risk: {
    DEFAULT: '#B91C1C',    // High Spoilage / Price Drop Alert (Crimson)
    fg: '#FFFFFF',
    bg: '#FEE2E2',
  },

  // Signal / Alert Color
  signal: {
    DEFAULT: '#D9381E',    // Direct high-contrast alert
    fg: '#FFFFFF',
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
  'hard-md': '3px 3px 0px 0px rgba(28, 25, 23, 1)',
  'hard-lg': '5px 5px 0px 0px rgba(28, 25, 23, 1)',
};
