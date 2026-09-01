/* Gradient palettes.

   The system stays black, white and grey. Colour arrives only as a gradient,
   and only where a gradient earns its place: a report cover, the site hero, a
   figure that needs a field behind it. One piece can run warm and the next
   cool without either looking like a different brand, because what makes them
   a family is the CONSTRUCTION, not the hue.

   Four palettes, differing on what that construction is. That is the choice:
   pick the rule, not the colours. Each carries five gradients meant to sit
   beside each other, including a near-neutral one, because a palette without
   a quiet member forces colour onto pieces that do not want it.

   Anchors are [lightness, SATURATION AS A FRACTION OF THE sRGB CEILING, hue].
   Not absolute chroma. The first version used hand-picked chroma around 0.11
   and read as dull against the references, which carry roughly twice that:
   the ceiling is not a constant, so one number cannot be right for two hues.
   sRGB holds 0.26 of chroma for a blue at lightness 0.45 and 0.13 for an
   orange at 0.75, and anything asked for above the ceiling is silently
   clamped to something flatter. gamut.cjs finds the ceiling by bisection and
   expand() turns these into real OKLCH anchors.

   The same fact drives the lightness journeys. Each hue peaks at a different
   lightness: blue near 0.45, green near 0.85, yellow near 0.94. A family that
   fixed one lightness ramp for every member would run some of them nowhere
   near their peak and those would look washed out next to the rest. So the
   journeys differ, and what is actually held constant is the saturation
   profile. */
const { expand } = require('./gamut.cjs');

const RAW = [
  {
    key: 'Meridian',
    name: 'Meridian',
    rule: 'One saturation profile, five positions on the wheel.',
    note: 'Every gradient holds the same saturation profile and travels about the same short hue arc. What differs is where it sits on the wheel, and how light it has to be to get there: sRGB puts its vivid blues near lightness 0.42 and its vivid greens near 0.80, so a family that fixed one lightness ramp would run half its members nowhere near their peak and those would look washed out beside the rest.',
    grads: [
      { n: 'Cobalt', a: [[0.34, 0.92, 272], [0.46, 1.00, 262], [0.62, 0.88, 250], [0.86, 0.48, 238]] },
      { n: 'Iris', a: [[0.38, 0.92, 292], [0.52, 1.00, 304], [0.66, 0.90, 316], [0.86, 0.48, 330]] },
      { n: 'Ember', a: [[0.40, 0.92, 8], [0.54, 1.00, 20], [0.66, 0.90, 34], [0.86, 0.48, 60]] },
      { n: 'Moss', a: [[0.48, 0.90, 160], [0.62, 1.00, 148], [0.76, 0.95, 138], [0.88, 0.50, 120]] },
      { n: 'Slate', a: [[0.34, 0.13, 250], [0.50, 0.13, 248], [0.70, 0.10, 246], [0.88, 0.06, 244]] }
    ]
  },
  {
    key: 'Daylight',
    name: 'Daylight',
    rule: 'Deep ends vary widely. Every one resolves to light, and none turns warm.',
    note: 'The family rule is the destination, not the origin. Each gradient starts somewhere different and ends pale and high-key near paper, and nothing here turns warm on the way up: the light ends are pale blue, lilac and yellow-green. Built from what you were reaching for on the steel end. The teal member is the least vivid of the four, and that is the gamut rather than a choice: sRGB cannot make a saturated cyan at any lightness.',
    grads: [
      { n: 'Meltwater', a: [[0.36, 0.95, 270], [0.50, 1.00, 258], [0.72, 0.90, 240], [0.96, 0.28, 222]] },
      { n: 'Haze', a: [[0.40, 0.92, 296], [0.54, 1.00, 302], [0.72, 0.88, 308], [0.96, 0.26, 314]] },
      { n: 'Shallows', a: [[0.42, 0.92, 214], [0.58, 0.95, 180], [0.78, 0.98, 152], [0.96, 0.32, 128]] },
      { n: 'Verdigris', a: [[0.50, 0.92, 150], [0.66, 1.00, 140], [0.82, 0.96, 128], [0.96, 0.34, 112]] },
      { n: 'Graphite', a: [[0.30, 0.07, 250], [0.52, 0.06, 248], [0.76, 0.05, 246], [0.97, 0.03, 246]] }
    ]
  },
  {
    key: 'Duotone',
    name: 'Duotone',
    rule: 'Two temperatures at once, crossing through a neutral middle.',
    note: 'Each gradient holds two temperatures and crosses between them through a desaturated middle, which is what stops the crossing becoming a rainbow. The most dramatic of the four and the least quiet. This is the construction the current covers already use, so it is the incumbent the other three have to beat.',
    grads: [
      { n: 'Ignition', a: [[0.36, 0.98, 268], [0.50, 0.09, 262], [0.64, 1.00, 22], [0.80, 0.64, 44]] },
      { n: 'Nightfall', a: [[0.38, 0.96, 300], [0.52, 0.10, 300], [0.66, 0.98, 18], [0.80, 0.62, 58]] },
      { n: 'Thicket', a: [[0.50, 0.94, 144], [0.60, 0.09, 150], [0.68, 0.98, 340], [0.82, 0.60, 326]] },
      { n: 'Copperhead', a: [[0.42, 0.92, 232], [0.55, 0.09, 224], [0.66, 1.00, 14], [0.80, 0.64, 40]] },
      { n: 'Flint', a: [[0.32, 0.07, 250], [0.50, 0.12, 252], [0.68, 0.58, 264], [0.84, 0.36, 250]] }
    ]
  },
  {
    key: 'Ash',
    name: 'Ash',
    rule: 'Both ends neutral. Colour only in the middle of the climb.',
    note: 'Both ends are dead neutral and the colour lives only in the middle, where it reads as a tint on grey rather than as a colour in its own right. The most restrained of the four and the closest to the system as it stands. It prints anywhere and never fights type, and it is the one that risks looking like no decision was made.',
    grads: [
      { n: 'Ash Blue', a: [[0.20, 0, 0], [0.46, 0.62, 268], [0.72, 0.36, 258], [0.95, 0, 0]] },
      { n: 'Ash Rose', a: [[0.20, 0, 0], [0.50, 0.62, 340], [0.74, 0.36, 330], [0.95, 0, 0]] },
      { n: 'Ash Ember', a: [[0.20, 0, 0], [0.50, 0.62, 22], [0.74, 0.36, 42], [0.95, 0, 0]] },
      { n: 'Ash Moss', a: [[0.20, 0, 0], [0.56, 0.60, 144], [0.78, 0.36, 132], [0.95, 0, 0]] },
      { n: 'Ash', a: [[0.20, 0, 0], [0.46, 0, 0], [0.72, 0, 0], [0.95, 0, 0]] }
    ]
  }
];

const PALETTES = RAW.map((p) => ({ ...p, grads: p.grads.map((g) => ({ n: g.n, a: expand(g.a) })) }));

module.exports = { PALETTES, RAW };
