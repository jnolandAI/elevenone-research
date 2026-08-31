/**
 * Exhibit geometry.
 *
 * Every chart in this system is laid out here rather than in the component, so
 * the maths can be tested without rendering and so no page ever carries a
 * hand-computed pixel coordinate. A page passes values; the exhibit works out
 * where they go.
 */

/** At most one marked value per exhibit. The slate budget, as an invariant. */
export function assertOneMark<T extends { mark?: boolean; label: string }>(
  items: readonly T[],
  exhibit: string,
): void {
  const marked = items.filter((i) => i.mark);
  if (marked.length > 1) {
    throw new Error(
      `${exhibit}: ${marked.length} marked values (${marked.map((m) => m.label).join(', ')}). ` +
        'The slate budget is exactly one marked value per exhibit.',
    );
  }
}

/* The value-lane half of audit.mjs's table-craft reading, with the same
   semantics, moved here for the componentised matrices that pass their rows
   as props, which no source scan can read. A column of figures reads down
   the page only if it is right-aligned on tabular figures, and a numeric
   column left in the prose treatment costs the reader the one thing a table
   is for. The heuristic is the audit's, verbatim: a value is short (26
   chars or fewer) as well as numeric, because "+$97mm; a 12.5% 2027E
   margin" opens with a figure and is a sentence; the lane trips at 70%
   numeric with no cell set num; column 1 is exempt, because a row-name lane
   may be years; head rows are skipped and fewer than two body rows is not a
   table. Enforced as a throw for the reason assertOneMark is: measured
   before it was enforced, with no live violation in either corpus. */
const NUMERIC = new RegExp(String.raw`^[~<>+-]?[$]?\d[\d,.–—-]*\s*(%|x|bn|mm|M|B|K|bps|days?|yrs?)?`);

type LaneCell = string | { text: string; kind?: string };

export function assertValueLanes(
  rows: readonly { cells: readonly LaneCell[]; head?: boolean }[],
  exhibit: string,
): void {
  const body = rows.filter((r) => !r.head);
  if (body.length < 2) return;
  const grid = body.map((r) =>
    r.cells.map((c) => (typeof c === 'string' ? { text: c, kind: undefined } : c)),
  );
  const cols = Math.min(...grid.map((r) => r.length));
  for (let c = 1; c < cols; c++) {
    const cells = grid.map((r) => r[c]!);
    const numeric = cells.filter((x) => x.text.length <= 26 && NUMERIC.test(x.text)).length;
    const tagged = cells.filter((x) => x.kind === 'num').length;
    if (numeric / cells.length >= 0.7 && tagged === 0) {
      throw new Error(
        `${exhibit}: column ${c + 1} is ${numeric} of ${cells.length} figures and is not set ` +
          "as a value lane. Set the cells' kind to 'num', or the reader loses the one thing " +
          'a table is for.',
      );
    }
  }
}

/** Round a maximum up to a readable axis top, so bars never touch the frame. */
export function axisTop(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = magnitude / 2;
  return Math.ceil((max * 1.08) / step) * step;
}

/** A value formatted the way this system formats values: negatives in parens. */
export function formatDelta(value: number, digits = 1): string {
  const n = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (value < 0) return `(${n})`;
  return `+${n}`;
}

export function formatLevel(value: number, digits = 1): string {
  /* Grouped, because a count is one of the shapes an exhibit has to draw and a
     bar labelled 4820 is not a count anyone writes. Every house style in the
     corpus groups thousands, and until 2026-08-31 this function could not: a
     five-step funnel came out reading 4820, 2146, 874, 396, 181. Grouping is
     invisible under a thousand, so nothing that already renders moves. */
  const n = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return value < 0 ? `(${n})` : n;
}

/* ---- Bridge -------------------------------------------------------------- */

export interface BridgeStep {
  label: string;
  /** An anchor's absolute level, or a step's signed delta. */
  value: number;
  /** Anchors run from the baseline. Steps float from the running total. */
  anchor?: boolean;
  mark?: boolean;
}

export interface BridgeBar extends BridgeStep {
  x: number;
  y: number;
  width: number;
  height: number;
  centre: number;
  from: number;
  to: number;
  /** Baseline for the value label, always above the bar. */
  labelY: number;
  valueText: string;
}

export interface BridgeConnector {
  x1: number;
  x2: number;
  y: number;
}

export interface PlotGeometry {
  width: number;
  height: number;
  plotTop: number;
  plotBottom: number;
}

export interface BridgeLayout {
  bars: BridgeBar[];
  connectors: BridgeConnector[];
  baseline: number;
  top: number;
}

export interface BridgeGeometry extends PlotGeometry {
  /** Decimals on every label. 0 for a movement in counts. */
  digits?: number;
}

export function bridgeLayout(steps: readonly BridgeStep[], geom: BridgeGeometry): BridgeLayout {
  assertOneMark(steps, 'Bridge');
  if (steps.length === 0) throw new Error('Bridge: no steps');

  // Resolve each step into the absolute span it occupies.
  let running = 0;
  const spans = steps.map((s) => {
    const from = s.anchor ? 0 : running;
    const to = s.anchor ? s.value : running + s.value;
    running = to;
    return { from, to };
  });

  const top = axisTop(Math.max(...spans.flatMap((s) => [s.from, s.to])));
  const plotHeight = geom.plotBottom - geom.plotTop;
  const y = (v: number) => geom.plotBottom - (v / top) * plotHeight;

  const digits = geom.digits ?? 1;

  const column = geom.width / steps.length;
  const width = Math.round(column * 0.67);

  const bars: BridgeBar[] = steps.map((s, i) => {
    const { from, to } = spans[i]!;
    const x = Math.round(i * column + (column - width) / 2);
    const yTop = y(Math.max(from, to));
    const height = Math.abs(y(from) - y(to));
    return {
      ...s,
      x,
      y: yTop,
      width,
      height,
      centre: x + width / 2,
      from,
      to,
      labelY: yTop - 8,
      valueText: s.anchor ? formatLevel(s.value, digits) : formatDelta(s.value, digits),
    };
  });

  // A connector runs from the closing level of one step to the next bar's
  // edge, which is what makes a bridge read as one continuous walk.
  const connectors: BridgeConnector[] = [];
  for (let i = 0; i < bars.length - 1; i++) {
    const a = bars[i]!;
    const b = bars[i + 1]!;
    connectors.push({ x1: a.x + a.width, x2: b.x, y: y(spans[i]!.to) });
  }

  return { bars, connectors, baseline: geom.plotBottom, top };
}

/* ---- Slope --------------------------------------------------------------- */

export interface SlopeSeries {
  label: string;
  from: number;
  to: number;
  mark?: boolean;
}

export interface SlopeLine extends SlopeSeries {
  y1: number;
  y2: number;
}

export interface SlopeLayout {
  lines: SlopeLine[];
  x1: number;
  x2: number;
}

