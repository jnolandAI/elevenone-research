/* The whole set, on two boards.

   Pages 8, 9 and 10 hold the gradient constant so that the DEVICE is the only
   variable. That is the right control for the question those pages ask, and it
   has one cost: every board on them is a violet, so the canvas stops showing
   what the set can do. This page pays that back.

   TWO BOARDS, NOT SEVENTEEN. The first version of this page was eleven full
   covers plus a figure sheet, one artboard each. In the real runtime exactly
   one of the twelve ever painted: every artboard is its own sandboxed iframe
   carrying its own copy of the runtime, and eleven stipples of forty-four
   thousand marks mounting at once is more than the canvas will carry. Smoke,
   paint, markup and timing all passed it, because every one of those measures
   a board ALONE.

   So the comparison sheets are single artboards holding many panels, which is
   the pattern Heroes and Stipple already use and the same reason page 3 gives
   for holding a whole theme in one board. One iframe, one runtime, panels
   drawn in sequence.

   It is a swatch sheet, and the constitution says a piece is one gradient
   throughout or it is not a piece. That still holds. This is a reference sheet
   and not a piece, and it says so on the board. */
const fs = require('fs');
const A = require('./_applied.cjs');
const { D, G, NEUTRAL, DARK, ALL_GRADIENTS, pre, props, FIGJS } = A;

const NOTES = {
  cobalt: 'The workhorse single. Deep blue to a pale sky, and the one member that never argues with anything else on the page.',
  iris: 'The most chroma in the set at 0.266. Reads as expensive and gets tiring quickly, so it suits a piece you publish twice a year.',
  ember: 'The only warm single. Wine to a pale sand, and the one to reach for when a subject is industrial rather than technical.',
  moss: 'Green, and the hardest to keep serious. Works on a subject literally about land, energy or growth, and looks like a logo anywhere else.',
  slate: 'Almost no chroma. This is what lets a piece decline colour without declining to be part of the system.',
  'cobalt-iris': 'Blue into violet, 54 degrees. The narrowest crossing and the safest: it never leaves the cool half, so it cannot surprise anyone.',
  'iris-ember': 'Violet into a warm sand. Arcs 91 degrees but spends seven of its nine stops inside magenta, which is why a Hero on it comes out one colour.',
  'cobalt-ember': 'Blue into salmon, 112 degrees. The widest useful arc in the set, and the reason a stipple on it reads as made of a gradient at all.',
  'moss-ember': 'Green into red, 126 degrees. The most aggressive member, and the only one carrying a prohibition: it is the classic colour-blind trap, so it may never encode anything.',
  'cobalt-moss': 'Blue into green, 137 degrees. Built differently from the other ten, because sRGB has no vivid route between them: it crosses a deliberately neutral middle, and that middle is the point rather than a compromise.',
  'slate-iris': 'Starts grey and becomes colour only at the top of the climb. The quiet crossing, and the one that suits a piece whose point is that most of the mass is unremarkable.'
};

/* ------------------------------------------------- board 1: the set on dark */

const PW = 600, PH = 338, GAP = 32, PAD = 48, HEAD = 178, TITLE = 26, CAP = 88, ROWGAP = 30;
const COLS = 4;
const ROWS = Math.ceil(ALL_GRADIENTS.length / COLS);
const CW = PAD * 2 + COLS * PW + (COLS - 1) * GAP;
const CH = PAD * 2 + HEAD + ROWS * (TITLE + PH + CAP) + (ROWS - 1) * ROWGAP;

const setPanel = (g, i) => `
      <div style="display: flex; flex-direction: column; width: ${PW}px; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px; height: ${TITLE}px;">
          <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">${g.name}</span>
          <span class="mono" style="font-size: 10px; color: ${G.g60};">${g.kind} &#183; arc ${g.arc}&#176;</span>
        </div>
        <canvas id="c${i}" width="${Math.round(PW * 1.6)}" height="${Math.round(PH * 1.6)}" style="width: ${PW}px; height: ${PH}px; display: block; background: ${DARK};"></canvas>
        <p style="margin: 10px 0 0 0; height: ${CAP - 10}px; font-size: 11px; line-height: 17px; color: ${G.g70}; text-wrap: pretty;">${NOTES[g.id]}</p>
      </div>`;

const row = (from, to) => `
    <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">
${ALL_GRADIENTS.slice(from, to).map((g, j) => setPanel(g, from + j)).join('')}
    </div>`;

