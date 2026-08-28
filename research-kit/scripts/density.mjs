import { chromium } from 'playwright';
import { takeProfile } from '../profiles/load.mjs';

// Word count per working page, against the profile's measured baseline.
//
// On a client deliverable a working page under about 120 words is almost
// certainly too thin: a placeholder that has been styled rather than a page of
// work. Geometry checks cannot see that failure, because an underfull page
// overflows nothing and collides with nothing.
//
// On a published research page it is a form, not a fault. 41% of the pages in
// the published corpus run under 120 words: dividers, statements, provenance
// pages, quote pages. So the threshold stays at 120 for every profile and what
// changes is the SHARE of pages allowed to sit below it. The deliverable
// profile allows none, which is the behaviour this script had before profiles
// existed; the research profiles allow up to the corpus rate.
//
// Covers and dividers are excluded: they are fields rather than pages, and
// counting them would drag the median toward a number that means nothing.
//
//   node scripts/density.mjs --profile <name> <url> [--all]
//
// --profile is required and has no default, for the reason above: the same
// page count is a fault under one profile and a form under another.

let PROFILE;
let argv;
try {
  const taken = takeProfile(process.argv.slice(2));
  PROFILE = taken.profile;
  argv = taken.rest;
} catch (e) {
  console.error(`density.mjs: ${e.message}`);
  process.exit(2);
}

const URL = argv.find((a) => !a.startsWith('--')) || 'http://localhost:4321/project-argo';
const ALL = argv.includes('--all');
const THIN = PROFILE.density.thinWords;
const THIN_SHARE = PROFILE.density.thinShare;
const MEDIAN_BASELINE = PROFILE.density.medianWords;

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

console.log(
  `${work.length} working pages (${slides.length - work.length} covers and dividers excluded)` +
    `  [profile: ${PROFILE.name}]`,
);
console.log(
  `words per page: median ${median}, mean ${mean}, range ${counts[0]} to ${counts[counts.length - 1]}` +
    `  (baseline ${MEDIAN_BASELINE})`,
);

if (ALL) {
  for (const s of work) console.log(`  s${String(s.n).padStart(2, '0')}  ${s.words}`);
}

const thinShare = thin.length / work.length;
if (thin.length) {
  const pct = Math.round(thinShare * 100);
  const allowed = Math.round(THIN_SHARE * 100);
  console.log(
    `\n${thin.length} of ${work.length} page(s) under ${THIN} words, ${pct}% (profile allows ${allowed}%):`,
  );
  for (const s of thin) console.log(`  s${String(s.n).padStart(2, '0')}  ${s.words} words`);
  if (thinShare > THIN_SHARE) {
    console.log(`\nFAIL  ${pct}% of working pages are thin, above the ${allowed}% this profile expects`);
    process.exitCode = 1;
  } else {
    console.log(
      `\nok    ${pct}% thin, at or under the ${allowed}% the corpus runs for this shape`,
    );
  }
} else {
  console.log(`\nclean: no page under ${THIN} words`);
}
