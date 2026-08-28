import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  assertOneMark,
  axisTop,
  formatDelta,
  formatLevel,
  bridgeLayout,
  slopeLayout,
  rangeLayout,
  sparkLayout,
  plotBand,
  calloutLayout,
} from '../lib/exhibits';

const plot = { width: 1199, height: 250, plotTop: 30, plotBottom: 220 };

describe('the slate budget, as an invariant', () => {
  it('allows no mark and one mark', () => {
    expect(() => assertOneMark([{ label: 'a' }, { label: 'b' }], 'X')).not.toThrow();
    expect(() => assertOneMark([{ label: 'a', mark: true }, { label: 'b' }], 'X')).not.toThrow();
  });

  it('throws on a second mark, naming both', () => {
    expect(() =>
      assertOneMark([{ label: 'Price', mark: true }, { label: 'Mix', mark: true }], 'Bridge'),
    ).toThrow(/Bridge: 2 marked values \(Price, Mix\)/);
  });

  it('is enforced by every exhibit and not just by the helper', () => {
    const two = [
      { label: 'a', value: 10, anchor: true, mark: true },
      { label: 'b', value: 2, mark: true },
    ];
    expect(() => bridgeLayout(two, plot)).toThrow(/slate budget/);
    expect(() =>
      slopeLayout(
        [
          { label: 'a', from: 1, to: 2, mark: true },
          { label: 'b', from: 3, to: 4, mark: true },
        ],
        { ...plot, x1: 100, x2: 300 },
      ),
    ).toThrow(/slate budget/);
    expect(() =>
      rangeLayout(
        [
          { label: 'a', low: 1, high: 2, mid: 1.5, mark: true },
          { label: 'b', low: 1, high: 2, mid: 1.5, mark: true },
        ],
        { ...plot, x1: 100, x2: 300, min: 0, max: 10 },
      ),
    ).toThrow(/slate budget/);
    expect(() =>
      sparkLayout(
        [
          { label: 'a', points: [1, 2], mark: true },
          { label: 'b', points: [1, 2], mark: true },
        ],
        { ...plot, x1: 0, x2: 100, base: 1 },
      ),
    ).toThrow(/slate budget/);
  });
});

describe('value formatting', () => {
  it('puts negatives in parentheses and never behind a minus sign', () => {
    expect(formatDelta(3.4)).toBe('+3.4');
    expect(formatDelta(-1.2)).toBe('(1.2)');
    expect(formatLevel(18.4)).toBe('18.4');
    expect(formatLevel(-6.3)).toBe('(6.3)');
    expect(formatDelta(-1.2)).not.toContain('-');
    expect(formatLevel(-6.3)).not.toContain('-');
  });
});

describe('axis top', () => {
  it('leaves headroom so a bar never touches the frame', () => {
    expect(axisTop(23.9)).toBeGreaterThan(23.9);
    expect(axisTop(100)).toBeGreaterThan(100);
  });

  it('lands on a readable step', () => {
    expect(axisTop(23.9) % 5).toBe(0);
    expect(axisTop(0)).toBe(1);
  });
});

