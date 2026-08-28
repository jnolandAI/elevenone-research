import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The checks a geometry pass cannot make.
 *
 * `slidecheck` answers "does anything overlap or overflow", and a deck can be
 * clean on that and still be wrong: a title that argues in a banned shape, an
 * exhibit number that repeats, a page with no source line, a total that does
 * not sum. None of those push a pixel anywhere, so nothing reports them.
 *
 * This reads the source rather than the render, because that is where the
 * copy lives and because it needs no browser.
 *
 *   node scripts/audit.mjs [dir]        default src/components/argo
 *
 * Exits non-zero on a hard failure (banned title construction, numbering that
 * repeats or skips). Soft measures print for judgement and never fail the run:
 * a median is a calibration, not a rule.
 */

const dir = process.argv.slice(2).find((a) => !a.startsWith("--")) || 'src/components/argo';

/* The measured baseline from the reference deliverable. A working title runs a
   median of 19 words and about three quarters carry a number. */
const TITLE_MEDIAN = 19;
const NUMBER_SHARE = 0.74;

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.astro'))
  .sort();

const strip = (s) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&ensp;|&nbsp;/g, ' ')
    .trim();

const titles = [];
const exhibits = [];
const leads = [];
let slides = 0;
let sourced = 0;

for (const file of files) {
  const src = readFileSync(join(dir, file), 'utf8');

  for (const m of src.matchAll(/<h2 class="s-title">([\s\S]*?)<\/h2>/g)) {
    titles.push({ file, text: strip(m[1]) });
  }
  for (const m of src.matchAll(/Exhibit (\d+)&ensp;/g)) {
    exhibits.push({ file, n: Number(m[1]) });
  }
  const leadBody =
    /class="s-(annot|comment)__lead">([\s\S]*?)<\/p>\s*<p class="s-\1__body">([\s\S]*?)<\/p>/g;
  for (const m of src.matchAll(leadBody)) {
    leads.push({ file, text: strip(m[2]), body: strip(m[3]) });
  }

  // A slide is sourced if a source line appears between its own <Slide> and
  // the next one. Full-bleed covers and dividers are exempt.
  for (const block of src.split('<Slide ').slice(1)) {
    if (block.includes('full>')) continue;
    slides++;
    if (block.includes('class="s-source"')) sourced++;
  }
}

let failed = false;
const fail = (msg) => {
  failed = true;
  console.log(`FAIL  ${msg}`);
};

console.log(`${files.length} files, ${titles.length} titles, ${exhibits.length} exhibits, ${slides} working pages\n`);

/* ---- Banned title constructions ------------------------------------------
   These are the shapes that mark a deck as generated. The dramatic colon is
   the one that relapses: it reached 58% of titles on a deck written against a
   rule that already forbade it, because setup-colon-payoff is the path of
   least resistance when a title carries a claim and its support. A colon that
   introduces a LIST is sanctioned, so the test requires prose on both sides. */
const banned = [
  [/^[^:]{15,}: (?![^,]+, )[a-z]/, 'dramatic colon (setup, colon, payoff)'],
  [/\b(is|are|was|were) (sound|real|right|true) and .{0,40}\b(is|are) not\b/i, 'the reversal'],
  [/\b(exactly|precisely|entirely|genuinely|the whole point)\b/i, 'rhetorical intensifier'],
  [/\bthis (deck|page|section|analysis)\b/i, 'meta-title: the subject is the work'],
];

const offenders = [];
for (const t of titles) {
  for (const [re, name] of banned) {
    if (re.test(t.text)) offenders.push({ ...t, name });
  }
}
if (offenders.length) {
  fail(`${offenders.length} title(s) use a banned construction`);
  for (const o of offenders) console.log(`      [${o.file}] ${o.name}\n        ${o.text}`);
} else {
  console.log('ok    no banned title constructions');
}

/* ---- Exhibit numbering ---------------------------------------------------
   Drifts silently whenever an exhibit is inserted, converted or deleted. */
const nums = exhibits.map((e) => e.n);
const dupes = [...new Set(nums.filter((n, i) => nums.indexOf(n) !== i))];
const expected = nums.map((_, i) => i + 1);
const sortedNums = [...nums].sort((a, b) => a - b);
const gaps = expected.filter((n) => !sortedNums.includes(n));

if (dupes.length) fail(`exhibit numbers repeat: ${dupes.join(', ')}`);
if (gaps.length) fail(`exhibit numbers skip: ${gaps.join(', ')}`);
if (!dupes.length && !gaps.length) {
  console.log(`ok    exhibits numbered 1 to ${nums.length}, no gaps or repeats`);
}

