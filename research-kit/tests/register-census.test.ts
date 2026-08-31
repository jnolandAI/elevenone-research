import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NOLAND, announceSkip, assertUsable } from './noland-repo';

/**
 * The audit had never read a word of body prose.
 *
 * `noland-advisory-voice` carries a catalogue of seven constructions that mark
 * a deck as generated. Until 2026-08-30 this script gated four TITLE shapes
 * and advised on three sub-head shapes, and everything the catalogue names in
 * body copy was counted nowhere at all, on a population the script was already
 * extracting and then discarding.
 *
 * That is why the residue survived. The 2026-08-25 review hand-counted roughly
 * 20 "rather than" and 17 "carry" on Project Argo and wrote the numbers into
 * the skill; nothing re-measured them for five days, because nothing could.
 *
 * The census is deliberately not a verdict-label detector, and it is
 * deliberately two needles rather than four. The skill already establishes
 * from a measurement that no regex can catch a verdict label: a pattern wide
 * enough to catch "PM is the genuine sticky tier" also catches "927 VDR files
 * remain triage-deferred", which is the sub-head that is working. Two further
 * needles were built and cut on the same standard; the second block below is
 * what stops them being added back.
 */

const run = (dir: string) =>
  execFileSync('node', ['research-kit/scripts/audit.mjs', '--profile', 'deliverable', dir], {
    encoding: 'utf8',
  });

/**
 * Only the census. "carrying a number  53 of 69" sits above it in the same
 * output and contains "carry" as a substring, which is enough on its own to
 * fool a whole-output search into reading 53 as a count.
 */
const census = (out: string) => out.slice(out.indexOf('register census'));

