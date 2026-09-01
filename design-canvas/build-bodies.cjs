/* Six body pages from one piece, in the order a reader meets them.

   These are not six alternatives. They are a sequence, and the thing to judge
   is the RATE: how often a device shows up over six pages, and whether the
   pages that carry one earn it against the pages that do not.

   As built: two of the six carry a device outright, one carries a small Form
   in the margin, and three carry nothing at all. One of the two figure pages
   uses the gradient as an ordered encoding and the other is greyscale, which
   is the same choice made twice with different answers.

   Everything is drawn from the CY2024 margin data in this repository. No
   number on these pages is invented and no chart is shaped to flatter a
   gradient. */
const fs = require('fs');
const A = require('./_applied.cjs');
const { D, G, NEUTRAL, CW, CH, px, DARK, PAPER, A_PIECE, BLOBS_COVER, pre, props, FIGJS, running } = A;

const { LEDE, P1, P2, CLAIM } = D;

/* One page shell. The running head, the folio and the hairline are identical
   on all six and they are greyscale on all six, including the page that runs
   a field under them. */
function page(o) {
  const fg = o.dark ? '#FFFFFF' : DARK;
  const body = `<div style="position: relative; width: ${CW}px; height: ${CH}px; overflow: hidden; background: ${o.dark ? DARK : '#FFFFFF'}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${fg};">
  ${o.bleed ? `<canvas id="bg" width="${px(CW)}" height="${px(CH)}" style="position: absolute; inset: 0; width: ${CW}px; height: ${CH}px; display: block;"></canvas>` : ''}
  <div style="position: relative; display: flex; flex-direction: column; height: 100%; padding: 40px 64px 30px 64px; box-sizing: border-box;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 12px; border-bottom: 1px solid ${o.dark ? 'rgba(244,244,243,0.14)' : G.g20}; flex-shrink: 0;">
      <span class="mono" style="font-size: 9px; letter-spacing: 0.06em; color: ${o.dark ? G.g70 : G.g60};">ELEVEN ONE RESEARCH &#183; PIECE 001</span>
      <span class="mono" style="font-size: 9px; letter-spacing: 0.06em; color: ${o.dark ? G.g70 : G.g60};">${o.section}</span>
    </div>
    ${o.content}
    <div style="display: flex; justify-content: space-between; align-items: baseline; flex-shrink: 0; padding-top: 10px;">
      <span class="mono" style="font-size: 9px; color: ${o.dark ? G.g70 : G.g60};">${o.foot || ''}</span>
      <span class="mono" style="font-size: 9px; color: ${o.dark ? G.g70 : G.g60};">${o.n}</span>
    </div>
  </div>
</div>`;
  fs.writeFileSync(o.file, D.shell({ dark: !!o.dark, d: NEUTRAL, body, js: o.js || 'class Component extends DCLogic {}', props: props(o.sectionProp || 'Body', o.grain) }));
  return { file: o.file, w: CW, h: CH, title: o.title, note: o.note };
}

const head = (grain, id) => `class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('${id}');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : ${grain};`;

const tail = `
  }
  renderVals() { return {}; }
}`;

const BODIES = [];

/* ------------------------------------------------------------------ page 2 */
/* No device. This is what most pages of most pieces look like, and it is the
   null the other five have to beat. */
