#!/usr/bin/env node
// Capture screenshots from a running webpage at 2x retina resolution.
// Usage:
//   node scripts/capture.mjs [url] [outDir]
//   node scripts/capture.mjs http://localhost:8080 ./screenshots
//
// Env overrides:
//   CAPTURE_URL   target URL          (default http://localhost:8080)
//   CAPTURE_OUT   output directory    (default ./screenshots)
//   CAPTURE_W     viewport width px   (default 1440)
//   CAPTURE_H     viewport height px  (default 900)
//   CAPTURE_FULL  full page capture   (default true; set "false" for viewport only)

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.argv[2] || process.env.CAPTURE_URL || 'http://localhost:8080';
const outDir = resolve(process.argv[3] || process.env.CAPTURE_OUT || './screenshots');
const width = Number(process.env.CAPTURE_W || 1440);
const height = Number(process.env.CAPTURE_H || 900);
const fullPage = (process.env.CAPTURE_FULL || 'true') !== 'false';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  // deviceScaleFactor: 2 produces 2x retina-resolution output.
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log(`Navigating to ${url} ...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  } catch (err) {
    console.error(`Failed to load ${url}: ${err.message}`);
    console.error('Is the dev server running? Try: npm run dev');
    await browser.close();
    process.exit(1);
  }

  const file = resolve(outDir, `capture-${timestamp}.png`);
  await page.screenshot({ path: file, fullPage });

  const dims = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
  }));

  console.log(`Saved ${file}`);
  console.log(
    `Logical: ${dims.w}x${dims.h}px | Output: ~${dims.w * 2}x${dims.h * 2}px (2x retina)`,
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
