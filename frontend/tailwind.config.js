import { colors, fontSize, boxShadow } from './src/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    // REPLACING default color palette completely (NOT extending)
    // Only domain tokens are available. No purple, violet, indigo, blue, cyan, slate, etc.
    colors: colors,

    // Overriding font size scale: minimum allowed size is 14px. Default body is 16px.
    fontSize: fontSize,

    // Overriding shadow scale: only deliberate hard offset shadows or none. No soft/glow shadows.
    boxShadow: boxShadow,

    extend: {},
  },
  corePlugins: {
    // Hard Rule: Disable all backdrop blur and backdrop filter utilities
    backdropBlur: false,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
    backdropFilter: false,

    // Hard Rule: Disable background gradient utilities
    backgroundImage: false,
  },
  plugins: [],
};
