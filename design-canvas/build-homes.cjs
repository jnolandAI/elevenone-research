/* Four homepages. The hero band is the variable and the rest of the page is
   held identical, because the site is where a device has to survive being
   next to navigation, cards and a footer rather than alone on a cover.

   Read across: a Hero in the band, a Field in the band, a Form on a paper
   band, and a page that spends its only colour below the fold on a figure.

   Two things are fixed on all four and are worth naming, because the site
   boards on page 2 of this canvas do neither.

   Furniture is greyscale. The subscribe chip, the nav links and the card
   strips are grey on every one of these. Page 2 colours all three off the
   direction's accent, which is the thing the constitution forbids: colour is
   a field or an ordered encoding, and never an interface element.

   The card headers carry no gradient. Page 2 puts an 84px wash on top of
   every card, which is a gradient used as decoration on a component. A
   hairline does the same job and does not spend the colour budget on three
   pieces of furniture. */
const fs = require('fs');
const A = require('./_applied.cjs');
const { D, G, NEUTRAL, HW, px, DARK, PAPER, MARK, A_SITE, A_GREY, BLOBS_HOME, BLOBS_HOME_UNDER, pre, props, FIGJS } = A;

const { TITLE, SUB } = D;

const PAD = 96;
const HEAD_W = 640;
const HERO_H = 740;
const HH = 2000;

const nav = (onDark) => {
  const fg = onDark ? G.g40 : G.g80;
  const on = onDark ? '#FFFFFF' : DARK;
  const items = ['Research', 'Method', 'About'].map((t, i) =>
    `<span style="font-size: 14px; line-height: 20px; color: ${i === 0 ? on : fg};">${t}</span>`).join('');
  return `
  <div style="display: flex; justify-content: space-between; align-items: center; height: 72px; padding: 0 ${PAD}px; border-bottom: 1px solid ${onDark ? 'rgba(244,244,243,0.10)' : G.g20}; flex-shrink: 0;">
    <div style="display: flex; align-items: center; gap: 11px;">
      <svg style="width: 22px; height: 22px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g fill="${onDark ? PAPER : DARK}">${MARK}</g></svg>
      <span style="font-size: 14px; line-height: 20px; font-weight: 500; letter-spacing: -0.01em; color: ${on};">Eleven One Research</span>
    </div>
    <div style="display: flex; align-items: center; gap: 32px;">
      ${items}
      <span class="mono" style="font-size: 11px; color: ${on}; border: 1px solid ${onDark ? 'rgba(244,244,243,0.32)' : G.g40}; padding: 7px 14px;">Subscribe</span>
    </div>
  </div>`;
};

const stats = [
  ['2,186', 'SEC registrants, CY2024'],
  ['38.8%', 'median reported gross margin'],
  ['64 pts', 'the band eight in ten fall inside']
].map(([n, l]) => `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <span style="font-size: 40px; line-height: 46px; font-weight: 500; letter-spacing: -0.03em;">${n}</span>
        <span class="mono" style="font-size: 11px; line-height: 17px; color: ${G.g70};">${l}</span>
      </div>`).join('');

/* A hairline rather than a gradient strip. The strip on page 2 is a gradient
   used as decoration on a component, which is the one thing colour is never
   allowed to be. */
const cards = [
  ['Distributions, not medians', 'Every benchmark we publish shows the spread it came from. A median with no dispersion behind it is a number, not a finding.'],
  ['Primary filings only', 'Figures come out of the SEC XBRL frames API and comparable primary sources. Nothing is scraped from a summary and nothing is modelled.'],
  ['Claims carry their own limits', 'Each claim states what it rests on, what it assumes, and what would break it. The limits ship with the number.']
].map(([h, t]) => `
      <div style="display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid ${G.g20};">
        <div style="height: 3px; background: ${G.g90};"></div>
        <div style="display: flex; flex-direction: column; gap: 9px; padding: 24px 24px 28px 24px;">
          <h3 style="margin: 0; font-size: 17px; line-height: 24px; font-weight: 500; letter-spacing: -0.01em; text-wrap: pretty;">${h}</h3>
          <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">${t}</p>
        </div>
      </div>`).join('');

