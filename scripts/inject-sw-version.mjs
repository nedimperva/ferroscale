#!/usr/bin/env node

/**
 * Build-time script: injects a combined cache version key into the service worker.
 * Combines the package.json version + dataset version to ensure the SW cache
 * is busted whenever either changes.
 *
 * Run: node scripts/inject-sw-version.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Read package version
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const pkgVersion = pkg.version ?? "0.0.0";

// Read dataset version
const versionFile = readFileSync(
  resolve(root, "packages/metal-core/src/datasets/version.ts"),
  "utf-8",
);
const match = versionFile.match(/DATASET_VERSION\s*=\s*"([^"]+)"/);
const datasetVersion = match?.[1] ?? "unknown";

const cacheKey = `ferroscale-v${pkgVersion}-ds${datasetVersion}`;

// Inject into sw.js — handle both placeholder and previously injected versions
const swPath = resolve(root, "public/sw.js");
let sw = readFileSync(swPath, "utf-8");

// Replace either the placeholder or a previously injected cache key
sw = sw.replace(
  /const CACHE_NAME = "[^"]*";/,
  `const CACHE_NAME = "${cacheKey}";`,
);

writeFileSync(swPath, sw, "utf-8");

console.log(`[inject-sw-version] Cache key: ${cacheKey}`);
