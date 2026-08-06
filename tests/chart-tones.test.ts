import { describe, it, expect } from 'vitest';
import { TONES, AXIS, GUIDE, TICK, CURVE, INK } from '../src/lib/chart-tones';

const EXPECTED = [
  '#FDFDFD', '#E2E2E2', '#C8C8C8', '#AEAEAE',
  '#959595', '#7D7D7D', '#656565', '#4E4E4E',
  '#393939', '#252525', '#121212', '#030303',
];

// WCAG relative luminance, sRGB
const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('chart tones', () => {
  it('reproduces the prototype ramp exactly, so figures cannot silently change', () => {
    expect(TONES).toEqual(EXPECTED);
  });

  it('is a different ramp from the interface greys, which is the point', () => {
    expect(TONES[6]).not.toBe('#8C8C8A');
    expect(TONES[11]).not.toBe('#131312');
  });

  it('clears AA for axis labels across the whole figure card gradient', () => {
    // the card runs linear-gradient(160deg, #FFFFFF, #F7F7F6)
    expect(contrast(TICK, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TICK, '#F7F7F6')).toBeGreaterThanOrEqual(4.5);
  });

  it('names the roles the chart modules import', () => {
    expect(AXIS).toBe(TONES[3]);
    expect(GUIDE).toBe(TONES[2]);
    expect(TICK).toBe(TONES[6]);
    expect(CURVE).toBe('#2B2B2A');
    expect(INK).toBe('#131312');
  });
});
