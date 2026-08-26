import { describe, it, expect } from 'vitest';
import { stratify, spreadDecks } from '../research-kit/census/sample-pages.mjs';

const e = (deck: string, page: number, visual: string) =>
  ({ deck, page, roles: ['Content'], visual: [visual] });

describe('stratify', () => {
  it('takes up to perStratum pages from each visual type', () => {
    const entries = [
      e('a', 1, 'Chart'), e('a', 2, 'Chart'), e('a', 3, 'Chart'),
      e('b', 1, 'Table'), e('b', 2, 'Table'),
    ];
    const out = stratify(entries, 2);
    expect(out.filter((x) => x.stratum === 'Chart')).toHaveLength(2);
    expect(out.filter((x) => x.stratum === 'Table')).toHaveLength(2);
  });

  it('spreads across decks before repeating one', () => {
    const entries = [
      e('a', 1, 'Chart'), e('a', 2, 'Chart'), e('a', 3, 'Chart'), e('b', 9, 'Chart'),
    ];
    const decks = stratify(entries, 2).map((x) => x.deck);
    expect(new Set(decks).size).toBe(2);
  });

  it('excludes furniture pages', () => {
    const entries = [
      { deck: 'a', page: 1, roles: ['Section Divider'], visual: ['Image-heavy'] },
      { deck: 'a', page: 2, roles: ['Content'], visual: ['Image-heavy'] },
    ];
    expect(stratify(entries, 5)).toHaveLength(1);
  });

  it('is deterministic across runs', () => {
    const entries = [e('a', 1, 'Chart'), e('b', 2, 'Chart'), e('c', 3, 'Chart')];
    expect(stratify(entries, 2)).toEqual(stratify(entries, 2));
  });

  it('reaches decks past the quota instead of stopping at the first few', () => {
    // Eleven decks, five slots. A sampler that walks the sorted list from the
    // start and stops at the cap never sees deck k, however many pages it
    // holds. Here k holds 100 of the stratum's 110 pages.
    const entries = [];
    for (const d of 'abcdefghij') entries.push(e(d, 1, 'Chart'));
    for (let i = 1; i <= 100; i++) entries.push(e('k', i, 'Chart'));
    const decks = stratify(entries, 5).map((x) => x.deck);
    expect(decks).toContain('k');
    expect(new Set(decks).size).toBe(5);
  });

  it('groups pages with no visual tag under Untagged', () => {
    // 17% of the real sample lands here, so this branch is load-bearing.
    const untagged = { deck: 'a', page: 4, roles: ['Content'], visual: [] };
    expect(stratify([untagged], 2)).toEqual([{ deck: 'a', page: 4, stratum: 'Untagged' }]);
  });
});

describe('spreadDecks', () => {
  it('keeps every deck when there are no more than slots', () => {
    expect(spreadDecks(['a', 'b', 'c'], 5)).toEqual(['a', 'b', 'c']);
  });

  it('spans the list end to end when there are more decks than slots', () => {
    expect(spreadDecks('abcdefghijk'.split(''), 5)).toEqual(['a', 'd', 'f', 'i', 'k']);
  });

  it('never repeats a deck', () => {
    for (let n = 1; n <= 40; n++) {
      for (let slots = 1; slots <= 15; slots++) {
        const picked = spreadDecks(Array.from({ length: n }, (_, i) => String(i)), slots);
        expect(new Set(picked).size).toBe(picked.length);
      }
    }
  });
});
