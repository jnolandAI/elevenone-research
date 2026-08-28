import { describe, it, expect } from 'vitest';
import { compare } from '../scripts/html-diff.mjs';
import { clean } from '../scripts/html-capture.mjs';

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

describe("html-capture's normaliser", () => {
  // \s matches U+2002 (en space) and U+00A0 (non-breaking space) as well as
  // an ASCII space, so a whitespace collapse built on \s would compare
  // "A | B" (as shipped, e.g. "Eleven One Research&ensp;|&ensp;
  // Brief 001") equal to "A | B" and make every &ensp; in the corpus
  // invisible to html-capture.mjs, and therefore to html-diff.mjs, which
  // only ever sees what the capture already collapsed. clean() must leave
  // an en space as content, not treat it as collapsible whitespace.
  it('does not collapse an en space into an ASCII space', () => {
    const withEnSpace = clean('<p>A | B</p>');
    expect(withEnSpace).toBe('<p>A | B</p>');
    expect(withEnSpace).not.toBe('<p>A | B</p>');
  });

  it('still collapses runs of ASCII whitespace to one space', () => {
    expect(clean('<p>\n  A   B\t\tC\n</p>')).toBe('<p> A B C </p>');
  });

  it('makes a capture pair differing only by an en space report a difference', () => {
    const a = { '0': clean('<p>Eleven One Research | Brief 001</p>') };
    const b = { '0': clean('<p>Eleven One Research | Brief 001</p>') };
    expect(compare(a, b)).toHaveLength(1);
  });
});
