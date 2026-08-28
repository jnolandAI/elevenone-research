import data from '../../public/assets/data/margin-cy2024.json';

/**
 * The figures behind piece 001, derived from the same committed dataset the
 * web brief reads. Nothing here is typed in by hand: every number on a slide
 * comes through this module, so the piece and the brief cannot drift.
 *
 * The one derived quantity is the band share below. `hist` is 40 counts and
 * the file does not record its edges, so they are recovered: the array sums
 * to n, and a linear read of the cumulative counts over the span -0.05 to
 * 1.00 reproduces all five recorded percentiles to within 0.2 points, which
 * two independent quantiles would not do by coincidence. That is the same
 * interpolation the brief already declares for its one-in-six figure, and it
 * carries the same precision: good to about a point.
 */
const X0 = -0.05;
const X1 = 1.0;
const W = (X1 - X0) / data.nbins;

const cumulative: number[] = [];
{
  let running = 0;
  for (const h of data.hist) {
    running += h;
    cumulative.push(running);
  }
}

/** Filers reporting a margin at or below `m`, interpolated inside a bin. */
function below(m: number): number {
  const t = (m - X0) / W;
  if (t <= 0) return 0;
  if (t >= data.nbins) return data.n;
  const i = Math.floor(t);
  const lo = i === 0 ? 0 : cumulative[i - 1]!;
  return lo + (t - i) * data.hist[i]!;
}

const pct = (n: number) => (n / data.n) * 100;

export const universe = {
  kept: data.n_kept,
  excluded: data.n_excluded,
  screened: data.n_kept + data.n_excluded,
  source: data.source,
  retrieved: data.retrieved,
  aboveSeventy: data.n_above_70,
  aboveSeventyShare: pct(data.n_above_70),
};

export const q = {
  p10: data.q.p10 * 100,
  p25: data.q.p25 * 100,
  p50: data.q.p50 * 100,
  p75: data.q.p75 * 100,
  p90: data.q.p90 * 100,
};

export const widths = {
  /** Eight filers in ten fall inside this many points. */
  p10p90: q.p90 - q.p10,
  /** Half of them fall inside this many points. */
  iqr: q.p75 - q.p25,
  /** Share sitting within five points either side of the median. */
  withinFive: pct(below(data.q.p50 + 0.05) - below(data.q.p50 - 0.05)),
};

/**
 * The axis the bands sit on: -10 to 100 per cent, eleven bands of ten points.
 *
 * It was nine bands over the data's own span, with the outer two collapsing a
 * tail: below 10 ran from the -5 floor and above 80 ran to 100, so those two
 * were 15 and 20 points wide against ten for the rest. Drawn through `Bars`
 * that was honest, because a categorical bar claims nothing about interval
 * width. Drawn as a histogram it would not be: unequal intervals at equal
 * widths is the staircase defect, step sizes that are not to scale and read
 * as quantitative anyway. Extending the axis to -10 rather than dropping the
 * sub-zero filers keeps every one of the 2,186 on the exhibit.
 */
export const bandDomain: [number, number] = [-0.1, 1.0];

/** Eleven ten-point bands. The finding is that none of them is a middle. */
export const bands = (() => {
  const [start, end] = bandDomain;
  const step = 0.1;
  const n = Math.round((end - start) / step);
  return Array.from({ length: n }, (_, i) => {
    const lo = start + i * step;
    const hi = lo + step;
    const count = below(hi) - below(lo);
    return {
      label: `${Math.round(lo * 100)} to ${Math.round(hi * 100)}%`,
      lo,
      hi,
      value: pct(count),
      count: Math.round(count),
    };
  });
})();

/** The band holding more of the universe than any other. */
export const tallestBand = bands.reduce((a, b) => (b.value > a.value ? b : a));

/**
 * The bands whose whole interval lies inside [lo, hi].
 *
 * Prose about the bands selects through this rather than by array position.
 * An index means a range only for as long as the banding does not change, and
 * when it did, three sentences on the piece would have gone on reading as
 * though they still described the ranges they were written for.
 */
export const bandsIn = (lo: number, hi: number) =>
  bands.filter((b) => b.lo >= lo - 1e-9 && b.hi <= hi + 1e-9);

/** Filers inside [lo, hi], summed from the bands the exhibit draws. */
export const filersIn = (lo: number, hi: number) =>
  bandsIn(lo, hi).reduce((sum, b) => sum + b.count, 0);

/** The two concentrations on the revenue and margin surface. */
export const modes = {
  main: {
    margin: data.peak.margin * 100,
    revenue: data.peak.rev,
    inCell: data.peak.band_count,
  },
  second: {
    margin: data.ridge.margin * 100,
    revenue: data.ridge.rev,
    inCell: data.ridge.band_count,
  },
};

/**
 * Six equal-count revenue cohorts. `deciles` runs min, p10 through p90, max,
 * so index 1 is p10, index 5 the median and index 9 p90.
 */
export const cohorts = data.series6.map((s) => ({
  label: s.label,
  n: s.n,
  p10: s.deciles[1]! * 100,
  median: s.deciles[5]! * 100,
  p90: s.deciles[9]! * 100,
  spread: (s.deciles[9]! - s.deciles[1]!) * 100,
}));

export const one = (v: number, digits = 1) => v.toFixed(digits);

/** "$654m", "$1.44bn". Revenue is the only quantity here that is not a share. */
export function money(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}bn`;
  return `$${Math.round(v / 1e6)}m`;
}