/* ---- Source lines -------------------------------------------------------- */
if (sourced < slides) {
  console.log(`warn  ${slides - sourced} working page(s) carry no source line`);
} else {
  console.log('ok    every working page carries a source line');
}

/* Mis-decoded punctuation. A curly apostrophe written back through a shell
   in the system codepage becomes "aEURtm" on the page, and it survives every
   other check because it is valid text. Ten of them were sitting in this deck
   on 2026-08-26, one of them inside a risk register that had been read twice. */
const MOJIBAKE = /â€|Ã©|Â /;
const garbled = [];
for (const file of files) {
  const src = readFileSync(join(dir, file), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (MOJIBAKE.test(line)) garbled.push(`${file}:${i + 1}`);
  });
}
if (garbled.length) {
  failed = true;
  console.log(`FAIL  ${garbled.length} lines carry mis-decoded punctuation`);
  for (const g of garbled.slice(0, 8)) console.log(`        ${g}`);
} else {
  console.log('ok    no mis-decoded punctuation');
}

/* ---- Soft measures ------------------------------------------------------- */
const words = titles.map((t) => t.text.split(' ').length).sort((a, b) => a - b);
const median = words[Math.floor(words.length / 2)];
const withNumber = titles.filter((t) => /\d/.test(t.text)).length;
const share = withNumber / titles.length;

console.log(
  `\ntitle length   median ${median} words, range ${words[0]} to ${words[words.length - 1]}  (baseline ${TITLE_MEDIAN})`,
);
console.log(
  `carrying a number  ${withNumber} of ${titles.length}, ${Math.round(share * 100)}%  (baseline ${Math.round(NUMBER_SHARE * 100)}%)`,
);
if (share < 0.65) {
  console.log('      below 65%: adjectives are probably standing where figures were available');
}

/* Table craft. The two things that separate a working text matrix from a grid
   of text, both of them invisible to a geometry pass:

   A value lane that is not set as one. A column of figures reads down the page
   only if it is right-aligned on tabular figures, and a numeric column left in
   the prose treatment costs the reader the one thing a table is for.

   More than one marked row. The mark says "this is the row the title is about".
   Two marks say nothing, and they spend a page's single accent twice. */
const matrices = [];
for (const file of files) {
  const src = readFileSync(join(dir, file), 'utf8');
  let i = 0;
  while (true) {
    const open = src.indexOf('<div class="s-matrix', i);
    if (open < 0) break;
    let j = src.indexOf('>', open) + 1;
    let depth = 1;
    while (depth > 0 && j < src.length) {
      const o = src.indexOf('<div', j);
      const c = src.indexOf('</div>', j);
      if (c < 0) break;
      if (o >= 0 && o < c) { depth++; j = o + 4; } else { depth--; j = c + 6; }
    }
    matrices.push({ file, html: src.slice(open, j) });
    i = j;
  }
}

const NUMERIC = new RegExp(String.raw`^[~<>+-]?[$]?\d[\d,.–—-]*\s*(%|x|bn|mm|M|B|K|bps|days?|yrs?)?`);
const craft = [];
for (const m of matrices) {
  const rows = [...m.html.matchAll(/<div class="s-matrix__row([^"]*)">([\s\S]*?)<\/div>/g)];
  const marks = rows.filter((r) => r[1].includes('mark')).length;
  if (marks > 1) craft.push(`${m.file}: a matrix carries ${marks} marked rows`);

  const body = rows.filter((r) => !r[1].includes('head'));
  if (body.length < 2) continue;
  const grid = body.map((r) =>
    [...r[2].matchAll(/<p class="s-matrix__cell([^"]*)">([\s\S]*?)<\/p>/g)].map((c) => ({
      cls: c[1],
      text: c[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    })),
  );
  const cols = Math.min(...grid.map((r) => r.length));
  for (let c = 1; c < cols; c++) {
    const cells = grid.map((r) => r[c]);
    // A value lane is short as well as numeric. "+$97mm; a 12.5% 2027E
    // margin" opens with a figure and is a sentence; "$44.0M ACV" is a value.
    const numeric = cells.filter((x) => x.text.length <= 26 && NUMERIC.test(x.text)).length;
    const tagged = cells.filter((x) => x.cls.includes('--num')).length;
    if (numeric / cells.length >= 0.7 && tagged === 0) {
      craft.push(
        `${m.file}: column ${c + 1} is ${numeric} of ${cells.length} figures and is not set as a value lane`,
      );
    }
  }
}
if (craft.length) {
  console.log(`\nwarn  ${craft.length} table craft issue(s)`);
  for (const c of craft) console.log(`        ${c}`);
} else {
  console.log('\nok    every value lane is set as one, and no matrix carries two marks');
}

