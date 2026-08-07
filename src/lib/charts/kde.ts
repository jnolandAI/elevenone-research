import { AXIS, GUIDE, TICK, CURVE, INK, FILL_MID, FILL_EDGE } from '../chart-tones';
import { SANS, esc, pct, type MarginDataset } from '../dataset';
import { spline } from './spline';

const W = 620, H = 252, L = 6, R = W - 6, T = 32, B = H - 38;

/**
 * Gaussian kernel density across the whole universe, bandwidth by Silverman's
 * rule, computed upstream and carried in the dataset. Quartiles marked on the
 * axis, median marked once on the curve with one small solid dot.
 */
export function densityFigure(d: MarginDataset): string {
  const K = d.kde, NK = d.kde_n, x0 = d.kde_x0, x1 = d.kde_x1;
  const max = Math.max(...K);
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (R - L);

  const pts: [number, number][] = [];
  for (let i = 0; i < NK; i++) {
    pts.push([L + (i / (NK - 1)) * (R - L), B - (K[i]! / max) * (B - T)]);
  }
  const line = spline(pts);
  const area = `${line}L${R},${B}L${L},${B}Z`;

  const yAt = (x: number) => {
    for (let i = 0; i < NK - 1; i++) {
      if (pts[i]![0] <= x && pts[i + 1]![0] >= x) {
        const f = (x - pts[i]![0]) / (pts[i + 1]![0] - pts[i]![0]);
        return pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * f;
      }
    }
    return B;
  };

  let guides = '';
  for (const [k, label] of [['p25', '25th'], ['p75', '75th']] as const) {
    const x = X(d.q[k]);
    guides +=
      `<line x1="${x.toFixed(1)}" y1="${yAt(x).toFixed(1)}" x2="${x.toFixed(1)}" y2="${B}" ` +
      `stroke="${GUIDE}" stroke-width="1" stroke-dasharray="2 4"/>` +
      `<text x="${(x + 5).toFixed(1)}" y="${B - 6}" fill="${TICK}" font-family="${SANS}" ` +
      `font-size="10">${label} ${pct(d.q[k])}</text>`;
  }

  const mx = X(d.q.p50), my = yAt(mx);
  const label = esc(
    `Kernel density of reported gross margin across ${d.n_kept.toLocaleString('en-US')} SEC ` +
    `registrants. A broad main mass below 40 percent and a distinct shoulder in the high ` +
    `seventies. Median ${(d.q.p50 * 100).toFixed(1)} percent.`,
  );

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}"><defs>
<linearGradient id="kde-fill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#3C3C3A" stop-opacity=".16"/>
<stop offset="62%" stop-color="${FILL_MID}" stop-opacity=".05"/>
<stop offset="100%" stop-color="${FILL_EDGE}" stop-opacity="0"/></linearGradient></defs>
<path d="${area}" fill="url(#kde-fill)"/>${guides}
<path d="${line}" fill="none" stroke="${CURVE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="${AXIS}" stroke-width="1"/>
<line x1="${mx.toFixed(1)}" y1="${(my + 4).toFixed(1)}" x2="${mx.toFixed(1)}" y2="${B}" stroke="#7D7D7D" stroke-width="1"/>
<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3.4" fill="${INK}"/>
<text x="${mx.toFixed(1)}" y="${(my - 12).toFixed(1)}" text-anchor="middle" fill="${INK}" font-family="${SANS}" font-size="11.5" font-weight="600">Median ${(d.q.p50 * 100).toFixed(1)}%</text>
<text x="${L}" y="${H - 11}" fill="${TICK}" font-family="${SANS}" font-size="10.5">0% gross margin</text>
<text x="${R}" y="${H - 11}" text-anchor="end" fill="${TICK}" font-family="${SANS}" font-size="10.5">100%</text></svg>`;
}
