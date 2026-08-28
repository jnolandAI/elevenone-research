import { describe, it, expect } from 'vitest';
import { compare } from '../scripts/html-diff.mjs';

describe('the html diff', () => {
  it('reports nothing when the markup matches', () => {
    expect(compare({ '0': '<p>a</p>' }, { '0': '<p>a</p>' })).toEqual([]);
  });

  it('catches a changed attribute, which paint-diff cannot see', () => {
    // The whole reason this script exists. An alt text carries no colour, no
    // size and no box, so every property paint-capture records is identical
    // across this pair.
    const a = { '0': '<img alt="a tray of beans">' };
    const b = { '0': '<img alt="">' };
    expect(compare(a, b)).toHaveLength(1);
    expect(compare(a, b)[0]!.key).toBe('0');
  });

  it('refuses to call two empty captures identical', () => {
    expect(() => compare({}, {})).toThrow(/proves nothing/);
  });

  it('refuses to compare captures of different length', () => {
    expect(() => compare({ '0': 'x' }, { '0': 'x', '1': 'y' })).toThrow(/1 slide.*2 slide/);
  });
});