const coversBody = `<div style="position: relative; width: ${CW}px; height: ${CH}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${A.bar(false, 'The whole set &#183; one subject, eleven members')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 340px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">The whole set, doing one job</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">Eleven covers. Everything held except which member they run.</p>
      </div>
      <p style="margin: 0; max-width: 1700px; font-size: 13px; line-height: 21px; color: ${G.g70}; text-wrap: pretty;">Same subject, same crop, same dissolve, same mark count, same ground. Reading across this board is reading the set. <strong style="font-weight: 500; color: ${G.g90};">This is a reference sheet and not a piece.</strong> The rule that a piece runs ONE member throughout is untouched: pages 9 and 10 hold the gradient constant on purpose so the device is the only thing moving, and the cost of that control is that every board on them is a violet. <strong style="font-weight: 500; color: ${G.g90};">Watch the hue arc.</strong> cobalt-ember at 112 degrees shows the gradient across the subject; iris-ember at 91 does not, because seven of its nine stops sit inside magenta. A Field has room to show a whole ramp. A Hero only sees the ramp where the subject happens to be, so the arc matters more here than anywhere else in the system.</p>
    </div>
  </div>
${row(0, 4)}
    <div style="height: ${ROWGAP}px;"></div>
${row(4, 8)}
    <div style="height: ${ROWGAP}px;"></div>
${row(8, 11)}
</div>`;

/* Counts are a fifth of the full-size cover's, because the panel is a fifth of
   its area. Density per unit area is what has to be held constant, not the
   count: the same 44,000 marks in a panel this size is a solid block. */
const coversJs = `${pre(ALL_GRADIENTS[0].anchors, { subjects: true })}
var SETA = ${JSON.stringify(ALL_GRADIENTS.map((g) => g.anchors))};
function rampOf(a) { return function (t, kk) { return anchorRamp(a, t, kk); }; }

/* One mask for all eleven panels. fxMaskFrom paints the subject to an
   offscreen canvas and reads the pixels back, which is the most expensive
   thing on the board; the subject is identical in every panel, so doing it
   once turns eleven readbacks into one. */
var MASK = null;

class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }

  paint(cv, i, k, gr) {
    if (!cv) return;
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    if (!MASK) MASK = faded(fxMaskFrom(placed(subjPort, 0.10, 0.06, 0.94, 0.80), W, H, 3), { bot: [0.44, 0.70] });
    fxStipple(ctx, W, H, rampOf(SETA[i]), k, {
      count: 11000, seed: 21, glyph: 'dot', grid: 72, rMin: 0.7, rMax: 1.8,
      aLo: 0.26, aHi: 1.0, t0: 0.20, t1: 1.0, axis: [0.06, 0.88, 0.98, 0.08], density: MASK
    });
    fxGrain(ctx, W, H, gr, 19, 1);
  }

  draw() {
    if (!document.getElementById('c0')) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : 0.05;
${ALL_GRADIENTS.map((g, i) => `    this.paint(document.getElementById('c${i}'), ${i}, k, gr);`).join('\n')}
  }
  renderVals() { return {}; }
}`;

fs.writeFileSync('SetOnDark.dc.html', D.shell({ dark: false, d: NEUTRAL, body: coversBody, js: coversJs, props: props('Set on dark', 0.05) }));

const DARK_BOARD = {
  file: 'SetOnDark.dc.html', w: CW, h: CH,
  title: 'The whole set  eleven members, one subject',
  note: 'Everything held except which member of the set runs. Watch the hue arc: a Hero only sees the ramp where the subject happens to be, so a narrow arc comes out as one colour.'
};

/* ------------------------------------------------ board 2: the set on paper */
/* A gradient behaves differently as ink than as light. An additive field on
   black shows a whole ramp; ink on white loses the pale end completely, so
   every panel here reads only the deep half. Six members rather than eleven,
   and deliberately not the three violets: the point is the ones the applied
   pages never show. */

const PAPER_IDS = ['cobalt', 'moss', 'ember', 'moss-ember', 'cobalt-moss', 'slate-iris'];
const PAPER = PAPER_IDS.map((id) => ALL_GRADIENTS.find((g) => g.id === id));

const FW = 620, FH = 420, FGAP = 44, FHEAD = 168, FTITLE = 26, FCAP = 62, FROWGAP = 34;
const BW = PAD * 2 + 3 * FW + 2 * FGAP;
const BH = PAD * 2 + FHEAD + (FTITLE + FH + FCAP) * 2 + FROWGAP;

