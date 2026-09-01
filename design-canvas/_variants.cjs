/* Candidate Embers with the violet and rose taken out.

   Ember as built travels violet to cream the long way round, through rose.
   These are the two honest ways to remove that, and they are not the same
   decision:

     EmberWarm    one warm family, red through orange and amber to cream.
                  Nothing cool anywhere. The most literal reading of "ember".
     EmberSteel   keeps a cool end, but blue instead of violet. Blending in
                  OKLab runs blue to orange through the desaturated middle,
                  not around the wheel, so the path never reaches purple.

   Anchors only. Everything else, including the blob layout, the grain and
   the dot spec, is inherited from Ember so the comparison stays clean. */
const { DIRS, endsFromAnchors } = require('./_dirs.cjs');
const EMBER = DIRS.find((d) => d.key === 'Ember');

const VARIANTS = [
  {
    ...EMBER,
    key: 'EmberWarm',
    name: 'Ember, warm only',
    idea: 'Colour is light, and the light is fire. One warm family, no cool end.',
    dark: [[0.22, 0.090, 26], [0.45, 0.130, 46], [0.70, 0.115, 68], [0.97, 0.042, 92]],
    light: [[0.960, 0.040, 92], [0.780, 0.105, 70], [0.600, 0.140, 46], [0.400, 0.115, 27]],
    fieldDark: [[0.24, 0.085, 28], [0.34, 0.115, 45], [0.44, 0.105, 66], [0.52, 0.072, 88]]
  },
  {
    ...EMBER,
    key: 'EmberSteel',
    name: 'Ember, steel end',
    idea: 'Colour is light. The cool end is blue rather than violet.',
    dark: [[0.22, 0.100, 252], [0.45, 0.075, 246], [0.70, 0.115, 62], [0.97, 0.042, 92]],
    light: [[0.960, 0.040, 92], [0.780, 0.110, 58], [0.600, 0.030, 44], [0.380, 0.115, 254]],
    fieldDark: [[0.26, 0.105, 252], [0.34, 0.050, 250], [0.44, 0.100, 48], [0.52, 0.072, 86]]
  }
];

/* Both candidates carry the field tweaks: they are the two John is choosing
   between, and the choice is about where the warm end sits and how far the
   spectrum runs past it. The four live directions keep fixed fields. */
for (const d of VARIANTS) {
  d.tweakField = true;
  d.fieldEnds = endsFromAnchors(d.fieldDark);
}

module.exports = { VARIANTS };