/* The form census. The first cut of this deck came back 34 ledgers deep with
   one chart in it, and nothing in the build objected, because every page was
   individually defensible. The share is the thing to look at, and the
   208-slide reference corpus puts it at roughly 47% chart, 18% table. A deck
   whose table share runs past about a third is defaulting. */
const FORMS = [
  ['chart', /<(Bars|Columns|Trend|Stack|Scatter|Spread|Slope|Bridge|Timeline|RangeDot|SmallMultiples|Phases|Map)\b/g],
  ['diagram', /<(DriverChain|Layers)\b|class="s-flow"/g],
  ['panels', /<(Panels)\b/g],
  ['list', /class="s-dense\b|class="s-list\b/g],
  ['table', /<(Table)\b|class="s-matrix\b/g],
];
const census = {};
for (const file of files) {
  const src = readFileSync(join(dir, file), 'utf8');
  for (const [name, re] of FORMS) {
    census[name] = (census[name] ?? 0) + (src.match(re) ?? []).length;
  }
}
const forms = Object.values(census).reduce((a, b) => a + b, 0);
console.log(
  '\nexhibit forms  ' +
    Object.entries(census)
      .map(([k, v]) => `${k} ${v} (${Math.round((v / forms) * 100)}%)`)
      .join(', '),
);
if (census.table / forms > 0.34) {
  console.log(
    [
      '      tables are over a third of the forms. The corpus runs 18%, so open every one',
      '      and say what kind of table it is: a genuine matrix asks the same questions of',
      '      every row, and anything else has a better form. A diligence readout sits above',
      '      the market-study baseline honestly; three times it is a default.',
    ].join(String.fromCharCode(10)),
  );
}

/* The sub-head test from the voice register: read the heads down the page,
   ignoring every body. A list of conclusions means verdict labels; a list of
   topics or measurements is right. No regex decides this, so the check prints.

   The first version of this test looked only for "The X is Y", and reading the
   real list found shapes it could not see: bare-subject pronouncements ("PM is
   the genuine sticky tier"), reversals ("Coordination, not a cornered
   resource") and teasers ("ADG is positioned for it"). The shapes below are
   what that reading turned up. They are advisory, and the full list is still
   the real test: run with --leads. */
const SHAPES = [
  [/^The .{3,40}\b(is|are|was|were)\b/, 'the-x-is-y'],
  [/,\s+(not|never)\s/, 'reversal'],
  [/\b(it|this|that|them|one|both|either)\.?$/i, 'teaser pronoun'],
];
const flagged = leads
  .map((l) => ({ ...l, shape: SHAPES.find(([re]) => re.test(l.text))?.[1] }))
  .filter((l) => l.shape);

console.log(`\n${leads.length} sub-heads, ${flagged.length} of a verdict shape`);
if (flagged.length) {
  console.log('      read these as a list; if they are conclusions they are verdict labels:');
  for (const v of flagged.slice(0, 12)) console.log(`        ${v.shape.padEnd(14)} ${v.text}`);
  if (flagged.length > 12) console.log(`        ... and ${flagged.length - 12} more, --leads for all`);
}

/* A sub-head that restates the opening of its own body costs a line and says
   nothing. Two voice passes over this deck produced that defect both times, so
   it is worth measuring rather than remembering. Only near-verbatim repeats
   count: a lead that names the finding and a body that extends it share words
   by design, and flagging those buries the real ones. */
const bag = (t) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9 $%.-]/g, '')
    .split(' ')
    .filter((w) => w.length > 3);
const echoes = leads.filter((l) => {
  const lead = bag(l.text);
  if (lead.length < 3) return false;
  const head = bag(l.body).slice(0, lead.length + 6);
  return lead.filter((w) => head.includes(w)).length / lead.length >= 0.9;
});
console.log(`${echoes.length} sub-heads restate the opening of their own body`);
for (const e of echoes.slice(0, 8)) console.log(`        ${e.file}  ${e.text}`);

if (process.argv.includes('--leads')) {
  console.log('\nevery sub-head, in deck order:');
  leads.forEach((l, i) =>
    console.log(`  ${String(i + 1).padStart(3)}  ${l.file.slice(0, 3)}  ${l.text}`),
  );
}

process.exitCode = failed ? 1 : 0;
