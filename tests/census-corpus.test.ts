import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeClassifier, deckOf, pageOf, loadPatterns } from '../research-kit/census/corpus.mjs';

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
    expect(classifyDeck('untitled-deck-2019')).toBe('unplaced');
    expect(classifyDeck('speaker-name-2018')).toBe('unplaced');
  });

  it('client wins when a deck matches both patterns', () => {
    // "market study" reads published, but the client pattern is more specific.
    expect(classifyDeck('alpha-corp-market-study-dec-2016')).toBe('client');
  });

  it('strict is published only; broad is everything not client', () => {
    expect(population('sector-outlook-2022', 'strict')).toBe(true);
    expect(population('untitled-deck-2019', 'strict')).toBe(false);
    expect(population('untitled-deck-2019', 'broad')).toBe(true);
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

describe('loadPatterns', () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('reads the client and published arrays from census-classification.json', () => {
    dir = mkdtempSync(join(tmpdir(), 'census-corpus-'));
    writeFileSync(
      join(dir, 'census-classification.json'),
      JSON.stringify({ client: ['alpha-corp'], published: ['report', 'study'] })
    );

    expect(loadPatterns(dir)).toEqual({ client: ['alpha-corp'], published: ['report', 'study'] });
  });

  it('throws when client is not an array', () => {
    dir = mkdtempSync(join(tmpdir(), 'census-corpus-'));
    writeFileSync(
      join(dir, 'census-classification.json'),
      JSON.stringify({ client: 'alpha-corp', published: ['report', 'study'] })
    );

    expect(() => loadPatterns(dir)).toThrow(
      'census-classification.json needs client and published arrays'
    );
  });
});
