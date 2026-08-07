import { TONES, AXIS, TICK, INK } from '../chart-tones';
import { SANS, MONO, esc, pct, type MarginDataset } from '../dataset';

const W = 620, H = 236, L = 118, R = W - 46, T = 14;

/**
 * The same six cohorts as ranges rather than curves. Light track is the tenth
 * to ninetieth percentile, the darker band is the interquartile range, the dot
 * is the median. Read the tracks rather than the dots: the dots move around,
 * the tracks shorten in order.
 */
export function rangeFigure(d: MarginDataset): string {
  const C = d.cohorts;
  const rowH = (H - T - 32) / C.length;
  const X = (v: number) => L + v * (R - L);
  let out = '';

  C.forEach((c, i) => {
    const y = T + i * rowH + rowH / 2;
    out += `<line x1="${L}" y1="${y.toFixed(1)}" x2="${R}" y2="${y.toFixed(1)}" stroke="${TONES[1]}" stroke-width="1"/>`;
    out +=
      `<rect x="${X(c.p10).toFixed(1)}" y="${(y - 2.5).toFixed(1)}" ` +
      `width="${(X(c.p90) - X(c.p10)).toFixed(1)}" height="5" rx="2.5" fill="${TONES[4]}"/>`;
    out +=
      `<rect x="${X(c.p25).toFixed(1)}" y="${(y - 5).toFixed(1)}" ` +
      `width="${(X(c.p75) - X(c.p25)).toFixed(1)}" height="10" rx="5" fill="${TONES[7]}"/>`;
    out += `<circle cx="${X(c.p50).toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="${INK}"/>`;
    // knockout ring rather than a shadow: the dot has to read against the band
    out += `<circle cx="${X(c.p50).toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="none" stroke="#FAFAF9" stroke-width="1.4"/>`;
    out +=
      `<text x="${L - 12}" y="${(y + 3.6).toFixed(1)}" text-anchor="end" fill="${TONES[8]}" ` +
      `font-family="${SANS}" font-size="10.5">${esc(c.label)}</text>`;
    out +=
      `<text x="${R + 8}" y="${(y + 3.6).toFixed(1)}" fill="${INK}" font-family="${MONO}" ` +
      `font-size="9.5" font-weight="400">${pct(c.p50)}</text>`;
  });

  const yb = T + C.length * rowH + 6;
  out += `<line x1="${L}" y1="${yb.toFixed(1)}" x2="${R}" y2="${yb.toFixed(1)}" stroke="${AXIS}" stroke-width="1"/>`;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    out +=
      `<line x1="${X(v).toFixed(1)}" y1="${yb.toFixed(1)}" x2="${X(v).toFixed(1)}" y2="${(yb + 4).toFixed(1)}" stroke="${AXIS}" stroke-width="1"/>` +
      `<text x="${X(v).toFixed(1)}" y="${(yb + 16).toFixed(1)}" text-anchor="middle" fill="${TICK}" ` +
      `font-family="${MONO}" font-weight="300" font-size="9">${pct(v)}</text>`;
  }

  const spanPct = (c: (typeof C)[number]) => ((c.p90 - c.p10) * 100).toFixed(1);
  const label = esc(
    'Percentile ranges by revenue cohort. The tenth to ninetieth percentile span runs ' +
    `${spanPct(C[0]!)} percent in the smallest cohort to ${spanPct(C[C.length - 1]!)} percent in the largest.`,
  );
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${out}</svg>`;
}
