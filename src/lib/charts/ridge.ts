import { TONES, AXIS, TICK, INK } from '../chart-tones';
import { SANS, MONO, esc, pct, type MarginDataset } from '../dataset';
import { spline } from './spline';

const W = 620, H = 250, L = 118, R = W - 16, TOP = 18, BOT = H - 38;

/**
 * One density per cohort on a shared scale, so the heights compare. Overlap is
 * the point: it shows where the cohorts agree and where they separate.
 * Densities are normalised, so a taller ridge means tighter clustering rather
 * than more filers.
 */
export function ridgeFigure(d: MarginDataset): string {
  const C = d.cohorts;
  const NK = C[0]!.kde.length;
  let gk = 0;
  for (const c of C) for (const v of c.kde) if (v > gk) gk = v;

  const step = (BOT - TOP) / (C.length - 1);
  const amp = step * 1.55;
  const X = (v: number) => L + ((v - d.kde_x0) / (d.kde_x1 - d.kde_x0)) * (R - L);

  let out = '';
  const ticks: [number, number][] = [];

  for (let i = 0; i < C.length; i++) {
    const c = C[i]!;
    const base = TOP + i * step;
    const pts: [number, number][] = [];
    for (let k = 0; k < NK; k++) {
      pts.push([L + (k / (NK - 1)) * (R - L), base - (c.kde[k]! / gk) * amp]);
    }
    const curve = spline(pts);
    const tone = TONES[4 + Math.round((i / (C.length - 1)) * 6)]!;
    // an opaque base so a nearer ridge occludes the one behind it
    out += `<path d="${curve}L${R},${base}L${L},${base}Z" fill="#FCFCFB"/>`;
    out += `<path d="${curve}" fill="none" stroke="${tone}" stroke-width="1.25" stroke-linejoin="round"/>`;
    ticks.push([X(c.p50), base]);
    out +=
      `<text x="${L - 13}" y="${(base - 1).toFixed(1)}" text-anchor="end" fill="${TONES[8]}" ` +
      `font-family="${SANS}" font-size="10.5">${esc(c.label)}</text>`;
  }

  for (const [mx, base] of ticks) {
    out +=
      `<line x1="${mx.toFixed(1)}" y1="${(base - 5).toFixed(1)}" x2="${mx.toFixed(1)}" ` +
      `y2="${(base + 1).toFixed(1)}" stroke="${INK}" stroke-width="1.4"/>`;
  }

  out += `<line x1="${L}" y1="${BOT}" x2="${R}" y2="${BOT}" stroke="${AXIS}" stroke-width="1"/>`;
  for (const v of [0, 0.5, 1]) {
    out +=
      `<line x1="${X(v).toFixed(1)}" y1="${BOT}" x2="${X(v).toFixed(1)}" y2="${BOT + 4}" stroke="${AXIS}" stroke-width="1"/>` +
      `<text x="${X(v).toFixed(1)}" y="${BOT + 16}" text-anchor="middle" fill="${TICK}" ` +
      `font-family="${MONO}" font-weight="300" font-size="9">${pct(v)}</text>`;
  }
  out +=
    `<text x="${R}" y="${H - 3}" text-anchor="end" fill="${TICK}" font-family="${SANS}" ` +
    `font-size="9.5">tick marks each median</text>`;

  const label = esc(
    'One density curve per revenue cohort on a shared scale. The largest cohort sits lowest and narrowest.',
  );
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${out}</svg>`;
}
