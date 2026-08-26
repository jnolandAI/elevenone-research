import { describe, it, expect } from 'vitest';
import {
  titleBlock, titleLineCount, pageWords, hasNumber,
  multiColumnProseLines, isFurniture,
} from '../research-kit/census/measure.mjs';
import {
  WRAPPED_TITLE, TABLE_PAGE, TWO_COLUMN_PROSE, SINGLE_COLUMN,
} from './fixtures/census-pages.mjs';

describe('titleBlock', () => {
  it('joins a wrapped title instead of truncating to the first line', () => {
    expect(titleBlock(WRAPPED_TITLE)).toBe(
      'After years of acceleration, digital adoption growth is normalising across all six markets'
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