const footer = `
  <div style="flex-shrink: 0; background: ${DARK}; padding: 44px ${PAD}px 40px ${PAD}px; display: flex; justify-content: space-between; align-items: flex-start; gap: 60px;">
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 380px;">
      <div style="display: flex; align-items: center; gap: 11px;">
        <svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g fill="${PAPER}">${MARK}</g></svg>
        <span style="font-size: 13px; line-height: 19px; color: ${G.g40};">Eleven One Research</span>
      </div>
      <p style="margin: 0; font-size: 12px; line-height: 19px; color: ${G.g70}; text-wrap: pretty;">Cross-sector financial analysis built from primary filings. Every figure traces to a source of record.</p>
    </div>
    <div style="display: flex; gap: 56px;">
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span class="mono" style="font-size: 9px; color: ${G.g80}; letter-spacing: 0.06em;">RESEARCH</span>
        <span style="font-size: 12px; line-height: 19px; color: ${G.g40};">All pieces</span>
        <span style="font-size: 12px; line-height: 19px; color: ${G.g40};">Method</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span class="mono" style="font-size: 9px; color: ${G.g80}; letter-spacing: 0.06em;">CONTACT</span>
        <span style="font-size: 12px; line-height: 19px; color: ${G.g40};">[EMAIL]</span>
        <span class="mono" style="font-size: 11px; color: ${G.g70};">elevenoneresearch.com</span>
      </div>
    </div>
  </div>`;

function home(o) {
  const onDark = o.heroDark;
  const fg = onDark ? '#FFFFFF' : DARK;
  const body = `<div style="position: relative; width: ${HW}px; height: ${HH}px; overflow: hidden; background: #FFFFFF; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column;">

  <div style="position: relative; height: ${HERO_H}px; flex-shrink: 0; background: ${onDark ? DARK : PAPER}; overflow: hidden;">
    <canvas id="hero" width="${px(HW)}" height="${px(HERO_H)}" style="position: absolute; inset: 0; width: ${HW}px; height: ${HERO_H}px; display: block;"></canvas>
    <div style="position: relative; display: flex; flex-direction: column; height: 100%; color: ${fg};">
      ${nav(onDark)}
      <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 22px; padding: 0 ${PAD}px; max-width: ${HEAD_W + PAD}px;">
        <span class="mono" style="font-size: 11px; letter-spacing: 0.06em; color: ${onDark ? G.g60 : G.g70};">PIECE 001 &#183; CROSS-SECTOR</span>
        <h1 style="margin: 0; font-size: 50px; line-height: 56px; font-weight: 500; letter-spacing: -0.03em; text-wrap: pretty;">${TITLE}</h1>
        <p style="margin: 0; font-size: 20px; line-height: 30px; letter-spacing: -0.02em; color: ${onDark ? G.g40 : G.g80}; text-wrap: pretty;">${SUB}</p>
        <div style="display: flex; align-items: center; gap: 20px; margin-top: 8px;">
          <span style="font-size: 14px; line-height: 20px; color: ${onDark ? DARK : '#FFFFFF'}; background: ${onDark ? PAPER : DARK}; padding: 13px 24px;">Read the piece</span>
          <span class="mono" style="font-size: 11px; color: ${onDark ? G.g60 : G.g70};">14 pages &#183; free</span>
        </div>
      </div>
      <div style="padding: 0 ${PAD}px 40px ${PAD}px;">
        <span class="mono" style="font-size: 10px; line-height: 16px; color: ${onDark ? G.g70 : G.g60};">SEC XBRL frames API, us-gaap, CY2024. n=2,186, retrieved 2026-08-05.</span>
      </div>
    </div>
  </div>

  <div style="flex-shrink: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; padding: 52px ${PAD}px; background: ${PAPER}; border-bottom: 1px solid ${G.g20};">
    ${stats}
  </div>

  <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 28px; padding: 64px ${PAD}px 24px ${PAD}px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
      <h2 style="margin: 0; font-size: 30px; line-height: 38px; font-weight: 500; letter-spacing: -0.02em; max-width: 560px; text-wrap: pretty;">What we publish, and what we will not</h2>
      <span style="font-size: 14px; line-height: 20px; flex-shrink: 0; color: ${G.g90}; border-bottom: 1px solid ${G.g40}; padding-bottom: 2px;">All research &#8594;</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px;">
      ${cards}
    </div>
  </div>

  <div style="flex-shrink: 0; display: flex; gap: 52px; padding: 56px ${PAD}px; align-items: flex-start;">
    <div style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
      <span class="mono" style="font-size: 10px; color: ${G.g60}; letter-spacing: 0.06em;">FROM PIECE 001</span>
      <h3 style="margin: 0; font-size: 22px; line-height: 29px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">Six cohorts, and none of them is the whole</h3>
      <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">${o.figNote}</p>
    </div>
    <canvas id="fig" width="1408" height="576" style="width: 880px; height: 360px; display: block; flex-shrink: 0;"></canvas>
  </div>

  <div style="flex-grow: 1;"></div>
  ${footer}
</div>`;
  fs.writeFileSync(o.file, D.shell({ dark: false, d: NEUTRAL, body, js: o.js, props: props(o.section, o.grain) }));
  return { file: o.file, w: HW, h: HH, title: o.title, note: o.note };
}