describe('bridge', () => {
  const steps = [
    { label: 'FY24', value: 18.4, anchor: true },
    { label: 'Volume', value: 2.1 },
    { label: 'Price', value: 3.4, mark: true },
    { label: 'Mix', value: -1.2 },
    { label: 'Input cost', value: -2.6 },
    { label: 'Opex', value: 1.1 },
    { label: 'FY25E', value: 21.2, anchor: true },
  ];

  it('walks the running total so the closing anchor is reached by the steps', () => {
    const { bars } = bridgeLayout(steps, plot);
    const opex = bars.find((b) => b.label === 'Opex')!;
    // 18.4 + 2.1 + 3.4 - 1.2 - 2.6 + 1.1 = 21.2
    expect(opex.to).toBeCloseTo(21.2, 6);
    const close = bars[bars.length - 1]!;
    expect(close.to).toBeCloseTo(opex.to, 6);
  });

  it('gives a falling step a bar that hangs from the level it starts at', () => {
    const { bars } = bridgeLayout(steps, plot);
    const mix = bars.find((b) => b.label === 'Mix')!;
    expect(mix.from).toBeCloseTo(23.9, 6);
    expect(mix.to).toBeCloseTo(22.7, 6);
    // The rect's top is the higher VALUE, which for a fall is where it began.
    const price = bars.find((b) => b.label === 'Price')!;
    expect(mix.y).toBeCloseTo(price.y, 6);
    expect(mix.height).toBeGreaterThan(0);
  });

  it('anchors run from the baseline and steps do not', () => {
    const { bars, baseline } = bridgeLayout(steps, plot);
    const open = bars[0]!;
    expect(open.from).toBe(0);
    expect(open.y + open.height).toBeCloseTo(baseline, 6);
    const volume = bars.find((b) => b.label === 'Volume')!;
    expect(volume.y + volume.height).toBeLessThan(baseline);
  });

  it('joins each bar to the next at the level the step closed on', () => {
    const { bars, connectors } = bridgeLayout(steps, plot);
    expect(connectors).toHaveLength(bars.length - 1);
    for (let i = 0; i < connectors.length; i++) {
      const c = connectors[i]!;
      expect(c.x1).toBeCloseTo(bars[i]!.x + bars[i]!.width, 6);
      expect(c.x2).toBeCloseTo(bars[i + 1]!.x, 6);
      expect(c.x2).toBeGreaterThan(c.x1);
    }
    // The join after a rise sits on that bar's top edge.
    expect(connectors[1]!.y).toBeCloseTo(bars[1]!.y, 6);
  });

  it('keeps every bar inside the plot and clear of the frame', () => {
    const { bars } = bridgeLayout(steps, plot);
    for (const b of bars) {
      expect(b.y, b.label).toBeGreaterThanOrEqual(plot.plotTop);
      expect(b.y + b.height, b.label).toBeLessThanOrEqual(plot.plotBottom + 0.001);
      expect(b.x, b.label).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, b.label).toBeLessThanOrEqual(plot.width);
    }
  });

  it('puts the value label above the bar, never over it', () => {
    const { bars } = bridgeLayout(steps, plot);
    for (const b of bars) expect(b.labelY, b.label).toBeLessThan(b.y);
  });

  it('formats anchors as levels and steps as signed deltas', () => {
    const { bars } = bridgeLayout(steps, plot);
    expect(bars[0]!.valueText).toBe('18.4');
    expect(bars.find((b) => b.label === 'Price')!.valueText).toBe('+3.4');
    expect(bars.find((b) => b.label === 'Mix')!.valueText).toBe('(1.2)');
  });
});

describe('slope', () => {
  const series = [
    { label: 'Instruments', from: 58.1, to: 62.4 },
    { label: 'Consumables', from: 66.2, to: 71.0, mark: true },
    { label: 'Service', from: 46.9, to: 44.3 },
    { label: 'Aftermarket', from: 37.2, to: 38.1 },
  ];

  it('puts a rising series above where it started and a falling one below', () => {
    const { lines } = slopeLayout(series, { ...plot, x1: 125, x2: 280 });
    const up = lines.find((l) => l.label === 'Consumables')!;
    const down = lines.find((l) => l.label === 'Service')!;
    expect(up.y2).toBeLessThan(up.y1); // smaller y is higher on the page
    expect(down.y2).toBeGreaterThan(down.y1);
  });

  it('orders the series on screen the way the values order', () => {
    const { lines } = slopeLayout(series, { ...plot, x1: 125, x2: 280 });
    const byValue = [...series].sort((a, b) => b.from - a.from).map((s) => s.label);
    const byPosition = [...lines].sort((a, b) => a.y1 - b.y1).map((l) => l.label);
    expect(byPosition).toEqual(byValue);
  });

  it('pads the domain so no dot sits on the frame', () => {
    const { lines } = slopeLayout(series, { ...plot, x1: 125, x2: 280 });
    for (const l of lines) {
      for (const y of [l.y1, l.y2]) {
        expect(y).toBeGreaterThan(plot.plotTop);
        expect(y).toBeLessThan(plot.plotBottom);
      }
    }
  });

  it('refuses a seventh series rather than letting the lines cross', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `s${i}`, from: i, to: i + 1 }));
    expect(() => slopeLayout(seven, { ...plot, x1: 125, x2: 280 })).toThrow(/six is the ceiling/);
  });
});

