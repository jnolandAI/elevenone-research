import { describe, it, expect } from 'vitest';
import { makeClassifier, deckOf, pageOf } from '../research-kit/census/corpus.mjs';

/* Synthetic patterns of the same shape as the real ones. The real patterns name
   client engagements and live with the corpus, outside this repository. */
const PATTERNS = {
  client: ['alpha-corp', 'steering-committee', 'deep-dive'],
  published: ['report', 'study', 'outlook'],
};

const { classifyDeck, population } = makeClassifier(PATTERNS);

describe('corpus split', () => {
  it('classifies client deliverables', () => {
    expect(classifyDeck('firm-alpha-corp-scm-vshare')).toBe('client');
    expect(classifyDeck('2020-steering-committee-readout')).toBe('client');
    expect(classifyDeck('101030-adjacency-deep-dive')).toBe('client');
  });

  it('classifies published research', () => {
    expect(classifyDeck('sector-outlook-2022')).toBe('published');
    expect(classifyDeck('annual-report-2021')).toBe('published');
    expect(classifyDeck('consumer-study-2024')).toBe('published');
  });

  it('leaves ambiguous decks unplaced rather than guessing', () => {
    expect(classifyDeck('theendofmanagement')).toBe('unplaced');
    expect(classifyDeck('speaker-name-2018')).toBe('unplaced');
  });

  it('client wins when a deck matches both patterns', () => {
    // "market study" reads published, but the client pattern is more specific.
    expect(classifyDeck('alpha-corp-market-study-dec-2016')).toBe('client');
  });

  it('strict is published only; broad is everything not client', () => {
    expect(population('sector-outlook-2022', 'strict')).toBe(true);
    expect(population('theendofmanagement', 'strict')).toBe(false);
    expect(population('theendofmanagement', 'broad')).toBe(true);
    expect(population('firm-alpha-corp-scm-vshare', 'broad')).toBe(false);
  });

  it('rejects an unknown population name', () => {
    expect(() => population('sector-outlook-2022', 'loose')).toThrow(/unknown population/);
  });

  it('parses tag keys', () => {
    expect(deckOf('sector-outlook-2022::20')).toBe('sector-outlook-2022');
    expect(pageOf('sector-outlook-2022::20')).toBe(20);
  });
});
