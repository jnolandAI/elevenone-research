/* The site pages: four directions by three page types.

   Same rule as the report. Type, words, objects, layout and which bands are
   dark or light are identical across all four; only the palette and the
   surface treatment change. The site is where a direction has to work at
   1440 wide, with navigation, cards and a footer, rather than on a 16:9
   page with nothing else on it.

   Copy marked [DRAFT TITLE] is structural placeholder. Piece 001 is real. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const {
  LANGJS, GRIDJS, KDEJS, FXJS, at, fieldCss, fieldBlobCss,
  BLOBS_DARK, BLOBS_LIGHT,
  SPREAD, LABELS, TITLE, SUB, LEDE, P1, P2, CLAIM, PIECES,
  MARK, DARK, PAPER, DIRS, shell, RAMPS
} = D;

const W = 1440;
const PAD = 96;

/* The hero headline column. Narrower than the 720 it used to be, because
   the object has to clear it and the headline sets in two lines either way. */
const HEADW = 620;

const CHROMA = (d) => `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"${d.name}","tsType":"number"}}`;

const NAV = (d, onDark, current) => {
  const fg = onDark ? '#C9C9C7' : '#4A4A48';
  const on = onDark ? '#FFFFFF' : DARK;
  const items = ['Research', 'Method', 'About'].map((t) =>
    `<a href="#" style="font-size: 14px; line-height: 20px; color: ${t === current ? on : fg}; text-decoration: none;">${t}</a>`).join('');
  return `
  <div style="display: flex; justify-content: space-between; align-items: center; height: 72px; padding: 0 ${PAD}px; background: ${onDark ? 'transparent' : '#FFFFFF'}; border-bottom: 1px solid ${onDark ? 'rgba(244,244,243,0.10)' : '#EBEBEA'}; flex-shrink: 0;">
    <div style="display: flex; align-items: center; gap: 11px;">
      <svg class="mk" style="width: 22px; height: 22px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g>${MARK}</g></svg>
      <span style="font-size: 14px; line-height: 20px; font-weight: 500; letter-spacing: -0.01em; color: ${on};">Eleven One Research</span>
    </div>
    <div style="display: flex; align-items: center; gap: 32px;">
      ${items}
      <span class="mono" style="font-size: 11px; color: ${onDark ? d.accentDark : d.accent}; border: 1px solid ${onDark ? d.accentDark : d.accent}; padding: 7px 14px;">Subscribe</span>
    </div>
  </div>`;
};

const FOOTER = (d) => `
  <div style="flex-shrink: 0; background: ${DARK}; padding: 44px ${PAD}px 40px ${PAD}px; display: flex; justify-content: space-between; align-items: flex-start; gap: 60px;">
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 380px;">
      <div style="display: flex; align-items: center; gap: 11px;">
        <svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g fill="${PAPER}">${MARK}</g></svg>
        <span style="font-size: 13px; line-height: 19px; color: #C9C9C7;">Eleven One Research</span>
      </div>
      <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6C6C6A; text-wrap: pretty;">Cross-sector financial analysis built from primary filings. Every figure traces to a source of record.</p>
    </div>
    <div style="display: flex; gap: 56px;">
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span class="mono" style="font-size: 9px; color: #4A4A48; letter-spacing: 0.06em;">RESEARCH</span>
        <a href="#" style="font-size: 12px; line-height: 19px;">All pieces</a>
        <a href="#" style="font-size: 12px; line-height: 19px;">Method</a>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span class="mono" style="font-size: 9px; color: #4A4A48; letter-spacing: 0.06em;">CONTACT</span>
        <a href="#" style="font-size: 12px; line-height: 19px;">[EMAIL]</a>
        <span class="mono" style="font-size: 11px; color: #6C6C6A;">elevenoneresearch.com</span>
      </div>
    </div>
  </div>`;

// --------------------------------------------------------------------- HOME