export interface SlopeGeometry extends PlotGeometry {
  x1: number;
  x2: number;
}

export function slopeLayout(series: readonly SlopeSeries[], geom: SlopeGeometry): SlopeLayout {
  assertOneMark(series, 'Slope');
  if (series.length === 0) throw new Error('Slope: no series');
  // Six is the ceiling. Past that the lines cross and it should be a table.
  if (series.length > 6) throw new Error(`Slope: ${series.length} series, six is the ceiling`);

  const values = series.flatMap((s) => [s.from, s.to]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Pad the domain so the outermost dots do not sit on the frame.
  const pad = (hi - lo) * 0.15 || 1;
  const min = lo - pad;
  const max = hi + pad;

  const plotHeight = geom.plotBottom - geom.plotTop;
  const y = (v: number) => geom.plotBottom - ((v - min) / (max - min)) * plotHeight;

  return {
    lines: series.map((s) => ({ ...s, y1: y(s.from), y2: y(s.to) })),
    x1: geom.x1,
    x2: geom.x2,
  };
}

/* ---- Range and dot ------------------------------------------------------- */

export interface RangeRow {
  label: string;
  /** Interquartile span. */
  low: number;
  high: number;
  /** The median. */
  mid: number;
  mark?: boolean;
}

export interface RangeBar extends RangeRow {
  x: number;
  width: number;
  midX: number;
  y: number;
}

export interface RangeGeometry extends PlotGeometry {
  x1: number;
  x2: number;
  /** Axis domain, stated rather than derived: a discount axis starts at 0. */
  min: number;
  max: number;
}

export function rangeLayout(rows: readonly RangeRow[], geom: RangeGeometry): RangeBar[] {
  assertOneMark(rows, 'RangeDot');
  if (rows.length === 0) throw new Error('RangeDot: no rows');

  const span = geom.x2 - geom.x1;
  const x = (v: number) => geom.x1 + ((v - geom.min) / (geom.max - geom.min)) * span;
  const gap = (geom.plotBottom - geom.plotTop) / rows.length;

  return rows.map((r, i) => {
    if (r.low > r.high) throw new Error(`RangeDot "${r.label}": low is above high`);
    return {
      ...r,
      x: x(r.low),
      width: x(r.high) - x(r.low),
      midX: x(r.mid),
      y: geom.plotTop + gap * i + gap / 2,
    };
  });
}

/* ---- Small multiples ----------------------------------------------------- */

export interface Sparkline {
  label: string;
  points: readonly number[];
  mark?: boolean;
  /** The total panel is drawn in ink rather than grey, and is never the mark. */
  total?: boolean;
}

export interface SparkPanel extends Sparkline {
  /** SVG polyline points attribute, already composed. */
  path: string;
  endX: number;
  endY: number;
  baseY: number;
  last: number;
  delta: number;
}

export interface SparkGeometry extends PlotGeometry {
  x1: number;
  x2: number;
  /** The index every panel is measured against. */
  base: number;
}

/**
 * Every panel shares one vertical domain, computed across all series. A panel
 * scaled to its own range is a lie by omission, because a reader compares
 * slopes across panels whether or not that was intended.
 */
export function sparkLayout(series: readonly Sparkline[], geom: SparkGeometry): SparkPanel[] {
  assertOneMark(series, 'SmallMultiples');
  if (series.length === 0) throw new Error('SmallMultiples: no series');
  if (series.length > 6) throw new Error(`SmallMultiples: ${series.length} panels, six is the ceiling`);
  const lengths = new Set(series.map((s) => s.points.length));
  if (lengths.size > 1) throw new Error('SmallMultiples: panels have different numbers of points');

  const all = series.flatMap((s) => [...s.points, geom.base]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 || 1;
  const min = lo - pad;
  const max = hi + pad;

  const plotHeight = geom.plotBottom - geom.plotTop;
  const y = (v: number) => geom.plotBottom - ((v - min) / (max - min)) * plotHeight;
  const n = series[0]!.points.length;
  const step = n > 1 ? (geom.x2 - geom.x1) / (n - 1) : 0;
  const x = (i: number) => geom.x1 + i * step;

  return series.map((s) => {
    const pts = s.points.map((v, i) => `${round(x(i))},${round(y(v))}`);
    const last = s.points[s.points.length - 1]!;
    return {
      ...s,
      path: pts.join(' '),
      endX: round(x(n - 1)),
      endY: round(y(last)),
      baseY: round(y(geom.base)),
      last,
      delta: last - geom.base,
    };
  });
}

/* ---- Columns ------------------------------------------------------------- */

/**
 * Grouped vertical bars, for comparing a small number of categories on one
 * measure, or two measures against each other (plan against actual, claim
 * against evidence).
 *
 * Encoding: the first series takes grey-80, the second grey-40, and exactly one
 * group may be marked. Sign is read from the axis, never from colour.
 */
export interface ColumnGroup {
  label: string;
  /** One value per series. Every group carries the same number. */
  values: readonly number[];
  mark?: boolean;
}

export interface ColumnBar {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  valueText: string;
  /** Which series this bar belongs to, so the component can colour it. */
  series: number;
  /** Baseline for the value label, always clear of the bar. */
  labelY: number;
}

export interface ColumnGroupLayout {
  label: string;
  mark?: boolean;
  bars: ColumnBar[];
  centre: number;
}

export interface ColumnGeometry extends PlotGeometry {
  /** Axis top, stated when several exhibits must share a domain. */
  max?: number;
  /** Decimal places on the value labels. */
  digits?: number;
}

export function columnLayout(
  groups: readonly ColumnGroup[],
  geom: ColumnGeometry,
): { groups: ColumnGroupLayout[]; baseline: number; top: number } {
  assertOneMark(groups, 'Columns');
  if (groups.length === 0) throw new Error('Columns: no groups');
  // Ten is the ceiling. Past that the labels stop fitting under the bars and
  // the comparison the exhibit exists to make is no longer legible.
  if (groups.length > 10) throw new Error(`Columns: ${groups.length} groups, ten is the ceiling`);

  const counts = new Set(groups.map((g) => g.values.length));
  if (counts.size > 1) throw new Error('Columns: groups carry different numbers of series');
  const seriesCount = groups[0]!.values.length;
  if (seriesCount === 0) throw new Error('Columns: no values');
  if (seriesCount > 3) throw new Error(`Columns: ${seriesCount} series, three is the ceiling`);

  const values = groups.flatMap((g) => [...g.values]);
  if (values.some((v) => v < 0)) {
    throw new Error('Columns: negative values need a bridge or a signed axis, not a column');
  }

  const top = geom.max ?? axisTop(Math.max(...values));
  const plotHeight = geom.plotBottom - geom.plotTop;
  const y = (v: number) => geom.plotBottom - (v / top) * plotHeight;

  const column = geom.width / groups.length;
  // The group occupies two thirds of its slot; the bars divide that between
  // them, so a grouped pair reads as one unit against its neighbours.
  //
  // Then the cap. Proportional width alone is right for six columns and absurd
  // for two: two groups on a full-width exhibit gave each column 367px and the
  // page drew two grey slabs. John, 2026-08-26: "If you have two columns in a
  // chart, it doesn't need to expand to fill the entire horizontal space
  // because then you just end up with these massive columns." Past 88px a
  // column stops reading as a measured quantity and starts reading as a
  // rectangle, so the bars keep their spacing and give the width back.
  const MAX_BAR = 88;
  const barWidth = Math.min((column * 0.62) / seriesCount, MAX_BAR);
  const groupWidth = barWidth * seriesCount;
  const digits = geom.digits ?? 1;

  const laid = groups.map((g, i) => {
    const left = i * column + (column - groupWidth) / 2;
    const bars: ColumnBar[] = g.values.map((v, s) => {
      const yTop = y(v);
      return {
        x: round(left + s * barWidth),
        y: round(yTop),
        width: round(barWidth),
        height: round(geom.plotBottom - yTop),
        value: v,
        valueText: formatLevel(v, digits),
        series: s,
        labelY: round(yTop - 7),
      };
    });
    return { label: g.label, mark: g.mark, bars, centre: round(left + groupWidth / 2) };
  });

  return { groups: laid, baseline: geom.plotBottom, top };
}

/* ---- Bars ---------------------------------------------------------------- */

/**
 * Horizontal ranked bars, for "rank these against each other".
 *
 * The form to reach for once the categories run past about eight, or once the
 * labels are phrases rather than years: a column chart cannot carry either. The
 * bars sort as given, so a page that wants a ranking sorts its own data and a
 * page that wants a fixed order (a scorecard's dimensions) keeps it.
 */
export interface BarRow {
  label: string;
  value: number;
  /** Reading set at the bar's end, when it is not just the value. */
  note?: string;
  mark?: boolean;
}

export interface BarShape extends BarRow {
  x: number;
  y: number;
  width: number;
  height: number;
  valueText: string;
  /** Baseline of the value, always just past the bar's end. */
  valueX: number;
  midY: number;
}

export interface BarsGeometry extends PlotGeometry {
  x1: number;
  x2: number;
  max?: number;
  digits?: number;
  /** Bar thickness as a share of the row's slot. */
  thickness?: number;
}

export function barsLayout(rows: readonly BarRow[], geom: BarsGeometry): BarShape[] {
  assertOneMark(rows, 'Bars');
  if (rows.length === 0) throw new Error('Bars: no rows');
  if (rows.length > 14) throw new Error(`Bars: ${rows.length} rows, fourteen is the ceiling`);
  const values = rows.map((r) => r.value);
  if (values.some((v) => v < 0)) {
    throw new Error('Bars: negative values need a signed axis, not a ranked bar');
  }

  const top = geom.max ?? axisTop(Math.max(...values));
  const span = geom.x2 - geom.x1;
  const slot = (geom.plotBottom - geom.plotTop) / rows.length;
  // Capped for the same reason columns are: three rows in a tall zone gave
  // each bar 78px of thickness, which draws as a band rather than a bar.
  const height = round(Math.min(slot * (geom.thickness ?? 0.52), 52));
  const digits = geom.digits ?? 1;

  return rows.map((r, i) => {
    const w = round((r.value / top) * span);
    const midY = geom.plotTop + slot * i + slot / 2;
    return {
      ...r,
      x: geom.x1,
      y: round(midY - height / 2),
      width: Math.max(w, 1),
      height,
      valueText: formatLevel(r.value, digits),
      valueX: round(geom.x1 + Math.max(w, 1) + 8),
      midY: round(midY),
    };
  });
}

/* ---- Driver chain -------------------------------------------------------- */

/**
 * A sizing equation set as chips joined by operators.
 *
 * This, and not the waterfall, is how the reference decks show arithmetic:
 * "$13,000 per home × 1,022K completions = $31.4B". The waterfall decomposes a
 * movement; the chain shows a build. Each term carries a figure, what the
 * figure is, and optionally where it came from.
 */
export interface ChainTerm {
  /** The figure, set large: "$30,775". */
  value: string;
  /** What the figure is: "NAHB per-home finish spend". */
  label: string;
  /** Where it came from, or its grade. */
  note?: string;
  /** The operator that precedes this term. The first term takes none. */
  op?: '×' | '+' | '−' | '÷' | '=';
  mark?: boolean;
}

export interface ChainCell extends ChainTerm {
  x: number;
  width: number;
  centre: number;
  /** Where the operator glyph sits, or null on the first term. */
  opX: number | null;
}

export function chainLayout(
  terms: readonly ChainTerm[],
  geom: { width: number; gap?: number },
): ChainCell[] {
  assertOneMark(
    terms.map((t) => ({ ...t, label: t.label })),
    'DriverChain',
  );
  if (terms.length < 2) throw new Error('DriverChain: a chain needs at least two terms');
  if (terms.length > 5) throw new Error(`DriverChain: ${terms.length} terms, five is the ceiling`);
  for (let i = 1; i < terms.length; i++) {
    if (!terms[i]!.op) throw new Error(`DriverChain: term "${terms[i]!.label}" has no operator`);
  }
  if (terms[0]!.op) throw new Error('DriverChain: the first term cannot carry an operator');

  const gap = geom.gap ?? 46;
  const available = geom.width - gap * (terms.length - 1);
  if (available <= 0) throw new Error('DriverChain: the operators consume the whole width');
  const width = round(available / terms.length);

  return terms.map((t, i) => {
    const x = round(i * (width + gap));
    return {
      ...t,
      x,
      width,
      centre: round(x + width / 2),
      opX: i === 0 ? null : round(x - gap / 2),
    };
  });
}

/* ---- Trend --------------------------------------------------------------- */

/**
 * A multi-series line, for a measure over time.
 *
 * Series are labelled at the line's end rather than in a detached legend, which
 * is the convention across the reference decks: a legend makes the reader carry
 * a key back and forth across the exhibit. A forecast segment is drawn dashed
 * from `solidThrough`, and a divider rule can be placed at that index so
 * observed and projected read as two zones of one chart.
 */
export interface TrendSeries {
  label: string;
  points: readonly number[];
  mark?: boolean;
  /** Drawn as a dashed reference level rather than a measured series. */
  reference?: boolean;
}

export interface TrendLine extends TrendSeries {
  /** Polyline points for the observed segment. */
  path: string;
  /** Polyline points for the projected segment, empty when there is none. */
  projected: string;
  endX: number;
  endY: number;
  startY: number;
  last: number;
  first: number;
  dots: { x: number; y: number; value: number }[];
}

export interface TrendGeometry extends PlotGeometry {
  x1: number;
  x2: number;
  /** Domain, stated rather than derived when a zero baseline is the honest one. */
  min?: number;
  max?: number;
  /**
   * Index of the last observed point. Points after it are drawn dashed.
   * Omit when the whole series is observed.
   */
  solidThrough?: number;
}

export interface TrendLayout {
  lines: TrendLine[];
  xs: number[];
  min: number;
  max: number;
  /** X of the divider between observed and projected, or null. */
  dividerX: number | null;
}

export function trendLayout(series: readonly TrendSeries[], geom: TrendGeometry): TrendLayout {
  assertOneMark(series, 'Trend');
  if (series.length === 0) throw new Error('Trend: no series');
  if (series.length > 6) throw new Error(`Trend: ${series.length} series, six is the ceiling`);
  const lengths = new Set(series.map((s) => s.points.length));
  if (lengths.size > 1) throw new Error('Trend: series have different numbers of points');
  const n = series[0]!.points.length;
  if (n < 2) throw new Error('Trend: a line needs at least two points');

  const all = series.flatMap((s) => [...s.points]);
  const lo = geom.min ?? Math.min(...all);
  const hi = geom.max ?? Math.max(...all);
  if (hi <= lo) throw new Error('Trend: the domain has no height');
  // Pad only where the domain was derived; a stated domain is left alone.
  const pad = (hi - lo) * 0.12;
  const min = geom.min ?? lo - pad;
  const max = geom.max ?? hi + pad;

  const plotHeight = geom.plotBottom - geom.plotTop;
  const y = (v: number) => geom.plotBottom - ((v - min) / (max - min)) * plotHeight;
  const step = (geom.x2 - geom.x1) / (n - 1);
  const xs = Array.from({ length: n }, (_, i) => round(geom.x1 + i * step));

  const cut = geom.solidThrough ?? n - 1;
  if (cut < 0 || cut > n - 1) throw new Error('Trend: solidThrough is outside the series');

  const lines = series.map((s) => {
    const pt = (i: number) => `${xs[i]},${round(y(s.points[i]!))}`;
    const solid: string[] = [];
    for (let i = 0; i <= cut; i++) solid.push(pt(i));
    const dashed: string[] = [];
    if (cut < n - 1) for (let i = cut; i < n; i++) dashed.push(pt(i));
    const last = s.points[n - 1]!;
    return {
      ...s,
      path: solid.join(' '),
      projected: dashed.join(' '),
      endX: xs[n - 1]!,
      endY: round(y(last)),
      startY: round(y(s.points[0]!)),
      last,
      first: s.points[0]!,
      dots: s.points.map((v, i) => ({ x: xs[i]!, y: round(y(v)), value: v })),
    };
  });

  return {
    lines,
    xs,
    min,
    max,
    dividerX: cut < n - 1 ? xs[cut]! : null,
  };
}

/* ---- Stack --------------------------------------------------------------- */

/**
 * A stacked column, for how a total is composed and how that composition moves.
 *
 * Segment values are set inside their own band rather than in a legend, and the
 * total is set above the column, which is the reference decks' rule: every bar
 * is labelled and every stack totals.
 */
export interface StackColumn {
  label: string;
  /** One value per segment, in draw order from the baseline up. */
  values: readonly number[];
  mark?: boolean;
}

export interface StackSegment {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  valueText: string;
  segment: number;
  /** Centre of the band, for a label set inside it. */
  midY: number;
  /** True when the band is too short to carry its own label. */
  tight: boolean;
}

export interface StackColumnLayout {
  label: string;
  mark?: boolean;
  segments: StackSegment[];
  total: number;
  totalText: string;
  centre: number;
  topY: number;
}

export interface StackGeometry extends PlotGeometry {
  /** Normalise every column to 100%. */
  share?: boolean;
  max?: number;
  digits?: number;
}

export function stackLayout(
  columns: readonly StackColumn[],
  geom: StackGeometry,
): { columns: StackColumnLayout[]; baseline: number; top: number } {
  assertOneMark(columns, 'Stack');
  if (columns.length === 0) throw new Error('Stack: no columns');
  if (columns.length > 8) throw new Error(`Stack: ${columns.length} columns, eight is the ceiling`);

  const counts = new Set(columns.map((c) => c.values.length));
  if (counts.size > 1) throw new Error('Stack: columns carry different numbers of segments');
  const segments = columns[0]!.values.length;
  if (segments === 0) throw new Error('Stack: no segments');
  if (segments > 5) throw new Error(`Stack: ${segments} segments, five is the ceiling`);
  if (columns.flatMap((c) => [...c.values]).some((v) => v < 0)) {
    throw new Error('Stack: a stacked column cannot carry a negative segment');
  }

  const totals = columns.map((c) => c.values.reduce((a, b) => a + b, 0));
  if (totals.some((t) => t <= 0)) throw new Error('Stack: a column sums to zero');

  const top = geom.share ? 100 : (geom.max ?? axisTop(Math.max(...totals)));
  const plotHeight = geom.plotBottom - geom.plotTop;
  const scale = (v: number) => (v / top) * plotHeight;
  const digits = geom.digits ?? 1;

  const column = geom.width / columns.length;
  /* Capped at the same 88 units a column chart is capped at, and for the same
     reason: three columns on a full-width exhibit take 219 units each and draw
     as slabs. A composition bar is still a bar. */
  const width = round(Math.min(column * 0.54, 88));

  const laid = columns.map((c, i) => {
    const x = round(i * column + (column - width) / 2);
    const factor = geom.share ? 100 / totals[i]! : 1;
    let cursor = geom.plotBottom;
    const segs: StackSegment[] = c.values.map((v, s) => {
      const h = scale(v * factor);
      cursor -= h;
      return {
        x,
        y: round(cursor),
        width,
        height: round(h),
        value: v,
        valueText: geom.share ? `${formatLevel(v * factor, geom.digits ?? 0)}%` : formatLevel(v, digits),
        segment: s,
        midY: round(cursor + h / 2),
        // A band under 16 units cannot carry an 11px label inside it.
        tight: h < 16,
      };
    });
    return {
      label: c.label,
      mark: c.mark,
      segments: segs,
      total: totals[i]!,
      totalText: geom.share ? '100%' : formatLevel(totals[i]!, digits),
      centre: round(x + width / 2),
      topY: round(cursor),
    };
  });

  return { columns: laid, baseline: geom.plotBottom, top };
}

/* ---- Scatter ------------------------------------------------------------- */

/**
 * Points on two measures, optionally sized by a third.
 *
 * This is the positioning map, the deal register and the risk board in one
 * geometry: what changes between them is the axis labels and whether quadrant
 * rules are drawn. Points carry their own labels, because a scatter with a
 * legend is unreadable at slide size.
 */
export interface ScatterPoint {
  label: string;
  x: number;
  y: number;
  /** Third measure, drawn as area. Omit for a fixed dot. */
  size?: number;
  mark?: boolean;
}

export interface ScatterDot extends ScatterPoint {
  cx: number;
  cy: number;
  r: number;
  /** Where the point's label sits, pulled inside the drawing. */
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
}

export interface ScatterGeometry extends PlotGeometry {
  x1: number;
  x2: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Radius range for the size measure. */
  rMin?: number;
  rMax?: number;
  /** Label size in user units, for the pull-back. Must match --text-xs. */
  fontSize?: number;
}

export function scatterLayout(
  points: readonly ScatterPoint[],
  geom: ScatterGeometry,
): ScatterDot[] {
  assertOneMark(points, 'Scatter');
  if (points.length === 0) throw new Error('Scatter: no points');
  if (points.length > 14) throw new Error(`Scatter: ${points.length} points, fourteen is the ceiling`);
  if (geom.xMax <= geom.xMin || geom.yMax <= geom.yMin) {
    throw new Error('Scatter: the domain has no extent');
  }

  const px = (v: number) => geom.x1 + ((v - geom.xMin) / (geom.xMax - geom.xMin)) * (geom.x2 - geom.x1);
  const plotHeight = geom.plotBottom - geom.plotTop;
  const py = (v: number) => geom.plotBottom - ((v - geom.yMin) / (geom.yMax - geom.yMin)) * plotHeight;

  const sizes = points.map((p) => p.size ?? 0);
  const sizeMax = Math.max(...sizes);
  const rMin = geom.rMin ?? 5;
  const rMax = geom.rMax ?? 22;
  const fontSize = geom.fontSize ?? 11;

  // Two deals a month apart at the same multiple are a real pattern in the
  // data, so the exhibit has to survive drawing them rather than requiring the
  // numbers to be nudged apart. Every label is tested against the labels
  // already placed AND against every bubble, because a label sitting on a
  // neighbour's bubble is as unreadable as one sitting on its text.
  type Box = { x1: number; y1: number; x2: number; y2: number };
  const placed: Box[] = [];

  const circles = points.map((p) => ({
    cx: px(p.x),
    cy: py(p.y),
    r:
      p.size === undefined || sizeMax <= 0
        ? rMin
        : Math.sqrt(p.size / sizeMax) * (rMax - rMin) + rMin,
  }));

  const hitsBox = (b: Box) =>
    placed.some((q) => b.x1 < q.x2 && b.x2 > q.x1 && b.y1 < q.y2 && b.y2 > q.y1);

  // Closest point on the box to the circle centre, which is the standard
  // circle-rectangle test and cheap enough to run for every candidate.
  const hitsCircle = (b: Box, self: number) =>
    circles.some((c, i) => {
      if (i === self) return false;
      const nx = Math.max(b.x1, Math.min(c.cx, b.x2));
      const ny = Math.max(b.y1, Math.min(c.cy, b.y2));
      return (c.cx - nx) ** 2 + (c.cy - ny) ** 2 < c.r ** 2;
    });

  return points.map((p, i) => {
    const { cx: rawX, cy: rawY, r: rawR } = circles[i]!;
    const cx = round(rawX);
    const cy = round(rawY);
    const r = round(rawR);

    const wide = textWidth(p.label, fontSize);
    const half = fontSize * 0.62;
    const mid = fontSize * 0.36;

    // Right, left, above, below, then the four diagonals. The first that
    // clears both the placed labels and every bubble wins.
    const candidates: { x: number; y: number; anchor: 'start' | 'end' }[] = [
      { x: cx + rawR + 5, y: cy + mid, anchor: 'start' },
      { x: cx - rawR - 5, y: cy + mid, anchor: 'end' },
      { x: cx + wide / 2, y: cy - rawR - 6, anchor: 'end' },
      { x: cx + wide / 2, y: cy + rawR + fontSize + 2, anchor: 'end' },
      { x: cx + rawR + 5, y: cy - rawR - 6, anchor: 'start' },
      { x: cx - rawR - 5, y: cy - rawR - 6, anchor: 'end' },
      { x: cx + rawR + 5, y: cy + rawR + fontSize + 2, anchor: 'start' },
      { x: cx - rawR - 5, y: cy + rawR + fontSize + 2, anchor: 'end' },
    ];

    const boxOf = (c: (typeof candidates)[number]): Box => {
      const x1 = c.anchor === 'start' ? c.x : c.x - wide;
      return { x1, y1: c.y - half, x2: x1 + wide, y2: c.y + half * 0.4 };
    };

    let chosen = candidates[0]!;
    let found = false;
    for (const c of candidates) {
      const box = boxOf(c);
      if (box.x1 < 0 || box.x2 > geom.width) continue;
      if (box.y1 < 0 || box.y2 > geom.height) continue;
      if (hitsBox(box) || hitsCircle(box, i)) continue;
      chosen = c;
      found = true;
      break;
    }

    if (!found) {
      throw new Error(
        `Scatter: no clear position for the label "${p.label}". The points are too crowded to ` +
          'label at this size: give the exhibit more height, shorten the labels, or use a table.',
      );
    }

    placed.push(boxOf(chosen));

    return {
      ...p,
      cx,
      cy,
      r,
      labelX: round(chosen.x),
      labelY: round(chosen.y),
      labelAnchor: chosen.anchor,
    };
  });
}

/* ---- Spread -------------------------------------------------------------- */

/**
 * Horizontal value ranges on a shared axis: the football field.
 *
 * Where RangeDot shows dispersion inside a population, this shows competing
 * estimates of one quantity, each carried with its own basis. A row may be a
 * range or a single point, and a threshold rule can mark the line that decides
 * something.
 */
export interface SpreadRow {
  label: string;
  low: number;
  /** Equal to `low` for a point estimate. */
  high: number;
  /** The reading, set at the end of the bar: "$31-38B". */
  value?: string;
  mark?: boolean;
  /** Drawn as an open reference rather than a measured range. */
  muted?: boolean;
}

export interface SpreadBar extends SpreadRow {
  x: number;
  width: number;
  y: number;
  /** True when the range is narrower than a drawable bar. */
  point: boolean;
  valueX: number;
}

export interface SpreadGeometry extends PlotGeometry {
  x1: number;
  x2: number;
  min: number;
  max: number;
}

export function spreadLayout(rows: readonly SpreadRow[], geom: SpreadGeometry): SpreadBar[] {
  assertOneMark(rows, 'Spread');
  if (rows.length === 0) throw new Error('Spread: no rows');
  if (rows.length > 9) throw new Error(`Spread: ${rows.length} rows, nine is the ceiling`);
  if (geom.max <= geom.min) throw new Error('Spread: the domain has no extent');

  const span = geom.x2 - geom.x1;
  const x = (v: number) => geom.x1 + ((v - geom.min) / (geom.max - geom.min)) * span;
  const gap = (geom.plotBottom - geom.plotTop) / rows.length;

  return rows.map((r, i) => {
    if (r.low > r.high) throw new Error(`Spread "${r.label}": low is above high`);
    if (r.low < geom.min || r.high > geom.max) {
      throw new Error(`Spread "${r.label}": ${r.low} to ${r.high} falls outside the axis`);
    }
    const x1 = x(r.low);
    const w = x(r.high) - x1;
    return {
      ...r,
      x: round(x1),
      width: round(Math.max(w, 2)),
      y: round(geom.plotTop + gap * i + gap / 2),
      point: w < 3,
      valueX: round(x1 + Math.max(w, 2) + 7),
    };
  });
}

/* ---- Distribution -------------------------------------------------------- */

/**
 * One distribution over a continuous numeric axis, drawn as a density curve or
 * as contiguous bins.
 *
 * The axis is a measured range and not a list of categories, and holding that
 * distinction is the whole reason this exhibit exists. Piece 001 drew ten
 * margin bands through `barsLayout`, which places a row by its rank in the
 * array: the bands happened to arrive in order, so the drawing was right by
 * luck rather than by construction, and a marker at the 25th percentile had
 * nowhere to go at all. Here every x is a value on the domain.
 */
export interface DistributionMarker {
  /** A value on the domain: a quantile, a threshold, a peer figure. */
  at: number;
  label: string;
  mark?: boolean;
}

export interface DistributionPlacement extends DistributionMarker {
  x: number;
  /** Height of the distribution at `at`, which is where a guide meets it. */
  y: number;
  /**
   * Baseline of the label, which is a property of the form and not of the
   * exhibit. A bin is filled with `--ct-ex-fill`, an opaque mid tone, so a
   * label laid over one is not quiet but gone, and it goes above the bin. The
   * area under a curve is `--ct-ex-fill-quiet`, a recessive tint, so a label
   * reads over it and sits at the foot of its own guide where it crowds
   * nothing. A marked label clears its own dot in both.
   */
  labelY: number;
}

export interface DistributionPoint {
  x: number;
  y: number;
}

export interface DistributionBin {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  /** Midpoint of the bin on the domain, so a bin can be named by value. */
  at: number;
}

export interface DistributionGeometry extends PlotGeometry {
  x1: number;
  x2: number;
  /** The measured range the values cover, low to high. */
  domain: [number, number];
  form?: 'curve' | 'bins';
  /** Top of the frequency axis, stated when two exhibits must share one. */
  max?: number;
  markers?: readonly DistributionMarker[];
}

export interface DistributionLayout {
  form: 'curve' | 'bins';
  points: DistributionPoint[];
  /** The polyline, ready for a `points` attribute. */
  path: string;
  /** The same line closed to the baseline, for the tint underneath it. */
  area: string;
  bins: DistributionBin[];
  markers: DistributionPlacement[];
  max: number;
}

export function distributionLayout(
  values: readonly number[],
  geom: DistributionGeometry,
): DistributionLayout {
  const markers = geom.markers ?? [];
  assertOneMark(markers, 'Distribution');

  const form = geom.form ?? 'curve';
  const [lo, hi] = geom.domain;
  if (!(hi > lo)) {
    throw new Error(`Distribution: the domain ${lo} to ${hi} does not run upward`);
  }
  if (values.length < 2) {
    throw new Error(
      `Distribution: ${values.length} value${values.length === 1 ? '' : 's'}. ` +
        'A distribution needs at least two.',
    );
  }
  if (values.some((v) => v < 0)) {
    throw new Error('Distribution: a frequency cannot be negative');
  }

  const span = geom.x2 - geom.x1;
  const depth = geom.plotBottom - geom.plotTop;
  // No axisTop here, deliberately. A frequency axis on a density carries no
  // ticks to round to and usually no scale at all: the shape is the reading.
  // Rounding the peak up would push the curve off the top of its own plot.
  const max = geom.max ?? Math.max(...values);
  if (max <= 0) throw new Error('Distribution: every value is zero');

  const onDomain = (v: number) => round(geom.x1 + ((v - lo) / (hi - lo)) * span);
  const height = (v: number) => (v / max) * depth;

  const points = values.map((v, i) => ({
    x: round(geom.x1 + (i / (values.length - 1)) * span),
    y: round(geom.plotBottom - height(v)),
  }));
  const path = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${path} ${geom.x2},${geom.plotBottom} ${geom.x1},${geom.plotBottom}`;

  let bins: DistributionBin[] = [];
  if (form === 'bins') {
    // Edges are computed once and each bin takes its width from the next
    // edge. Rounding an x and a width apart lets them disagree by a hundredth
    // and opens a hairline gap between bins, which is exactly the tell that
    // makes a histogram read as a row of separate bars.
    const edge = (i: number) => round(geom.x1 + (i / values.length) * span);
    if (span / values.length < 1) {
      throw new Error(
        `Distribution: ${values.length} bins across ${span} units is ` +
          `${round(span / values.length)} each, which paints as a solid block. ` +
          'Bin the data more coarsely, or draw it as a curve.',
      );
    }
    bins = values.map((v, i) => {
      const x = edge(i);
      const y = round(geom.plotBottom - height(v));
      return {
        x,
        y,
        width: round(edge(i + 1) - x),
        height: round(geom.plotBottom - y),
        value: v,
        at: lo + ((i + 0.5) / values.length) * (hi - lo),
      };
    });
  }

  const placed = markers.map((m) => {
    if (m.at < lo || m.at > hi) {
      throw new Error(
        `Distribution: marker "${m.label}" at ${m.at} is outside the domain ${lo} to ${hi}`,
      );
    }
    let y: number;
    if (form === 'bins') {
      const i = Math.min(
        Math.floor(((m.at - lo) / (hi - lo)) * values.length),
        values.length - 1,
      );
      y = bins[i]!.y;
    } else {
      // A guide meets the curve, not the floor. Dropping it to the baseline
      // would say the distribution is empty at its own median.
      const t = ((m.at - lo) / (hi - lo)) * (values.length - 1);
      const i = Math.min(Math.floor(t), values.length - 2);
      const a = points[i]!.y;
      const b = points[i + 1]!.y;
      y = round(a + (b - a) * (t - i));
    }
    const labelY = m.mark
      ? round(y - 12)
      : form === 'bins'
        ? round(y - 8)
        : geom.plotBottom - 6;
    return { ...m, x: onDomain(m.at), y, labelY };
  });

  return { form, points, path, area, bins, markers: placed, max };
}

/* ---- Timeline ------------------------------------------------------------ */

/**
 * Events along a horizontal axis, for a chronology whose spacing carries
 * meaning: three events in one quarter and then eighteen months of nothing is
 * the finding, and a list cannot show it.
 *
 * Labels alternate above and below the spine so a dense cluster stays legible.
 */
export interface TimelineEvent {
  label: string;
  /** Any monotonic number: a year, a quarter index, a month count. */
  at: number;
  /** The date as it should read: "Feb 2023". */
  when?: string;
  mark?: boolean;
}

export interface TimelineNode extends TimelineEvent {
  x: number;
  /** Whether the label sits above or below the spine. */
  above: boolean;
  /**
   * Centre of the label block, pulled back inside the drawing when the event
   * sits near an edge. Separate from `x` so the tick still points at the date.
   */
  labelX: number;
  /** Baseline of the label block. */
  labelY: number;
  whenY: number;
  tickTop: number;
  tickBottom: number;
  /** 0, 2 or 4: how far out of the spine this label had to be pushed. */
  tier: number;
}

export interface TimelineGeometry {
  width: number;
  height: number;
  min: number;
  max: number;
  x1: number;
  x2: number;
  /** Where the spine sits. */
  spineY: number;
  fontSize?: number;
  /**
   * How far a tier-0 label sits off the spine, and what each further tier
   * adds. Both were fixed at 18 and 30, sized for the shortest timeline the
   * deck had. On a tall exhibit that left the labels crowded against the line
   * with the rest of the zone empty, so the caller now sets them from the
   * height it actually has.
   */
  reach?: number;
  tierStep?: number;
}

export function timelineLayout(
  events: readonly TimelineEvent[],
  geom: TimelineGeometry,
): TimelineNode[] {
  assertOneMark(events, 'Timeline');
  if (events.length === 0) throw new Error('Timeline: no events');
  if (events.length > 10) throw new Error(`Timeline: ${events.length} events, ten is the ceiling`);
  if (geom.max <= geom.min) throw new Error('Timeline: the span has no extent');

  const sorted = [...events].sort((a, b) => a.at - b.at);
  const x = (v: number) => geom.x1 + ((v - geom.min) / (geom.max - geom.min)) * (geom.x2 - geom.x1);
  const fontSize = geom.fontSize ?? 11;

  // Labels alternate above and below the spine, and a label that would still
  // land on its neighbour on that side is pushed out to a second tier with a
  // longer tick. Without this, a cluster of events inside one quarter, which
  // is exactly the shape a workout produces, sets three labels on top of each
  // other.
  const lastRight: number[] = [];
  const tiers: number[] = [];

  sorted.forEach((e, i) => {
    if (e.at < geom.min || e.at > geom.max) {
      throw new Error(`Timeline "${e.label}": ${e.at} falls outside the span`);
    }
    const side = i % 2 === 0 ? 0 : 1;
    const half = Math.max(textWidth(e.label, fontSize), textWidth(e.when ?? '', fontSize)) / 2;
    const left = x(e.at) - half;

    // Tier 0 for this side, then 2, then 4: each side keeps its own cursor.
    let tier = 0;
    while (tier < 6) {
      const key = side + tier;
      const prev = lastRight[key];
      if (prev === undefined || left > prev + 8) break;
      tier += 2;
    }
    if (tier >= 6) {
      throw new Error(
        `Timeline: "${e.label}" cannot be placed without overlapping its neighbours. ` +
          'Shorten the labels, widen the exhibit, or drop an event.',
      );
    }
    lastRight[side + tier] = x(e.at) + half;
    tiers[i] = tier;
  });

  const base = geom.reach ?? 18;
  const step = geom.tierStep ?? 30;

  return sorted.map((e, i) => {
    const above = i % 2 === 0;
    const tier = tiers[i]!;
    // Each tier out adds a full label block, so a pushed label clears the one
    // it was colliding with rather than merely shifting.
    const reach = base + (tier / 2) * step;
    const whenOffset = above ? -(reach + 2) : reach + fontSize;
    const half = Math.max(textWidth(e.label, fontSize), textWidth(e.when ?? '', fontSize)) / 2;
    if (half * 2 > geom.width) {
      throw new Error(`Timeline: "${e.label}" is wider than the whole drawing`);
    }
    return {
      ...e,
      x: round(x(e.at)),
      labelX: round(Math.min(Math.max(x(e.at), half + 2), geom.width - half - 2)),
      above,
      labelY: round(geom.spineY + whenOffset + (above ? -14 : 14)),
      whenY: round(geom.spineY + whenOffset),
      tickTop: round(above ? geom.spineY - reach : geom.spineY),
      tickBottom: round(above ? geom.spineY : geom.spineY + reach),
      tier,
    };
  });
}

/* ---- Plot band ----------------------------------------------------------- */

/**
 * Where a plot axis sits inside a drawing, as a share of its width.
 *
 * RangeDot and Slope reserve a gutter for row labels on the left and for value
 * labels on the right, and the axis lives between them. Those positions were
 * written as pixel constants sized for a 356px drawing, so when the exhibits
 * were widened the plots stayed where they were and left half the canvas empty.
 * Proportions travel; pixel constants do not.
 */
export function plotBand(width: number, left: number, right: number) {
  if (!(left > 0 && left < right && right <= 1)) {
    throw new Error(
      `plotBand: ${left} to ${right} is not a band inside the drawing`,
    );
  }
  return { x1: Math.round(width * left), x2: Math.round(width * right) };
}

/* ---- Callout ------------------------------------------------------------- */

/**
 * An on-chart annotation: a leader line from a data point to a short reading
 * stated at that point ("The best branches reach 13.7%"). The highest-value
 * device on a real analytical page, per the ExampleSlides read: a chart with
 * no annotation makes the reader do the work the analyst already did.
 *
 * A page names the item and supplies the reading; the exhibit resolves the
 * anchor. This function only places text and draws the leader, so it can be
 * tested without rendering.
 */
export interface CalloutSpec {
  /** Label of the item the leader points at. Resolved by each exhibit. */
  at: string;
  /** The reading. One or two short lines. */
  lines: string[];
  side?: CalloutSide;
  /**
   * How far the leader runs before the text starts, overriding the exhibit's
   * default of roughly two line-heights.
   *
   * The default sets the reading immediately beside the point it annotates,
   * which is right when the chart is busy and wrong when it is not: on a
   * sparse line chart it drops the text on top of the series while a third of
   * the plot sits empty. John, 2026-08-26: "in cases where there's plenty of
   * room on the chart itself for the callout to live, there's no reason why it
   * should be just confined to sit right over the line of data ... still have
   * that line that goes to the point that it's referring to." Give it the
   * distance to the open space and the leader stays attached.
   */
  reach?: number;
}

export type CalloutSide = 'left' | 'right' | 'above' | 'below';

export interface CalloutGeometry {
  width: number;
  height: number;
  /** Text size in user units. Must match --text-xs. */
  fontSize: number;
  /** Baseline to baseline between the two lines. */
  lineHeight: number;
  /** How far the leader runs from the anchor before the text begins. */
  reach: number;
}

export interface CalloutLayout {
  texts: { text: string; x: number; y: number }[];
  align: 'start' | 'end' | 'middle';
  leader: { x1: number; y1: number; x2: number; y2: number };
}

/** Distance from the leader's end to the first glyph. */
const CALLOUT_GAP = 5;

export function calloutLayout(
  anchor: { x: number; y: number },
  spec: { lines: readonly string[]; side: CalloutSide },
  geom: CalloutGeometry,
): CalloutLayout {
  if (spec.lines.length === 0) throw new Error('Callout: no lines');
  if (spec.lines.length > 2) {
    throw new Error('Callout: two lines is the ceiling; a longer reading belongs in the commentary');
  }

  const widest = Math.max(...spec.lines.map((l) => textWidth(l, geom.fontSize)));
  const n = spec.lines.length;
  // Cap height over the baseline, the part of a line that matters for bounds.
  const cap = geom.fontSize * 0.72;

  const outside = () =>
    new Error('Callout: the text runs off the drawing; shorten the reading or change sides');

  if (spec.side === 'left' || spec.side === 'right') {
    const dir = spec.side === 'left' ? -1 : 1;
    const xEnd = anchor.x + dir * geom.reach;
    const xText = xEnd + dir * CALLOUT_GAP;
    const extent = xText + dir * widest;
    if (extent < 0 || extent > geom.width) throw outside();

    // The block centres vertically on the anchor.
    const first = anchor.y + cap / 2 - ((n - 1) * geom.lineHeight) / 2;
    if (first - cap < 0 || first + (n - 1) * geom.lineHeight > geom.height) throw outside();

    return {
      texts: spec.lines.map((text, i) => ({ text, x: round(xText), y: round(first + i * geom.lineHeight) })),
      align: spec.side === 'left' ? 'end' : 'start',
      leader: { x1: round(anchor.x), y1: round(anchor.y), x2: round(xEnd), y2: round(anchor.y) },
    };
  }

  // Above or below: the leader is vertical and the text centres on the anchor,
  // pulled back inside the drawing when the anchor sits near an edge. A pulled
  // block slants the leader to the text's centre rather than leaving it
  // pointing at nothing.
  if (widest + 4 > geom.width) throw outside();
  const dir = spec.side === 'above' ? -1 : 1;
  const yEnd = anchor.y + dir * geom.reach;
  const cx = Math.min(Math.max(anchor.x, widest / 2 + 2), geom.width - widest / 2 - 2);
  const first =
    spec.side === 'below'
      ? yEnd + CALLOUT_GAP + cap
      : yEnd - CALLOUT_GAP - (n - 1) * geom.lineHeight;
  if (first - cap < 0 || first + (n - 1) * geom.lineHeight > geom.height) throw outside();

  return {
    texts: spec.lines.map((text, i) => ({ text, x: round(cx), y: round(first + i * geom.lineHeight) })),
    align: 'middle',
    leader: { x1: round(anchor.x), y1: round(anchor.y), x2: round(cx), y2: round(yEnd) },
  };
}

/* ---- Phases -------------------------------------------------------------- */

export interface Phase {
  label: string;
  /** Any unit. Widths are proportional to this, never to the label. */
  weight: number;
  /** Sub-label under the band: "Weeks 1–2". */
  span?: string;
  mark?: boolean;
}

export interface PhaseBand extends Phase {
  x: number;
  width: number;
  /** Where the label starts. The band's own x, unless that would clip. */
  labelX: number;
  /** Where the span starts, under the band. Same rule as the label. */
  spanX: number;
}

export interface PhaseGeometry {
  width: number;
  /** Space between bands. Comes off the total before anything is allocated. */
  gap: number;
  /** Label font size, in user units. Must match --text-sm. */
  labelSize: number;
  /** Span font size, in user units. Must match --text-xs. */
  spanSize: number;
}

/**
 * A conservative advance width, in ems per character.
 *
 * Every label and span in the system was measured in the browser at the size
 * it renders: the widest ran 0.604 em per character. This carries headroom
 * over that. The number is only ever used to pull a label back inside the
 * exhibit, so overestimating shifts a label a few units left and
 * underestimating clips it. It is meant to sit high.
 */
const EM_PER_CHAR = 0.62;

/** An upper bound on how wide a run of text will set, in user units. */
export const textWidth = (text: string, fontSize: number) =>
  round(text.length * fontSize * EM_PER_CHAR);

/**
 * Text sits above its own band, which works until the band is the last one
 * and the word is longer than the band is wide. Then the text runs past the
 * right edge of the viewBox and the SVG clips it. Pull it back to the edge.
 */
const clampText = (x: number, text: string, fontSize: number, width: number) =>
  round(Math.max(0, Math.min(x, width - textWidth(text, fontSize))));

/**
 * A proportional band, for how a fixed total divides. The point of the exhibit
 * is that width means something, so the gaps are taken out of the total first
 * and never out of the individual shares.
 */
export function phaseLayout(phases: readonly Phase[], geom: PhaseGeometry): PhaseBand[] {
  assertOneMark(phases, 'Phases');
  if (phases.length === 0) throw new Error('Phases: no phases');
  const total = phases.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) throw new Error('Phases: weights sum to zero');

  const available = geom.width - geom.gap * (phases.length - 1);
  if (available <= 0) throw new Error('Phases: gaps consume the whole width');

  let x = 0;
  const bands = phases.map((p) => {
    const width = (p.weight / total) * available;
    const band = {
      ...p,
      x: round(x),
      width: round(width),
      labelX: clampText(x, p.label, geom.labelSize, geom.width),
      spanX: clampText(x, p.span ?? '', geom.spanSize, geom.width),
    };
    x += width + geom.gap;
    return band;
  });

  assertNoCollision(bands, geom);
  return bands;
}

/**
 * Pulling a label back off the right edge can walk it into the label before
 * it, which is a quieter failure than clipping and a worse one: two words run
 * together and the exhibit still looks deliberate. There is no layout answer
 * once the text is wider than the bands underneath it, so refuse the exhibit
 * and make the copy shorter or the exhibit wider.
 */
function assertNoCollision(bands: readonly PhaseBand[], geom: PhaseGeometry): void {
  for (let i = 0; i < bands.length - 1; i++) {
    const left = bands[i]!;
    const right = bands[i + 1]!;

    const labelEnd = left.labelX + textWidth(left.label, geom.labelSize);
    if (labelEnd + geom.gap > right.labelX) {
      throw new Error(
        `Phases: the labels "${left.label}" and "${right.label}" collide. ` +
          'Their bands cannot carry words that long side by side.',
      );
    }

    if (!left.span || !right.span) continue;
    const spanEnd = left.spanX + textWidth(left.span, geom.spanSize);
    if (spanEnd + geom.gap > right.spanX) {
      throw new Error(
        `Phases: the spans "${left.span}" and "${right.span}" collide. ` +
          'Their bands cannot carry runs that long side by side.',
      );
    }
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
