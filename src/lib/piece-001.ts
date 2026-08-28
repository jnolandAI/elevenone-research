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

/** Nine ten-point bands. The finding is that none of them is a middle. */
export const bands = (() => {
  const edges = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const labels = [
    'Below 10%', '10 to 20%', '20 to 30%', '30 to 40%', '40 to 50%',
    '50 to 60%', '60 to 70%', '70 to 80%', 'Above 80%',
  ];
  return labels.map((label, i) => {
    const lo = i === 0 ? X0 : edges[i]!;
    const hi = i === labels.length - 1 ? X1 : edges[i + 1]!;
    const count = below(hi) - below(lo);
    return { label, value: pct(count), count: Math.round(count) };
  });
})();

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