describe('range and dot', () => {
  const rows = [
    { label: 'Top 10 accounts', low: 22, high: 34, mid: 28, mark: true },
    { label: 'Tier 2', low: 14, high: 24, mid: 18 },
    { label: 'Tier 3', low: 8, high: 16, mid: 11 },
    { label: 'Long tail', low: 2, high: 9, mid: 5 },
  ];
  const geom = { ...plot, x1: 110, x2: 340, min: 0, max: 40 };

  it('places the median dot inside its own bar', () => {
    for (const r of rangeLayout(rows, geom)) {
      expect(r.midX, r.label).toBeGreaterThanOrEqual(r.x);
      expect(r.midX, r.label).toBeLessThanOrEqual(r.x + r.width);
    }
  });

  it('maps the stated domain to the stated axis, not to the data', () => {
    const [first] = rangeLayout([{ label: 'a', low: 0, high: 40, mid: 20 }], geom);
    expect(first!.x).toBeCloseTo(110, 6);
    expect(first!.x + first!.width).toBeCloseTo(340, 6);
    expect(first!.midX).toBeCloseTo(225, 6);
  });

  it('spaces rows evenly inside the plot', () => {
    const bars = rangeLayout(rows, geom);
    const gaps = bars.slice(1).map((b, i) => b.y - bars[i]!.y);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 6);
    for (const b of bars) {
      expect(b.y).toBeGreaterThan(plot.plotTop);
      expect(b.y).toBeLessThan(plot.plotBottom);
    }
  });

  it('rejects a range that runs backwards', () => {
    expect(() => rangeLayout([{ label: 'bad', low: 30, high: 10, mid: 20 }], geom)).toThrow(
      /low is above high/,
    );
  });
});

describe('small multiples', () => {
  const series = [
    { label: 'Consumables', points: [100, 110, 125, 139], mark: true },
    { label: 'Instruments', points: [100, 104, 109, 113] },
    { label: 'Service', points: [100, 95, 90, 86] },
    { label: 'Total', points: [100, 106, 111, 116], total: true },
  ];
  const geom = { width: 131, height: 60, plotTop: 6, plotBottom: 54, x1: 4, x2: 127, base: 100 };

  it('scales every panel against one shared domain', () => {
    const panels = sparkLayout(series, geom);
    // The base line is the same y in every panel. If a panel were scaled to
    // its own range this would differ, and a reader comparing slopes across
    // panels would be misled.
    const baseYs = new Set(panels.map((p) => p.baseY));
    expect(baseYs.size).toBe(1);
  });

  it('makes the steepest true series the steepest drawn series', () => {
    const panels = sparkLayout(series, geom);
    const drawnRise = (label: string) => {
      const p = panels.find((x) => x.label === label)!;
      const first = Number(p.path.split(' ')[0]!.split(',')[1]);
      return first - p.endY; // positive means it climbed
    };
    expect(drawnRise('Consumables')).toBeGreaterThan(drawnRise('Instruments'));
    expect(drawnRise('Service')).toBeLessThan(0);
  });

  it('reports the closing value and its delta against the base', () => {
    const panels = sparkLayout(series, geom);
    const consumables = panels.find((p) => p.label === 'Consumables')!;
    expect(consumables.last).toBe(139);
    expect(consumables.delta).toBe(39);
    expect(panels.find((p) => p.label === 'Service')!.delta).toBe(-14);
  });

  it('ends each line on its own end dot', () => {
    for (const p of sparkLayout(series, geom)) {
      const [lastX, lastY] = p.path.split(' ').pop()!.split(',').map(Number);
      expect(lastX).toBeCloseTo(p.endX, 6);
      expect(lastY).toBeCloseTo(p.endY, 6);
    }
  });

  it('refuses panels of unequal length, which cannot share an x axis', () => {
    expect(() =>
      sparkLayout([{ label: 'a', points: [1, 2, 3] }, { label: 'b', points: [1, 2] }], geom),
    ).toThrow(/different numbers of points/);
  });

  it('refuses a seventh panel', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `s${i}`, points: [1, 2] }));
    expect(() => sparkLayout(seven, geom)).toThrow(/six is the ceiling/);
  });
});

