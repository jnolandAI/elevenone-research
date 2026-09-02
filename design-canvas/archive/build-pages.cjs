/* Emits the twelve language pages: three languages by four page types.
   Everything on them is real. The prose, the claim and its four rows, the
   cohort figures and the surface all come out of the repository. */
const fs = require('fs');
const L = require('./build-langs.cjs');

const S_DATA = 'var SPREAD = [' + L.SPREAD.join(',') + '];\nvar MEDIANS = [' + L.MEDIANS.join(',') + '];\n';

function shell(o) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${L.FONTS}
  <style>
    body { margin: 0; }
    a { color: ${o.dark ? '#8FD3E8' : '#005CCC'}; text-decoration: none; }
    a:hover { color: ${o.dark ? '#C9DFD0' : '#0647C1'}; }
    .mk circle { fill: ${o.dark ? '#F4F4F3' : '#131312'}; }
    .mono { font-family: 'Martian Mono', ui-monospace, monospace; font-weight: 300; letter-spacing: -0.012em; font-variant-numeric: tabular-nums; }
    ${o.css || ''}
  </style>
</helmet>
${o.body}
</x-dc>
<script data-dc-script data-props='${o.props}'>
${o.js}
</script>
</body>
</html>
`;
}

const BAR = (dark, right) => `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px;">
      <div style="display: flex; align-items: center; gap: 11px;">
        <svg class="mk" style="width: 20px; height: 20px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g>${L.MARK_MICRO}</g></svg>
        <span style="font-size: 12px; line-height: 18px; color: ${dark ? '#C9C9C7' : '#4A4A48'};">Eleven One Research</span>
      </div>
      <span class="mono" style="font-size: 10px; color: ${dark ? '#6C6C6A' : '#8C8C8A'};">${right}</span>
    </div>`;

// ------------------------------------------------------------------- COVER

function cover(g) {
  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: #131312; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: #F4F4F3;">
  <canvas id="cv" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px;"></canvas>
  <div style="position: absolute; inset: 0; pointer-events: none; opacity: {{grain}}; background-image: ${L.NOISE};"></div>
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 44px 60px 40px 60px;">
    ${BAR(true, 'Cross-sector financial analysis')}
    <div style="display: flex; flex-direction: column; gap: 18px; max-width: 470px;">
      <span class="mono" style="font-size: 11px; color: #6C6C6A;">001</span>
      <h1 style="margin: 0; font-size: 44px; line-height: 50px; font-weight: 500; letter-spacing: -0.03em; color: #FFFFFF; text-wrap: pretty;">Reported gross margin is not one distribution</h1>
      <p style="margin: 0; font-size: 20px; line-height: 29px; letter-spacing: -0.02em; color: #C9C9C7; text-wrap: pretty;">The peer median sits between two of them</p>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
      <p style="margin: 0; max-width: 420px; font-size: 14px; line-height: 22px; color: #AEAEAC; text-wrap: pretty;">Every SEC registrant reporting both revenue and gross profit for calendar 2024. The median is 38.8%, and half the universe spans 23.1% to 59.7%.</p>
      <span class="mono" style="font-size: 10px; line-height: 15px; color: #6C6C6A; text-align: right; white-space: pre-line;">SEC XBRL frames API, us-gaap, CY2024
n=2,186  retrieved 2026-08-05</span>
    </div>
  </div>
</div>`;

  const js = `${L.LANGJS}
${L.GRIDJS}
${L.KDEJS}
${S_DATA}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2;
    var k = this.props.chroma != null ? this.props.chroma : ${g.chroma};
    ${g.iso}
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#131312'; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(O.ox, O.oy - 120, 0, O.ox, O.oy - 120, 1200);
    glow.addColorStop(0, rgba(emit(0.30, k), 0.28));
    glow.addColorStop(1, 'rgba(19,19,18,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
${L.COVER_DRAW[g.key]}
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  renderVals() { return { grain: this.props.grain != null ? this.props.grain : 0.05 }; }
}`;

  return shell({
    dark: true, body, js,
    props: `{"chroma":{"editor":"range","default":${g.chroma},"min":0,"max":1.5,"step":0.05,"section":"${g.name}","tsType":"number"},"grain":{"editor":"range","default":0.05,"min":0,"max":0.16,"step":0.01,"section":"${g.name}","tsType":"number"}}`
  });
}

// ----------------------------------------------------------------- SECTION

