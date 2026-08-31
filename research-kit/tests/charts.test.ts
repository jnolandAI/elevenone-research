import { describe, it, expect } from 'vitest';
import {
  columnLayout,
  columnLevel,
  columnBreak,
  columnSteps,
  barsLayout,
  trendLayout,
  stackLayout,
  scatterLayout,
  spreadLayout,
  timelineLayout,
} from '../lib/exhibits';

const plot = { width: 1184, height: 300, plotTop: 26, plotBottom: 248 };
const wide = { ...plot, x1: 100, x2: 1000 };

/* ---- Columns ------------------------------------------------------------- */

describe('columns', () => {
  const groups = [
    { label: 'Plan', values: [40, 32] },
    { label: 'Bundling', values: [25.5, 22.5] },
    { label: 'BTR', values: [13.5, 22.5] },
  ];

  it('puts every bar on the baseline and scales to the tallest value', () => {
    const laid = columnLayout(groups, plot);
    for (const g of laid.groups) {
      for (const b of g.bars) {
        expect(Math.round(b.y + b.height)).toBe(plot.plotBottom);
      }
    }
    expect(laid.top).toBeGreaterThanOrEqual(40);
  });

  it('draws taller bars for larger values', () => {
    const [first] = columnLayout(groups, plot).groups;
    expect(first!.bars[0]!.height).toBeGreaterThan(first!.bars[1]!.height);
  });

  it('shares one domain across the groups so bars are comparable', () => {
    const laid = columnLayout(groups, plot);
    // Heights are rounded to two decimals, so compare to that precision.
    const perUnit = laid.groups.map((g) => g.bars[0]!.height / g.bars[0]!.value);
    for (const r of perUnit) expect(r).toBeCloseTo(perUnit[0]!, 3);
  });

  it('honours a stated axis top, so two exhibits can share a scale', () => {
    const a = columnLayout(groups, { ...plot, max: 100 });
    const b = columnLayout([{ label: 'One', values: [10, 5] }], { ...plot, max: 100 });
    expect(a.top).toBe(100);
    expect(b.top).toBe(100);
    expect(a.groups[0]!.bars[0]!.height / 40).toBeCloseTo(b.groups[0]!.bars[0]!.height / 10, 6);
  });

  it('labels each bar with its own value', () => {
    const laid = columnLayout(groups, plot);
    expect(laid.groups[0]!.bars.map((b) => b.valueText)).toEqual(['40.0', '32.0']);
  });

  it('keeps every bar inside the drawing', () => {
    const laid = columnLayout(groups, plot);
    for (const g of laid.groups) {
      for (const b of g.bars) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(plot.width);
      }
    }
  });

  it('refuses a negative value, which is a bridge and not a column', () => {
    expect(() => columnLayout([{ label: 'a', values: [-4] }], plot)).toThrow(/bridge/);
  });

  it('refuses ragged groups', () => {
    expect(() =>
      columnLayout([{ label: 'a', values: [1, 2] }, { label: 'b', values: [3] }], plot),
    ).toThrow(/different numbers of series/);
  });

  it('refuses more groups than the labels can carry', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ label: `g${i}`, values: [1] }));
    expect(() => columnLayout(many, plot)).toThrow(/ten is the ceiling/);
  });

  it('refuses a fourth series', () => {
    expect(() => columnLayout([{ label: 'a', values: [1, 2, 3, 4] }], plot)).toThrow(
      /three is the ceiling/,
    );
  });

  it('enforces the slate budget', () => {
    expect(() =>
      columnLayout(
        [
          { label: 'a', values: [1], mark: true },
          { label: 'b', values: [2], mark: true },
        ],
        plot,
      ),
    ).toThrow(/slate budget/);
  });

  /* The three devices a column plot needs beyond the bars. Added after four
     pages of one deck were found plotting the data and stopping. */

  it('puts a reference line where the value falls, not where the bar ends', () => {
    const laid = columnLayout([{ label: 'a', values: [50] }], { ...plot, max: 100 });
    const mid = columnLevel(laid, plot.plotTop, 50);
    expect(mid).toBeCloseTo((plot.plotTop + plot.plotBottom) / 2, 0);
    expect(columnLevel(laid, plot.plotTop, 100)).toBe(plot.plotTop);
    expect(columnLevel(laid, plot.plotTop, 0)).toBe(plot.plotBottom);
  });

  it('refuses a reference line off the axis, which would draw outside the plot', () => {
    const laid = columnLayout([{ label: 'a', values: [50] }], { ...plot, max: 100 });
    expect(() => columnLevel(laid, plot.plotTop, 140)).toThrow(/above the axis top/);
    expect(() => columnLevel(laid, plot.plotTop, -1)).toThrow(/below the baseline/);
  });

  it('breaks between the last observed group and the first estimated one', () => {
    const laid = columnLayout(groups, plot);
    const x = columnBreak(laid, 0);
    const a = laid.groups[0]!.bars.at(-1)!;
    expect(x).toBeGreaterThan(a.x + a.width);
    expect(x).toBeLessThan(laid.groups[1]!.bars[0]!.x);
  });

  it('refuses a break that leaves nothing estimated', () => {
    const laid = columnLayout(groups, plot);
    expect(() => columnBreak(laid, 2)).toThrow(/no estimated groups/);
  });

  it('sets one rate on every transition and none on the groups', () => {
    const laid = columnLayout(groups, plot);
    const marks = columnSteps(laid, ['44.5%', '40.7%']);
    expect(marks).toHaveLength(2);
    expect(marks.map((m) => m.text)).toEqual(['44.5%', '40.7%']);
    for (const [i, m] of marks.entries()) {
      // The rate spans the gap between the two bars it is about.
      expect(m.x1).toBeCloseTo(laid.groups[i]!.bars[0]!.x + laid.groups[i]!.bars[0]!.width, 1);
      expect(m.x2).toBeCloseTo(laid.groups[i + 1]!.bars[0]!.x, 1);
      expect(m.x).toBeGreaterThan(m.x1);
      expect(m.x).toBeLessThan(m.x2);
      // And it clears both tops, so it cannot land on a value label.
      expect(m.y).toBeLessThan(Math.min(m.y1, m.y2) - 7);
    }
  });

  it('refuses a rate count that does not match the transitions', () => {
    const laid = columnLayout(groups, plot);
    expect(() => columnSteps(laid, ['1', '2', '3'])).toThrow(/2 expected/);
  });
});

