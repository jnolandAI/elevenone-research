import { describe, it, expect } from 'vitest';
import { parseHex, relativeLuminance, contrastRatio, toOklab, deltaEOK, neutralSpread }
  from '../research-kit/contract/color.mjs';

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

describe('parseHex', () => {
  it('reads six-digit and three-digit hex in either case', () => {
    expect(parseHex('#4A4A48')).toEqual({ r: 74, g: 74, b: 72 });
    expect(parseHex('#4a4a48')).toEqual({ r: 74, g: 74, b: 72 });
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('returns null for anything that is not a hex colour', () => {
    for (const s of ['none', 'var(--g40)', 'rgba(0,0,0,.05)', '#12345', '']) {
      expect(parseHex(s), s).toBeNull();
    }
  });
});

describe('WCAG contrast', () => {
  it('puts black on white at 21:1 and a colour against itself at 1:1', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 2);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    const a = parseHex('#6C6C6A')!;
    expect(contrastRatio(a, WHITE)).toBeCloseTo(contrastRatio(WHITE, a), 10);
  });

  it('agrees with the luminance endpoints', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 6);
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 6);
  });
});

describe('OKLab', () => {
  it('places white and black at the ends of L', () => {
    expect(toOklab(WHITE).L).toBeCloseTo(1, 3);
    expect(toOklab(BLACK).L).toBeCloseTo(0, 3);
  });

  it('gives a neutral grey almost no chroma', () => {
    const { a, b } = toOklab(parseHex('#8C8C8A')!);
    expect(Math.hypot(a, b)).toBeLessThan(0.01);
  });

  it('separates two colours of near-identical luminance but different hue', () => {
    // The case a luminance test gets wrong: a chromatic accent and a neutral
    // grey can sit within a hair of each other in luminance and still read as
    // obviously different colours. This is why distinguishability is measured
    // in OKLab and legibility is measured in WCAG contrast.
    const slate = parseHex('#253444')!;
    const grey = parseHex('#4A4A48')!;
    expect(contrastRatio(slate, grey)).toBeLessThan(2);
    expect(deltaEOK(slate, grey)).toBeGreaterThan(0.05);
  });

  it('is zero for a colour against itself and symmetric', () => {
    const a = parseHex('#253444')!;
    const b = parseHex('#C9C9C7')!;
    expect(deltaEOK(a, a)).toBeCloseTo(0, 10);
    expect(deltaEOK(a, b)).toBeCloseTo(deltaEOK(b, a), 10);
  });
});

describe('neutralSpread', () => {
  it('is zero for a true grey and positive for a hue', () => {
    expect(neutralSpread(parseHex('#4A4A4A')!)).toBe(0);
    expect(neutralSpread(parseHex('#4A4A48')!)).toBe(2);
    expect(neutralSpread(parseHex('#253444')!)).toBe(31);
  });
});