describe('the plot band', () => {
  // Written after the real defect: RangeDot and Slope carried their axis
  // positions as pixel constants sized for a 356px drawing. Widening the
  // exhibits to a 1199px page column left both plots sitting in the left half of
  // the canvas with the rest empty, and nothing failed.
  it('scales with the drawing rather than staying where it was', () => {
    const narrow = plotBand(356, 0.31, 0.955);
    const wide = plotBand(1199, 0.31, 0.955);
    expect(wide.x1 / narrow.x1).toBeCloseTo(1199 / 356, 1);
    expect(wide.x2 / narrow.x2).toBeCloseTo(1199 / 356, 1);
  });

  it('spends most of the drawing on the plot at every width', () => {
    // A plot that ends before three quarters of the canvas has a dead margin,
    // which is what the pixel constants produced once the exhibits grew.
    for (const width of [356, 575, 690, 1152, 1199]) {
      for (const [left, right] of [
        [0.31, 0.955],
        [0.351, 0.787],
      ] as const) {
        const band = plotBand(width, left, right);
        expect(band.x2, `plot ends early at width ${width}`).toBeGreaterThan(width * 0.75);
        expect(band.x1, `label gutter is not a gutter at width ${width}`).toBeLessThan(width * 0.4);
        expect(band.x2).toBeLessThanOrEqual(width);
      }
    }
  });

  it('refuses a band that is not inside the drawing', () => {
    expect(() => plotBand(500, 0.6, 0.4)).toThrow(/not a band/);
    expect(() => plotBand(500, 0.3, 1.4)).toThrow(/not a band/);
    expect(() => plotBand(500, 0, 0.9)).toThrow(/not a band/);
  });
});

