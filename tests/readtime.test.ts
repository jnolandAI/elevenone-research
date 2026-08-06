import { describe, it, expect } from 'vitest';
import { readTime } from '../src/lib/readtime';

// Every word count below sits just under the 1-to-2 minute rounding boundary
// at 330 words. Pick a round number instead and the stray tokens a regression
// would introduce disappear into the rounding, so the test passes with the
// stripping it names deleted.
describe('read time', () => {
  it('counts prose at 220 words per minute', () => {
    expect(readTime(Array(329).fill('word').join(' '))).toBe(1);
    expect(readTime(Array(330).fill('word').join(' '))).toBe(2);
  });

  it('never reports zero minutes', () => {
    expect(readTime('three short words')).toBe(1);
  });

  it('does not count JSX component tags as prose', () => {
    const body = '<Claim id="A">' + Array(329).fill('word').join(' ') + '</Claim>';
    expect(readTime(body)).toBe(1);
  });

  it('does not count an import line as prose', () => {
    const body = "import Foo from '../../components/Foo.astro'\n" + Array(327).fill('word').join(' ');
    expect(readTime(body)).toBe(1);
  });
});