/* ---- Trend --------------------------------------------------------------- */

describe('trend', () => {
  const series = [
    { label: 'Base', points: [166.7, 176.7, 191.5, 206.7] },
    { label: 'Stress', points: [135.9, 110.3, 106.7, 113.0], mark: true },
  ];

  it('spaces the points evenly across the plot band', () => {
    const { xs } = trendLayout(series, wide);
    expect(xs[0]).toBe(100);
    expect(xs[3]).toBe(1000);
    const gaps = xs.slice(1).map((x, i) => x - xs[i]!);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 6);
  });

  it('puts every series on one domain, so slopes compare', () => {
    const laid = trendLayout(series, wide);
    const [base, stress] = laid.lines;
    // The stress line ends below the base line because its value is lower.
    expect(stress!.endY).toBeGreaterThan(base!.endY);
  });

  it('splits observed from projected at solidThrough', () => {
    const laid = trendLayout(series, { ...wide, solidThrough: 1 });
    expect(laid.lines[0]!.path.split(' ')).toHaveLength(2);
    // The dashed run repeats the cut point so the line does not break.
    expect(laid.lines[0]!.projected.split(' ')).toHaveLength(3);
    expect(laid.dividerX).toBe(laid.xs[1]);
  });

  it('leaves no divider when the whole series is observed', () => {
    expect(trendLayout(series, wide).dividerX).toBeNull();
  });

  it('honours a stated domain rather than padding it', () => {
    const laid = trendLayout(series, { ...wide, min: 0, max: 250 });
    expect(laid.min).toBe(0);
    expect(laid.max).toBe(250);
  });

  it('refuses series of different lengths', () => {
    expect(() =>
      trendLayout([{ label: 'a', points: [1, 2] }, { label: 'b', points: [1, 2, 3] }], wide),
    ).toThrow(/different numbers of points/);
  });

  it('refuses a single point, which is not a line', () => {
    expect(() => trendLayout([{ label: 'a', points: [1] }], wide)).toThrow(/at least two points/);
  });

  it('refuses a solidThrough outside the series', () => {
    expect(() => trendLayout(series, { ...wide, solidThrough: 9 })).toThrow(/outside the series/);
  });

  it('enforces the slate budget', () => {
    expect(() =>
      trendLayout(
        [
          { label: 'a', points: [1, 2], mark: true },
          { label: 'b', points: [3, 4], mark: true },
        ],
        wide,
      ),
    ).toThrow(/slate budget/);
  });
});