BODIES.push(page({
  file: 'AppBodyOpen.dc.html', n: '2', section: '01 &#183; THE METHOD',
  sectionProp: 'Body Open', title: 'Body  opening, no device',
  note: 'No colour anywhere. This is the default page and most pages of most pieces are this page. Everything else on this sheet has to beat it.',
  foot: 'SEC XBRL frames, us-gaap, CY2024',
  content: `
    <div style="flex-grow: 1; display: flex; gap: 64px; padding-top: 40px; align-items: flex-start;">
      <div style="width: 300px; flex-shrink: 0;">
        <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${G.g60};">SECTION 01</span>
        <h2 style="margin: 10px 0 0 0; font-size: 30px; line-height: 36px; font-weight: 500; letter-spacing: -0.025em; text-wrap: pretty;">The method that produces the number</h2>
      </div>
      <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px; max-width: 690px;">
        <p style="margin: 0; font-size: 19px; line-height: 30px; letter-spacing: -0.015em; color: ${G.g90}; text-wrap: pretty;">${LEDE}</p>
        <p style="margin: 0; font-size: 15px; line-height: 25px; color: ${G.g80}; text-wrap: pretty;">${P1}</p>
        <p style="margin: 0; font-size: 15px; line-height: 25px; color: ${G.g80}; text-wrap: pretty;">${P2} The question is not whether the median is correct. It is whether a median is the right object to hand somebody who has to make a decision with it.</p>
      </div>
    </div>`
}));

/* ------------------------------------------------------------------ page 8 */
/* A Field, and nothing else on the page competing with it. A section opener
   is the one place in a report where atmosphere is the whole job. */
BODIES.push(page({
  file: 'AppBodySection.dc.html', dark: true, n: '8', section: '02 &#183; OPENER',
  sectionProp: 'Body Section', grain: 0.06, bleed: true,
  title: 'Body  section opener, Field',
  note: 'One device, and the only thing on the page. A section opener is where atmosphere is the entire job, so nothing else is asked to share the page with it.',
  foot: 'Section 02 begins overleaf',
  content: `
    <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 24px; max-width: 620px;">
      <span class="mono" style="font-size: 44px; line-height: 50px; color: ${G.g70}; letter-spacing: -0.02em;">02</span>
      <h2 style="margin: 18px 0 0 0; font-size: 40px; line-height: 46px; font-weight: 500; letter-spacing: -0.03em; text-wrap: pretty;">Where the spread comes from</h2>
      <p style="margin: 14px 0 0 0; font-size: 17px; line-height: 27px; letter-spacing: -0.015em; color: ${G.g40}; text-wrap: pretty;">Six equal-count cohorts, sorted by revenue, and what changes across them.</p>
    </div>`,
  js: `${pre(A_PIECE)}
${head(0.06, 'bg')}
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
    fxField(ctx, W, H, ramp, k, ${JSON.stringify(BLOBS_COVER)}, 'lighter');
    fxGrain(ctx, W, H, gr, 53, 1);${tail}`
}));

/* ------------------------------------------------------------------ page 9 */
/* Colour as an ordered encoding. Cohort runs small to large, so the ramp may
   carry it and the ramp is then the legend. Every rule, tick and label on the
   page is still grey. */
BODIES.push(page({
  file: 'AppBodyFigure.dc.html', n: '9', section: '02 &#183; FIG. 2',
  sectionProp: 'Body Figure', grain: 0.03,
  title: 'Body  one figure, gradient as encoding',
  note: 'The gradient carries cohort, which is ordered, so a ramp is allowed to hold it and the ramp becomes the legend. Axes, ticks, labels and the baseline stay grey, which is the part of the rule that did not change.',
  foot: 'n = 2,186. Bandwidth by Silverman.',
  content: `
    <div style="flex-grow: 1; display: flex; gap: 44px; padding-top: 26px; align-items: flex-start;">
      <div style="width: 268px; flex-shrink: 0; display: flex; flex-direction: column; gap: 11px;">
        <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${G.g60};">FIG. 2</span>
        <h3 style="margin: 0; font-size: 21px; line-height: 28px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">Six cohorts, and none of them is the whole</h3>
        <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">The same estimate cut into six equal-count revenue cohorts and offset so the shapes can be compared. Every one of them is wide, and the widest is the smallest cohort.</p>
        <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g70}; text-wrap: pretty;">Cohort is ordered, so the gradient is allowed to carry it. There is no key because the ramp is the key.</p>
      </div>
      <canvas id="fig" width="1370" height="672" style="width: 856px; height: 420px; display: block; flex-shrink: 0;"></canvas>
    </div>`,
  js: `${pre(A_PIECE, { kde: true })}
${FIGJS}
${head(0.03, 'fig')}
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    figRidge(ctx, W, H, ramp, k, false);
    fxGrain(ctx, W, H, gr, 59, 1);${tail}`
}));

