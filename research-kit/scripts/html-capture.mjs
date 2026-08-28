import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2];
const OUT = process.argv[3];
const SELECTOR = process.argv[4] || '.slide';

if (!URL || !OUT) {
  console.error('usage: html-capture.mjs <url> <out.json> [selector]');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const markup = await page.evaluate((selector) => {
    const out = {};
    // Astro stamps a per-component scope class (data-astro-cid-*) on every
    // element it renders. Moving markup into a component changes which
    // component owns it, so those attributes change by construction and are
    // not a finding. Everything else is.
    const clean = (html) =>
      html
        .replace(/\s*data-astro-cid-[a-z0-9]+=""/g, '')
        .replace(/\s+class="\s*"/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim();
    document.querySelectorAll(selector).forEach((el, i) => {
      out[String(i)] = clean(el.outerHTML);
    });
    return out;
  }, SELECTOR);

  if (Object.keys(markup).length === 0) {
    console.error(`${OUT}: selector "${SELECTOR}" matched nothing. Refusing to write an empty capture.`);
    await browser.close();
    process.exit(1);
  }

  writeFileSync(OUT, JSON.stringify(markup, null, 2));
  console.log(`${OUT}: ${Object.keys(markup).length} slides captured (selector "${SELECTOR}")`);
  await browser.close();
})();
