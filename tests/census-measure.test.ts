import { describe, it, expect } from 'vitest';
import {
  titleBlock, titleLineCount, pageWords, hasNumber,
  multiColumnProseLines, isFurniture,
} from '../research-kit/census/measure.mjs';
import {
  WRAPPED_TITLE, TABLE_PAGE, TWO_COLUMN_PROSE, SINGLE_COLUMN,
  WIDE_LABEL_TABLE, TWO_COLUMN_TEXT_MATRIX,
} from './fixtures/census-pages.mjs';

describe('titleBlock', () => {
  it('joins a wrapped title instead of truncating to the first line', () => {
    expect(titleBlock(WRAPPED_TITLE)).toBe(
      'Regional demand held steady through the downturn while replacement cycles lengthened across segments'
    );
    expect(titleBlock(WRAPPED_TITLE).split(/\s+/).length).toBe(13);
  });

  it('stops at the first blank line', () => {
    expect(titleBlock(TABLE_PAGE)).toBe('Sector economics, 2022');
  });

  it('reports how many lines the title occupied', () => {
    expect(titleLineCount(WRAPPED_TITLE)).toBe(2);
    expect(titleLineCount(TABLE_PAGE)).toBe(1);
  });

  it('caps a runaway block at three lines', () => {
    const noBlanks = ['one', 'two', 'three', 'four', 'five'].join('\n');
    expect(titleLineCount(noBlanks)).toBe(3);
  });
});

describe('multiColumnProseLines', () => {
  it('does not count aligned numeric table columns', () => {
    expect(multiColumnProseLines(TABLE_PAGE)).toBe(0);
  });

  it('counts lines where both sides are running prose', () => {
    expect(multiColumnProseLines(TWO_COLUMN_PROSE)).toBe(4);
  });

  it('returns zero for single-column prose', () => {
    expect(multiColumnProseLines(SINGLE_COLUMN)).toBe(0);
  });

  it('rejects wide table labels on digit density, not on length', () => {
    // Every chunk here is 49 to 53 characters with 29 to 35 letters, so it
    // clears the length and letter floors and only the digit-ratio gate can
    // reject it. TABLE_PAGE cannot catch a regression in that gate, because
    // its widest chunk is 13 characters and never reaches the digit check.
    expect(multiColumnProseLines(WIDE_LABEL_TABLE)).toBe(0);
  });

  it('counts a two-column text matrix as prose, a known limitation', () => {
    // Both sides are long, letter-rich and digit-free, so they pass every
    // gate. One line of a text matrix is not distinguishable from one line of
    // running prose. Asserted rather than hidden: the census README records
    // the multi-column figure as provisional for this reason.
    expect(multiColumnProseLines(TWO_COLUMN_TEXT_MATRIX)).toBe(3);
  });
});

describe('pageWords and hasNumber', () => {
  it('counts alphanumeric tokens only', () => {
    expect(pageWords('Growth is 12% ,, -- strong')).toBe(4);
  });

  it('detects a digit anywhere in a title', () => {
    expect(hasNumber('Growth reached 12% in 2022')).toBe(true);
    expect(hasNumber('Growth reached record levels')).toBe(false);
  });
});

describe('isFurniture', () => {
  it('excludes covers, dividers, agendas, disclaimers and closings', () => {
    expect(isFurniture(['Title / Cover'])).toBe(true);
    expect(isFurniture(['Section Divider'])).toBe(true);
    expect(isFurniture(['Disclaimer'])).toBe(true);
    expect(isFurniture(['Thank You'])).toBe(true);
    expect(isFurniture(['Content'])).toBe(false);
    expect(isFurniture(['Executive Summary'])).toBe(false);
    expect(isFurniture([])).toBe(false);
  });
});