describe('the callout', () => {
  const geom = { width: 690, height: 420, fontSize: 11, lineHeight: 14, reach: 24 };

  it('runs the leader horizontally and right-aligns the text on the left side', () => {
    const c = calloutLayout({ x: 500, y: 200 }, { lines: ['16.4 pts below', 'legacy at FY25E'], side: 'left' }, geom);
    expect(c.align).toBe('end');
    expect(c.leader.y1).toBe(200);
    expect(c.leader.y2).toBe(200);
    expect(c.leader.x2).toBe(500 - 24);
    expect(c.texts[0]!.x).toBeLessThan(c.leader.x2);
    // The block centres on the anchor: one baseline above it, one below.
    expect(c.texts[0]!.y).toBeLessThan(200);
    expect(c.texts[1]!.y).toBeGreaterThan(200);
    expect(c.texts[1]!.y - c.texts[0]!.y).toBe(14);
  });

  it('centres the text under the anchor on the below side', () => {
    const c = calloutLayout({ x: 345, y: 100 }, { lines: ['one line'], side: 'below' }, geom);
    expect(c.align).toBe('middle');
    expect(c.texts[0]!.x).toBe(345);
    expect(c.leader.x1).toBe(345);
    expect(c.leader.y2).toBe(124);
    expect(c.texts[0]!.y).toBeGreaterThan(124);
  });

  it('pulls a centred block inside the drawing and slants the leader to it', () => {
    const c = calloutLayout({ x: 685, y: 100 }, { lines: ['a reading of some length'], side: 'below' }, geom);
    const half = (24 * 11 * 0.62) / 2;
    expect(c.texts[0]!.x + half).toBeLessThanOrEqual(690);
    expect(c.texts[0]!.x).toBeLessThan(685);
    expect(c.leader.x1).toBe(685);
    expect(c.leader.x2).toBe(c.texts[0]!.x);
  });

  it('refuses text that runs off the drawing on a horizontal side', () => {
    expect(() =>
      calloutLayout({ x: 60, y: 200 }, { lines: ['a reading far too long for the space left of the anchor'], side: 'left' }, geom),
    ).toThrow(/runs off the drawing/);
  });

  it('refuses a block pushed past the foot of the drawing', () => {
    expect(() =>
      calloutLayout({ x: 345, y: 410 }, { lines: ['one', 'two'], side: 'below' }, geom),
    ).toThrow(/runs off the drawing/);
  });

  it('refuses more than two lines, which belong in the commentary', () => {
    expect(() =>
      calloutLayout({ x: 345, y: 200 }, { lines: ['a', 'b', 'c'], side: 'right' }, geom),
    ).toThrow(/two lines is the ceiling/);
  });
});

