/* Colour math for the token validator. No dependencies: this is a public repo
   and a validator that pulls in a colour library to compute six formulas is a
   supply chain for no reason.

   Two measures live here and they answer different questions. WCAG contrast
   answers "can this be read", and it is a luminance ratio, so it is blind to
   hue by design. OKLab distance answers "can these be told apart", and it is
   not, which is the whole reason the contract can be satisfied by a greyscale
   system and a slate one at the same time. */

export function parseHex(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/* sRGB transfer function, WCAG 2.x wording. Shared by both measures. */
const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

export function relativeLuminance({ r, g, b }) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* Bjorn Ottosson's OKLab. Linear sRGB in, perceptual L/a/b out, L on 0 to 1. */
export function toOklab({ r, g, b }) {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

export function deltaEOK(c1, c2) {
  const a = toOklab(c1);
  const b = toOklab(c2);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

/* The same measure tests/tokens.test.ts uses to hold Eleven One Research to
   greyscale, so the two cannot disagree about what neutral means. */
export function neutralSpread({ r, g, b }) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}
