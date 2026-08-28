import { describe, it, expect } from 'vitest';
import { phaseLayout, textWidth } from '../lib/exhibits';

const geom = { width: 1199, gap: 8, labelSize: 13, spanSize: 11 };

const phases = [
  { label: 'Data and interviews', weight: 2 },
  { label: 'Analysis', weight: 1 },
  { label: 'Writing', weight: 2, mark: true },
  { label: 'The plan', weight: 1 },
];

describe('phases', () => {
  it('makes width mean the weight, which is the whole point of the exhibit', () => {
    const bands = phaseLayout(phases, geom);
    const [data, analysis, writing, plan] = bands;
    // Two decimal places, because phaseLayout rounds its output to that: a
    // tighter assertion would be testing the rounding rather than the ratio.
    expect(data!.width / analysis!.width).toBeCloseTo(2, 2);
    expect(writing!.width).toBeCloseTo(data!.width, 2);
    expect(plan!.width).toBeCloseTo(analysis!.width, 2);
  });

  it('takes the gaps out of the total before allocating, never out of a share', () => {
    const bands = phaseLayout(phases, geom);
    const widths = bands.reduce((sum, b) => sum + b.width, 0);
    const gaps = geom.gap * (phases.length - 1);
    expect(widths + gaps).toBeCloseTo(geom.width, 1);
  });

  it('lays the bands out left to right without overlapping', () => {
    const bands = phaseLayout(phases, geom);
    for (let i = 0; i < bands.length - 1; i++) {
      const end = bands[i]!.x + bands[i]!.width;
      expect(bands[i + 1]!.x, bands[i + 1]!.label).toBeGreaterThanOrEqual(end);
    }
    expect(bands[0]!.x).toBe(0);
    const last = bands[bands.length - 1]!;
    expect(last.x + last.width).toBeCloseTo(geom.width, 1);
  });

  // The five-band arc in the about section. The last two bands are a tenth of
  // the width each, which is the tightest case in the system. At the 880px
  // page this could not carry 'Independent'; at 1280 it can, with room.
  const arc = [
    { label: 'Advisor', weight: 2, span: '2016–2018' },
    { label: 'Operator', weight: 4, span: '2018–2022' },
    { label: 'Advisor', weight: 3, span: '2022–2025' },
    { label: 'Operator', weight: 1, span: '2025' },
    { label: 'Independent', weight: 1, span: '2026–', mark: true },
  ];

  it('keeps every label and span inside the exhibit', () => {
    for (const band of phaseLayout(arc, geom)) {
      const label = band.labelX + textWidth(band.label, geom.labelSize);
      const span = band.spanX + textWidth(band.span ?? '', geom.spanSize);
      expect(label, band.label).toBeLessThanOrEqual(geom.width);
      expect(span, band.label).toBeLessThanOrEqual(geom.width);
      expect(band.labelX, band.label).toBeGreaterThanOrEqual(0);
      expect(band.spanX, band.label).toBeGreaterThanOrEqual(0);
    }
  });

  it('moves a label off its band only when the band cannot hold it', () => {
    const bands = phaseLayout(
      [
        { label: 'Wide enough', weight: 19 },
        { label: 'Independent', weight: 1, mark: true },
      ],
      geom,
    );
    const [wide, narrow] = bands;
    // The first band has the room, so its label starts where the band starts.
    expect(wide!.labelX).toBe(wide!.x);
    // The last one does not, so the label is pulled left to the edge and no
    // further: it stops exactly where it fits.
    expect(narrow!.labelX).toBeLessThan(narrow!.x);
    expect(narrow!.labelX + textWidth(narrow!.label, geom.labelSize)).toBeCloseTo(
      geom.width,
      1,
    );
  });

  it('refuses two labels that cannot sit side by side', () => {
    // Two narrow bands at the right edge, both carrying long words. Pulling
    // the last label back inside the edge walks it into the one before it,
    // and two words running together is a quieter failure than a clipped one.
    // The exhibit refuses rather than rendering it.
    const tooLong = [
      { label: 'Wide enough', weight: 18 },
      { label: 'Operator', weight: 1 },
      { label: 'Independent', weight: 1, mark: true },
    ];
    expect(() => phaseLayout(tooLong, geom)).toThrow(/collide/);
  });

  it('holds the slate budget', () => {
    expect(() =>
      phaseLayout([{ label: 'a', weight: 1, mark: true }, { label: 'b', weight: 1, mark: true }], geom),
    ).toThrow(/slate budget/);
  });

  it('refuses a total that cannot be divided', () => {
    expect(() => phaseLayout([], geom)).toThrow(/no phases/);
    expect(() => phaseLayout([{ label: 'a', weight: 0 }], geom)).toThrow(/sum to zero/);
    expect(() => phaseLayout(phases, { ...geom, width: 20 })).toThrow(/gaps consume/);
  });
});