function home(d) {
  const H = 2100;
  const cardField = () => fieldBlobCss(d.light, BLOBS_LIGHT, 0.85);

  const cards = [
    ['Distributions, not medians', 'Every benchmark we publish shows the spread it came from. A median with no dispersion behind it is a number, not a finding.'],
    ['Primary filings only', 'Figures come out of the SEC XBRL frames API and comparable primary sources. Nothing is scraped from a summary and nothing is modelled.'],
    ['Claims carry their own limits', 'Each claim states what it rests on, what it assumes, and what would break it. The limits ship with the number.']
  ].map(([h, t], i) => `
      <div style="display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid #EBEBEA;">
        <div style="height: 84px; background: ${cardField(i)};"></div>
        <div style="display: flex; flex-direction: column; gap: 9px; padding: 22px 24px 26px 24px;">
          <h3 style="margin: 0; font-size: 17px; line-height: 24px; font-weight: 500; letter-spacing: -0.01em; text-wrap: pretty;">${h}</h3>
          <p style="margin: 0; font-size: 13px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">${t}</p>
        </div>
      </div>`).join('');

  const stats = [
    ['2,186', 'SEC registrants, CY2024'],
    ['38.8%', 'median reported gross margin'],
    ['64 pts', 'the band eight in ten fall inside']
  ].map(([n, l]) => `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <span style="font-size: 40px; line-height: 46px; font-weight: 500; letter-spacing: -0.03em;">${n}</span>
        <span class="mono" style="font-size: 11px; line-height: 17px; color: #6C6C6A;">${l}</span>
      </div>`).join('');

  const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #FFFFFF; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column;">

  <div style="position: relative; height: 732px; flex-shrink: 0; background: ${DARK}; overflow: hidden;">
    <canvas id="hero" width="2880" height="1464" style="position: absolute; inset: 0; width: ${W}px; height: 732px;"></canvas>
    <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
      ${NAV(d, true, 'Research')}
      <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 22px; padding: 0 ${PAD}px; max-width: ${HEADW}px;">
        <span class="mono" style="font-size: 11px; color: ${d.accentDark};">PIECE 001 &#183; CROSS-SECTOR</span>
        <h1 style="margin: 0; font-size: 52px; line-height: 58px; font-weight: 500; letter-spacing: -0.03em; color: #FFFFFF; text-wrap: pretty;">${TITLE}</h1>
        <p style="margin: 0; font-size: 20px; line-height: 30px; letter-spacing: -0.02em; color: #C9C9C7; text-wrap: pretty;">${SUB}</p>
        <div style="display: flex; align-items: center; gap: 20px; margin-top: 8px;">
          <span style="font-size: 14px; line-height: 20px; color: ${DARK}; background: ${PAPER}; padding: 13px 24px;">Read the piece</span>
          <span class="mono" style="font-size: 11px; color: #8C8C8A;">14 pages &#183; free</span>
        </div>
      </div>
      <div style="padding: 0 ${PAD}px 40px ${PAD}px;">
        <span class="mono" style="font-size: 10px; line-height: 16px; color: #6C6C6A;">SEC XBRL frames API, us-gaap, CY2024. n=2,186, retrieved 2026-08-05.</span>
      </div>
    </div>
  </div>

  <div style="flex-shrink: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; padding: 52px ${PAD}px 52px ${PAD}px; background: ${PAPER}; border-bottom: 1px solid #EBEBEA;">
    ${stats}
  </div>

  <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 28px; padding: 64px ${PAD}px 20px ${PAD}px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
      <h2 style="margin: 0; font-size: 30px; line-height: 38px; font-weight: 500; letter-spacing: -0.02em; max-width: 560px; text-wrap: pretty;">What we publish, and what we will not</h2>
      <a href="#" style="font-size: 14px; line-height: 20px; flex-shrink: 0;">All research &#8594;</a>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px;">
      ${cards}
    </div>
  </div>

  <div style="flex-shrink: 0; display: flex; gap: 56px; padding: 56px ${PAD}px 56px ${PAD}px; align-items: flex-start;">
    <div style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
      <span class="mono" style="font-size: 10px; color: ${d.accent}; letter-spacing: 0.06em;">FROM PIECE 001</span>
      <h3 style="margin: 0; font-size: 22px; line-height: 29px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">Dispersion narrows with revenue while the medians do not</h3>
      <p style="margin: 0; font-size: 13px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">Six equal-count cohorts. The p10 to p90 spread falls from 72.2 points to 52.7 across them. The medians do not march in order.</p>
    </div>
    <canvas id="fig" width="1832" height="700" style="width: 916px; height: 350px; display: block; flex-shrink: 0;"></canvas>
  </div>

  <div style="flex-grow: 1;"></div>
  ${FOOTER(d)}
</div>`;

  const js = `${LANGJS}
${GRIDJS}
${KDEJS}
${FXJS}
var SPREAD = [${SPREAD.join(',')}];
${RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('hero');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var ctx = cv.getContext('2d'), CW = cv.width, CH = cv.height, S = 2;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, CW, CH);
    fxField(ctx, CW, CH, fd, k * ${d.fieldK}, ${JSON.stringify(BLOBS_DARK)}, '${d.fieldMode}');

    /* The same surface, pushed right so the headline has the left half.

       It used to be sized by arithmetic and never looked at: the back corner
       of the object landed on the right end of the headline. It is smaller
       now and its left edge is derived from the headline column rather than
       chosen, so the two cannot collide again when either one moves. */
    var HEAD = ${(PAD + HEADW) * 2}, GUT = 90, EDGE = 30;
    /* Both constraints at once: clear of the headline column on the left,
       inside the frame on the right. Solve for the reach that satisfies both
       and size the object from it, rather than picking a size and hoping. An
       earlier version took the smaller of the two placements, which silently
       chose the frame and put the object back on the headline. */
    var reach = (CW - EDGE - GUT - HEAD) / 2;
    var sx = reach / 0.749, sy = sx * 0.73;
    var O = { ox: HEAD + GUT + reach, oy: CH * 0.60, sx: sx, sy: sy, hz: CH * 0.30 };
    fxDots(ctx, S, O, {
      grid: GRID, rows: GROWS, cols: GCOLS, max: GMAX,
      ramp: em, k: k, seed: 11, mode: '${d.dot.mode}',
      stepR: ${d.dot.stepR}, stepC: ${d.dot.stepC}, jitter: ${d.dot.jitter},
      web: ${d.dot.web}, webStep: ${d.dot.webStep},
      aLo: ${d.dot.aLo}, aHi: ${d.dot.aHi}, rLo: ${d.dot.rLo}, rHi: ${d.dot.rHi}, floor: 0.02, lo: 0, hi: 1
    });
    fxGrain(ctx, CW, CH, ${d.grainAmp}, 7, ${d.grainScale});
    /* The figure below, on paper, with the same six cohorts. */
    var f = document.getElementById('fig');
    if (!f) return;
    var f2 = f.getContext('2d');
    f2.clearRect(0, 0, f.width, f.height);
    var peak = maxOf(KDE), i;
    var x0 = 60, w = 1560, base = 590, hgt = 430;
    var peakA = 0;
    for (i = 0; i < ALL.length; i++) if (ALL[i] > peakA) peakA = ALL[i];
    fxCloud(f2, ALL, x0, base, w, hgt, peakA, {
      n: 9000, seed: 5, ramp: ik, k: k * 1.5, t0: 0.26, t1: 1.0, soft: 0.16,
      aLo: 0.05, aHi: 0.28, rad: 1.4, mode: 'multiply'
    });
    for (i = 0; i < KDE.length; i++) {
      var t = i / (KDE.length - 1);
      var col = ik(0.16 + t * 0.76, k);
      kdePath(f2, KDE[i], x0, base, w, hgt, peak, false);
      f2.strokeStyle = rgba(col, 0.94); f2.lineWidth = 3; f2.stroke();
    }
    axisX(f2, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
  }
  renderVals() { return {}; }
}`;

  return shell({ dark: false, d, body, js, props: CHROMA(d), h: H });
}

// ----------------------------------------------------------------- RESEARCH

function research(d) {
  const H = 1500;

  const cards = PIECES.map((p, i) => `
      <div style="display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid #EBEBEA;">
        <div style="height: 108px; background: ${fieldBlobCss(d.light, BLOBS_LIGHT, 0.85)}; display: flex; align-items: flex-end; justify-content: space-between; padding: 0 22px 14px 22px;">
          <span class="mono" style="font-size: 11px; color: ${DARK};">${p.n}</span>
          <span class="mono" style="font-size: 10px; color: #4A4A48;">${p.tag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; padding: 22px 24px 24px 24px;">
          <h3 style="margin: 0; font-size: 19px; line-height: 26px; font-weight: 500; letter-spacing: -0.02em; color: ${p.live ? DARK : '#8C8C8A'}; text-wrap: pretty;">${p.t}</h3>
          <p style="margin: 0; font-size: 13px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">${p.d}</p>
          <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
            <span class="mono" style="font-size: 10px; color: ${p.live ? d.accent : '#AEAEAC'};">${p.live ? 'PUBLISHED' : 'IN PROGRESS'}</span>
            <span class="mono" style="font-size: 10px; color: #AEAEAC;">${p.live ? '2026-08-05' : '[DATE]'}</span>
          </div>
        </div>
      </div>`).join('');

  const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column;">
  ${NAV(d, false, 'Research')}

  <div style="position: relative; flex-shrink: 0; padding: 60px ${PAD}px 52px ${PAD}px; overflow: hidden;">
    <div style="position: absolute; right: -120px; top: -160px; width: 760px; height: 520px; background: ${fieldBlobCss(d.light, BLOBS_LIGHT, 1.2)};"></div>
    <div style="position: relative; display: flex; flex-direction: column; gap: 16px; max-width: 620px;">
      <h1 style="margin: 0; font-size: 42px; line-height: 50px; font-weight: 500; letter-spacing: -0.03em; text-wrap: pretty;">Research</h1>
      <p style="margin: 0; font-size: 17px; line-height: 27px; color: #4A4A48; text-wrap: pretty;">Everything we have published, with the data behind it. Each piece states what its claims rest on, what they assume, and what would break them.</p>
    </div>
  </div>

  <div style="flex-shrink: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; padding: 0 ${PAD}px;">
    ${cards}
  </div>

  <div style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 60px; margin: 56px ${PAD}px 0 ${PAD}px; padding-top: 28px; border-top: 1px solid #DEDEDD;">
    <p style="margin: 0; font-size: 13px; line-height: 21px; color: #6C6C6A; max-width: 620px; text-wrap: pretty;">Titles in brackets are placeholders for work in progress, not published findings. Nothing is listed here before its figures trace to a source of record.</p>
    <a href="#" style="font-size: 13px; line-height: 21px; flex-shrink: 0;">How we work &#8594;</a>
  </div>

  <div style="flex-grow: 1;"></div>
  ${FOOTER(d)}
</div>`;

  return shell({ dark: false, d, body, props: '{}', h: H });
}

