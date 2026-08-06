import { describe, it, expect } from 'vitest';
import { weakest, capOf, WIRE, STANDING_ORDER } from '../src/lib/standing';
import type { Claim, Standing } from '../src/content.config';

const c = (id: string, standing: Standing): Claim => ({
  id,
  standing,
  text: 'x'.repeat(20),
  qualifier: 'n=1',
  restsOn: 'x'.repeat(20),
  assumes: 'x'.repeat(20),
  breaksIf: 'x'.repeat(20),
  note: null,
});

describe('the cap', () => {
  it('orders firm above supported above provisional', () => {
    expect(STANDING_ORDER.firm).toBeLessThan(STANDING_ORDER.supported);
    expect(STANDING_ORDER.supported).toBeLessThan(STANDING_ORDER.provisional);
  });

  it('returns firm only when every input is firm', () => {
    expect(weakest(['firm', 'firm', 'firm'])).toBe('firm');
  });

  it('caps at supported when one input is supported', () => {
    expect(weakest(['firm', 'firm', 'supported'])).toBe('supported');
  });

  it('caps at provisional when any input is provisional', () => {
    expect(weakest(['firm', 'supported', 'provisional'])).toBe('provisional');
  });

  it('names which claim did the capping', () => {
    const claims = [c('A', 'firm'), c('B', 'firm'), c('C', 'supported')];
    expect(capOf(claims, ['A', 'B', 'C'])).toEqual({ standing: 'supported', cappedBy: ['C'] });
  });

  it('names every claim tied at the weakest standing', () => {
    const claims = [c('A', 'firm'), c('B', 'supported'), c('C', 'supported')];
    expect(capOf(claims, ['A', 'B', 'C'])).toEqual({
      standing: 'supported',
      cappedBy: ['B', 'C'],
    });
  });

  it('ignores claims that are not on the load path', () => {
    // Claim D is provisional and deliberately off the path. It must not drag
    // the conclusion down, because nothing in the conclusion rests on it.
    const claims = [c('A', 'firm'), c('B', 'firm'), c('D', 'provisional')];
    expect(capOf(claims, ['A', 'B'])).toEqual({ standing: 'firm', cappedBy: ['A', 'B'] });
  });

  it('throws rather than guessing when a member does not resolve', () => {
    expect(() => capOf([c('A', 'firm')], ['A', 'Z'])).toThrow(/Z/);
  });

  it('throws on an empty load path rather than returning firm', () => {
    // Pinned to capOf's own message. A bare .toThrow() cannot tell capOf's
    // guard from weakest's, which would also throw on an empty array, so the
    // test would keep passing with capOf's guard deleted.
    expect(() => capOf([c('A', 'firm')], [])).toThrow(/no members/);
  });

  it('draws the thinnest wire for the claim holding the least', () => {
    expect(WIRE.firm.w).toBeGreaterThan(WIRE.supported.w);
    expect(WIRE.supported.w).toBeGreaterThan(WIRE.provisional.w);
  });
});
