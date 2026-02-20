/**
 * Generates PNG icon variants from icon.svg for PWA and iOS.
 * Run with: node scripts/generate-icons.mjs
 * Requires: sharp (npm install --save-dev sharp)
 */

import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const publicDir = join(rootDir, "public");

const svgSource = readFileSync(join(publicDir, "icon.svg"), "utf8");

// Maskable variant: full-bleed background (no rounded corners) so the OS
// can safely apply any mask shape without clipping the design.
const maskableSvg = svgSource.replace('rx="96"', 'rx="0"');

const icons = [
  { name: "icon-192.png", size: 192, svg: svgSource },
  { name: "icon-512.png", size: 512, svg: svgSource },
  { name: "icon-maskable-512.png", size: 512, svg: maskableSvg },
  { name: "apple-touch-icon.png", size: 180, svg: svgSource },
];

for (const { name, size, svg } of icons) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(publicDir, name));
  console.log(`✓ ${name} (${size}×${size})`);
}

console.log("\nAll icons generated in /public/");
