import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

// Resolved paint, not custom properties. A rename changes which token a rule
// reads; the only thing that proves the rename was value-preserving is what
// the browser finally paints.
const URL = process.argv[2] || 'http://localhost:4321/project-argo';
const OUT = process.argv[3] || '.baseline/paint.json';
// Not every page is a deck of `.slide` elements: Base-layout pages have a
// single `#main` document root instead. A capture that silently selects
// nothing and reports zero elements is indistinguishable from a real,
// empty diff, which is exactly how the Base.astro regression went
// unnoticed. So the selector is an argument, not a constant, and zero
// matches is an error, not a result.
const SELECTOR = process.argv[4] || '.slide';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });

  const paint = await page.evaluate((selector) => {
    const PROPS = [
      'color', 'background-color', 'fill', 'stroke', 'stroke-width',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
      // font-family joined this list on 2026-08-31. Its absence was the same
      // blindness the kit-probe found in the kit itself: portability.mjs
      // checks only paint properties, deck.css set no family at all, and this
      // script recorded a font's size and weight but never which face drew it.
      // A migration could swap a whole type system and every instrument here
      // would report identical. Border width and radius join for the same
      // reason and in advance: they are the next properties a brand supplies,
      // and an instrument that cannot see a property cannot prove a change to
      // it was inert.
      'font-family',
      'font-size', 'font-weight', 'letter-spacing', 'line-height',
      'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
      'border-top-left-radius', 'border-top-right-radius',
      'border-bottom-left-radius', 'border-bottom-right-radius',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'width', 'height',
      'gap', 'row-gap', 'column-gap', 'box-shadow',
      'top', 'right', 'bottom', 'left',
    ];
    // Index path rather than a selector: the rename touches no markup, so
    // position is stable across runs and does not depend on class names that
    // a careless replace might have altered.
    const pathOf = (el) => {
      const parts = [];
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        parts.unshift([...e.parentElement.children].indexOf(e));
      }
      return parts.join('/');
    };
    const out = {};
    document.querySelectorAll(selector).forEach((slide, i) => {
      const n = 's' + String(i + 1).padStart(2, '0');
      [slide, ...slide.querySelectorAll('*')].forEach((el) => {
        const cs = getComputedStyle(el);
        const rec = {};
        for (const p of PROPS) rec[p] = cs.getPropertyValue(p);
        out[`${n}|${pathOf(el)}`] = rec;
      });
    });
    return out;
  }, SELECTOR);

  await browser.close();

  const n = Object.keys(paint).length;
  if (n === 0) {
    console.error(
      `${OUT}: 0 elements captured for selector "${SELECTOR}" at ${URL}. ` +
      `Refusing to write an empty capture — pass the right selector (the ` +
      `page's own content root when it has no .slide elements).`
    );
    process.exitCode = 1;
    return;
  }

  writeFileSync(OUT, JSON.stringify(paint, null, 1));
  console.log(`${OUT}: ${n} elements captured (selector "${SELECTOR}")`);
})();
