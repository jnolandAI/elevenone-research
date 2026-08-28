import { chromium } from 'playwright';

// Word count per working page, against the measured baseline.
//
// The reference deliverable this system is calibrated to runs a median of 190
// words a page, and the single most useful number in the whole calibration is
// that a working page under about 120 words is almost certainly too thin: it
// is a placeholder that has been styled rather than a page of work. Geometry
// checks cannot see that failure, because an underfull page overflows nothing
// and collides with nothing.
//
// Covers and dividers are excluded: they are fields rather than pages, and
// counting them would drag the median toward a number that means nothing.
//
//   node scripts/density.mjs <url> [--all]

const URL = process.argv[2] || 'http://localhost:4321/project-argo';
const ALL = process.argv.includes('--all');
const THIN = 120;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const slides = await page.evaluate(() =>
  [...document.querySelectorAll('.slide')].map((s, i) => {
    const text = (s.innerText || '').replace(/\s+/g, ' ').trim();
    return {
      n: i + 1,
      // A full-bleed body is a cover or a divider, not a working page.
      full: !!s.querySelector('.slide__body--full'),
      words: text ? text.split(' ').length : 0,
    };
  }),
);
await browser.close();

const work = slides.filter((s) => !s.full);
if (work.length === 0) {
  console.log('no working pages found');
  process.exit(0);
}

const counts = work.map((s) => s.words).sort((a, b) => a - b);
const median = counts[Math.floor(counts.length / 2)];
const mean = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
const thin = work.filter((s) => s.words < THIN);

console.log(`${work.length} working pages (${slides.length - work.length} covers and dividers excluded)`);
console.log(`words per page: median ${median}, mean ${mean}, range ${counts[0]} to ${counts[counts.length - 1]}`);

if (ALL) {
  for (const s of work) console.log(`  s${String(s.n).padStart(2, '0')}  ${s.words}`);
}

if (thin.length) {
  console.log(`\n${thin.length} page(s) under ${THIN} words:`);
  for (const s of thin) console.log(`  s${String(s.n).padStart(2, '0')}  ${s.words} words`);
  process.exitCode = 1;
} else {
  console.log(`\nclean: no page under ${THIN} words`);
}
