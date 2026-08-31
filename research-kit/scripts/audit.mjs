import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { takeProfile } from '../profiles/load.mjs';

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
 *   node scripts/audit.mjs --profile <name> [dir]   default dir src/components/argo
 *     --leads      every sub-head in deck order, to be read as a list
 *     --register   every catalogued construction, with its sentence
 *
 * --profile is required and has no default. These constants were measured
 * from a client deliverable and were being applied to research pieces, where
 * they are wrong in the direction that matters: a research page carries fewer
 * words than a client page and its titles are three words shorter at the
 * median, so the deliverable numbers ask a research piece to be fuller and
 * wordier than the corpus it imitates. A gate that guesses says nothing about
 * having guessed, which is the failure this replaces.
 *
 * Exits non-zero on a hard failure (banned title construction, numbering that
 * repeats or skips). Soft measures print for judgement and never fail the run:
 * a median is a calibration, not a rule.
 */

let PROFILE;
let argv;
try {
  const taken = takeProfile(process.argv.slice(2));
  PROFILE = taken.profile;
  argv = taken.rest;
} catch (e) {
  console.error(`audit.mjs: ${e.message}`);
  process.exit(2);
}

const dir = argv.find((a) => !a.startsWith('--')) || 'src/components/argo';

/* Every calibration constant comes from the profile. research-kit/profiles/
   records what each one was measured from. */
const TITLE_MEDIAN = PROFILE.title.medianWords;
const NUMBER_SHARE = PROFILE.title.numberShare;
const NUMBER_FLOOR = PROFILE.title.numberShareFloor;
const TABLE_CEILING = PROFILE.forms.tableShareCeiling;
const FRAME_BUDGET = PROFILE.voice.framesPerDeck;

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

// A prop can be a plain string (title="...") or, when the corpus's own copy
// carries a computed value, a template literal (title={`... ${expr} ...`}).
// The word-count and number-share measures below need real text either way,
// so a template literal's ${expr} runs are collapsed to a single "0": one
// placeholder word, and one that (correctly) reads as carrying a number,
// since that is the entire reason the expression is there.
// A non-greedy [\s\S]*?> stops at the first '>' it sees, and an arrow
// function inside a prop's expression (cohorts.map((c) => c.n), a plain
// case once col/padLg/sourcePad and expression props existed together) has
// one long before the tag's own close. Excluding a '>' immediately preceded
// by '=' skips every arrow function's own '>' and finds the real one.
const PAGE_TAG_ALL = /<Page[\s\S]*?(?<!=)>/g;
const PAGE_TAG_ONE = /<Page[\s\S]*?(?<!=)>/;

// Shared by extractProp below and by the Comment/Annot items-array reader
// further down: collapses every ${expr} run in a template literal to a
// single '0', which keeps the word-count and number-share measures honest
// without evaluating the expression.
function collapseExpr(raw) {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const brace = raw.indexOf('${', i);
    if (brace === -1) {
      out += raw.slice(i);
      break;
    }
    out += raw.slice(i, brace);
    let depth = 1;
    let j = brace + 2;
    while (depth > 0 && j < raw.length) {
      if (raw[j] === '{') depth++;
      else if (raw[j] === '}') depth--;
      j++;
    }
    out += '0';
    i = j;
  }
  return out;
}

function extractProp(tagText, name) {
  const plain = new RegExp(`\\b${name}="([^"]*)"`).exec(tagText);
  if (plain) return plain[1];
  const tmplStart = tagText.indexOf(`${name}={\``);
  if (tmplStart === -1) return undefined;
  const bodyStart = tmplStart + `${name}={\``.length;
  const closeAt = tagText.indexOf('`}', bodyStart);
  if (closeAt === -1) return undefined;
  return collapseExpr(tagText.slice(bodyStart, closeAt));
}

// A backslash-escaped quote or backtick inside a JS string literal ('it\'s',
// `it\`s`) is the literal character once JS parses it; the census wants that
// character, not the escape.
const unescapeJs = (s) => s.replace(/\\(.)/g, '$1');

