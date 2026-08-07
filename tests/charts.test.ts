import { describe, it, expect } from 'vitest';
import { loadDataset } from '../src/lib/dataset';
import { spline } from '../src/lib/charts/spline';
import { densityFigure } from '../src/lib/charts/kde';
import { ridgeFigure } from '../src/lib/charts/ridge';
import { rangeFigure } from '../src/lib/charts/range';
import { TONES } from '../src/lib/chart-tones';

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

describe('ridge figure', () => {
  const svg = ridgeFigure(data);

  it('draws one curve and one median tick per cohort', () => {
    // 6 filled bases + 6 stroked curves
    expect(svg.match(/<path/g)).toHaveLength(12);
    expect(svg.match(/stroke-width="1.4"/g)).toHaveLength(6);
  });

  it('labels every cohort', () => {
    for (const c of data.cohorts) expect(svg).toContain(c.label);
  });

  it('describes itself to a screen reader with the figures it actually draws', () => {
    // A generic caption ("one density curve per cohort") passes a length
    // check and says nothing a screen reader user could act on: the visible
    // ticks carry real medians, so the accessible name has to carry them too.
    const label = svg.match(/aria-label="([^"]+)"/)![1]!;
    expect(label).toContain((data.cohorts[0]!.p50 * 100).toFixed(1) + '%');
    expect(label).toContain((data.cohorts.at(-1)!.p50 * 100).toFixed(1) + '%');
  });

  it('sets axis ticks in mono, because a tick is a value standing alone', () => {
    // Counted, not merely present. A bare substring check stays green if the
    // ticks regress to SANS while any other element still carries MONO.
    const ticks = svg.match(/font-family="Martian Mono[^"]*" font-weight="300" font-size="9"/g) ?? [];
    expect(ticks).toHaveLength(3);
  });

  it('puts no drop shadow on any data mark', () => {
    expect(svg).not.toContain('filter');
    expect(svg).not.toContain('drop-shadow');
  });
});

describe('range figure', () => {
  const svg = rangeFigure(data);

  it('draws a track, two bands and a median dot per cohort', () => {
    expect(svg.match(/<rect/g)).toHaveLength(12);      // p10-p90 and IQR each
    expect(svg.match(/<circle/g)).toHaveLength(12);    // dot plus its knockout ring
    // the track itself is a line, not a rect, so the counts above say nothing
    // about whether it was drawn
    expect(svg.match(new RegExp(`<line[^>]*stroke="${TONES[1]}"`, 'g')))
      .toHaveLength(data.cohorts.length);
  });

  it('shortens the tracks in order from smallest cohort to largest', () => {
    // Measured off the rendered track widths, not recomputed from the fixture.
    // Asserting that data.cohorts is sorted tests the dataset, not the figure:
    // rangeFigure could return an empty string and still pass.
    const widths = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="5"/g)]
      .map((m) => Number(m[1]));
    expect(widths).toHaveLength(data.cohorts.length);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]!).toBeLessThan(widths[i - 1]!);
    }
  });

  it('sets the per-cohort median readout in mono', () => {
    // MONO appears twice in this figure: the readout and the axis ticks. A bare
    // substring check stays green if the readout regresses to SANS.
    const readouts = svg.match(/font-family="Martian Mono[^"]*" font-size="9.5" font-weight="400"/g) ?? [];
    expect(readouts).toHaveLength(data.cohorts.length);
  });

  it('describes itself to a screen reader with the figures it actually draws', () => {
    // Same defect class as the ridge figure: a caption naming the encoding
    // ("tenth to ninetieth percentile track") without a number is stale
    // boilerplate, not a description of what this dataset actually shows.
    const label = svg.match(/aria-label="([^"]+)"/)![1]!;
    const span = (c: (typeof data.cohorts)[number]) => ((c.p90 - c.p10) * 100).toFixed(1);
    expect(label).toContain(span(data.cohorts[0]!) + ' percent');
    expect(label).toContain(span(data.cohorts.at(-1)!) + ' percent');
  });
});

// The density figure carries this check already. Both cohort figures introduce
// their own literal hexes, so without it a tinted value could enter a figure
// with nothing in the suite to notice.
describe('every figure draws in greyscale only', () => {
  for (const [name, svg] of [
    ['density', densityFigure(data)],
    ['ridge', ridgeFigure(data)],
    ['range', rangeFigure(data)],
  ] as const) {
    it(`${name} introduces no colour`, () => {
      const hexes = svg.match(/#[0-9A-Fa-f]{6}/g) ?? [];
      expect(hexes.length).toBeGreaterThan(0);
      for (const hex of hexes) {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!), `${name} ${hex}`).toBeLessThanOrEqual(4);
      }
    });
  }
});
