// Generates src/data/toolLogos.ts from the two icon packages.
//
// Run: npm run logos
//
// Why generate rather than import at runtime: simple-icons alone is 3,459
// icons. The strip needs a couple of dozen, so the paths are extracted at build
// time and the packages stay devDependencies that never reach a browser.
//
// LICENSING. Simple Icons ships its SVGs under CC0 and Devicon under MIT, so
// the icon *files* are free to use. The marks themselves remain their owners'
// trademarks, which is fine here because the strip is nominative use: it says
// "tools I work with" and claims no endorsement or partnership. Keep that
// label honest if the section is ever reworded.
//
// Several brands are in neither package on purpose rather than by oversight.
// Microsoft, Adobe, OpenAI and VS Code marks were removed from Simple Icons
// under its trademark policy, which is why VS Code, Azure, Photoshop and
// Premiere Pro come from Devicon instead, and why Codex, Groq and CapCut have
// no licensed mark available at all. Those three fall back to a monogram in
// the site's own accent rather than a guessed-at imitation of their logo.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as simpleIcons from "simple-icons";
import { svgPathBbox } from "svg-path-bbox";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The strip, in the order it should read. */
const TOOLS = [
  { label: "Claude", si: "claude" },
  { label: "Codex", monogram: "Cx" },
  { label: "Gemini", si: "googlegemini" },
  { label: "Groq", monogram: "Gq" },
  // `wordmark`: the licensed mark already spells the brand legibly at the
  // strip's size, so it is set on its own rather than printing the name twice.
  // Zoho is deliberately NOT one: its mark is four shapes with "ZOHO" set
  // beneath them at about a fifth of the mark's height, which is a 3px smudge
  // in this row. It keeps its label.
  { label: "Odoo", si: "odoo", wordmark: true },
  { label: "Zoho", si: "zoho" },
  { label: "Vercel", si: "vercel" },
  { label: "Supabase", si: "supabase" },
  { label: "Google Workspace", si: "google" },
  { label: "Microsoft Azure", dev: "azure" },
  { label: "CapCut", monogram: "Cc" },
  { label: "Adobe Photoshop", dev: "photoshop" },
  { label: "Adobe Premiere Pro", dev: "premierepro" },
  { label: "VS Code", dev: "vscode" },
  { label: "Shopify", si: "shopify" },
  { label: "WordPress", si: "wordpress" },
  { label: "Framer", si: "framer" },
];

const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The dark theme's canvas, from --c-canvas in index.css. */
const DARK_CANVAS = "0c1526";

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A dark-theme colour for marks that would disappear on the navy canvas.
 *
 * Measured as contrast against that canvas rather than raw luminance, and
 * lightened only as far as it takes to read clearly. A first pass keyed off
 * luminance alone turned Zoho's red into pink and Gemini's purple into
 * lavender, which loses the brand while fixing a problem those two never had.
 * Pure black still lands near white, which is how Vercel renders on dark
 * anyway; a mark that already reads is returned unchanged.
 *
 * There is deliberately no matching pass for the light theme. Nothing goes
 * invisible on white — the faintest, Supabase's green, still clears 2:1 — and
 * these marks are decorative with the tool's name set beside them in text, so
 * no contrast rule applies (brand marks are exempt from 1.4.11 in any case).
 * Darkening a brand's own green to win a number it does not owe would trade
 * the thing being shown for a metric nobody reads.
 */
function darkVariant(hex) {
  if (contrast(hex, DARK_CANVAS) >= 3.2) return null;
  // A mark that is essentially black has no hue to preserve, and its owner
  // already renders it white on dark. Lightening it by degrees just produces
  // grey, which looks like a mistake rather than a choice.
  if (luminance(hex) < 0.012) return "ffffff";
  let rgb = hexToRgb(hex);
  for (let step = 0; step < 40; step++) {
    rgb = rgb.map((v) => v + (255 - v) * 0.06);
    if (contrast(toHex(rgb), DARK_CANVAS) >= 7) break;
  }
  return toHex(rgb);
}

/**
 * Crop a mark's viewBox to what it actually draws, and report its shape.
 *
 * Icon sets pad to a square canvas, which is right for a grid of icons and
 * wrong for a row where each mark sits beside a word. Odoo and Zoho only
 * publish wordmarks: inside a 24x24 box those fill 32% and 43% of the height,
 * so at the row's mark size they came out as unreadable smudges next to
 * full-height marks like Claude's starburst. Cropping to the ink and sizing by
 * height instead of width puts every mark on the same optical baseline; the
 * wordmarks simply end up wider, which is how they are meant to be set.
 */