/* ---- Stack --------------------------------------------------------------- */

describe('stack', () => {
  const columns = [
    { label: 'Flooring', values: [13.3, 18.2] },
    { label: 'Combined', values: [20.0, 11.4] },
  ];

  it('stacks segments from the baseline up without gaps', () => {
    const laid = stackLayout(columns, plot);
    const [first] = laid.columns;
    expect(Math.round(first!.segments[0]!.y + first!.segments[0]!.height)).toBe(plot.plotBottom);
    expect(Math.round(first!.segments[1]!.y + first!.segments[1]!.height)).toBe(
      Math.round(first!.segments[0]!.y),
    );
  });

  it('totals each column and puts the total above it', () => {
    const laid = stackLayout(columns, plot);
    expect(laid.columns[0]!.total).toBeCloseTo(31.5, 6);
    expect(laid.columns[0]!.topY).toBeLessThan(laid.columns[0]!.segments[1]!.y + 1);
  });

  it('normalises to 100% on share, whatever the underlying totals', () => {
    const laid = stackLayout([{ label: 'a', values: [1, 3] }], { ...plot, share: true });
    const [seg1, seg2] = laid.columns[0]!.segments;
    expect(seg1!.valueText).toBe('25%');
    expect(seg2!.valueText).toBe('75%');
    expect(Math.round(seg1!.height + seg2!.height)).toBe(plot.plotBottom - plot.plotTop);
  });

  it('flags a band too short to carry its own label', () => {
    const laid = stackLayout([{ label: 'a', values: [100, 0.4] }], plot);
    expect(laid.columns[0]!.segments[1]!.tight).toBe(true);
    expect(laid.columns[0]!.segments[0]!.tight).toBe(false);
  });

  it('refuses a negative segment', () => {
    expect(() => stackLayout([{ label: 'a', values: [5, -1] }], plot)).toThrow(/negative segment/);
  });

  it('refuses a column that sums to zero', () => {
    expect(() => stackLayout([{ label: 'a', values: [0, 0] }], plot)).toThrow(/sums to zero/);
  });

  it('refuses ragged columns and a sixth segment', () => {
    expect(() =>
      stackLayout([{ label: 'a', values: [1, 2] }, { label: 'b', values: [1] }], plot),
    ).toThrow(/different numbers of segments/);
    expect(() => stackLayout([{ label: 'a', values: [1, 1, 1, 1, 1, 1] }], plot)).toThrow(
      /five is the ceiling/,
    );
  });
});

/* ---- Scatter ------------------------------------------------------------- */