describe('the multi-series exhibits take their categories from the contract', () => {
  const trend = readFileSync('research-kit/components/Trend.astro', 'utf8');
  const columns = readFileSync('research-kit/components/Columns.astro', 'utf8');

  it('names no raw ramp value where a series is drawn', () => {
    // The grey-40 defect was never reachable by tokencheck: a literal inside a
    // component is not a weaker check than a threshold, it is no check. This
    // test is the only thing standing between that and a recurrence.
    for (const [name, src] of [['Trend', trend], ['Columns', columns]] as const) {
      expect(src.match(/var\(--color-grey-\d+\)/g) ?? [], `${name} still names the raw ramp`).toEqual([]);
      expect(src.match(/var\(--color-slate-\d+\)/g) ?? [], `${name} still names slate`).toEqual([]);
    }
  });

  it('draws three series and no more', () => {
    for (const [name, src] of [['Trend', trend], ['Columns', columns]] as const) {
      for (const n of [1, 2, 3]) {
        expect(src, `${name} does not read --ct-ex-series-${n}`).toContain(`--ct-ex-series-${n}`);
      }
      expect(src, `${name} reads a fourth series that the contract does not have`)
        .not.toContain('--ct-ex-series-4');
    }
  });

  it('gives Columns one mapping, so the legend key cannot drift from the bars', () => {
    // The ternary was written out twice, at the bar fill and at the key. Two
    // copies of a mapping is how a key comes to label the wrong bar.
    expect((columns.match(/--ct-ex-series-1/g) ?? []).length, 'series-1 named more than once')
      .toBe(1);
  });

  it('pins index 0 to series-1, index 1 to series-2 and the rest to series-3', () => {
    // Naming all three tokens is not naming the mapping: the tests above pass
    // just as well on a reversed ternary. These assert the order the source
    // text actually declares the branches in, so a reversal fails here.
    const trendStroke = trend.match(/const stroke = [\s\S]*?\n};/)?.[0] ?? '';
    expect(trendStroke, 'Trend: stroke() not found').not.toBe('');
    const ti0 = trendStroke.indexOf('i === 0');
    const ts1 = trendStroke.indexOf('--ct-ex-series-1');
    const ti1 = trendStroke.indexOf('i === 1');
    const ts2 = trendStroke.indexOf('--ct-ex-series-2');
    const ts3 = trendStroke.indexOf('--ct-ex-series-3');
    expect(ti0, 'Trend: expected to find "i === 0"').toBeGreaterThan(-1);
    expect(ti0, 'Trend: index 0 must map to series-1').toBeLessThan(ts1);
    expect(ts1, 'Trend: series-1 branch must precede the i === 1 branch').toBeLessThan(ti1);
    expect(ti1, 'Trend: index 1 must map to series-2').toBeLessThan(ts2);
    expect(ts2, 'Trend: series-2 must precede the fallthrough series-3').toBeLessThan(ts3);

    const columnsSeries = columns.match(/const series = [\s\S]*?;/)?.[0] ?? '';
    expect(columnsSeries, 'Columns: series() not found').not.toBe('');
    const cs0 = columnsSeries.indexOf('s === 0');
    const cc1 = columnsSeries.indexOf('--ct-ex-series-1');
    const cs1 = columnsSeries.indexOf('s === 1');
    const cc2 = columnsSeries.indexOf('--ct-ex-series-2');
    const cc3 = columnsSeries.indexOf('--ct-ex-series-3');
    expect(cs0, 'Columns: expected to find "s === 0"').toBeGreaterThan(-1);
    expect(cs0, 'Columns: index 0 must map to series-1').toBeLessThan(cc1);
    expect(cc1, 'Columns: series-1 branch must precede the s === 1 branch').toBeLessThan(cs1);
    expect(cs1, 'Columns: index 1 must map to series-2').toBeLessThan(cc2);
    expect(cc2, 'Columns: series-2 must precede the fallthrough series-3').toBeLessThan(cc3);
  });

  it('holds the reference line and the divider to --ct-ex-axis, not --ct-ex-axis-quiet', () => {
    // Both drew sub-floor greys before this branch. A regression back to the
    // quiet token would still contain the substring "--ct-ex-axis", so this
    // checks for the exact token and for the absence of the quiet variant.
    const referenceBranch = trend.match(/if \(l\.reference\)[\s\S]*?;/)?.[0] ?? '';
    expect(referenceBranch, 'Trend: l.reference branch not found').not.toBe('');
    expect(referenceBranch).toMatch(/--ct-ex-axis(?!-quiet)/);
    expect(referenceBranch).not.toMatch(/--ct-ex-axis-quiet/);

    const divideRule = trend.match(/\.divide\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(divideRule, 'Trend: .divide rule not found').not.toBe('');
    expect(divideRule).toMatch(/--ct-ex-axis(?!-quiet)/);
    expect(divideRule).not.toMatch(/--ct-ex-axis-quiet/);
  });
});

