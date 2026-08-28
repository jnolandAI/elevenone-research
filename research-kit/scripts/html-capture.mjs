import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2];
const OUT = process.argv[3];
const SELECTOR = process.argv[4] || '.slide';

// Astro stamps a per-component scope class (data-astro-cid-*) on every
// element it renders. Moving markup into a component changes which
// component owns it, so those attributes change by construction and are
// not a finding. Everything else is.
//
// The whitespace collapse below must use an ASCII-only character class, not
// \s. \s matches U+2002 (en space) and U+00A0 (non-breaking space) as well
// as a literal space, so a regex built on \s compares an en-space equal to
// an ASCII space and makes every &ensp; in the corpus invisible to this
// capture. That is a real typographic character, used deliberately
// throughout as a separator (e.g. "Exhibit N&ensp;Title", "Eleven One
// Research&ensp;|&ensp;Brief 001"), not incidental whitespace, and a
// content change to it must be a finding here.
//
// A plain function, not inlined inside page.evaluate(): it touches no DOM,
// so there is no reason to run it in the browser, and running it in Node
// instead makes it importable and unit-testable the way compare() in
// html-diff.mjs is.
export function clean(html) {
  return html
    .replace(/\s*data-astro-cid-[a-z0-9]+=""/g, '')
    .replace(/\s+class="\s*"/g, '')
    .replace(/>[ \t\n\r\f]+</g, '><')
    .replace(/[ \t\n\r\f]+/g, ' ')
    .trim();
}

if (process.argv[1] && process.argv[1].endsWith('html-capture.mjs')) {
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

    const raw = await page.evaluate((selector) => {
      const out = {};
      document.querySelectorAll(selector).forEach((el, i) => {
        out[String(i)] = el.outerHTML;
      });
      return out;
    }, SELECTOR);

    const markup = {};
    for (const [i, html] of Object.entries(raw)) markup[i] = clean(html);

    if (Object.keys(markup).length === 0) {
      console.error(`${OUT}: selector "${SELECTOR}" matched nothing. Refusing to write an empty capture.`);
      await browser.close();
      process.exit(1);
    }

    writeFileSync(OUT, JSON.stringify(markup, null, 2));
    console.log(`${OUT}: ${Object.keys(markup).length} slides captured (selector "${SELECTOR}")`);
    await browser.close();
  })();
}