const head = (grain) => `class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('hero');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : ${grain};
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;`;

/* The featured figure, identical on all four boards but for the one argument
   that decides whether it is coloured. */
const fig = (grey) => `
    var f = document.getElementById('fig');
    if (!f) return;
    var fc = f.getContext('2d');
    fc.globalCompositeOperation = 'source-over'; fc.globalAlpha = 1;
    fc.clearRect(0, 0, f.width, f.height);
    figRidge(fc, f.width, f.height, ramp, k, ${grey});
    fxGrain(fc, f.width, f.height, gr * 0.6, 83, 1);
  }
  renderVals() { return {}; }
}`;

const HOMES = [];

/* 1. A Hero in the band. The subject has to clear the headline column, so
   its left edge is derived from that column rather than picked.

   Width and height fractions are EQUAL, which is not a coincidence. `placed`
   scales the two axes independently, so a subject given 0.60 of the width and
   0.86 of the height is squeezed 30 per cent horizontally, and a skyline
   squeezed 30 per cent stops being a skyline and becomes a row of spikes.
   Equal fractions hold the subject at the aspect it was drawn for.

   The box is also LARGER than it needs to be and runs well off the right
   edge. Fifteen towers fitted inside the band read as a picket fence; the
   same fifteen at a scale where four of them fall off the frame read as a
   skyline, because the towers are wide enough to have massing and the frame
   is plainly a crop of something bigger.

   And it dissolves at the base rather than standing on a ground line. */
HOMES.push(home({
  file: 'AppHomeHero.dc.html', heroDark: true, section: 'Home Hero', grain: 0.055,
  title: 'Home  Hero in the band',
  note: 'A named subject behind the headline. It says what the practice looks at before a word is read, and it is the only one of the four that could not be any other research site.',
  figNote: 'Six equal-count revenue cohorts. The gradient carries cohort, which is ordered, so the ramp is the key.',
  js: `${pre(A_SITE, { subjects: true, kde: true })}
${FIGJS}
${head(0.055)}
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    var mask = faded(fxMaskFrom(placed(subjCity, 0.44, 0.10, 0.82, 0.82), W, H, 3), { bot: [0.56, 0.86], grit: 0.5 });
    fxStipple(ctx, W, H, ramp, k, {
      count: 30000, seed: 11, glyph: 'dot', grid: 88, rMin: 0.9, rMax: 2.2,
      aLo: 0.24, aHi: 1.0, t0: 0.22, t1: 1.0, axis: [0.42, 0.84, 1.10, 0.14], density: mask
    });
    fxGrain(ctx, W, H, gr, 13, 1);
${fig(false)}`
}));