// Finding and Implication carry their prose as slot children rather than as a
// prop, and slot children can hold inline markup and {expr} interpolations.
// Neither is prose: a tag left in place splits the phrase the register census
// below is trying to match, and an expression is a value, so it collapses to
// the same '0' extractProp uses.
const slotText = (s) => s.replace(/<[^>]*>/g, '').replace(/\{[^{}]*\}/g, '0');

const titles = [];
const exhibits = [];
const leads = [];
const findings = [];
const sources = [];
let slides = 0;
let sourced = 0;
let fullPages = 0;

for (const file of files) {
  const src = readFileSync(join(dir, file), 'utf8');
  sources.push(src);

  // Any class list containing s-title, not the bare attribute. The exact-match
  // form silently skipped every title carrying a spacing modifier alongside it,
  // which on the first piece rendered outside Argo was 7 of 12: the gate
  // reported five titles on a twelve-page deck and computed its length and
  // number-share statistics from that biased subset without saying so.
  for (const m of src.matchAll(/<h2 class="[^"]*\bs-title\b[^"]*">([\s\S]*?)<\/h2>/g)) {
    titles.push({ file, text: strip(m[1]) });
  }
  // A page composed with <Page> carries its title as a prop, not as a literal
  // <h2>, so the census above cannot see it: it undercounted every migrated
  // page's title (and, below, its source line) until this matched the tag
  // itself. Non-greedy up to the tag's own closing '>', since Page's props
  // are plain strings that hold no '>' of their own.
  for (const m of src.matchAll(PAGE_TAG_ALL)) {
    const t = extractProp(m[0], 'title');
    if (t !== undefined) titles.push({ file, text: strip(t) });
  }
  for (const m of src.matchAll(/Exhibit (\d+)&ensp;/g)) {
    exhibits.push({ file, n: Number(m[1]) });
  }
  const leadBody =
    /class="s-(annot|comment)__lead">([\s\S]*?)<\/p>\s*<p class="s-\1__body">([\s\S]*?)<\/p>/g;
  for (const m of src.matchAll(leadBody)) {
    leads.push({ file, text: strip(m[2]), body: strip(m[3]) });
  }
  // A page composed with <Comment> or <Annot> carries its lead/body pairs as
  // items={[{ lead: '...', body: '...' }, ...]}, not as literal
  // <p class="s-*__lead"> markup: Comment renders a Fragment with no root
  // element at all, and Annot's items are JS data assembled at the call
  // site. The census above cannot see either, so it undercounted every
  // migrated rail and annotation block until this matched the array literal
  // too. Bracket-depth scanning, not a regex to the closing ']}', because an
  // item's own body can carry a literal '[' (cohorts[5]!.median).
  const itemsTag = /<(?:Comment|Annot)\b[\s\S]*?\bitems=\{\[/g;
  const itemFields =
    /lead:\s*(?:'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`)\s*,\s*body:\s*(?:'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`)/g;
  for (const tag of src.matchAll(itemsTag)) {
    const arrStart = tag.index + tag[0].length;
    let depth = 1;
    let k = arrStart;
    while (depth > 0 && k < src.length) {
      if (src[k] === '[') depth++;
      else if (src[k] === ']') depth--;
      k++;
    }
    const arr = src.slice(arrStart, k - 1);
    for (const m of arr.matchAll(itemFields)) {
      const leadRaw = m[1] ?? m[2];
      const bodyRaw = m[3] ?? m[4];
      leads.push({
        file,
        text: strip(unescapeJs(collapseExpr(leadRaw))),
        body: strip(unescapeJs(collapseExpr(bodyRaw))),
      });
    }
  }

  // A labelled conclusion carries its prose between its tags, not in a prop:
  // <Finding label="Verdict">the text</Finding>. 40 such blocks on Argo, and
  // until the register census below nothing read one. Non-greedy to the tag's
  // own '>', excluding a '>' preceded by '=' so an arrow function inside a
  // prop does not end the tag early, the same hazard PAGE_TAG_ALL documents.
  for (const m of src.matchAll(/<(Finding|Implication)\b[\s\S]*?(?<!=)>([\s\S]*?)<\/\1>/g)) {
    findings.push({ file, text: strip(slotText(m[2])) });
  }

  // A slide is sourced if a source line appears between its own <Slide> and
  // the next one. Full-bleed covers and dividers are exempt.
  for (const block of src.split('<Slide ').slice(1)) {
    if (block.includes('full>')) {
      fullPages++;
      continue;
    }
    slides++;
    const pageTag = PAGE_TAG_ONE.exec(block);
    const sourcedByPage = pageTag && extractProp(pageTag[0], 'source') !== undefined;
    if (block.includes('class="s-source"') || sourcedByPage) sourced++;
  }
}

let failed = false;
const fail = (msg) => {
  failed = true;
  console.log(`FAIL  ${msg}`);
};

console.log(
  `${files.length} files, ${titles.length} titles, ${exhibits.length} exhibits, ` +
    `${slides} working pages  [profile: ${PROFILE.name}]\n`,
);

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

/* ---- Page budget ---------------------------------------------------------
   Only when the profile declares one. The deliverable profile does not: the
   reference deliverable runs 167 pages and Argo runs 81, so a budget wide
   enough for both would not be a check. Covers and dividers count, because a
   page budget is a property of the document a reader holds. */
if (PROFILE.pages) {
  const total = slides + fullPages;
  const { min, max } = PROFILE.pages;
  if (total < min || total > max) {
    console.log(`\nwarn  ${total} pages, outside the ${PROFILE.name} budget of ${min} to ${max}`);
  } else {
    console.log(`\nok    ${total} pages, inside the ${PROFILE.name} budget of ${min} to ${max}`);
  }
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
if (share < NUMBER_FLOOR) {
  console.log(
    `      below ${Math.round(NUMBER_FLOOR * 100)}%: adjectives are probably standing where figures were available`,
  );
}

/* Table craft. The two things that separate a working text matrix from a grid
   of text, both of them invisible to a geometry pass:

   A value lane that is not set as one. A column of figures reads down the page
   only if it is right-aligned on tabular figures, and a numeric column left in
   the prose treatment costs the reader the one thing a table is for.

   More than one marked row. The mark says "this is the row the title is about".
   Two marks say nothing, and they spend a page's single accent twice.

   Both readings need the rendered row and cell markup, so this only reaches a
   matrix a page still writes by hand. A `<Matrix>` call carries its rows as a
   frontmatter array of records, and no source scan can read a prop. Both
   readings therefore also live in the component: `Matrix.astro` throws on a
   second mark and on an unset value lane at render (`assertOneMark` and
   `assertValueLanes` in lib/exhibits.ts, the latter mirroring the heuristic
   below verbatim). The count of matrices this pass hands off to the
   component is still printed rather than left implied. */
const matrices = [];
let componentised = 0;
for (const file of files) {
  const src = readFileSync(join(dir, file), 'utf8');
  componentised += (src.match(/<Matrix\b/g) ?? []).length;
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
const scope =
  ` (${matrices.length} hand-written matrix/matrices read` +
  (componentised
    ? `; ${componentised} <Matrix> call(s) carry their rows as props, where the component enforces both the mark budget and the value lane at render)`
    : ')');
if (craft.length) {
  console.log(`\nwarn  ${craft.length} table craft issue(s)${scope}`);
  for (const c of craft) console.log(`        ${c}`);
} else {
  console.log(`\nok    every value lane is set as one, and no matrix carries two marks${scope}`);
}

/* The form census. The first cut of this deck came back 34 ledgers deep with
   one chart in it, and nothing in the build objected, because every page was
   individually defensible. The share is the thing to look at, and the
   208-slide reference corpus puts it at roughly 47% chart, 18% table. A deck
   whose table share runs past about a third is defaulting. */
/* Every row matches BOTH forms an exhibit can take in source: the component
   call that writes it, and the root class of a page that still writes it by
   hand. This census reads `.astro` SOURCE and never renders, so a class
   needle alone cannot see a componentised exhibit: `<Matrix>` emits
   `class="s-matrix"` at render time, and that string is nowhere in the file
   this script opens. On 2026-08-28 the page-form migration turned 23 hand-
   written matrices into `<Matrix>` calls and 9 `s-dense` ledgers into
   `<Dense>` calls; the census lost 32 of 72 forms, every printed share was
   computed on the broken denominator, and the table-share warning stopped
   firing on a deck that had not changed. It printed a number the whole time.
   The rule: when a construct gets a component, its row gets the name too, and
   the class stays for whatever is still hand-written. Never swap one for the
   other. Both can never double-count the same exhibit, because a page writes
   one form or the other, never both.

   `chart` is the one row with no class needle, and deliberately: every chart
   is an inline `<svg class="fig">`, a class the corpus also uses for a plain
   `<figure>` wrapper (each repo's own `Figure.astro`), so a class needle there
   would count furniture as exhibits. Charts are only ever written as
   components, so the names are the whole surface. */
const FORMS = [
  ['chart', /<(Bars|Columns|Trend|Stack|Scatter|Spread|Slope|Bridge|Timeline|RangeDot|SmallMultiples|Phases|Map|Distribution)\b/g],
  ['diagram', /<(DriverChain|Layers)\b|class="s-flow"|class="s-layers\b/g],
  ['panels', /<(Panels)\b|class="s-panels\b/g],
  ['list', /<(Dense)\b|class="s-dense\b|class="s-list\b/g],
  ['table', /<(Table|Matrix)\b|class="s-matrix\b|class="tbl\b/g],
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
if (census.table / forms > TABLE_CEILING) {
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

/* ---- The register census -------------------------------------------------
   Everything above this line reads titles. `noland-advisory-voice` carries a
   catalogue of seven constructions that mark a deck as generated, and until
   2026-08-30 this script gated four TITLE shapes and advised on three
   sub-head shapes. The catalogue's body-copy entries were counted nowhere at
   all, on a population of sub-heads and findings the script was already
   extracting and then discarding after the echo check.

   That is why the residue survived a rewrite and five days: the 2026-08-25
   review hand-counted roughly 20 "rather than" and 17 "carry" on Project
   Argo, wrote the numbers into the skill, and nothing could re-measure them.

   These four are the catalogue entries a machine can see. The verdict label
   is deliberately not among them, and never will be: the skill establishes
   from a measurement that a pattern wide enough to catch "PM is the genuine
   sticky tier" also catches "927 VDR files remain triage-deferred", which is
   the sub-head that is working. The reading pass above is for that one; this
   census is for the ones a regex gets right, so the reading pass is not spent
   on them.

   The budget is an absolute count per deck, not a rate, and it comes from the
   rule rather than from a measurement: "one of these per deck might be
   load-bearing; as a recurring frame it is the tell." A rate would need a
   text corpus and there is none — ExampleSlides is images — so the only
   calibration available would be a single approved deck, which is the
   one-deck mistake the 2026-08-29 re-baselining retired. The rate per 100
   blocks still prints, as information about deck length, and decides nothing.

   Soft, like the table share. The corpus this runs on is kept dirty on
   purpose: Argo is the only deck never voice-rewritten, which makes it the
   only fixture that can prove the census fires, and hard-failing on it would
   put `npm run audit` permanently red for a deck that will not ship. The hard
   gate is the pinned count in research-kit/tests/register-census.test.ts. */
const REGISTER = [
  [/\brather than\b/gi, 'the "X rather than Y" reflex'],
  [/\b(?:carry|carries|carrying|carried)\b/gi, '"carry" as the verb of consequence'],
];

/* Two more needles were built, measured against Argo, and cut. Recorded here
   because the obvious move for the next person is to add them back.

   `\bnamed\b` for the catalogue's "named as an intensifier" read 9 hits, and
   8 of them are the ordinary sense: "named accounts", "named account
   executives", "Named Lennar opportunities" — the term of art in this deck's
   own industry — plus "Moody's named the roll-up", which is just the verb.
   One needle in nine is the tell, and a needle that is wrong eight times out
   of nine teaches the reader to skip the census.

   `,\s(not|never)\s` for the reversal read 27 hits, and most are load-bearing
   precision in a matrix cell: "held to direction, not levels", "a
   balance-sheet vector, not an installer". It is also already gated where the
   catalogue actually puts it, in SHAPES above, which reads sub-heads: the
   catalogue's example, "Coordination, not a cornered resource", is a head. In
   body copy the same shape is usually the right compression. Gating it twice
   would fire on the wrong population.

   What is left is the pair a machine gets right. That is the whole claim. */

// The deck's copy, and only the deck's copy.
//
// Not an enumerated list of prose-carrying props. That is the shape that has
// failed here before: FORMS named its components by hand, the migration moved
// 32 exhibits into components it did not name, and the census silently
// stopped counting them while still printing plausible percentages. A needle
// that has to be told where to look stops looking wherever nobody updated it.
//
// So: strip the comments, then take every string literal and every text child.
// Over-inclusive by design — a class list is in there — which costs nothing,
// because these four needles are English phrases and no class list matches
// one. The denominator is words, not blocks, for the same reason: it stays
// meaningful when the population is not curated.
//
// Comments are stripped first and it is not a detail. Argo's component source
// carries 13 of its 25 "rather than" instances inside /* */ blocks explaining
// why a page uses the form it does. That is engineering prose about the deck,
// not the deck's voice, and counting it would measure how the components are
// documented. A line comment only counts as one at the start of a line, so a
// '//' inside a URL in a source line survives.
//
// This reads source, not the render. density.mjs reads innerText through a
// browser and would need no extractor at all, but it needs a dev server; this
// script's contract is that it runs anywhere with no browser, and that is
// worth more here than the last few percent of fidelity.
const CODE_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /^\s*\/\/.*$/gm;
const STRING_LITERAL = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/g;
const TEXT_CHILD = />([^<>{}]+)</g;

const copy = strip(
  sources
    .map((src) => {
      const bare = src.replace(CODE_COMMENT, ' ').replace(LINE_COMMENT, ' ');
      const parts = [];
      for (const m of bare.matchAll(STRING_LITERAL)) parts.push(unescapeJs(m[1] ?? m[2] ?? m[3]));
      for (const m of bare.matchAll(TEXT_CHILD)) parts.push(m[1]);
      return parts.join(' ');
    })
    .join(' '),
);
const copyWords = copy.split(' ').filter((w) => /[a-z]{3}/i.test(w)).length;

// A fresh regex per use. A shared global one carries lastIndex between calls,
// which silently under-counts every use after the first — the same defect the
// coverage guard's needles had.
const register = REGISTER.map(([re, name]) => ({
  name,
  count: (copy.match(new RegExp(re.source, re.flags)) || []).length,
}));
const over = register.filter((r) => r.count > FRAME_BUDGET);

console.log(`\nregister census  ${copyWords} words of deck copy read, comments excluded`);
for (const r of register.filter((r) => r.count)) {
  const per1k = ((r.count / copyWords) * 1000).toFixed(1);
  console.log(`      ${r.name.padEnd(36)} ${r.count}  (${per1k} per 1,000 words)`);
}
if (over.length) {
  console.log(
    `      ${over.length} of them run over the budget of ${FRAME_BUDGET} per deck. One instance\n` +
      '      can be load-bearing; a recurring frame is the tell. The replacement\n' +
      '      grammar for each is in noland-advisory-voice.',
  );
} else {
  console.log('ok    no catalogued construction runs over budget');
}

// A count is not actionable on its own: the writer has to see the sentence.
// --register prints every hit in its own context, the way --leads prints the
// full sub-head list for the reading test.
if (process.argv.includes('--register')) {
  console.log('\nevery catalogued construction, in context:');
  for (const [re, name] of REGISTER) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of copy.matchAll(g)) {
      const from = Math.max(0, m.index - 55);
      console.log(`  ${name}\n    ...${copy.slice(from, m.index + m[0].length + 55)}...`);
    }
  }
}

if (process.argv.includes('--leads')) {
  console.log('\nevery sub-head, in deck order:');
  leads.forEach((l, i) =>
    console.log(`  ${String(i + 1).padStart(3)}  ${l.file.slice(0, 3)}  ${l.text}`),
  );
}

process.exitCode = failed ? 1 : 0;