/* ----------------------------------------------------------------- page 12 */
/* The same decision, answered the other way. Two exhibits, no colour on
   either, because a report where every exhibit is coloured has no emphasis
   left to spend on the one that matters. */
BODIES.push(page({
  file: 'AppBodyPair.dc.html', n: '12', section: '02 &#183; FIG. 4 AND FIG. 5',
  sectionProp: 'Body Pair', grain: 0.03,
  title: 'Body  two figures, no colour',
  note: 'The same decision as the page before, answered the other way. Both exhibits could have taken the ramp and neither needed it, and a report where every exhibit is coloured has no emphasis left to spend.',
  foot: 'Cohorts are equal-count, not equal-width',
  content: `
    <div style="flex-grow: 1; display: flex; gap: 40px; padding-top: 22px; align-items: flex-start;">
      <div style="display: flex; flex-direction: column; gap: 8px; width: 536px; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px;">
          <span class="mono" style="font-size: 10px; color: ${G.g60};">FIG. 4</span>
          <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">Dispersion narrows with revenue</span>
        </div>
        <p style="margin: 0; font-size: 12px; line-height: 19px; color: ${G.g70}; text-wrap: pretty;">The p10 to p90 spread of each cohort, in points of margin. It falls at every step.</p>
        <canvas id="fa" width="858" height="608" style="width: 536px; height: 380px; display: block;"></canvas>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; width: 536px; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px;">
          <span class="mono" style="font-size: 10px; color: ${G.g60};">FIG. 5</span>
          <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">The medians do not</span>
        </div>
        <p style="margin: 0; font-size: 12px; line-height: 19px; color: ${G.g70}; text-wrap: pretty;">p25 to p75 for each cohort with the median marked. The order is 40.8, 35.8, 44.1, 39.8, 36.6, 29.2.</p>
        <canvas id="fb" width="858" height="608" style="width: 536px; height: 380px; display: block;"></canvas>
      </div>
    </div>`,
  js: `${pre(A_PIECE, { kde: true })}
${FIGJS}
${head(0.03, 'fa')}
    var b = document.getElementById('fb');
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    figSpread(ctx, W, H, ramp, k, true);
    fxGrain(ctx, W, H, gr, 61, 1);
    var c2 = b.getContext('2d');
    c2.globalCompositeOperation = 'source-over'; c2.globalAlpha = 1;
    c2.clearRect(0, 0, b.width, b.height);
    figQuart(c2, b.width, b.height, ramp, k, true);
    fxGrain(c2, b.width, b.height, gr, 67, 1);${tail}`
}));

/* ----------------------------------------------------------------- page 15 */
/* A Form, in a margin, at the size a Form belongs. It carries the idea of the
   argument beside it and it carries no data, which is why it can sit next to
   running text without being read as a chart. */