/* 2. A Field in the band. Atmosphere and nothing to name. */
HOMES.push(home({
  file: 'AppHomeField.dc.html', heroDark: true, section: 'Home Field', grain: 0.06,
  title: 'Home  Field in the band',
  note: 'The band is weather. Quietest of the four behind a long headline and the one that will still look right when the featured piece changes, because it is about nothing in particular.',
  figNote: 'Six equal-count revenue cohorts. The gradient carries cohort, which is ordered, so the ramp is the key.',
  js: `${pre(A_SITE, { kde: true })}
${FIGJS}
${head(0.06)}
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    fxField(ctx, W, H, ramp, k, ${JSON.stringify(BLOBS_HOME)}, 'lighter');
    fxGrain(ctx, W, H, gr, 17, 1);
${fig(false)}`
}));

/* 3. A Form, on a paper band. The site does not have to open on black, and a
   light band is the version that survives being printed or screenshotted
   into somebody else's deck. */
HOMES.push(home({
  file: 'AppHomeForm.dc.html', heroDark: false, section: 'Home Form', grain: 0.035,
  title: 'Home  Form on a paper band',
  note: 'A light band, and a Form rather than a subject. Decoration doing the work a Hero would do, which is allowed here in a way it is not on a cover: nobody expects a homepage band to be a picture of anything.',
  figNote: 'Six equal-count revenue cohorts. The gradient carries cohort, which is ordered, so the ramp is the key.',
  js: `${pre(A_SITE, { forms: true, kde: true })}
${FIGJS}
${head(0.035)}
    ctx.fillStyle = '${PAPER}'; ctx.fillRect(0, 0, W, H);
    fxStipple(ctx, W, H, ramp, k, {
      count: 13000, seed: 19, glyph: 'dot', grid: 58, rMin: 0.9, rMax: 2.5,
      aLo: 0.32, aHi: 0.92, t0: 0.02, t1: 0.62,
      axis: [0.46, 0.10, 1.04, 0.90], density: windowed(formNamed('concentration'), 0.46, 0.04, 0.58, 0.92)
    });
    fxGrain(ctx, W, H, gr, 23, 1);
${fig(false)}`
}));

/* 4. No COLOUR above the fold, and the page's only colour spent on the one
   figure. The question this asks is where a single note of colour buys the
   most, and the answer it proposes is: not in the band.

   The band still carries the field CONSTRUCTION, run through four neutral
   anchors. Left as flat black it read as a failed render rather than as a
   decision, which is a real failure whatever the intent was: a viewer cannot
   tell restraint from a bug. Declining colour is not the same as declining to
   draw anything. */
HOMES.push(home({
  file: 'AppHomeQuiet.dc.html', heroDark: true, section: 'Home Quiet', grain: 0.05,
  title: 'Home  colour once, below the fold',
  note: 'No colour in the band. It carries the same field construction as the second board with the chroma taken out, because flat black read as a failed render rather than as a decision. The page spends its entire colour budget on one figure, where the gradient carries an ordered variable and is therefore doing work rather than setting a mood.',
  figNote: 'Six equal-count revenue cohorts. This is the only coloured element on the page, and it is coloured because the ramp is carrying cohort.',
  js: `${pre(A_SITE, { kde: true })}
var A_N = ${JSON.stringify(A_GREY)};
function neutral(t, kk) { return anchorRamp(A_N, t, 1); }
${FIGJS}
${head(0.05)}
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    fxField(ctx, W, H, neutral, 1, ${JSON.stringify(A.BLOBS_HOME)}, 'lighter');
    fxGrain(ctx, W, H, gr, 29, 2);
${fig(false)}`
}));

HOMES.forEach((h) => console.log(h.file.padEnd(28) + HW + 'x' + HH + '  ' + fs.statSync(h.file).size + ' bytes'));

module.exports = { HOMES, HW, HH };
