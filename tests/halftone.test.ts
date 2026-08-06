import { describe, it, expect } from 'vitest';
import { loadDataset } from '../src/lib/dataset';
import { dotField, dotRamp, HERO_WIDE, HERO_NARROW } from '../src/lib/charts/halftone';

const data = loadDataset('/assets/data/margin-cy2024.json');

describe('dot field', () => {
  const svg = dotField(data, HERO_WIDE);

  it('is a complete svg of circles and nothing else', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('<rect');
    expect(svg).not.toContain('<path');
  });

  it('carries the density in dot area, which is why it draws many dots', () => {
    // A count alone passes a field of identical dots, which would break the
    // rule that area carries the value. The spread is the part that matters.
    const radii = [...svg.matchAll(/r="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(radii.length).toBeGreaterThan(100);
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(HERO_WIDE.rmax * 0.5);
  });

  it('draws a coarser, darker field at the narrow breakpoint', () => {
    const wideSvg = dotField(data, HERO_WIDE);
    const narrowSvg = dotField(data, HERO_NARROW);
    // 92x42 against 120x52: fewer, larger dots, because 196 columns scaled to
    // 390px is a grey smear rather than a halftone
    expect((narrowSvg.match(/<circle/g) ?? []).length)
      .toBeLessThan((wideSvg.match(/<circle/g) ?? []).length);
    // and darker, which the count says nothing about
    expect(narrowSvg).toContain(`fill="${HERO_NARROW.ink}"`);
    expect(wideSvg).toContain(`fill="${HERO_WIDE.ink}"`);
    expect(wideSvg).not.toContain(`fill="${HERO_NARROW.ink}"`);
  });

  it('is decorative, so it is hidden from assistive technology', () => {
    // the axis key in the prose is what carries the meaning
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('role="img"');
  });
});

describe('dot ramp', () => {
  const svg = dotRamp(800, 400);

  it('draws depth rather than blurring it', () => {
    expect(svg).not.toContain('filter');
    expect(svg).not.toContain('blur');
    expect((svg.match(/<circle/g) ?? []).length).toBeGreaterThan(100);
  });

  it('holds the engine screen angle of 15 degrees by default', () => {
    const rotated = dotRamp(800, 400, { angle: 15 });
    expect(svg).toBe(rotated);
  });

  it('is deterministic, so the same panel always draws the same surface', () => {
    expect(dotRamp(800, 400)).toBe(dotRamp(800, 400));
  });

  it('thins toward the frame rather than stopping against it', () => {
    // Asserting every radius clears 0.3 is tautological: the implementation
    // skips anything smaller, so the assertion holds with the edge dissolve
    // deleted entirely. Compare the frame to the interior instead.
    const dots = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"\/>/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), r: Number(m[3]) }));
    const maxR = Math.max(...dots.map((d) => d.r));
    const edge = dots.filter((d) => d.x < 44 || d.x > 756 || d.y < 22 || d.y > 378);
    expect(edge.length).toBeGreaterThan(0);
    expect(Math.max(...edge.map((d) => d.r))).toBeLessThan(maxR * 0.6);
  });
});
