import { describe, it, expect } from 'vitest';
import { loadDataset } from '../src/lib/dataset';
import { spline } from '../src/lib/charts/spline';
import { densityFigure } from '../src/lib/charts/kde';

const data = loadDataset('/assets/data/margin-cy2024.json');

describe('dataset', () => {
  it('reads the published file, not a copy of it', () => {
    expect(data.n_kept).toBe(2186);
    expect(data.kde).toHaveLength(200);
    expect(data.cohorts).toHaveLength(6);
    expect(data.q.p50).toBeCloseTo(0.388, 3);
  });

  it('refuses a path outside the published data directory', () => {
    expect(() => loadDataset('/etc/passwd')).toThrow();
  });

  it('refuses a path that starts inside it and then climbs out', () => {
    // Pinned to the guard's own message. A bare .toThrow() passes either way:
    // path.join collapses this to public/etc/passwd, which does not exist, so
    // readFileSync's ENOENT masks the guard's absence entirely.
    expect(() => loadDataset('/assets/data/../../etc/passwd'))
      .toThrow(/must sit under/);
  });
});

describe('spline', () => {
  it('starts with a moveto and emits one cubic per segment', () => {
    const d = spline([[0, 0], [10, 10], [20, 0]]);
    expect(d.startsWith('M0.0,0.0')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });
});

describe('density figure', () => {
  const svg = densityFigure(data);

  it('is a complete svg element with a viewBox', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 620 252"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('describes itself to a screen reader with the figures it actually draws', () => {
    expect(svg).toContain('role="img"');
    const label = svg.match(/aria-label="([^"]+)"/)![1]!;
    expect(label.length).toBeGreaterThan(60);
    // A length check alone passes a stale accessible name. The description a
    // screen reader hears has to carry the same numbers the sighted reader
    // sees, or the two readings of the figure disagree.
    expect(label).toContain((data.q.p50 * 100).toFixed(1) + ' percent');
    expect(label).toContain(data.n_kept.toLocaleString('en-US'));
  });

  it('puts no drop shadow on any data mark', () => {
    expect(svg).not.toContain('filter');
    expect(svg).not.toContain('drop-shadow');
  });

  it('marks the median once, with one small solid dot', () => {
    const dots = svg.match(/<circle/g) ?? [];
    expect(dots).toHaveLength(1);
    expect(svg).toContain('Median 38.8%');
  });

  it('marks both quartile guides', () => {
    expect(svg).toContain('25th 23%');
    expect(svg).toContain('75th 60%');
  });

  it('draws in greyscale only', () => {
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}/g) ?? []) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(4);
    }
  });
});