describe('scatter', () => {
  const geom = {
    ...plot,
    x1: 100,
    x2: 1000,
    xMin: 0,
    xMax: 10,
    yMin: 0,
    yMax: 10,
  };

  it('places a point by its two measures', () => {
    const [dot] = scatterLayout([{ label: 'ADG', x: 10, y: 10 }], geom);
    expect(dot!.cx).toBe(1000);
    expect(dot!.cy).toBe(plot.plotTop);
  });

  it('encodes the third measure as area, not radius', () => {
    const dots = scatterLayout(
      [
        { label: 'big', x: 1, y: 1, size: 100 },
        { label: 'quarter', x: 2, y: 2, size: 25 },
      ],
      { ...geom, rMin: 0, rMax: 20 },
    );
    // Quarter the area is half the radius, which is the whole point.
    expect(dots[1]!.r).toBeCloseTo(dots[0]!.r / 2, 6);
  });

  it('flips a label that would run off the right edge', () => {
    const [dot] = scatterLayout(
      [{ label: 'Interior Logic Group, the full-scope peer', x: 10, y: 5 }],
      geom,
    );
    expect(dot!.labelAnchor).toBe('end');
    expect(dot!.labelX).toBeLessThan(dot!.cx);
  });

  it('keeps a label on the right when there is room', () => {
    const [dot] = scatterLayout([{ label: 'ILG', x: 1, y: 5 }], geom);
    expect(dot!.labelAnchor).toBe('start');
    expect(dot!.labelX).toBeGreaterThan(dot!.cx);
  });

  it('refuses a domain with no extent', () => {
    expect(() => scatterLayout([{ label: 'a', x: 1, y: 1 }], { ...geom, xMax: 0 })).toThrow(
      /no extent/,
    );
  });

  it('refuses a crowd it cannot label', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ label: `p${i}`, x: i, y: i }));
    expect(() => scatterLayout(many, geom)).toThrow(/fourteen is the ceiling/);
  });
});

/* ---- Spread -------------------------------------------------------------- */

describe('spread', () => {
  const geom = { ...plot, x1: 300, x2: 1000, min: 0, max: 50 };
  const rows = [
    { label: 'Bottom-up', low: 30.9, high: 31.4 },
    { label: 'Base case', low: 31, high: 38, mark: true },
    { label: "Lowe's", low: 50, high: 50 },
  ];

  it('maps a range onto the axis', () => {
    const bars = spreadLayout(rows, geom);
    expect(bars[1]!.x).toBeCloseTo(300 + (31 / 50) * 700, 1);
    expect(bars[1]!.width).toBeCloseTo((7 / 50) * 700, 1);
  });

  it('draws a point estimate as a dot rather than a hairline bar', () => {
    const bars = spreadLayout(rows, geom);
    expect(bars[2]!.point).toBe(true);
    expect(bars[1]!.point).toBe(false);
  });

  it('spaces rows evenly down the plot', () => {
    const bars = spreadLayout(rows, geom);
    const gaps = bars.slice(1).map((b, i) => b.y - bars[i]!.y);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 6);
  });

  it('refuses a row that falls off the axis, rather than clipping it', () => {
    expect(() => spreadLayout([{ label: 'x', low: 10, high: 90 }], geom)).toThrow(
      /falls outside the axis/,
    );
  });

  it('refuses an inverted range', () => {
    expect(() => spreadLayout([{ label: 'x', low: 9, high: 2 }], geom)).toThrow(/low is above high/);
  });

  it('enforces the slate budget', () => {
    expect(() =>
      spreadLayout(
        [
          { label: 'a', low: 1, high: 2, mark: true },
          { label: 'b', low: 3, high: 4, mark: true },
        ],
        geom,
      ),
    ).toThrow(/slate budget/);
  });
});

/* ---- Timeline ------------------------------------------------------------ */

describe('timeline', () => {
  const geom = { width: 1184, height: 240, min: 2021, max: 2026, x1: 50, x2: 1130, spineY: 120 };
  const events = [
    { label: 'LBO', at: 2021.1 },
    { label: 'Caa1', at: 2023.1, mark: true },
    { label: 'CCC+', at: 2025.5 },
  ];

  it('places events by date, so spacing carries the meaning', () => {
    const nodes = timelineLayout(events, geom);
    const spanA = nodes[1]!.x - nodes[0]!.x;
    const spanB = nodes[2]!.x - nodes[1]!.x;
    // Two years against two and a half: the gaps must be in that proportion.
    expect(spanB / spanA).toBeCloseTo(2.4 / 2.0, 2);
  });

  it('sorts events into chronological order whatever order they arrive in', () => {
    const nodes = timelineLayout([events[2]!, events[0]!, events[1]!], geom);
    expect(nodes.map((n) => n.label)).toEqual(['LBO', 'Caa1', 'CCC+']);
  });

  it('alternates labels above and below the spine', () => {
    const nodes = timelineLayout(events, geom);
    expect(nodes.map((n) => n.above)).toEqual([true, false, true]);
    expect(nodes[0]!.labelY).toBeLessThan(geom.spineY);
    expect(nodes[1]!.labelY).toBeGreaterThan(geom.spineY);
  });

  it('refuses an event outside the span', () => {
    expect(() => timelineLayout([{ label: 'x', at: 2030 }], geom)).toThrow(/outside the span/);
  });

  it('refuses a span with no extent', () => {
    expect(() => timelineLayout(events, { ...geom, max: 2021 })).toThrow(/no extent/);
  });
});

