import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/pages/index.astro', 'utf8');

describe('the briefs index', () => {
  // Each assertion is tied to the construct that does the work, not to a
  // substring that could survive the behaviour being removed.
  it('shows only published briefs', () => {
    // the predicate has to be applied, not merely present: a filter computed
    // and never called leaves the literal text in the file
    expect(page).toMatch(/\.filter\([^)]*published\s*!==?\s*null[^)]*\)/);
  });

  it('sorts newest first', () => {
    // direction matters; a bare .sort( passes an oldest-first comparator
    expect(page).toMatch(/\.sort\(\s*\(a,\s*b\)\s*=>\s*b\.data\.published!?\.getTime\(\)\s*-\s*a\.data\.published!?\.getTime\(\)/);
  });

  it('is a single column, not a card grid', () => {
    // forbidding only repeat() lets a literal three-column grid through, which
    // is the exact failure the one-brief-or-thirty constraint names
    const listRule = page.match(/\.list\s*\{[^}]*\}/)?.[0] ?? '';
    expect(listRule).not.toMatch(/grid-template-columns|column-count/);
  });

  it('says plainly when nothing is published rather than showing an empty page', () => {
    // an orphaned .empty CSS rule satisfies a bare substring check while the
    // branch that renders the message is gone
    expect(page).toMatch(/briefs\.length\s*===\s*0[\s\S]{0,300}Nothing is published yet/);
  });
});
