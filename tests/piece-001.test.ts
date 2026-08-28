import { describe, it, expect } from 'vitest';
import { bands, bandDomain, bandsIn, filersIn, q } from '../src/lib/piece-001';
import data from '../public/assets/data/margin-cy2024.json';

/**
 * The bands behind piece 001's exhibit 1.
 *
 * They were nine buckets of unequal width, drawn through `Bars`, where the
 * outer two collapsed a tail: below 10 per cent ran from the data floor at
 * -5 and above 80 ran to 100, so the first was 15 points wide and the last
 * 20. A categorical bar makes no claim about interval width and that was
 * honest. A histogram does, and drawing those nine as equal rects would be
 * the staircase defect the form inventory records: step widths that are not
 * to scale but read as quantitative.
 */
describe('the margin bands', () => {
  const [lo, hi] = bandDomain;

  it('runs every band exactly ten points wide, which is what lets it be drawn', () => {
    const width = ((hi - lo) / bands.length) * 100;
    expect(width).toBeCloseTo(10, 10);
  });

  it('covers the whole universe, so the exhibit drops no filer', () => {
    const counted = bands.reduce((sum, b) => sum + b.count, 0);
    // Counts are rounded per band off an interpolated cumulative, so the sum
    // carries at most half a filer of rounding per band.
    expect(Math.abs(counted - data.n)).toBeLessThanOrEqual(bands.length / 2);
    expect(lo).toBeLessThanOrEqual(-0.05);
    expect(hi).toBeGreaterThanOrEqual(1.0);
  });

  it('orders the bands along the axis and never by size', () => {
    // The property Bars could not give this exhibit: a ranked bar places a
    // row by its position in the array, so an axis order is a coincidence
    // there and a guarantee here.
    const peak = bands.findIndex((b) => b.value === Math.max(...bands.map((x) => x.value)));
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(bands.length - 1);
    for (let i = 0; i < bands.length - 1; i++) {
      expect(bands[i]!.lo, bands[i]!.label).toBeLessThan(bands[i + 1]!.lo);
    }
  });

  it('holds the claim the page title makes: no band reaches one filer in six', () => {
    const tallest = Math.max(...bands.map((b) => b.value));
    expect(tallest).toBeLessThan(100 / 6);
    expect(tallest).toBeGreaterThan(15);
  });

  it("puts the median outside the tallest band, which is the piece's argument", () => {
    // `q` is in percentage points and the band edges are fractions. Written
    // as `q.p50 > tallest.hi` this passed by comparing 38.8 against 0.3, and
    // would have passed against any band on the axis. The exhibit's own domain
    // guard is what caught the same mix-up on the page.
    const tallest = bands.find((b) => b.value === Math.max(...bands.map((x) => x.value)))!;
    expect(q.p50 / 100).toBeGreaterThan(tallest.hi);
    expect(q.p50 / 100).toBeLessThan(tallest.hi + 0.1);
  });
});

/**
 * The claims the page states in words, pinned to the data that produces them.
 *
 * These were written against band positions in an array: `bands[4] + bands[5]
 * + bands[6]`, which meant 40 to 70 per cent only for as long as the first
 * band started at zero. Re-banding the exhibit shifted every index by one and
 * would have left three sentences quietly describing different ranges. Stated
 * as ranges they cannot drift, and one of them turned out to be wrong.
 */
describe('the claims the page makes about the bands', () => {
  const mean = (lo: number, hi: number) => filersIn(lo, hi) / bandsIn(lo, hi).length;

  it('selects bands by interval, so a claim cannot drift when the banding changes', () => {
    expect(bandsIn(0.4, 0.7).map((b) => b.label)).toEqual([
      '40 to 50%',
      '50 to 60%',
      '60 to 70%',
    ]);
    expect(bandsIn(0.2, 0.4)).toHaveLength(2);
  });

  it('thins through the middle per band, which is the gap the piece argues', () => {
    // The page said the 40-to-70 stretch holds "fewer" filers than the two
    // bands below it. It does not: 709 against 702. Three bands against two
    // is not a comparison, and the true statement is the per-band one, which
    // is stronger than the sentence it replaces.
    expect(filersIn(0.4, 0.7)).toBeGreaterThan(filersIn(0.2, 0.4));
    expect(mean(0.4, 0.7)).toBeLessThan(mean(0.2, 0.4) * 0.75);
  });

  it('holds more above 70% than below 10%', () => {
    expect(filersIn(0.7, 1.0)).toBeGreaterThan(filersIn(bandDomain[0], 0.1));
  });
});