function section(g) {
  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: #131312; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: #F4F4F3;">
  <canvas id="cv" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px;"></canvas>
  <div style="position: absolute; inset: 0; pointer-events: none; opacity: {{grain}}; background-image: ${L.NOISE};"></div>
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 44px 60px 40px 60px;">
    ${BAR(true, 'Piece 001')}
    <div style="display: flex; align-items: flex-end; gap: 28px; max-width: 620px;">
      <span class="mono" style="font-size: 88px; line-height: 78px; font-weight: 200; color: #4A4A48;">${g.section.n}</span>
      <h1 style="margin: 0 0 6px 0; font-size: 36px; line-height: 42px; font-weight: 500; letter-spacing: -0.02em; color: #FFFFFF; text-wrap: pretty;">${g.section.title}</h1>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
      <p style="margin: 0; max-width: 400px; font-size: 14px; line-height: 22px; color: #8C8C8A; text-wrap: pretty;">${g.idea}</p>
      <span class="mono" style="font-size: 10px; color: #6C6C6A;">${g.name.toLowerCase()}</span>
    </div>
  </div>
</div>`;

  const js = `${L.LANGJS}
${L.GRIDJS}
${L.KDEJS}
${S_DATA}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2;
    var k = this.props.chroma != null ? this.props.chroma : ${g.chroma};
    ${g.iso}
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#131312'; ctx.fillRect(0, 0, W, H);
${L.SECTION_DRAW[g.key]}
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  renderVals() { return { grain: this.props.grain != null ? this.props.grain : 0.04 }; }
}`;

  return shell({
    dark: true, body, js,
    props: `{"chroma":{"editor":"range","default":${g.chroma},"min":0,"max":1.5,"step":0.05,"section":"${g.name}","tsType":"number"},"grain":{"editor":"range","default":0.04,"min":0,"max":0.16,"step":0.01,"section":"${g.name}","tsType":"number"}}`
  });
}

// ----------------------------------------------------------------- EXHIBIT

function exhibit(g) {
  const desc = {
    Stack: 'Each cohort on its own sheet, near to far. The sheets narrow going back while their marked medians wander, which is the whole claim in one picture.',
    Terrain: 'Each cohort a ridgeline, front occluding back. Read as a landform: the profile narrows going back and the crests do not march in order.',
    Instrument: 'All six overlaid flat, with the p10 to p90 spread dimensioned on the right so the narrowing is measured rather than asserted.'
  }[g.key];

  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: #F4F4F3; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: #131312; display: flex; flex-direction: column; padding: 40px 60px 34px 60px;">
  ${BAR(false, 'Exhibit 2')}
  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; margin-top: 26px;">
    <div style="display: flex; flex-direction: column; gap: 8px; max-width: 760px;">
      <h1 style="margin: 0; font-size: 26px; line-height: 34px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">Dispersion narrows with revenue while the medians do not</h1>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #4A4A48; text-wrap: pretty;">${desc}</p>
    </div>
    <span class="mono" style="font-size: 10px; line-height: 15px; color: #8C8C8A; text-align: right; white-space: pre-line; flex-shrink: 0;">6 equal-count cohorts
2,186 filers</span>
  </div>
  <canvas id="cv" width="2320" height="900" style="width: 1160px; height: 450px; display: block; margin-top: 6px;"></canvas>
  <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-top: auto;">
    <span class="mono" style="font-size: 10px; line-height: 15px; color: #8C8C8A;">Black dot marks the cohort median. Spread is p10 to p90, in points.</span>
    <span class="mono" style="font-size: 10px; line-height: 15px; color: #8C8C8A; text-align: right;">SEC XBRL frames, us-gaap, CY2024. Gaussian KDE, Silverman bandwidth 0.046.</span>
  </div>
</div>`;

  const js = `${L.LANGJS}
${L.KDEJS}
${S_DATA}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), S = 2;
    var k = this.props.chroma != null ? this.props.chroma : ${g.chroma};
    ctx.clearRect(0, 0, cv.width, cv.height);
${L.EXHIBIT_DRAW[g.key]}
  }
  renderVals() { return {}; }
}`;

  return shell({
    dark: false, body, js,
    props: `{"chroma":{"editor":"range","default":${g.chroma},"min":0,"max":1.5,"step":0.05,"section":"${g.name}","tsType":"number"}}`
  });
}

// -------------------------------------------------------------------- READ
// The signature move, rendered three ways. Same words, same four rows.

const CLAIM = {
  text: 'Half the universe reports a gross margin between 23.1% and 59.7%, and about one company in six sits within five points of the 38.8% median.',
  rests: 'SEC XBRL frames, us-gaap Revenues and GrossProfit, CY2024 annual. 2,186 registrants, retrieved 2026-08-05.',
  assumes: 'As-reported gross profit is comparable across filers, which it is not perfectly: cost-of-revenue policy varies. The one-in-six figure is interpolated from 2.6-point bins and is good to about a point. The percentiles are exact.',
  breaks: 'The 221 excluded filers are not random with respect to margin. We have not tested that.'
};

