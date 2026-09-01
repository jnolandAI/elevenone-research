/* Six report covers. The device is the variable; the gradient is not.

   All six carry identical type, identical words and an identical title block
   in the quiet left third. Five run cobalt-ember and the sixth runs slate,
   which is the point of the sixth. What changes is which of the four devices
   is doing the work, and whether the ground is black or paper.

   Subjects bleed off the right edge rather than sitting inside the frame. An
   object with ground on every side of it reads as a diagram of itself, and
   the first pass here did exactly that: a crane floating in the middle of a
   black rectangle with a hard stop before the margin.

   And every subject DISSOLVES at its base. A stipple built from a subject has
   hard edges everywhere, which is right for the silhouette and wrong where
   the image meets the layout: an object standing on its own ground line reads
   as a cut-out pasted onto the page. The fade ends at the object's base, not
   at the frame edge, or it never finishes.

   Read across: Hero alone, Field under a Hero, Field alone, the same Hero on
   paper, a Form where the guidance says a Form does not belong, and the cover
   that declines colour. */
const fs = require('fs');
const A = require('./_applied.cjs');
const { D, G, NEUTRAL, CW, CH, px, DARK, PAPER, A_PIECE, A_SLATE, BLOBS_COVER, BLOBS_UNDER, pre, props, bar } = A;

const { TITLE, SUB, COVER_NOTE } = D;

function cover(o) {
  const fg = o.dark ? '#FFFFFF' : DARK;
  const sub = o.dark ? G.g40 : G.g80;
  const note = o.dark ? G.g70 : G.g60;
  const body = `<div style="position: relative; width: ${CW}px; height: ${CH}px; overflow: hidden; background: ${o.dark ? DARK : PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${fg};">
  <canvas id="cv" width="${px(CW)}" height="${px(CH)}" style="position: absolute; inset: 0; width: ${CW}px; height: ${CH}px; display: block;"></canvas>
  <div style="position: relative; display: flex; flex-direction: column; height: 100%; padding: 40px 56px 34px 56px; box-sizing: border-box;">
    ${bar(o.dark, o.rail)}
    <div style="flex-grow: 1;"></div>
    <div style="display: flex; flex-direction: column; gap: 15px; max-width: 600px;">
      <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${note};">PIECE 001 &#183; CROSS-SECTOR</span>
      <h1 style="margin: 0; font-size: 45px; line-height: 50px; font-weight: 500; letter-spacing: -0.03em; text-wrap: pretty;">${TITLE}</h1>
      <p style="margin: 0; font-size: 19px; line-height: 27px; letter-spacing: -0.02em; color: ${sub}; text-wrap: pretty;">${SUB}</p>
    </div>
    <div style="height: 28px;"></div>
    <p class="mono" style="margin: 0; max-width: 620px; font-size: 10px; line-height: 17px; color: ${note};">${COVER_NOTE}</p>
  </div>
</div>`;
  fs.writeFileSync(o.file, D.shell({ dark: o.dark, d: NEUTRAL, body, js: o.js, props: props(o.section, o.grain) }));
  return { file: o.file, w: CW, h: CH, title: o.title, note: o.note };
}

const head = (grain) => `class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : ${grain};
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;`;

const tail = `
  }
  renderVals() { return {}; }
}`;

const COVERS = [];

/* 1. Hero alone on a dark ground. The straight case, and the one the
   guidance recommends: the subject is the whole image and nothing competes
   with it. */
COVERS.push(cover({
  file: 'AppCoverHero.dc.html', dark: true, rail: 'Cover &#183; Hero', section: 'Cover Hero', grain: 0.055,
  title: 'Cover  Hero alone',
  note: 'One device. The subject is the whole image and the ground stays black behind it. This is the shape the guidance recommends for the front of a piece.',
  js: `${pre(A_PIECE, { subjects: true })}
${head(0.055)}
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    var mask = faded(fxMaskFrom(placed(subjPort, 0.24, 0.02, 0.86, 0.76), W, H, 3), { bot: [0.40, 0.66] });
    fxStipple(ctx, W, H, ramp, k, {
      count: 25000, seed: 21, glyph: 'dot', grid: 84, rMin: 0.9, rMax: 2.2,
      aLo: 0.26, aHi: 1.0, t0: 0.20, t1: 1.0, axis: [0.22, 0.88, 1.02, 0.08], density: mask
    });
    fxGrain(ctx, W, H, gr, 19, 1);${tail}`
}));

/* 2. Field and Hero in one composition. The single exception the guidance
   allows to one-device-per-page, and the thing it is least sure about. */
