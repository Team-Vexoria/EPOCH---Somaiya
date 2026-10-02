#!/usr/bin/env node

/**
 * design-check.mjs
 * 
 * Static analysis enforcement script for DESIGN_RULES.md.
 * Scans source code files for banned design patterns, styles, colors, and copy.
 * 
 * Usage:
 *   node scripts/design-check.mjs [targetDirectory]
 * 
 * Exit code:
 *   0: All checks passed (no violations).
 *   1: Violations found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Target directory to scan (defaults to frontend/src or first argument)
const targetArg = process.argv[2] || path.join('frontend', 'src');
const scanDir = path.isAbsolute(targetArg) ? targetArg : path.resolve(REPO_ROOT, targetArg);

// File extensions to scan
const SCANNABLE_EXTENSIONS = new Set(['.css', '.scss', '.less', '.jsx', '.tsx', '.html', '.vue', '.svelte', '.js', '.ts']);

// Token definition files where hex tokens are permitted
const TOKEN_FILE_BASENAMES = new Set(['tokens.js', 'tokens.ts', 'tokens.css', 'tokens.json']);

// Specific banned dark hex colors from Section 1 (banned everywhere, including config)
const BANNED_DARK_HEX_REGEX = /#(?:050505|0A0A0A|0F0F0F|111111|111\b|121212)\b/i;

// Generic copy phrases banned in Section 2
const BANNED_COPY_PHRASES = [
  /\bRevolutionize\b/i,
  /\bSupercharge\b/i,
  /\bUnlock the power of\b/i,
  /\bSeamless\b/i,
  /\bNext-generation\b/i,
  /\bNext gen\b/i,
  /\bAll-in-one platform\b/i,
];

// Uppercase generic eyebrow labels banned in Section 2
const BANNED_EYEBROWS = [
  /\bAI POWERED\b/,
  /\bFEATURES\b/,
  /\bPLATFORM\b/,
  /\bPOWERED BY AI\b/,
];

// Sub-14px font size patterns in arbitrary Tailwind, CSS, or JSX styles
const SUB_14PX_TAILWIND_REGEX = /\btext-\[(?:[0-9]|1[0-3])px\]/i;
const SUB_14PX_CSS_REGEX = /(?:font-size|fontSize)\s*:\s*['"]?(?:[0-9]|1[0-3])px/i;
const SUB_14PX_REM_REGEX = /(?:text-\[0\.[0-8]\d*rem\]|(?:font-size|fontSize)\s*:\s*['"]?0\.[0-8]\d*rem)/i;

// Arbitrary hex color in Tailwind utilities or JSX inline styles
const ARBITRARY_HEX_TAILWIND_REGEX = /\b(?:bg|text|border|fill|stroke|ring)-\[#([0-9a-fA-F]{3,8})\]/;
const INLINE_HEX_STYLE_REGEX = /(?:color|background|backgroundColor|borderColor)\s*:\s*['"]#(?:[0-9a-fA-F]{3,8})['"]/i;

// Gradient patterns
const TAILWIND_GRADIENT_CLASS_REGEX = /\b(?:bg-gradient-(?:to-[trbl]{1,2})|(?:from|via|to)-(?:[a-zA-Z0-9#_\[\]-]+))\b/;
const CSS_GRADIENT_REGEX = /\b(?:linear-gradient|radial-gradient|conic-gradient)\s*\(/i;

// Glassmorphism and Backdrop filters
const BACKDROP_FILTER_REGEX = /\b(?:backdrop-blur(?:-[a-zA-Z0-9]+)?|backdrop-filter|backdropFilter)\b/i;

// RGBA with alpha below 0.5 used as a background
const RGBA_LOW_ALPHA_REGEX = /(?:background|background-color|backgroundColor|bg-).*rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0?\.\d+|0)\s*\)/i;
const TAILWIND_RGBA_LOW_ALPHA_REGEX = /\bbg-\[(?:rgba?|hsla?)\([^\]]+,\s*(?:0?\.[0-4]\d*|0)\s*\)\]/i;

// Glowing blur and large blur radius box-shadow
const BLUR_FILTER_REGEX = /\b(?:filter:\s*)?blur\s*\(\s*(?:[8-9]|[1-9]\d+)px\s*\)/i;
const TAILWIND_BLUR_LARGE_REGEX = /\bblur-(?:md|lg|xl|2xl|3xl)\b/;
const GLOW_BOX_SHADOW_REGEX = /(?:box-shadow|boxShadow|shadow-\[)[^;\n]*(?:0\s+0\s+(?:[8-9]|[1-9]\d+)px|rgba\([^)]+\)\s+0\s+0|0\s+0\s+[a-zA-Z0-9#_]+)/i;

// Escape hatch comment pattern
const ESCAPE_HATCH_REGEX = /design-check-ignore:\s*(.+)/i;

/**
 * Recursively collect all files matching scannable extensions
 */
