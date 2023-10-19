import { join } from 'node:path';
import { cwd } from 'node:process';
import { mkdirp } from 'mkdirp';
import { existsSync } from 'node:fs';

interface ScreenshotGeneratorOptions {
  host?: string;
  archivePath?: string;
  viewport?: { width: number; height: number };
  target?: string;
}

interface ScreenshotRunOptions {
  force?: boolean;
}

export function createScreenshotGenerator(options: ScreenshotGeneratorOptions = {}) {
  return async (runOptions: ScreenshotRunOptions = {}) => {
    const chromium = await getPlaywright();
    if (!chromium) {
      // Skip if playwright is not installed
      return;
    }

    const force = runOptions.force || false;

    // Variables.
    const host = options.host || 'http://localhost:3000';
    const archivePath = options.archivePath || '/block-archive';
    const viewport = options.viewport || { width: 1280, height: 800 };
    const target = options.target || join(cwd(), 'public/blocks');

    await mkdirp(target);

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(host + archivePath);

    await page.setViewportSize(viewport);
    const script = page.locator('#block-archive');
    await script.waitFor({ state: 'attached' });
    const json = await script.innerText();
    const data = JSON.parse(json);

    await page.waitForLoadState('networkidle');

    const blocks = data.blocks || [];
    for (const block of blocks) {
      if (!force && existsSync(join(target, `${block.type}.jpg`))) {
        continue;
      }

      const { type, label, examples = [] } = block;
      if (examples.length) {
        await page
          .locator(`#example_${type}__0`)
          .first()
          .screenshot({ path: `${target}/${type}.jpg`, scale: 'device', type: 'jpeg' });
      }
    }

    await page.close();
  };
}

async function getPlaywright() {
  try {
    // @ts-ignore
    const { chromium } = require('playwright');

    return chromium;
  } catch (err) {
    return null;
  }
}