COVERS.push(cover({
  file: 'AppCoverFieldHero.dc.html', dark: true, rail: 'Cover &#183; Field under Hero', section: 'Cover Field+Hero', grain: 0.055,
  title: 'Cover  Field under a Hero',
  note: 'Two devices in one composition, which the guidance allows only here and has never tested. The field runs at half its alpha and is held to the deep end of the ramp, because on a dark ground a field and a stipple composite additively and go to white together. At full strength the racks came out of a lit sky and stopped reading as an object.',
  js: `${pre(A_PIECE, { subjects: true })}
${head(0.055)}
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    fxField(ctx, W, H, ramp, k, ${JSON.stringify(BLOBS_UNDER)}, 'lighter');
    var mask = faded(fxMaskFrom(placed(subjServers, 0.28, 0.03, 0.82, 0.72), W, H, 3), { bot: [0.42, 0.68] });
    fxStipple(ctx, W, H, ramp, k, {
      count: 25000, seed: 23, glyph: 'dot', grid: 84, rMin: 0.9, rMax: 2.1,
      aLo: 0.28, aHi: 1.0, t0: 0.24, t1: 1.0, axis: [0.26, 0.90, 1.06, 0.08], density: mask
    });
    fxGrain(ctx, W, H, gr, 23, 1);${tail}`
}));

/* 3. Field alone. Atmosphere behind type, and nothing in it to name. */
COVERS.push(cover({
  file: 'AppCoverField.dc.html', dark: true, rail: 'Cover &#183; Field', section: 'Cover Field', grain: 0.06,
  title: 'Cover  Field alone',
  note: 'No subject at all. The type is the cover and the field is weather behind it. Cheapest of the six to make, and the hardest to tell apart from the next piece that does the same thing.',
  js: `${pre(A_PIECE)}
${head(0.06)}
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    fxField(ctx, W, H, ramp, k, ${JSON.stringify(BLOBS_COVER)}, 'lighter');
    fxGrain(ctx, W, H, gr, 29, 1);${tail}`
}));

/* 4. The same device on paper. Four of the seven report pages are white, so
   a cover that only works on black is half a system. */
COVERS.push(cover({
  file: 'AppCoverPaper.dc.html', dark: false, rail: 'Cover &#183; Hero on paper', section: 'Cover Paper', grain: 0.04,
  title: 'Cover  Hero on paper',
  note: 'The same device on white. The stipple reads the deep half of the ramp only, because the pale end of any gradient is invisible against the page. Marks are opaque here rather than additive, so density does all the work.',
  js: `${pre(A_PIECE, { subjects: true })}
${head(0.04)}
    ctx.fillStyle = '${PAPER}'; ctx.fillRect(0, 0, W, H);
    var mask = faded(fxMaskFrom(placed(subjEnergy, 0.30, 0.00, 0.78, 0.70), W, H, 3), { bot: [0.46, 0.72] });
    fxStipple(ctx, W, H, ramp, k, {
      count: 21000, seed: 31, glyph: 'dot', grid: 84, rMin: 0.9, rMax: 2.4,
      aLo: 0.30, aHi: 0.96, t0: 0.00, t1: 0.58, axis: [0.26, 0.86, 1.02, 0.08], density: mask
    });
    fxGrain(ctx, W, H, gr, 31, 1);${tail}`
}));

/* 5. A Form on a cover. The guidance says this is the wrong device here,
   because a Form is decoration and cannot carry a subject. The board exists
   so that claim can be looked at rather than taken on trust. */
COVERS.push(cover({
  file: 'AppCoverForm.dc.html', dark: false, rail: 'Cover &#183; Form', section: 'Cover Form', grain: 0.04,
  title: 'Cover  Form, against the rule',
  note: 'An abstract Form fronting a piece, which the guidance forbids: a reader cannot name it, so it says the piece is about dissolution in general rather than about margin. Here to be judged, not to be copied.',
  js: `${pre(A_PIECE, { forms: true })}
${head(0.04)}
    ctx.fillStyle = '${PAPER}'; ctx.fillRect(0, 0, W, H);
    fxStipple(ctx, W, H, ramp, k, {
      count: 11000, seed: 37, glyph: 'dot', grid: 56, rMin: 1.0, rMax: 2.6,
      aLo: 0.38, aHi: 0.94, t0: 0.02, t1: 0.62,
      axis: [0.30, 0.10, 1.00, 0.80], density: windowed(formNamed('convergence'), 0.30, 0.04, 0.72, 0.66)
    });
    fxGrain(ctx, W, H, gr, 37, 1);${tail}`
}));

/* 6. The piece that declines colour. slate carries almost no chroma and it
   exists so that a report is never forced into a hue it did not ask for. */
COVERS.push(cover({
  file: 'AppCoverSlate.dc.html', dark: true, rail: 'Cover &#183; slate', section: 'Cover Slate', grain: 0.06,
  title: 'Cover  the piece that declines colour',
  note: 'The same field construction run in slate. A report rendered entirely in slate is a correct outcome, not a failure to pick one of the other ten, and this is what that costs and what it buys.',
  js: `${pre(A_SLATE)}
${head(0.06)}
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    fxField(ctx, W, H, ramp, k, ${JSON.stringify(BLOBS_COVER)}, 'lighter');
    fxGrain(ctx, W, H, gr, 41, 1);${tail}`
}));

COVERS.forEach((c) => console.log(c.file.padEnd(28) + CW + 'x' + CH + '  ' + fs.statSync(c.file).size + ' bytes'));

module.exports = { COVERS, cover, head, tail };