function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        getFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

/**
 * Inspect a single file for design rule violations
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const baseName = path.basename(filePath);
  const isTokenFile = TOKEN_FILE_BASENAMES.has(baseName);
  const relPath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');

  const violations = [];
  const ignoredCount = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check for documented escape hatch
    const ignoreMatch = line.match(ESCAPE_HATCH_REGEX);
    if (ignoreMatch) {
      return; // Line is explicitly ignored with reason
    }

    // 1. Banned near-black hex colors (banned everywhere, including token files)
    const bannedDarkMatch = line.match(BANNED_DARK_HEX_REGEX);
    if (bannedDarkMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'BannedDarkColor',
        message: `Banned dark hex background ${bannedDarkMatch[0]} found. Near-black and dark theme backgrounds are strictly prohibited.`,
        snippet: line.trim(),
      });
    }

    // If this is a token definition file, allow token definitions (skip arbitrary hex/copy checks)
    if (isTokenFile) {
      return;
    }

    // 2. Glassmorphism: backdrop-blur and backdrop-filter
    if (BACKDROP_FILTER_REGEX.test(line)) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'BannedGlassmorphism',
        message: 'backdrop-blur / backdrop-filter detected. Glassmorphism is prohibited.',
        snippet: line.trim(),
      });
    }

    // 3. Gradients: Tailwind gradient classes or CSS gradients
    if (TAILWIND_GRADIENT_CLASS_REGEX.test(line) || CSS_GRADIENT_REGEX.test(line)) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'BannedGradient',
        message: 'Gradient utility or linear/radial-gradient detected. Tech gradients and gradient stops are prohibited.',
        snippet: line.trim(),
      });
    }

    // 4. RGBA low-opacity backgrounds (alpha < 0.5)
    if (TAILWIND_RGBA_LOW_ALPHA_REGEX.test(line)) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'BannedLowAlphaBackground',
        message: 'Tailwind background with alpha < 0.5 detected. Translucent card backgrounds are prohibited.',
        snippet: line.trim(),
      });
    } else {
      const lowRgbaMatch = line.match(RGBA_LOW_ALPHA_REGEX);
      if (lowRgbaMatch) {
        // Parse alpha value
        const alphaMatch = lowRgbaMatch[0].match(/rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/i);
        if (alphaMatch && parseFloat(alphaMatch[1]) < 0.5) {
          violations.push({
            file: relPath,
            line: lineNum,
            rule: 'BannedLowAlphaBackground',
            message: `Background rgba with alpha ${alphaMatch[1]} (< 0.5) detected. Semi-transparent backgrounds are prohibited.`,
            snippet: line.trim(),
          });
        }
      }
    }

    // 5. Glow effects & large blur shadows
    if (BLUR_FILTER_REGEX.test(line) || TAILWIND_BLUR_LARGE_REGEX.test(line) || GLOW_BOX_SHADOW_REGEX.test(line)) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'BannedGlowEffect',
        message: 'Glowing box-shadow or large blur filter detected. Use hard offset shadows or none.',
        snippet: line.trim(),
      });
    }

    // 6. Sub-14px microcopy
    if (SUB_14PX_TAILWIND_REGEX.test(line) || SUB_14PX_CSS_REGEX.test(line) || SUB_14PX_REM_REGEX.test(line)) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'BannedMicrocopy',
        message: 'Font size below 14px detected. Nothing in the interface may be smaller than 14px.',
        snippet: line.trim(),
      });
    }

    // 7. Arbitrary hex colors outside design tokens
    const hexMatch = line.match(ARBITRARY_HEX_TAILWIND_REGEX);
    const inlineHexMatch = line.match(INLINE_HEX_STYLE_REGEX);
    if (hexMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'ArbitraryHexColor',
        message: `Arbitrary hex utility ${hexMatch[0]} detected. Use design tokens defined in tokens.js instead.`,
        snippet: line.trim(),
      });
    } else if (inlineHexMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'ArbitraryHexColor',
        message: `Inline style with hardcoded hex "${inlineHexMatch[0]}" detected. Use design tokens instead.`,
        snippet: line.trim(),
      });
    } else if (relPath.endsWith('.css') && /#(?:[0-9a-fA-F]{3,8})\b/.test(line) && !/var\(--/.test(line)) {
      // In CSS files outside tokens.css, check for raw hardcoded hex values
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'ArbitraryHexColor',
        message: 'Hardcoded hex color in CSS. Use design token CSS variables instead.',
        snippet: line.trim(),
      });
    }

    // 8. Banned generic marketing copy phrases
    for (const phraseRegex of BANNED_COPY_PHRASES) {
      const match = line.match(phraseRegex);
      if (match) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'BannedMarketingCopy',
          message: `Generic buzzword/filler copy "${match[0]}" detected. Write specific, concrete copy about product capabilities.`,
          snippet: line.trim(),
        });
      }
    }

    // 9. Generic uppercase eyebrow labels
    for (const eyebrowRegex of BANNED_EYEBROWS) {
      const match = line.match(eyebrowRegex);
      if (match) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'BannedEyebrowLabel',
          message: `Generic uppercase eyebrow label "${match[0]}" detected. Avoid cliché eyebrow tags.`,
          snippet: line.trim(),
        });
      }
    }
  });

  return violations;
}

/**
 * Main execution
 */