/* ---- The 2026-08-26 proportion rules ------------------------------------- */

describe('proportion caps', () => {
  it('caps a column at 88 units however much width it is handed', () => {
    // Two groups across a full-width exhibit used to give each column 367px,
    // which is the "massive columns" John read on slide 59.
    const { groups } = columnLayout(
      [
        { label: 'CIM', values: [575] },
        { label: 'Board view', values: [229] },
      ],
      { width: 1184, height: 300, plotTop: 20, plotBottom: 260 },
    );
    for (const g of groups) {
      for (const bar of g.bars) expect(bar.width).toBeLessThanOrEqual(88);
    }
  });

  it('still divides a narrow slot proportionally, below the cap', () => {
    const { groups } = columnLayout(
      [
        { label: 'a', values: [1, 2] },
        { label: 'b', values: [3, 4] },
        { label: 'c', values: [5, 6] },
        { label: 'd', values: [7, 8] },
        { label: 'e', values: [9, 10] },
        { label: 'f', values: [11, 12] },
      ],
      { width: 480, height: 300, plotTop: 20, plotBottom: 260 },
    );
    // 480 / 6 groups = 80 per slot, 62% of that split two ways is under 88.
    expect(groups[0]!.bars[0]!.width).toBeLessThan(88);
    expect(groups[0]!.bars[0]!.width).toBeGreaterThan(10);
  });

  it('keeps the groups evenly spaced after the cap bites', () => {
    const { groups } = columnLayout(
      [
        { label: 'a', values: [1] },
        { label: 'b', values: [2] },
      ],
      { width: 1184, height: 300, plotTop: 20, plotBottom: 260 },
    );
    const gap = groups[1]!.centre - groups[0]!.centre;
    expect(gap).toBe(Math.round(1184 / 2));
  });

  it('caps bar thickness so three rows in a tall zone stay bars', () => {
    const rows = barsLayout(
      [
        { label: 'a', value: 1 },
        { label: 'b', value: 2 },
        { label: 'c', value: 3 },
      ],
      { width: 600, height: 480, plotTop: 20, plotBottom: 460, x1: 100, x2: 560 },
    );
    for (const r of rows) expect(r.height).toBeLessThanOrEqual(52);
  });

  it('spends the height it is given on the timeline label tiers', () => {
    const events = [
      { label: 'LBO', at: 2021 },
      { label: 'Caa1', at: 2023 },
      { label: 'CCC+', at: 2025 },
    ];
    const base = { width: 600, height: 240, min: 2020, max: 2026, x1: 20, x2: 580, spineY: 120 };
    const tight = timelineLayout(events, { ...base, reach: 18 });
    const roomy = timelineLayout(events, { ...base, reach: 60 });
    expect(Math.abs(roomy[0]!.labelY - base.spineY)).toBeGreaterThan(
      Math.abs(tight[0]!.labelY - base.spineY),
    );
  });

  it('reports which tier each label landed on', () => {
    const nodes = timelineLayout(
      [
        { label: 'A long enough label', at: 2025.1 },
        { label: 'Another long label', at: 2025.15 },
        { label: 'A third long label', at: 2025.2 },
      ],
      { width: 600, height: 240, min: 2020, max: 2026, x1: 20, x2: 580, spineY: 120 },
    );
    expect(Math.max(...nodes.map((n) => n.tier))).toBeGreaterThan(0);
  });
});