BODIES.push(page({
  file: 'AppBodyRead.dc.html', n: '15', section: '03 &#183; WHAT WE ARE LEAST SURE OF',
  sectionProp: 'Body Read', grain: 0.035,
  title: 'Body  running text, Form in the margin',
  note: 'A Form at the size a Form belongs: a margin, quiet, carrying the idea of the argument beside it and no data at all. This is the one page on the sheet where a device and running text share the paper.',
  foot: '221 filers excluded. See appendix B.',
  content: `
    <div style="flex-grow: 1; display: flex; gap: 40px; padding-top: 26px; align-items: flex-start;">
      <div style="width: 196px; flex-shrink: 0;">
        <canvas id="mg" width="392" height="1040" style="width: 196px; height: 520px; display: block;"></canvas>
      </div>
      <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 16px;">
        <h3 style="margin: 0; font-size: 22px; line-height: 29px; font-weight: 500; letter-spacing: -0.02em; max-width: 620px; text-wrap: pretty;">The one thing in this data that behaves</h3>
        <div style="display: flex; gap: 36px;">
          <div style="width: 400px; display: flex; flex-direction: column; gap: 13px;">
            <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">Six equal-count cohorts, sorted by revenue. The p10 to p90 spread falls from 72.2 points in the smallest to 52.7 in the largest, and it falls at every step in between. Nothing else in this data is monotone.</p>
            <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">The medians are not. They run 40.8, 35.8, 44.1, 39.8, 36.6 and 29.2, which is not an order. Whatever moves margin around inside a cohort is not revenue, so a peer set built on revenue alone is buying less than it looks like it is buying.</p>
          </div>
          <div style="width: 400px; display: flex; flex-direction: column; gap: 13px;">
            <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">The excluded filers are the part of this we are least sure about. 221 registrants reported one of the two tags and not the other, and they are not a random sample with respect to margin. We have not tested how far that moves anything.</p>
            <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">Cost of revenue policy varies between filers and we have not adjusted for it. As-reported gross profit is comparable enough to rank a cohort and not comparable enough to separate two companies four points apart.</p>
          </div>
        </div>
      </div>
    </div>`,
  js: `${pre(A_PIECE, { forms: true })}
${head(0.035, 'mg')}
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    fxStipple(ctx, W, H, ramp, k, {
      count: 5200, seed: 71, glyph: 'square', grid: 56, rMin: 1.0, rMax: 2.4,
      aLo: 0.34, aHi: 0.90, t0: 0.04, t1: 0.66,
      axis: [0.20, 0.06, 0.80, 0.94], density: formNamed('erosion')
    });
    fxGrain(ctx, W, H, gr, 73, 1);${tail}`
}));

/* ----------------------------------------------------------------- page 18 */
/* No device again, and no colour. What a claim rests on, what it assumes and
   what would break it, which is the page the practice is actually selling. */
BODIES.push(page({
  file: 'AppBodyClaim.dc.html', n: '18', section: '04 &#183; THE CLAIM',
  sectionProp: 'Body Claim', title: 'Body  the claim, no device',
  note: 'The page the practice is actually selling, and it has no image on it at all. Rules and panel edges are grey here for the same reason they are grey on the pages that do carry a device.',
  foot: 'Retrieved 2026-08-05',
  content: `
    <div style="flex-grow: 1; display: flex; gap: 56px; padding-top: 34px; align-items: flex-start;">
      <div style="width: 380px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
        <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${G.g60};">CLAIM 1 OF 3</span>
        <p style="margin: 0; font-size: 21px; line-height: 30px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">${CLAIM.text}</p>
      </div>
      <div style="flex-grow: 1; display: flex; flex-direction: column; border-top: 1px solid ${G.g30};">
        ${[['RESTS ON', CLAIM.rests], ['ASSUMES', CLAIM.assumes], ['BREAKS IF', CLAIM.breaks]].map(([h, t]) => `
        <div style="display: flex; gap: 28px; padding: 17px 0; border-bottom: 1px solid ${G.g20};">
          <span class="mono" style="width: 92px; flex-shrink: 0; font-size: 9px; letter-spacing: 0.06em; color: ${G.g60}; padding-top: 3px;">${h}</span>
          <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g80}; text-wrap: pretty;">${t}</p>
        </div>`).join('')}
      </div>
    </div>`
}));

BODIES.forEach((b) => console.log(b.file.padEnd(28) + CW + 'x' + CH + '  ' + fs.statSync(b.file).size + ' bytes'));

module.exports = { BODIES };
