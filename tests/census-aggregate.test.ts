import { describe, it, expect } from 'vitest';
import { aggregate } from '../research-kit/census/aggregate.mjs';

const page = (raw: string, roles: string[] = ['Content'], visual: string[] = ['Chart']) =>
  ({ deck: 'd', page: 1, roles, visual, raw });

describe('aggregate', () => {
  it('reports quartiles over words per page', () => {
    const pages = [10, 20, 30, 40].map((n) => page(Array(n).fill('word').join(' ')));
    const r = aggregate(pages);
    expect(r.n).toBe(4);
    expect(r.words.median).toBe(20);
    // Floor-indexed percentiles: p90 of a 4-element sample is s[floor(3*0.9)] = s[2].
    // This is the method every percentile in the spec was computed with. Do not
    // change it to make a small sample read more intuitively.
    expect(r.words.p75).toBe(30);
    expect(r.words.p90).toBe(30);
    expect(r.words.p25).toBe(10);
  });

  it('drops furniture pages before measuring', () => {
    const pages = [page('one two three'), page('x', ['Section Divider'])];
    expect(aggregate(pages).n).toBe(1);
  });

  it('reports the visual mix as percentages that sum to 100', () => {
    const pages = [page('a b c', ['Content'], ['Chart']), page('d e f', ['Content'], ['Table'])];
    const mix = aggregate(pages).visualMix;
    expect(mix.Chart).toBe(50);
    expect(mix.Table).toBe(50);
  });

  it('emits no source text anywhere in the result', () => {
    const secret = 'Proprietary phrase that must never be republished';
    const r = aggregate([page(`${secret}\n\nbody body body`)]);
    expect(JSON.stringify(r)).not.toContain('Proprietary');
    expect(JSON.stringify(r)).not.toContain('phrase');
  });

  it('emits only numbers, and category names it was given as tags', () => {
    const r = aggregate([page('alpha beta gamma')]);
    const leaves: unknown[] = [];
    const walk = (v: unknown) => {
      if (v && typeof v === 'object') Object.values(v).forEach(walk);
      else leaves.push(v);
    };
    walk(r);
    expect(leaves.every((v) => typeof v === 'number')).toBe(true);
  });
});
