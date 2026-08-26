import { describe, it, expect } from 'vitest';
import { classifyDeck, population, deckOf, pageOf } from '../research-kit/census/corpus.mjs';

describe('corpus split', () => {
  it('classifies known client deliverables', () => {
    expect(classifyDeck('bcg-example-20201001-vixxo-scm-vshare-bcg')).toBe('client');
    expect(classifyDeck('project-drive-market-study-final-report-08-06-2024')).toBe('client');
    expect(classifyDeck('american-express-investor-day-2024')).toBe('client');
  });

  it('classifies known published research', () => {
    expect(classifyDeck('e-conomy-sea-2022-report')).toBe('published');
    expect(classifyDeck('mckinsey-future-of-trash')).toBe('published');
    expect(classifyDeck('bain-altagamma-luxury-study-2024')).toBe('published');
  });

  it('leaves ambiguous decks unplaced rather than guessing', () => {
    expect(classifyDeck('bcg-theendofmanagement')).toBe('unplaced');
    expect(classifyDeck('birgit-biemans')).toBe('unplaced');
  });

  it('client wins when a deck matches both patterns', () => {
    // "market study" reads published, but this is a client deliverable.
    expect(classifyDeck('parthenon-pexco-medica-market-study-dec-2016')).toBe('client');
  });

  it('strict is published only; broad is everything not client', () => {
    expect(population('e-conomy-sea-2022-report', 'strict')).toBe(true);
    expect(population('bcg-theendofmanagement', 'strict')).toBe(false);
    expect(population('bcg-theendofmanagement', 'broad')).toBe(true);
    expect(population('american-express-investor-day-2024', 'broad')).toBe(false);
  });

  it('parses tag keys', () => {
    expect(deckOf('e-conomy-sea-2022-report::20')).toBe('e-conomy-sea-2022-report');
    expect(pageOf('e-conomy-sea-2022-report::20')).toBe(20);
  });
});