const inDir = (body: string, fn: (dir: string) => string) => {
  const d = mkdtempSync(join(tmpdir(), 'register-'));
  writeFileSync(join(d, 'fixture.astro'), body, 'utf8');
  try {
    return fn(d);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
};

const finding = (text: string) => `<Finding label="Finding">${text}</Finding>`;
const REFLEX = 'The gap is commercial rather than operational.';
const PLAIN = 'Service accounts for 31% of gross profit.';

describe('the register census, on fixtures', () => {
  it('reads a construction out of a finding body, which no check read before', () => {
    expect(census(inDir(finding(REFLEX), run))).toContain('rather than');
  });

  it('reads a deck carrying none of them as clean', () => {
    expect(census(inDir(finding(PLAIN), run))).toMatch(/ok\s+no catalogued construction/);
  });

  it('never counts a comment, where a third of Argo instances live', () => {
    // 13 of Argo's 25 source-level "rather than" instances are inside /* */
    // blocks explaining why a page uses the form it does. That is engineering
    // prose about the deck, not the deck's voice, and a census that counted it
    // would be measuring how the components are documented.
    const out = inDir(
      `/* This page is a panel rather than a matrix rather than a table. */\n${finding(PLAIN)}`,
      run,
    );
    expect(census(out)).toMatch(/ok\s+no catalogued construction/);
  });

  it('allows one instance and warns on a recurring frame, at any deck length', () => {
    // The rule the budget mechanises, from the catalogue: "One of these per
    // deck might be load-bearing; as a recurring frame it is the tell." The
    // budget is an absolute count and not a rate, so padding a deck out does
    // not buy a second instance.
    const padding = Array.from({ length: 40 }, (_, i) =>
      finding(`Service accounts for ${i}% of gross profit.`),
    );
    const one = inDir([finding(REFLEX), ...padding].join('\n'), run);
    expect(census(one)).toMatch(/ok\s+no catalogued construction/);

    const many = inDir([finding(REFLEX), finding(REFLEX), ...padding].join('\n'), run);
    expect(census(many)).toContain('over the budget');
  });

  it('does not fail the run, because the corpus it reads is kept dirty on purpose', () => {
    // Project Argo is the only deck never voice-rewritten, which makes it the
    // only fixture that can prove this census fires. Hard-failing on it would
    // put `npm run audit` permanently red for a deck that will not ship, which
    // is the firm-overview mistake. The hard gate is the pin below.
    expect(() => inDir([finding(REFLEX), finding(REFLEX)].join('\n'), run)).not.toThrow();
  });

  it('prints every hit in context under --register, because a count is not actionable', () => {
    const out = inDir(finding(REFLEX), (d) =>
      execFileSync(
        'node',
        ['research-kit/scripts/audit.mjs', '--profile', 'deliverable', '--register', d],
        { encoding: 'utf8' },
      ),
    );
    expect(out).toContain('every catalogued construction, in context');
    expect(out).toContain('commercial rather than operational');
  });
});

/**
 * The two needles that were built, measured against Argo and cut. This is the
 * record, because re-adding them is the obvious move for anyone who reads the
 * catalogue and counts the entries.
 */
describe('the needles that did not survive the corpus', () => {
  it('does not count "named", which on this corpus is a term of art', () => {
    // 9 hits on Argo, 8 of them the ordinary sense: "named accounts", "named
    // account executives", "Named Lennar opportunities", and "Moody's named
    // the roll-up", which is just the verb. A needle that is wrong eight times
    // in nine teaches the reader to skip the census.
    const out = inDir(finding('PM runs 40-100% wallet share at named accounts.'), run);
    expect(census(out)).toMatch(/ok\s+no catalogued construction/);
  });

  it('does not count the reversal in body copy, where it is usually load-bearing', () => {
    // 27 hits on Argo, most of them real precision in a matrix cell: "held to
    // direction, not levels". It is already gated where the catalogue puts it,
    // in SHAPES, which reads sub-heads. Gating it twice fires on the wrong
    // population.
    const out = inDir(finding('Signals are held to direction, not levels.'), run);
    expect(census(out)).toMatch(/ok\s+no catalogued construction/);
  });
});

/**
 * Project Argo's residue, pinned. Over the pin is new debt and fails; under it
 * is a stale pin whose number should come down, and also fails. Exactly the
 * pin is the only way to pass. The idiom is `raw-markup.test.ts`'s EXEMPT, for
 * the same reason: an unpinned known-bad corpus goes unpoliced forever.
 *
 * Argo is not to be rewritten. It will not ship, and rewriting its prose
 * deletes the only corpus that can prove any of this fires.
 */
const ARGO_PIN: Record<string, number> = {
  'rather than': 10,
  '"carry" as': 7,
};

describe.skipIf(!NOLAND.repo)('the register census, on the real decks', () => {
  announceSkip('register-census.test.ts', 'the pinned Argo residue and the clean sample');
  const repo = NOLAND.repo!;
  const argo = join(repo, 'src', 'components', 'argo');
  const cd = join(repo, 'src', 'pages', 'commercial-diligence.astro');
  assertUsable([argo, cd]);

  it('reads Project Argo at exactly its pinned counts', () => {
    const out = census(run(argo));
    for (const [needle, pinned] of Object.entries(ARGO_PIN)) {
      const line = out.split('\n').find((l) => l.includes(needle));
      expect(line, `the census printed no line for ${needle}`).toBeDefined();
      const read = Number(/\s(\d+)\s/.exec(line!)?.[1]);
      expect(read, `${needle}: pinned ${pinned}, census read ${read}`).toBe(pinned);
    }
  });

  it('reads the rewritten commercial-diligence deck as clean', () => {
    // The one sample John accepted after a rewrite against the catalogue, on
    // 2026-08-25 ("the voice is much better"). If the census cannot tell it
    // apart from Argo, the census is measuring nothing. It reads 2,054 words
    // and zero hits, against Argo's 12,908 words and seventeen.
    const d = mkdtempSync(join(tmpdir(), 'register-cd-'));
    copyFileSync(cd, join(d, 'commercial-diligence.astro'));
    const out = run(d);
    rmSync(d, { recursive: true, force: true });
    expect(census(out)).toMatch(/ok\s+no catalogued construction/);
  });
});
