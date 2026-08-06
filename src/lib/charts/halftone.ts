import type { MarginDataset } from '../dataset';

export interface FieldOpts {
  w: number; h: number; cols: number; rows: number;
  rmax: number; ink: string; alpha: number;
}

/**
 * Below the breakpoint the field is a band in the flow, so it is drawn coarser
 * and darker: 196 columns scaled to 390px is a grey smear, not a halftone.
 */
export const HERO_WIDE: FieldOpts =
  { w: 760, h: 360, cols: 120, rows: 52, rmax: 3.1, ink: '#575755', alpha: 0.72 };
export const HERO_NARROW: FieldOpts =
  { w: 660, h: 300, cols: 92, rows: 42, rmax: 3.3, ink: '#4E4E4C', alpha: 0.80 };

/**
 * The data surface: revenue increasing left to right on a log scale, gross
 * margin rising front to back, dot area standing for how many companies fall
 * in each cell. Dot area carries the value, never opacity, which is the rule
 * the imagery engine works to.
 *
 * Decorative by intent. It is the surface the brief describes rather than a
 * figure to read values from, and the axis key in the prose carries the
 * meaning, so it is hidden from assistive technology.
 */
export function dotField(d: MarginDataset, o: FieldOpts): string {
  const G = d.grid, RS = d.rows, CS = d.cols;
  let gmax = 0;
  for (const row of G) for (const v of row) if (v > gmax) gmax = v;

  const val = (r: number, c: number) =>
    G[Math.max(0, Math.min(RS - 1, r))]![Math.max(0, Math.min(CS - 1, c))]! / gmax;
  const fade = (u: number) => Math.min(1, Math.min(u, 1 - u) / 0.14);

  let s = '';
  for (let r = 0; r < o.rows; r++) {
    for (let c = 0; c < o.cols; c++) {
      const u = c / (o.cols - 1), v = r / (o.rows - 1);
      const density = val(Math.round(v * (RS - 1)), Math.round(u * (CS - 1))) * fade(u);
      if (density < 0.012) continue;
      const rad = Math.pow(density, 0.55) * o.rmax;
      if (rad < 0.22) continue;
      s +=
        `<circle cx="${(u * o.w).toFixed(1)}" cy="${(o.h - 14 - v * (o.h - 28)).toFixed(1)}" ` +
        `r="${rad.toFixed(2)}" fill="${o.ink}" opacity="${((0.14 + density * 0.78) * o.alpha).toFixed(3)}"/>`;
    }
  }
  return `<svg viewBox="0 0 ${o.w} ${o.h}" aria-hidden="true">${s}</svg>`;
}

export interface RampOpts {
  pitch?: number; rmax?: number; ink?: string; angle?: number; alpha?: number;
}

/**
 * Depth on large panels is drawn, not blurred.
 *
 * A blurred dark blob under a light panel reads as a smudge. A halftone ramp
 * on the same staggered lattice and 15 degree screen angle as the imagery
 * engine reads as a surface that was made. Density rises toward the corner the
 * light turns away from, eased hard so the lit end stays genuinely open rather
 * than merely lighter.
 */
export function dotRamp(W: number, H: number, o: RampOpts = {}): string {
  const pitch = o.pitch ?? 12;
  const rmax = o.rmax ?? 2.6;
  const ink = o.ink ?? '#131312';
  const a = (o.angle ?? 15) * Math.PI / 180;
  const cs = Math.cos(a), sn = Math.sin(a);
  const rowH = pitch * 0.866;
  const D = Math.hypot(W, H);
  const N = Math.ceil(D / pitch) + 2;
  const M = Math.ceil(D / rowH) + 2;

  let s = '';
  for (let i = -M; i <= M; i++) {
    const sy = i * rowH;
    for (let j = -N; j <= N; j++) {
      const sx = j * pitch + (i & 1 ? pitch / 2 : 0);
      const x = sx * cs - sy * sn + W * 0.5;
      const y = sx * sn + sy * cs + H * 0.5;
      if (x < -pitch || x > W + pitch || y < -pitch || y > H + pitch) continue;

      let t = 0.5 * (x / W) + 0.5 * (y / H);
      t = Math.max(0, Math.min(1, (t - 0.10) / 0.90));

      // the engine's edge dissolve, gentler: the field thins at the frame
      // rather than stopping against it
      const fx = Math.min(1, Math.min(x, W - x) / (0.055 * W));
      const fy = Math.min(1, Math.min(y, H - y) / (0.055 * H));
      const r = rmax * Math.pow(t, 1.55) * Math.min(fx, fy);
      if (r < 0.3) continue;

      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`;
    }
  }
  return (
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">` +
    `<g fill="${ink}" opacity="${o.alpha ?? 0.5}">${s}</g></svg>`
  );
}