function tighten({ viewBox, paths, ...rest }) {
  const boxes = paths.map(svgPathBbox);
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[2]));
  const y1 = Math.max(...boxes.map((b) => b[3]));
  const w = x1 - x0;
  const h = y1 - y0;
  return {
    ...rest,
    paths,
    viewBox: [x0, y0, w, h].map((n) => Number(n.toFixed(2))).join(" "),
    // Rounded to two places: it only ever multiplies a pixel height.
    aspect: Number((w / h).toFixed(2)),
  };
}

function fromSimpleIcons(slug) {
  const key = "si" + slug.charAt(0).toUpperCase() + slug.slice(1);
  const icon = simpleIcons[key];
  if (!icon) throw new Error(`simple-icons has no "${slug}"`);
  return tighten({ viewBox: "0 0 24 24", paths: [icon.path], hex: icon.hex.toLowerCase() });
}

function fromDevicon(name) {
  const svg = readFileSync(join(root, `node_modules/devicon/icons/${name}/${name}-plain.svg`), "utf8");
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!viewBox || !paths.length) throw new Error(`devicon "${name}" gave nothing usable`);
  const meta = JSON.parse(readFileSync(join(root, "node_modules/devicon/devicon.json"), "utf8"))
    .find((x) => x.name === name);
  return tighten({ viewBox, paths, hex: (meta?.color ?? "#666666").replace("#", "").toLowerCase() });
}

const entries = TOOLS.map((tool) => {
  if (tool.monogram) return { label: tool.label, monogram: tool.monogram };
  const icon = tool.si ? fromSimpleIcons(tool.si) : fromDevicon(tool.dev);
  const dark = darkVariant(icon.hex);
  return {
    label: tool.label,
    ...icon,
    ...(tool.wordmark ? { wordmark: true } : {}),
    ...(dark ? { darkHex: dark } : {}),
  };
});

const body = entries
  .map((e) => {
    const lines = [`    label: ${JSON.stringify(e.label)},`];
    if (e.monogram) lines.push(`    monogram: ${JSON.stringify(e.monogram)},`);
    else {
      lines.push(`    viewBox: ${JSON.stringify(e.viewBox)},`);
      lines.push(`    aspect: ${e.aspect},`);
      if (e.wordmark) lines.push(`    wordmark: true,`);
      lines.push(`    paths: [\n${e.paths.map((p) => `      ${JSON.stringify(p)},`).join("\n")}\n    ],`);
      lines.push(`    hex: ${JSON.stringify(e.hex)},`);
      if (e.darkHex) lines.push(`    darkHex: ${JSON.stringify(e.darkHex)},`);
    }
    return `  {\n${lines.join("\n")}\n  },`;
  })
  .join("\n");

writeFileSync(
  join(root, "src/data/toolLogos.ts"),
  `// AUTO-GENERATED by scripts/build-tool-logos.mjs, do not edit by hand.
//
// The marks for the tools strip, extracted from simple-icons (CC0) and
// devicon (MIT) so neither package ships to a browser. Trademarks remain
// their owners': the strip is nominative use and claims no endorsement.
//
// \`monogram\` entries are the brands with no licensed mark available (their
// owners had them removed from those sets). They render as a lettermark in
// the site's own accent rather than an imitation of a logo nobody licensed.
//
// \`darkHex\` appears only where the brand colour is too dark to survive on the
// dark canvas, lightened in proportion to how dark it is.
//
// \`wordmark\` marks the brands whose licensed mark is the name set as type.
// The strip prints no label beside those — the mark already says it.

export interface ToolLogo {
  label: string;
  /** Absent when the brand has a licensed mark. */
  monogram?: string;
  viewBox?: string;
  /** Width divided by height, for marks that are not square. */
  aspect?: number;
  /** The mark spells the brand name, so no label is set beside it. */
  wordmark?: boolean;
  paths?: string[];
  hex?: string;
  darkHex?: string;
}

export const TOOL_LOGOS: ToolLogo[] = [
${body}
];
`,
);

const withMark = entries.filter((e) => !e.monogram).length;
console.log(`  wrote src/data/toolLogos.ts`);
console.log(`  ${withMark} licensed marks, ${entries.length - withMark} monograms`);
for (const e of entries) {
  console.log(
    `    ${e.label.padEnd(20)} ${e.monogram ? "monogram " + e.monogram : "#" + e.hex + (e.darkHex ? "  dark #" + e.darkHex : "")}`,
  );
}