describe('the composition ramp is the contract scale, and the mark is one value', () => {
  const stack = readFileSync('research-kit/components/Stack.astro', 'utf8');
  const columns = readFileSync('research-kit/components/Columns.astro', 'utf8');

  it('names no raw ramp value in Stack', () => {
    // The pattern the suite already pins in the Map describe block below:
    // matching only `grey-\d+` and `slate-\d+` misses `var(--color-ink)`,
    // which is a raw ramp value with no numeric suffix and would sail
    // through a ban that only covers the other two families.
    expect(stack.match(/var\(--color-(grey|slate|ink)[a-z0-9-]*\)/g) ?? [], 'raw ramp').toEqual([]);
  });

  it('draws the composition ramp from the sequential scale, darkest at the foot', () => {
    // tone is baseline up, so it runs scale-5 down to scale-1. A reversed ramp
    // would still name all five tokens, which is why order is pinned and not
    // just presence.
    const tone = stack.match(/const tone = \[([^\]]+)\]/)![1]!;
    expect(tone.match(/--ct-ex-scale-(\d)/g)).toEqual([
      '--ct-ex-scale-5', '--ct-ex-scale-4', '--ct-ex-scale-3',
      '--ct-ex-scale-2', '--ct-ex-scale-1',
    ]);
  });

  it('marks a column by replacing its darkest step and nothing else', () => {
    // The rule Columns.astro states: the slate budget is one value, not one
    // group. markTone must differ from tone at index 0 alone.
    const tone = stack.match(/const tone = \[([^\]]+)\]/)![1]!;
    const markTone = stack.match(/const markTone = \[([^\]]+)\]/)![1]!;
    const t = tone.split(',').map((s) => s.trim());
    const m = markTone.split(',').map((s) => s.trim());
    expect(m.length).toBe(t.length);
    // Exact match, not toContain: markTone[0] must be the mark itself, not
    // any token that merely contains the substring '--ct-mark', which
    // '--ct-mark-soft' also satisfies.
    expect(m[0]).toBe("'var(--ct-mark)'");
    expect(m.slice(1)).toEqual(t.slice(1));
  });

  it('sets in-band values in a colour that clears the band they sit on', () => {
    // grey-80 on grey-60 is 2.64:1. The middle band of this ramp takes neither
    // knockout nor body text, only --ct-text-strong at 5.52:1. A tint ramp in
    // this kit has twice shipped failing its own text.
    const inside = stack.match(/const inside = [\s\S]*?;/)![0]!;
    expect(inside).toContain('--ct-text-on-field');
    expect(inside).toContain('--ct-text-strong');
    expect(inside, 'body text cannot sit on the middle band').not.toContain('var(--ct-text)');
  });

  it('does not fill a bar body with the recessive mark tint', () => {
    // --ct-mark-soft is slate-300, 1.65:1 on the ground: the same number as the
    // grey-40 defect the series pass removed.
    const fill = columns.match(/const fill = [\s\S]*?\n};/)![0]!;
    expect(fill, 'mark-soft is a field, not a mark body').not.toContain('--ct-mark-soft');
  });
});

describe('the choropleth is the contract scale, and its labels clear their bands', () => {
  const map = readFileSync('research-kit/components/Map.astro', 'utf8');

  it('names no raw ramp value', () => {
    expect(map.match(/var\(--color-(grey|slate|ink)[a-z0-9-]*\)/g) ?? [], 'raw ramp').toEqual([]);
  });

  it('runs its four levels up the top four steps of the sequential scale', () => {
    // scale-2 and not scale-1: Map's own note at :146 says the lightest band has
    // to stay distinguishable from an unshaded state on a projector, and
    // scale-1 leaves only 0.0450 in OKLab lightness for that.
    for (const [lv, step] of [[0, 2], [1, 3], [2, 4], [3, 5]] as const) {
      const rule = map.match(new RegExp(`\\.state--l${lv}\\s*\\{[^}]*\\}`))![0]!;
      expect(rule, `level ${lv}`).toContain(`--ct-ex-scale-${step}`);
    }
  });

  it('knocks labels out only where knockout clears the band', () => {
    // White on grey-60 is 3.37:1. The threshold shipped at level >= 1, which is
    // grey-60, and .abbr--on removes the halo that would otherwise carry it.
    // Scoped to the actual `abbr--on` class-list expression, not a whole-file
    // substring check: the whole file also carries this comment, which says
    // "level >= 2" in prose, so a whole-file check for that string passes
    // even if the code regresses. And a whole-file check banning the literal
    // string 'level >= 1' passes trivially against a reverted condition
    // written without the spaces, `level>=1`, since that string never
    // appears verbatim. Extracting the real expression and matching on it
    // with a whitespace-tolerant pattern closes both holes at once.
    const expr = map.match(/'abbr--on':\s*([\s\S]*?)\}/)![1]!;
    expect(expr).toMatch(/level\s*>=\s*2/);
    expect(expr, 'the level >= 1 knockout is the shipped defect').not.toMatch(/level\s*>=\s*1\b/);
  });

  it('sets its legend note in a colour that clears the page', () => {
    // grey-50 is 2.22:1 on white.
    const rule = map.match(/\.legend__note\s*\{[^}]*\}/)![0]!;
    expect(rule).toContain('--ct-text-muted');
  });
});