// ------------------------------------------------------------------ ARTICLE

function article(d) {
  const H = 2260;
  const rows = [['Rests on', CLAIM.rests], ['Assumes', CLAIM.assumes], ['Breaks if', CLAIM.breaks]]
    .map(([kk, vv]) => `<div style="display: flex; gap: 18px;">
              <span class="mono" style="font-size: 10px; color: #8C8C8A; width: 70px; flex-shrink: 0; padding-top: 3px;">${kk}</span>
              <span style="font-size: 13px; line-height: 21px; color: #C9C9C7;">${vv}</span>
            </div>`).join('\n            ');

  const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column;">
  ${NAV(d, false, 'Research')}

  <div style="position: relative; flex-shrink: 0; padding: 56px ${PAD}px 48px ${PAD}px; overflow: hidden;">
    <div style="position: absolute; inset: 0; background: ${fieldBlobCss(d.light, BLOBS_LIGHT, 1.0)};"></div>
    <div style="position: relative; display: flex; flex-direction: column; gap: 18px; max-width: 780px;">
      <span class="mono" style="font-size: 11px; color: #4A4A48;">PIECE 001 &#183; CROSS-SECTOR &#183; 2026-08-05</span>
      <h1 style="margin: 0; font-size: 44px; line-height: 52px; font-weight: 500; letter-spacing: -0.03em; text-wrap: pretty;">${TITLE}</h1>
      <p style="margin: 0; font-size: 20px; line-height: 30px; letter-spacing: -0.02em; color: #2B2B2A; text-wrap: pretty;">${SUB}</p>
    </div>
  </div>

  <div style="flex-shrink: 0; display: flex; gap: 72px; padding: 56px ${PAD}px 0 ${PAD}px; align-items: flex-start;">
    <div style="width: 208px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;">
      <span class="mono" style="font-size: 10px; color: #8C8C8A; letter-spacing: 0.06em;">CONTENTS</span>
      <a href="#" style="font-size: 13px; line-height: 21px;">1 &#183; The method</a>
      <span style="font-size: 13px; line-height: 21px; color: ${d.accent};">2 &#183; The spread</span>
      <a href="#" style="font-size: 13px; line-height: 21px;">3 &#183; By cohort</a>
      <a href="#" style="font-size: 13px; line-height: 21px;">4 &#183; Notes on the data</a>
    </div>
    <div style="display: flex; flex-direction: column; gap: 22px; max-width: 720px;">
      <p style="margin: 0; font-size: 17px; line-height: 29px; color: #2B2B2A; text-wrap: pretty;">${LEDE}</p>
      <h2 style="margin: 12px 0 0 0; font-size: 28px; line-height: 36px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">The spread swamps the middle</h2>
      <p style="margin: 0; font-size: 17px; line-height: 29px; color: #2B2B2A; text-wrap: pretty;">${P1} ${P2}</p>
    </div>
  </div>

  <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; padding: 48px ${PAD}px 0 ${PAD}px;">
    <canvas id="fig" width="2496" height="880" style="width: 1248px; height: 440px; display: block; background: #FFFFFF;"></canvas>
    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 40px;">
      <span class="mono" style="font-size: 11px; color: #4A4A48;">Exhibit 2 &#183; Six equal-count revenue cohorts, density of reported gross margin</span>
      <span class="mono" style="font-size: 10px; color: #8C8C8A;">SEC XBRL frames, CY2024</span>
    </div>
  </div>

  <div style="position: relative; flex-shrink: 0; margin-top: 52px; background: ${DARK}; padding: 46px ${PAD}px 46px ${PAD}px; overflow: hidden;">
    <div style="position: absolute; inset: 0; background: ${DARK}; background-image: ${fieldBlobCss(d.fieldDark, BLOBS_DARK, d.fieldK)};"></div>
    <div style="position: relative; display: flex; gap: 72px; align-items: flex-start;">
      <div style="width: 208px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
        <span class="mono" style="font-size: 10px; color: ${d.accentDark}; letter-spacing: 0.06em;">CLAIM A</span>
        <span class="mono" style="font-size: 10px; color: #8C8C8A;">firm &#183; n=2,186</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 18px; max-width: 900px;">
        <p style="margin: 0; font-size: 22px; line-height: 32px; font-weight: 500; letter-spacing: -0.02em; color: #FFFFFF; text-wrap: pretty;">${CLAIM.text}</p>
        <div style="display: flex; flex-direction: column; gap: 11px; padding-top: 16px; border-top: 1px solid rgba(244,244,243,0.14);">
            ${rows}
        </div>
      </div>
    </div>
  </div>

  <div style="flex-shrink: 0; display: flex; gap: 72px; padding: 52px ${PAD}px 0 ${PAD}px; align-items: flex-start;">
    <div style="width: 208px; flex-shrink: 0;"></div>
    <div style="display: flex; flex-direction: column; gap: 22px; max-width: 720px;">
      <p style="margin: 0; font-size: 17px; line-height: 29px; color: #2B2B2A; text-wrap: pretty;">Split the universe into six equal-count revenue cohorts and the spread does fall, from 72.2 points at the smallest to 52.7 at the largest. That narrowing is monotonic. The medians are not: ${LABELS[2]} sits at ${SPREAD[2] ? '44.1%' : ''}, above both of its neighbours.</p>
      <p style="margin: 0; font-size: 17px; line-height: 29px; color: #2B2B2A; text-wrap: pretty;">So size explains dispersion better than it explains level. A benchmark drawn from a mixed-size peer set inherits the widest cohort's spread and none of its structure.</p>
    </div>
  </div>

  <div style="flex-grow: 1;"></div>
  ${FOOTER(d)}
</div>`;

  const js = `${LANGJS}
${KDEJS}
${FXJS}
var SPREAD = [${SPREAD.join(',')}];
${RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var f = document.getElementById('fig');
    if (!f) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var ctx = f.getContext('2d'), S = 2;
    ctx.clearRect(0, 0, f.width, f.height);
    var peak = maxOf(KDE), i;
    var x0 = 300, w = 1560, base = 640, hgt = 470;
    var peakA = 0;
    for (i = 0; i < ALL.length; i++) if (ALL[i] > peakA) peakA = ALL[i];
    fxCloud(ctx, ALL, x0, base, w, hgt, peakA, {
      n: 12000, seed: 5, ramp: ik, k: k * 1.5, t0: 0.26, t1: 1.0, soft: 0.16,
      aLo: 0.05, aHi: 0.28, rad: 1.5, mode: 'multiply'
    });
    for (i = 0; i < KDE.length; i++) {
      var t = i / (KDE.length - 1);
      var col = ik(0.16 + t * 0.76, k);
      kdePath(ctx, KDE[i], x0, base, w, hgt, peak, false);
      ctx.strokeStyle = rgba(col, 0.94); ctx.lineWidth = 3; ctx.stroke();
    }
    axisX(ctx, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
    ctx.font = (11 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (i = 0; i < LAB.length; i++) {
      ctx.fillStyle = rgbs(ik(0.16 + (i / (LAB.length - 1)) * 0.76, k));
      ctx.fillText(LAB[i], x0 - 24, 150 + i * 44);
      ctx.fillStyle = GREY.g60;
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.fillText(SPREAD[i].toFixed(1) + ' pts', x0 - 24, 150 + i * 44 + 18);
      ctx.font = (11 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
    }
    ctx.textAlign = 'left';
  }
  renderVals() { return {}; }
}`;

  return shell({ dark: false, d, body, js, props: CHROMA(d), h: H });
}

// --------------------------------------------------------------------- emit

const PAGES = [['Home', home, 2100], ['Research', research, 1500], ['Article', article, 2260]];

const out = [];
for (const d of DIRS) {
  for (const [pt, fn] of PAGES) {
    const file = d.key + 'Web' + pt + '.dc.html';
    fs.writeFileSync(file, fn(d));
    out.push([file, fs.statSync(file).size]);
  }
}
for (const [f, s] of out) console.log(f.padEnd(32), s, 'bytes');
console.log('\n' + out.length + ' site artboards');

module.exports = { WEB_PAGES: PAGES.map(([n, , h]) => ({ name: n, h })) };
