/**
 * Tones for marks drawn on a figure card.
 *
 * This is NOT the interface spine and must not be reconciled onto it. The
 * prototype it came from carried a comment claiming the two matched; they
 * never did, and all twelve values differ. The interface greys are lighter
 * and faintly warm. This ramp is linear in lightness at zero chroma and
 * considerably darker, because a 10px axis label on a near-white card needs
 * contrast the interface greys do not have: TICK here is 5.4:1 or better on
 * the card, where the equivalently named --g60 is 3.1:1 and fails AA.
 */

const f2s = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

const toHex = (rgb: number[]) =>
  '#' + rgb.map((v) => clamp(v).toString(16).padStart(2, '0')).join('').toUpperCase();

function oklabToHex([L, a, b]: [number, number, number]): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex([
    f2s(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255,
    f2s(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255,
    f2s(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255,
  ]);
}

/** Twelve steps, L from 0.995 down to 0.100, zero chroma. */
export const TONES: readonly string[] = Array.from({ length: 12 }, (_, i) =>
  oklabToHex([0.995 - (i / 11) * 0.895, 0, 0]),
);

export const AXIS = TONES[3]!;   // baselines and tick marks
export const GUIDE = TONES[2]!;  // dashed quartile guides
export const TICK = TONES[6]!;   // tick label text
export const CURVE = '#2B2B2A';  // the density line itself
export const INK = '#131312';    // the one solid emphasis dot
// The area-fill gradient under the density curve (kde.ts). These were
// previously #6C6C6A and #8C8C8A: not TONES values at all, but the exact
// literals of the interface --g70/--g60 tokens, typed straight from
// tokens.css into a chart module. That is the leak the no-reconciliation
// rule above exists to prevent: the fill happened to track the interface
// ramp by coincidence of someone copying a hex rather than by design, so an
// interface re-tint would have silently dragged this fill's contrast along
// with it. Named from this ramp instead, at the two steps nearest the
// originals.
export const FILL_MID = TONES[6]!;
export const FILL_EDGE = TONES[4]!;