function main() {
  console.log(`\n========================================`);
  console.log(` DESIGN RULES ENFORCEMENT CHECK`);
  console.log(`========================================`);
  console.log(`Scanning target: ${path.relative(REPO_ROOT, scanDir) || '.'}\n`);

  if (!fs.existsSync(scanDir)) {
    console.log(`Target directory "${scanDir}" does not exist yet.`);
    console.log(`Design check passed (no files to scan).\n`);
    process.exit(0);
  }

  const files = getFiles(scanDir);
  if (files.length === 0) {
    console.log(`No scannable files found in "${scanDir}".`);
    console.log(`Design check passed.\n`);
    process.exit(0);
  }

  let totalViolations = 0;
  const allViolations = [];

  for (const file of files) {
    const fileViolations = checkFile(file);
    if (fileViolations.length > 0) {
      totalViolations += fileViolations.length;
      allViolations.push(...fileViolations);
    }
  }

  if (totalViolations > 0) {
    console.error(`\x1b[31m[FAILED] Found ${totalViolations} design rule violation(s):\x1b[0m\n`);
    for (const v of allViolations) {
      console.error(`  \x1b[33m${v.file}:${v.line}\x1b[0m - \x1b[31m[${v.rule}]\x1b[0m ${v.message}`);
      console.error(`    \x1b[90mLine: "${v.snippet}"\x1b[0m\n`);
    }
    console.error(`\x1b[31mCommit or build blocked. Fix the violations above according to DESIGN_RULES.md.\x1b[0m`);
    console.error(`For approved exceptions, add "// design-check-ignore: <reason>" on the line and document in docs/DESIGN_EXCEPTIONS.md.\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[PASSED] Scanned ${files.length} file(s). 0 design rule violations found.\x1b[0m\n`);
    process.exit(0);
  }
}

main();