const paperPanel = (g, i) => `
      <div style="display: flex; flex-direction: column; width: ${FW}px; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px; height: ${FTITLE}px;">
          <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">${g.name}</span>
          <span class="mono" style="font-size: 10px; color: ${G.g60};">${g.kind} &#183; arc ${g.arc}&#176;</span>
        </div>
        <canvas id="p${i}" width="${Math.round(FW * 1.6)}" height="${Math.round(FH * 1.6)}" style="width: ${FW}px; height: ${FH}px; display: block;"></canvas>
        <p style="margin: 8px 0 0 0; height: ${FCAP - 8}px; font-size: 11px; line-height: 17px; color: ${G.g70}; text-wrap: pretty;">${NOTES[g.id]}</p>
      </div>`;

const paperBody = `<div style="position: relative; width: ${BW}px; height: ${BH}px; overflow: hidden; background: #FFFFFF; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${FHEAD}px;">
    ${A.bar(false, 'The set on paper &#183; ordered encoding')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 340px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">The set on paper</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">Six members carrying the same ordered variable on white.</p>
      </div>
      <p style="margin: 0; max-width: 1360px; font-size: 13px; line-height: 21px; color: ${G.g70}; text-wrap: pretty;">Identical figure, identical data, identical greyscale furniture. Only the gradient moves, and each one carries revenue cohort, which is ordered and therefore allowed to sit on a ramp. <strong style="font-weight: 500; color: ${G.g90};">A gradient behaves differently here than on a cover.</strong> An additive field on black shows a whole ramp; ink on white loses the pale end completely, so every one of these reads only the deep half, roughly t 0.03 to 0.66. <strong style="font-weight: 500; color: ${G.g90};">moss-ember is here to be rejected, not adopted.</strong> Green to red is the classic colour-blind trap and it may never carry an encoding, whatever it does for a cover. It is on the board because a rule with no counter-example beside it does not get followed.</p>
    </div>
  </div>
  <div style="display: flex; gap: ${FGAP}px; align-items: flex-start;">
${PAPER.slice(0, 3).map((g, i) => paperPanel(g, i)).join('')}
  </div>
  <div style="height: ${FROWGAP}px;"></div>
  <div style="display: flex; gap: ${FGAP}px; align-items: flex-start;">
${PAPER.slice(3).map((g, i) => paperPanel(g, i + 3)).join('')}
  </div>
</div>`;

/* Every lookup is a LITERAL id, spelled out one per panel rather than built in
   a loop. preview.cjs prefixes ids per board so several artboards can share a
   sheet, and it rewrites only literal getElementById calls. A board that
   builds its id as 'p' + i keeps its markup prefixed and its lookups bare,
   every element resolves null, and it renders EMPTY in the harness while
   passing smoke, paint, markup and timing, because the stub resolves ids from
   a map that was never prefixed. This board did exactly that. */
const paperJs = `${pre(ALL_GRADIENTS[0].anchors, { kde: true })}
var SETA = ${JSON.stringify(PAPER.map((g) => g.anchors))};
function rampOf(a) { return function (t, kk) { return anchorRamp(a, t, kk); }; }
${FIGJS}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  paint(cv, i, k, gr) {
    if (!cv) return;
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    figRidge(ctx, W, H, rampOf(SETA[i]), k, false);
    fxGrain(ctx, W, H, gr, 91 + i, 1);
  }
  draw() {
    if (!document.getElementById('p0')) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : 0.03;
${PAPER.map((g, i) => `    this.paint(document.getElementById('p${i}'), ${i}, k, gr);`).join('\n')}
  }
  renderVals() { return {}; }
}`;

fs.writeFileSync('SetOnPaper.dc.html', D.shell({ dark: false, d: NEUTRAL, body: paperBody, js: paperJs, props: props('Set on paper', 0.03) }));

const PAPER_BOARD = {
  file: 'SetOnPaper.dc.html', w: BW, h: BH,
  title: 'The set on paper  six members, one ordered encoding',
  note: 'The same figure six times. Only the gradient moves. moss-ember is on the board to be rejected: green to red is the classic colour-blind trap and may never carry an encoding, whatever it does for a cover.'
};

[DARK_BOARD, PAPER_BOARD].forEach((b) =>
  console.log(b.file.padEnd(24) + b.w + 'x' + b.h + '  ' + fs.statSync(b.file).size + ' bytes'));

module.exports = { DARK_BOARD, PAPER_BOARD };
