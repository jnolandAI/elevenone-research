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
    // Matching the default against an explicit angle:15 alone is
    // self-consistency, not proof: if the angle option were silently ignored
    // and every call fell through to some other hardcoded rotation, the two
    // calls would still be byte-identical, for the wrong reason. Asserting
    // the default also differs from a genuinely different explicit angle
    // (0 degrees) forces the option to be load-bearing, which closes that gap.
    const rotated15 = dotRamp(800, 400, { angle: 15 });
    const rotated0 = dotRamp(800, 400, { angle: 0 });
    expect(svg).toBe(rotated15);
    expect(svg).not.toBe(rotated0);
  });

  it('is deterministic, so the same panel always draws the same surface', () => {
    expect(dotRamp(800, 400)).toBe(dotRamp(800, 400));
  });

  it('thins toward the frame rather than stopping against it', () => {
    // Asserting every radius clears 0.3 is tautological: the implementation
    // skips anything smaller, so it holds with the edge dissolve deleted.
    //
    // The comparison is frame-relative rather than a fixed pixel band, and
    // deliberately so. A band equal to the fade width includes dots at the
    // band's outer lip, where the fade has already returned to 1 and nothing
    // is thinned, so the test fails against a correct implementation and
    // invites someone to widen the brand's dissolve constant to satisfy it.
    // Ranking by distance to the frame has no such coupling.
    const dots = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"\/>/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), r: Number(m[3]) }));
    expect(dots.length).toBeGreaterThan(100);
    const toFrame = (d: { x: number; y: number }) =>
      Math.min(d.x, 800 - d.x, d.y, 400 - d.y);
    const maxR = Math.max(...dots.map((d) => d.r));
    const nearest = [...dots].sort((a, b) => toFrame(a) - toFrame(b)).slice(0, 20);
    // measured: 0.32 with the dissolve, 1.00 without it
    expect(Math.max(...nearest.map((d) => d.r))).toBeLessThan(maxR * 0.6);
  });
});
