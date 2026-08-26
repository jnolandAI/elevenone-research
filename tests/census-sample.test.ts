import { describe, it, expect } from 'vitest';
import { stratify } from '../research-kit/census/sample-pages.mjs';

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
});