const LEDE = 'Every diligence process we have worked inside anchors gross margin to a peer median. Pull a comparable set, take the middle, treat the distance from it as a finding. The method survives because it is fast and because the number it produces always looks like an answer.';
const P1 = 'A benchmark is only useful when the distribution around it is tight enough that distance from it means something. This one is not.';
const P2 = 'Eight companies in ten fall in a band 64 points wide.';

function claimRows(labelStyle, valStyle, gap) {
  return [['Rests on', CLAIM.rests], ['Assumes', CLAIM.assumes], ['Breaks if', CLAIM.breaks]]
    .map(([kk, vv]) => `<div style="display: flex; gap: ${gap};">
          <span class="mono" style="${labelStyle}">${kk}</span>
          <span style="${valStyle}">${vv}</span>
        </div>`).join('\n        ');
}

function read(g) {
  const HEAD = `<h2 style="margin: 0; font-size: 24px; line-height: 32px; font-weight: 500; letter-spacing: -0.02em;">The spread swamps the middle</h2>`;

  let column, css = '';

  if (g.key === 'Stack') {
    css = `.sheet { background: #FFFFFF; box-shadow: 0 1px 2px rgba(20,20,18,.05), 0 8px 24px rgba(20,20,18,.055); }`;
    column = `
      <div style="display: flex; flex-direction: column; gap: 22px; width: 624px;">
        ${HEAD}
        <p style="margin: 0; font-size: 16px; line-height: 26px; color: #2B2B2A; text-wrap: pretty;">${P1} <span style="background: linear-gradient(180deg, rgba(255,255,255,0) 62%, #DCD9EE 62%);">${CLAIM.text}</span> ${P2}</p>
        <div class="sheet" style="position: relative; padding: 20px 24px; display: flex; flex-direction: column; gap: 12px;">
          <div style="position: absolute; left: 6px; right: -6px; top: 6px; bottom: -6px; background: #EBEBEA; z-index: -1;"></div>
          <div style="position: absolute; left: 12px; right: -12px; top: 12px; bottom: -12px; background: #F0F0EF; z-index: -2;"></div>
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span class="mono" style="font-size: 10px; color: #4A4A48;">Claim A</span>
            <span class="mono" style="font-size: 10px; color: #8C8C8A;">firm &#183; n=2,186</span>
          </div>
          ${claimRows('font-size: 10px; color: #8C8C8A; width: 62px; flex-shrink: 0; padding-top: 2px;', 'font-size: 12px; line-height: 19px; color: #2B2B2A;', '14px')}
        </div>
      </div>`;
  } else if (g.key === 'Terrain') {
    column = `
      <div style="display: flex; flex-direction: column; gap: 22px; width: 624px;">
        ${HEAD}
        <p style="margin: 0; font-size: 16px; line-height: 26px; color: #2B2B2A; text-wrap: pretty;">${P1} <span style="background: linear-gradient(180deg, rgba(255,255,255,0) 62%, #D8E4EC 62%);">${CLAIM.text}</span> ${P2}</p>
        <div style="position: relative; padding: 20px 24px 22px 24px; display: flex; flex-direction: column; gap: 12px; background: linear-gradient(180deg, #EFEFEE 0%, #E7E9EC 100%);">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span class="mono" style="font-size: 10px; color: #4A4A48;">Claim A</span>
            <span class="mono" style="font-size: 10px; color: #8C8C8A;">firm &#183; n=2,186</span>
          </div>
          ${claimRows('font-size: 10px; color: #8C8C8A; width: 62px; flex-shrink: 0; padding-top: 2px;', 'font-size: 12px; line-height: 19px; color: #2B2B2A;', '14px')}
        </div>
      </div>`;
  } else {
    column = `
      <div style="display: flex; flex-direction: column; gap: 22px; width: 624px;">
        ${HEAD}
        <p style="margin: 0; font-size: 16px; line-height: 26px; color: #2B2B2A; text-wrap: pretty;">${P1} <span style="border-bottom: 2px solid #005CCC;">${CLAIM.text}</span> ${P2}</p>
        <div style="display: flex; gap: 16px;">
          <div style="width: 3px; background: #131312; flex-shrink: 0;"></div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 11px; padding: 2px 0 4px 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #DEDEDD; padding-bottom: 8px;">
              <span class="mono" style="font-size: 10px; color: #4A4A48; letter-spacing: 0.06em;">CLAIM A</span>
              <span class="mono" style="font-size: 10px; color: #8C8C8A; letter-spacing: 0.06em;">FIRM &#183; N=2,186</span>
            </div>
            ${claimRows('font-size: 9px; color: #8C8C8A; width: 66px; flex-shrink: 0; padding-top: 3px; letter-spacing: 0.06em; text-transform: uppercase;', 'font-size: 12px; line-height: 19px; color: #2B2B2A;', '14px')}
          </div>
        </div>`
      + `
      </div>`;
  }

  const rail = {
    Stack: `<span class="mono" style="font-size: 10px; color: #8C8C8A;">Sheet 3 of 6</span>`,
    Terrain: `<span class="mono" style="font-size: 10px; color: #8C8C8A;">Elevation 3 of 6</span>`,
    Instrument: `<span class="mono" style="font-size: 10px; color: #8C8C8A; letter-spacing: 0.06em;">02.3</span>`
  }[g.key];

  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: #F4F4F3; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: #131312; display: flex; flex-direction: column; padding: 40px 60px 34px 60px;">
  <canvas id="cv" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px; pointer-events: none;"></canvas>
  <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
    ${BAR(false, 'Piece 001')}
    <div style="display: flex; gap: 60px; margin-top: 30px; align-items: flex-start;">
      <div style="width: 236px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; padding-top: 4px;">
        ${rail}
        <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6C6C6A; text-wrap: pretty;">${LEDE}</p>
      </div>
      ${column}
    </div>
    <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end;">
      <span class="mono" style="font-size: 10px; color: #8C8C8A;">${g.name.toLowerCase()}</span>
      <span class="mono" style="font-size: 10px; color: #8C8C8A;">3</span>
    </div>
  </div>
</div>`;

  const bg = {
    Stack: `
    /* Sheet edges, receding. The page is one of a stack and says so quietly. */
    ctx.strokeStyle = 'rgba(19,19,18,0.05)';
    ctx.lineWidth = 2;
    for (var i = 1; i <= 5; i++) {
      var inset = i * 26;
      ctx.strokeRect(inset, inset, cv.width - inset * 2, cv.height - inset * 2);
    }`,
    Terrain: `
    /* The surface, as contours, ghosted behind the page. */
    var O = { ox: 1780, oy: 1180, sx: 1500, sy: 900, hz: 420 };
    for (var lv = 1; lv <= 7; lv++) {
      var level = lv / 8;
      ctx.strokeStyle = 'rgba(19,19,18,' + (0.035 + level * 0.05).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      for (var rr = 0; rr < GROWS - 1; rr += 2) {
        var run = null;
        for (var cc = 0; cc < GCOLS; cc++) {
          var above = (GRID[rr][cc] / GMAX) >= level;
          if (above && run === null) run = cc;
          if ((!above || cc === GCOLS - 1) && run !== null) {
            var end = above ? cc : cc - 1;
            if (end > run) {
              ctx.beginPath();
              var pA = isoPoint(run / (GCOLS - 1), rr / (GROWS - 1), level, O);
              ctx.moveTo(pA[0], pA[1]);
              for (var q = run + 1; q <= end; q++) {
                var pB = isoPoint(q / (GCOLS - 1), rr / (GROWS - 1), level, O);
                ctx.lineTo(pB[0], pB[1]);
              }
              ctx.stroke();
            }
            run = null;
          }
        }
      }
    }`,
    Instrument: `
    /* Registration marks and a measured margin. Nothing decorative. */
    ctx.strokeStyle = 'rgba(19,19,18,0.16)';
    ctx.lineWidth = 2;
    var m = 84, t = 22;
    var corners = [[m, m, 1, 1], [cv.width - m, m, -1, 1], [m, cv.height - m, 1, -1], [cv.width - m, cv.height - m, -1, -1]];
    for (var i = 0; i < 4; i++) {
      var c = corners[i];
      ctx.beginPath();
      ctx.moveTo(c[0] + c[2] * t, c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3] * t);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(19,19,18,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(592, 150); ctx.lineTo(592, cv.height - 150); ctx.stroke();`
  }[g.key];

  const needGrid = g.key === 'Terrain';

  const js = `${L.LANGJS}
${needGrid ? L.GRIDJS : ''}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
${bg}
  }
  renderVals() { return {}; }
}`;

  return shell({ dark: false, body, js, css, props: '{}' });
}

// ------------------------------------------------------------------- emit

const PAGES = { Cover: cover, Section: section, Read: read, Exhibit: exhibit };
for (const key of Object.keys(L.LANGS)) {
  const g = L.LANGS[key];
  for (const pt of Object.keys(PAGES)) {
    const file = key + pt + '.dc.html';
    fs.writeFileSync(file, PAGES[pt](g));
    console.log(file.padEnd(28), fs.statSync(file).size, 'bytes');
  }
}
