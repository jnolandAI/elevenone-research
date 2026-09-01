/* The report pages: four directions by seven page types.

   Held constant across all four directions: type, words, objects, layout, and
   which pages are dark and which are light. The only variable is the palette
   and how colour meets the surface. See _dirs.cjs for the ramps. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const {
  LANGJS, GRIDJS, KDEJS, FXJS, at, atA, fieldCss, fieldBlobCss,
  BLOBS_DARK, BLOBS_LIGHT, BLOBS_READ,
  SPREAD, MEDIANS, LABELS, COUNTS, TITLE, SUB, COVER_NOTE, LEDE, P1, P2, CLAIM,
  DARK, PAPER, DIRS, shell, BAR, RAMPS
} = D;

/* The field tweaks. Only on the candidates, and only on boards that carry a
   dark field: the paper field comes off the encoding ramp, so making it
   tweakable is a design decision rather than a lever.

   Two ends and two numbers. `warmSpread` is how far past the warm colour the
   top of the ramp travels, positive toward amber and yellow, negative back
   toward red. `balance` is where the crossover between the two ends sits. */
const FIELD_PROPS = (d) => {
  const e = d.fieldEnds;
  return `,"coolEnd":{"editor":"color","default":"${e.cool}","section":"Field","tsType":"string"}` +
    `,"warmEnd":{"editor":"color","default":"${e.warm}","section":"Field","tsType":"string"}` +
    `,"warmSpread":{"editor":"range","default":${e.spread},"min":-40,"max":70,"step":1,"unit":"deg","section":"Field","tsType":"number"}` +
    `,"balance":{"editor":"range","default":${e.balance},"min":0.15,"max":0.85,"step":0.01,"section":"Field","tsType":"number"}`;
};

const CHROMA_PROP = (d, grain, field) => {
  const chroma = `"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"${d.name}","tsType":"number"}`;
  const gr = grain ? `,"grain":{"editor":"range","default":${d.grainAmp},"min":0,"max":0.16,"step":0.005,"section":"${d.name}","tsType":"number"}` : '';
  const fl = (field && d.tweakField) ? FIELD_PROPS(d) : '';
  return `{${chroma}${gr}${fl}}`;
};

/* The object.

   Same surface, same projection, same marks in every direction: this is
   content, not treatment. What changed is that it is drawn out of particles
   instead of out of strokes. The wireframe version put a lit mesh on a flat
   wash, which is a 2010s data-visualisation screensaver and not what the
   reference work does. Elevation is now carried by dot radius and dot
   opacity; the mesh survives underneath at a tenth of the alpha, as a
   substrate rather than as the drawing.

   `ramp` is a function name so the same object can be emitted on a dark
   ground and on paper without becoming a different object. */
const OBJECT = (d, ramp, onDark) => `
    fxDots(ctx, S, O, {
      grid: GRID, rows: GROWS, cols: GCOLS, max: GMAX,
      ramp: ${ramp}, k: k, seed: 11,
      mode: '${onDark ? d.dot.mode : 'source-over'}',
      stepR: ${d.dot.stepR}, stepC: ${d.dot.stepC}, jitter: ${d.dot.jitter},
      web: ${onDark ? d.dot.web : (d.dot.web * 0.55).toFixed(3)}, webStep: ${d.dot.webStep},
      aLo: ${onDark ? d.dot.aLo : (d.dot.aLo * 1.4).toFixed(3)},
      aHi: ${onDark ? d.dot.aHi : (d.dot.aHi * 0.9).toFixed(3)},
      rLo: ${d.dot.rLo}, rHi: ${d.dot.rHi}, floor: 0.02,
      lo: ${onDark ? 0 : 0.14}, hi: ${onDark ? 1 : 0.98}
    });
    /* The two summits, marked identically in every direction. Content. */
    var marks = [{ p: GPEAK, l: '01', t: '$1.44bn  27.8%' }, { p: GRIDGE, l: '02', t: '$654m  70.1%' }];
    for (var mi = 0; mi < marks.length; mi++) {
      var mk = marks[mi];
      var hh = GRID[mk.p.row][mk.p.col] / GMAX;
      var top = isoPoint(mk.p.col / (GCOLS - 1), mk.p.row / (GROWS - 1), hh, O);
      var foot = isoPoint(mk.p.col / (GCOLS - 1), mk.p.row / (GROWS - 1), 0, O);
      ctx.strokeStyle = '${onDark ? 'rgba(244,244,243,0.34)' : 'rgba(19,19,18,0.26)'}';
      ctx.lineWidth = 1 * S;
      ctx.setLineDash([4 * S, 5 * S]);
      ctx.beginPath(); ctx.moveTo(foot[0], foot[1]); ctx.lineTo(top[0], top[1] - 30 * S); ctx.stroke();
      ctx.setLineDash([]);
      /* The callout turns back on itself rather than running off the frame.
         Fixed to the right, the wider of the two labels ended 231px past the
         edge of a 2560 canvas and the reader lost the figure it was carrying.
         Direction is chosen from the room actually left. */
      var need = 320 * S;
      var dir = (top[0] + need > W) ? -1 : 1;
      ctx.strokeStyle = '${onDark ? 'rgba(244,244,243,0.52)' : 'rgba(19,19,18,0.42)'}';
      ctx.beginPath(); ctx.moveTo(top[0], top[1] - 30 * S); ctx.lineTo(top[0] + dir * 92 * S, top[1] - 30 * S); ctx.stroke();
      ctx.fillStyle = '${onDark ? d.accentDark : d.accent}';
      ctx.beginPath(); ctx.arc(top[0], top[1], 3.4 * S, 0, 6.283185); ctx.fill();
      ctx.textAlign = dir > 0 ? 'left' : 'right';
      ctx.fillStyle = '${onDark ? 'rgba(244,244,243,0.9)' : 'rgba(19,19,18,0.85)'}';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.fillText(mk.l, top[0] + dir * 100 * S, top[1] - 34 * S);
      ctx.fillStyle = '${onDark ? 'rgba(174,174,172,0.9)' : 'rgba(108,108,106,0.95)'}';
      ctx.fillText(mk.t, top[0] + dir * 100 * S, top[1] - 18 * S);
      ctx.textAlign = 'left';
    }`;

/* The atmosphere. One call, so every board that has a full-bleed canvas gets
   the same field and the same grain and they cannot drift apart. */
/* The field.

   On a candidate the ramp is BUILT from the tweak chips, always, not only
   when one has been moved. A dual path was tempting, because the fixed
   anchors and a colour picked out of them are not quite the same ramp: the
   deepest anchor sits outside sRGB and a colour picker can only offer colours
   inside it. But the runtime seeds props from their declared defaults, so the
   untouched path would rarely or never run and the comment claiming it did
   would be a lie. One path. Measured against the fixed ramps, the shift is at
   most 15 of 255 per channel on dark and 21 on paper. */
const FIELD = (d, onDark) => {
  const blobs = JSON.stringify(onDark ? BLOBS_DARK : BLOBS_LIGHT);
  const k2 = onDark ? d.fieldK : 1.5;
  return `${ENDS(d, onDark)}
    fxField(ctx, W, H, ${RAMPFN(d, onDark)}, k * ${k2}, ${blobs}, '${onDark ? d.fieldMode : 'multiply'}');`;
};

/* The ramp the chips describe, on whichever ground the board is on.

   Emitted once and used by every board with a field, so a chip cannot reach
   the cover and miss the reading page. `ENDS` declares it; `RAMPFN` is the
   name to pass wherever a ramp function is wanted. */
const ENDS = (d, onDark) => d.tweakField ? `
    var P = this.props;
    var FA = ${onDark ? 'fieldFromEnds' : 'paperFromEnds'}(
      P.coolEnd != null ? P.coolEnd : '${d.fieldEnds.cool}',
      P.warmEnd != null ? P.warmEnd : '${d.fieldEnds.warm}',
      P.warmSpread != null ? P.warmSpread : ${d.fieldEnds.spread},
      P.balance != null ? P.balance : ${d.fieldEnds.balance});
    var fdx = function (t, kk) { return anchorRamp(FA, t, kk); };` : '';

const RAMPFN = (d, onDark) => d.tweakField ? 'fdx' : (onDark ? 'fd' : 'ik');

const GRAIN = (d, mul) => `
    fxGrain(ctx, W, H, (this.props.grain != null ? this.props.grain : ${d.grainAmp})${mul ? ' * ' + mul : ''}, 7, ${d.grainScale});`;

const TITLE_BLOCK = (onDark) => `
    ${BAR(onDark, 'Cross-sector financial analysis')}
    <div style="display: flex; flex-direction: column; gap: 18px; max-width: 470px;">
      <span class="mono" style="font-size: 11px; color: ${onDark ? '#6C6C6A' : '#8C8C8A'};">001</span>
      <h1 style="margin: 0; font-size: 44px; line-height: 50px; font-weight: 500; letter-spacing: -0.03em; color: ${onDark ? '#FFFFFF' : DARK}; text-wrap: pretty;">${TITLE}</h1>
      <p style="margin: 0; font-size: 20px; line-height: 29px; letter-spacing: -0.02em; color: ${onDark ? '#C9C9C7' : '#4A4A48'}; text-wrap: pretty;">${SUB}</p>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
      <p style="margin: 0; max-width: 420px; font-size: 14px; line-height: 22px; color: ${onDark ? '#AEAEAC' : '#6C6C6A'}; text-wrap: pretty;">${COVER_NOTE}</p>
      <span class="mono" style="font-size: 10px; line-height: 15px; color: ${onDark ? '#6C6C6A' : '#8C8C8A'}; text-align: right; white-space: pre-line;">SEC XBRL frames API, us-gaap, CY2024
n=2,186  retrieved 2026-08-05</span>
    </div>`;

// ------------------------------------------------------------- COVER, dark

function cover(d) {
  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: ${DARK}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${PAPER};">
  <canvas id="cv" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px;"></canvas>
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 44px 60px 40px 60px;">
${TITLE_BLOCK(true)}
  </div>
</div>`;

  const js = `${LANGJS}
${GRIDJS}
${FXJS}
${RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2;
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var O = { ox: W * 0.66, oy: H * 0.62, sx: W * 0.60, sy: H * 0.70, hz: H * 0.34 };
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
${FIELD(d, true)}
${OBJECT(d, 'em', true)}
${GRAIN(d)}
  }
  renderVals() { return {}; }
}`;

  return shell({ dark: true, d, body, js, props: CHROMA_PROP(d, true, true) });
}

// ------------------------------------------------------------ COVER, light
// The same object, the same words, the same marks, on white. The field wash
// is what makes a direction legible on paper: the encoding ramp alone is
// correctly restrained, and restraint on white reads as no direction at all.

function coverLight(d) {
  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: #FFFFFF; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK};">
  <canvas id="cv" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px;"></canvas>
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 44px 60px 40px 60px;">
${TITLE_BLOCK(false)}
  </div>
</div>`;

  const js = `${LANGJS}
${GRIDJS}
${FXJS}
${RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2;
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var O = { ox: W * 0.66, oy: H * 0.62, sx: W * 0.60, sy: H * 0.70, hz: H * 0.34 };
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
${FIELD(d, false)}
${OBJECT(d, 'ik', false)}
${GRAIN(d, '0.75')}
  }
  renderVals() { return {}; }
}`;

  return shell({ dark: false, d, body, js, props: CHROMA_PROP(d, true) });
}

// ------------------------------------------------------------------ SECTION

function section(d) {
  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: ${DARK}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${PAPER};">
  <canvas id="cv" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px;"></canvas>
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 44px 60px 40px 60px;">
    ${BAR(true, 'Piece 001')}
    <div style="display: flex; align-items: flex-end; gap: 28px; max-width: 620px;">
      <span class="mono" style="font-size: 88px; line-height: 78px; font-weight: 200; color: #4A4A48;">02</span>
      <h1 style="margin: 0 0 6px 0; font-size: 36px; line-height: 42px; font-weight: 500; letter-spacing: -0.02em; color: #FFFFFF; text-wrap: pretty;">The spread swamps the middle</h1>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
      <p style="margin: 0; max-width: 400px; font-size: 14px; line-height: 22px; color: #8C8C8A; text-wrap: pretty;">${d.idea}</p>
      <span class="mono" style="font-size: 10px; color: #6C6C6A;">${d.name.toLowerCase()}</span>
    </div>
  </div>
</div>`;

  const js = `${LANGJS}
${KDEJS}
${FXJS}
${RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2;
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var O = { ox: 1520, oy: 880, sx: 1180, sy: 520, hz: 400 };
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '${DARK}'; ctx.fillRect(0, 0, W, H);
${FIELD(d, true)}
    var peakK = maxOf(KDE), li, lr, lc;
    for (li = 0; li < KDE.length; li++) {
      var lift = 0.05 + li * 0.18;
      var tCol = li / (KDE.length - 1);
      ctx.globalCompositeOperation = 'source-over';
      var corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
      ctx.beginPath();
      for (lr = 0; lr < 4; lr++) {
        var cp = isoPoint(corners[lr][0], corners[lr][1], lift, O);
        if (lr === 0) ctx.moveTo(cp[0], cp[1]); else ctx.lineTo(cp[0], cp[1]);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(em(0.10 + tCol * 0.28, k), 0.055);
      ctx.fill();
      ctx.strokeStyle = rgba(em(0.35 + tCol * 0.40, k), 0.18);
      ctx.lineWidth = 1 * S; ctx.stroke();
      ctx.globalCompositeOperation = '${d.blend}';
      for (lc = 0; lc <= 132; lc++) {
        var u = lc / 132;
        var dens = sampleAt(KDE[li], u) / peakK;
        if (dens <= 0.02) continue;
        for (lr = 0; lr <= 22; lr++) {
          var v = lr / 22;
          var jit = 0.5 + 0.5 * Math.cos(lc * 1.7 + lr * 2.3);
          var amp = dens * (0.55 + 0.45 * jit);
          var pp = isoPoint(u, v, lift, O);
          ctx.fillStyle = rgbs(em(0.30 + 0.62 * amp, k));
          ctx.globalAlpha = ${d.blend === 'lighter' ? '0.22 + 0.58 * amp' : '0.30 + 0.62 * amp'};
          ctx.beginPath(); ctx.arc(pp[0], pp[1], (0.45 + 2.6 * Math.pow(amp, 1.2)) * S, 0, 6.283185); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
${GRAIN(d)}
  }
  renderVals() { return {}; }
}`;

  return shell({ dark: true, d, body, js, props: CHROMA_PROP(d, true, true) });
}

// --------------------------------------------------------------------- READ
// Same words, same layout, same background geometry. The rail now carries a
// real coloured figure, because a reading page with no colour on it cannot
// show you what a direction does to a reading page.

function read(d) {
  const wash = atA(d.light, 0.20, 0.26);
  const rule = at(d.light, 0.86);
  const railField = d.tweakField ? '{{rail}}' : fieldBlobCss(d.light, BLOBS_LIGHT, 0.55);

  const rows = [['Rests on', CLAIM.rests], ['Assumes', CLAIM.assumes], ['Breaks if', CLAIM.breaks]]
    .map(([kk, vv]) => `<div style="display: flex; gap: 14px;">
            <span class="mono" style="font-size: 10px; color: #8C8C8A; width: 62px; flex-shrink: 0; padding-top: 2px;">${kk}</span>
            <span style="font-size: 12px; line-height: 19px; color: #2B2B2A;">${vv}</span>
          </div>`).join('\n          ');

  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: ${PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column; padding: 40px 60px 34px 60px;">
  <canvas id="bg" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px; pointer-events: none;"></canvas>
  <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
    ${BAR(false, 'Piece 001')}
    <div style="display: flex; gap: 60px; margin-top: 30px; align-items: flex-start;">
      <div style="width: 236px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; padding-top: 4px;">
        <span class="mono" style="font-size: 10px; color: #8C8C8A;">Section 2 of 6</span>
        <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6C6C6A; text-wrap: pretty;">${LEDE}</p>
        <div style="display: flex; flex-direction: column; gap: 7px; padding: 14px 14px 12px 14px; background: ${railField};">
          <span class="mono" style="font-size: 9px; color: #4A4A48; letter-spacing: 0.06em;">ALL FILERS</span>
          <canvas id="sp" width="416" height="150" style="width: 208px; height: 75px; display: block;"></canvas>
          <span class="mono" style="font-size: 9px; color: #6C6C6A;">0% to 100% margin</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 22px; width: 624px;">
        <h2 style="margin: 0; font-size: 24px; line-height: 32px; font-weight: 500; letter-spacing: -0.02em;">The spread swamps the middle</h2>
        <p style="margin: 0; font-size: 16px; line-height: 26px; color: #2B2B2A; text-wrap: pretty;">${P1} <span style="background: linear-gradient(180deg, rgba(255,255,255,0) 62%, ${wash} 62%);">${CLAIM.text}</span> ${P2}</p>
        <div style="display: flex; gap: 16px;">
          <div style="width: 3px; background: ${rule}; flex-shrink: 0;"></div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 11px; padding: 2px 0 4px 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #DEDEDD; padding-bottom: 8px;">
              <span class="mono" style="font-size: 10px; color: #4A4A48;">Claim A</span>
              <span class="mono" style="font-size: 10px; color: #8C8C8A;">firm &#183; n=2,186</span>
            </div>
            ${rows}
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end;">
      <span class="mono" style="font-size: 10px; color: #8C8C8A;">${d.name.toLowerCase()}</span>
      <span class="mono" style="font-size: 10px; color: #8C8C8A;">3</span>
    </div>
  </div>
</div>`;

  const js = `${LANGJS}
${GRIDJS}
${KDEJS}
${FXJS}
${RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('bg');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    /* The field, at a third of the alpha it carries on a cover: type sits on
       this one. */
${ENDS(d, false)}
    fxField(ctx, W, H, ${RAMPFN(d, false)}, k * 1.5, ${JSON.stringify(BLOBS_READ)}, 'multiply');
    /* The same surface, as contours, ghosted behind the page. Identical
       geometry in all four; only the tint differs. */
    var O = { ox: 1780, oy: 1180, sx: 1500, sy: 900, hz: 420 };
    for (var lv = 1; lv <= 7; lv++) {
      var level = lv / 8;
      ctx.strokeStyle = rgba(ik(0.30 + level * 0.55, k), 0.055 + level * 0.10);
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
    }
${GRAIN(d, '0.55')}
    /* The rail figure: the whole universe as dust plus one hairline. This is
       the smallest place a direction has to survive. */
    var sp = document.getElementById('sp');
    if (!sp) return;
    var s2 = sp.getContext('2d');
    s2.clearRect(0, 0, sp.width, sp.height);
    var peakA = 0, i;
    for (i = 0; i < ALL.length; i++) if (ALL[i] > peakA) peakA = ALL[i];
    fxCloud(s2, ALL, 4, sp.height - 4, sp.width - 8, sp.height - 16, peakA, {
      n: 2600, seed: 5, ramp: ik, k: k * 1.5, t0: 0.28, t1: 1.0, soft: 0.16,
      aLo: 0.05, aHi: 0.30, rad: 0.9, mode: 'multiply'
    });
    kdePath(s2, ALL, 4, sp.height - 4, sp.width - 8, sp.height - 16, peakA, false);
    s2.strokeStyle = rgbs(ik(0.88, k)); s2.lineWidth = 1.6; s2.stroke();
  }
  renderVals() {
${d.tweakField ? `    var P = this.props, kk = P.chroma != null ? P.chroma : 1;
    var FA = paperFromEnds(
      P.coolEnd != null ? P.coolEnd : '${d.fieldEnds.cool}',
      P.warmEnd != null ? P.warmEnd : '${d.fieldEnds.warm}',
      P.warmSpread != null ? P.warmSpread : ${d.fieldEnds.spread},
      P.balance != null ? P.balance : ${d.fieldEnds.balance});
    return { rail: fxFieldCss(FA, ${JSON.stringify(BLOBS_LIGHT)}, kk * 0.55) };` : '    return {};'}
  }
}`;

  return shell({ dark: false, d, body, js, props: CHROMA_PROP(d, true) });
}

// ------------------------------------------------------------------ EXHIBIT

function exhibit(d) {
  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: ${PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column; padding: 40px 60px 34px 60px;">
  ${BAR(false, 'Exhibit 2')}
  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; margin-top: 26px;">
    <div style="display: flex; flex-direction: column; gap: 8px; max-width: 760px;">
      <h1 style="margin: 0; font-size: 26px; line-height: 34px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">Dispersion narrows with revenue while the medians do not</h1>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #4A4A48; text-wrap: pretty;">All six cohorts overlaid, with the p10 to p90 spread dimensioned on the right so the narrowing is measured rather than asserted. Cohort is carried by colour alone: nothing else on the page is coloured.</p>
    </div>
    <span class="mono" style="font-size: 10px; line-height: 15px; color: #8C8C8A; text-align: right; white-space: pre-line; flex-shrink: 0;">6 equal-count cohorts
2,186 filers</span>
  </div>
  <canvas id="cv" width="2320" height="900" style="width: 1160px; height: 450px; display: block; margin-top: 6px;"></canvas>
  <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-top: auto;">
    <span class="mono" style="font-size: 10px; line-height: 15px; color: #8C8C8A;">Spread is p10 to p90, in points.</span>
    <span class="mono" style="font-size: 10px; line-height: 15px; color: #8C8C8A; text-align: right;">SEC XBRL frames, us-gaap, CY2024. Gaussian KDE, Silverman bandwidth 0.046.</span>
  </div>
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
    var cv = document.getElementById('cv');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), S = 2, W = cv.width, H = cv.height;
    var k = this.props.chroma != null ? this.props.chroma : 1;
    ctx.clearRect(0, 0, W, H);
    var peak = maxOf(KDE), i;
    var x0 = 300, w = 1400, base = 620, hgt = 400;
    /* The whole universe as dust behind the six cohorts. The cohorts are the
       finding and stay crisp; the dust is the population they were cut out
       of, and it is what stops six hairlines reading as six tidy facts. */
    var peakA = 0;
    for (i = 0; i < ALL.length; i++) if (ALL[i] > peakA) peakA = ALL[i];
    fxCloud(ctx, ALL, x0, base, w, hgt, peakA, {
      n: 22000, seed: 5, ramp: ik, k: k * 1.5, t0: 0.26, t1: 1.0, soft: 0.16,
      aLo: 0.06, aHi: 0.32, rad: 1.6, mode: 'multiply'
    });
    for (i = 0; i < KDE.length; i++) {
      var t = i / (KDE.length - 1);
      var col = ik(0.16 + t * 0.76, k);
      kdePath(ctx, KDE[i], x0, base, w, hgt, peak, false);
      ctx.strokeStyle = rgba(col, 0.94); ctx.lineWidth = 3; ctx.stroke();
    }
    axisX(ctx, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
    var bx = x0 + w + 54, bw = 190;
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    for (i = 0; i < KDE.length; i++) {
      var yy = 150 + i * 66;
      var t2 = i / (KDE.length - 1);
      var frac = (SPREAD[i] - 45) / 30;
      ctx.strokeStyle = GREY.g40; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, yy - 9); ctx.lineTo(bx, yy + 9); ctx.stroke();
      ctx.strokeStyle = rgbs(ik(0.16 + t2 * 0.76, k)); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bx, yy); ctx.lineTo(bx + bw * frac, yy); ctx.stroke();
      ctx.strokeStyle = GREY.g40; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(bx + bw * frac, yy - 9); ctx.lineTo(bx + bw * frac, yy + 9); ctx.stroke();
      ctx.fillStyle = GREY.g80;
      ctx.fillText(SPREAD[i].toFixed(1), bx + bw * frac + 12, yy + 5);
      ctx.fillStyle = GREY.g60;
      ctx.font = (10 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], bx - 12, yy + 5);
      ctx.textAlign = 'left';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    }
    ctx.fillStyle = GREY.g60;
    ctx.fillText('p10 to p90, points', bx, 110);
${GRAIN(d, '0.5')}
  }
  renderVals() { return {}; }
}`;

  return shell({ dark: false, d, body, js, props: CHROMA_PROP(d, true) });
}

// -------------------------------------------------------------------- PANEL

function panel(d) {
  const rows = LABELS.map((lab, i) => `
        <div style="display: grid; grid-template-columns: 168px 62px 68px 68px minmax(0, 1fr); gap: 20px; align-items: center; padding: 11px 0; border-bottom: 1px solid #2B2B2A;">
          <span style="font-size: 13px; color: #C9C9C7;">${lab}</span>
          <span class="mono" style="font-size: 11px; color: #8C8C8A; text-align: right;">${COUNTS[i]}</span>
          <span class="mono" style="font-size: 11px; color: #C9C9C7; text-align: right;">${MEDIANS[i].toFixed(1)}%</span>
          <span class="mono" style="font-size: 11px; color: #C9C9C7; text-align: right;">${SPREAD[i].toFixed(1)}</span>
          <div style="height: 26px; background: {{r${i}}};"></div>
        </div>`).join('');

  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: ${DARK}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${PAPER}; display: flex; flex-direction: column; padding: 40px 60px 34px 60px;">
  <canvas id="bg" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px; pointer-events: none;"></canvas>
  <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
    ${BAR(true, 'Exhibit 3')}
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; margin-top: 24px;">
      <div style="display: flex; flex-direction: column; gap: 7px; max-width: 700px;">
        <h1 style="margin: 0; font-size: 22px; line-height: 29px; font-weight: 500; letter-spacing: -0.02em; color: #FFFFFF; text-wrap: pretty;">Where the mass actually sits, cohort by cohort</h1>
        <p style="margin: 0; font-size: 13px; line-height: 20px; color: #8C8C8A; text-wrap: pretty;">Each strip is that cohort's density across the full 0 to 100% margin range. Brighter is more filers at that margin.</p>
      </div>
      <span class="mono" style="font-size: 10px; line-height: 15px; color: #6C6C6A; text-align: right; white-space: pre-line; flex-shrink: 0;">CY2024
n=2,186</span>
    </div>
    <div style="display: grid; grid-template-columns: 168px 62px 68px 68px minmax(0, 1fr); gap: 20px; align-items: end; margin-top: 22px; padding-bottom: 7px; border-bottom: 1px solid #4A4A48;">
      <span class="mono" style="font-size: 9px; color: #6C6C6A; letter-spacing: 0.06em;">REVENUE COHORT</span>
      <span class="mono" style="font-size: 9px; color: #6C6C6A; letter-spacing: 0.06em; text-align: right;">N</span>
      <span class="mono" style="font-size: 9px; color: #6C6C6A; letter-spacing: 0.06em; text-align: right;">MEDIAN</span>
      <span class="mono" style="font-size: 9px; color: #6C6C6A; letter-spacing: 0.06em; text-align: right;">SPREAD</span>
      <span class="mono" style="font-size: 9px; color: #6C6C6A; letter-spacing: 0.06em;">DENSITY, 0% TO 100% MARGIN</span>
    </div>
    ${rows}
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-top: auto;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="mono" style="font-size: 10px; color: #6C6C6A;">less</span>
        <div style="width: 148px; height: 8px; background: {{legend}};"></div>
        <span class="mono" style="font-size: 10px; color: #6C6C6A;">more</span>
      </div>
      <span class="mono" style="font-size: 10px; color: #6C6C6A; text-align: right;">Spread is p10 to p90, in points.</span>
    </div>
  </div>
</div>`;

  const js = `${LANGJS}
${KDEJS}
${FXJS}
${RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  draw() {
    var cv = document.getElementById('bg');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    var k = this.props.chroma != null ? this.props.chroma : 1;
    ctx.clearRect(0, 0, W, H);
${FIELD(d, true)}
${GRAIN(d, '0.8')}
  }
  strip(arr, peak, k) {
    var stops = [], n = 26;
    for (var i = 0; i <= n; i++) {
      var m = i / n;
      var dens = sampleAt(arr, m) / peak;
      stops.push(rgbs(em(dens, k)) + ' ' + (m * 100).toFixed(1) + '%');
    }
    return 'linear-gradient(90deg, ' + stops.join(', ') + ')';
  }
  renderVals() {
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var peak = maxOf(KDE);
    var out = {};
    for (var i = 0; i < KDE.length; i++) out['r' + i] = this.strip(KDE[i], peak, k);
    var ls = [];
    for (var j = 0; j <= 12; j++) ls.push(rgbs(em(j / 12, k)) + ' ' + ((j / 12) * 100).toFixed(1) + '%');
    out.legend = 'linear-gradient(90deg, ' + ls.join(', ') + ')';
    return out;
  }
}`;

  return shell({ dark: true, d, body, js, props: CHROMA_PROP(d, true, true) });
}

// -------------------------------------------------------------------- CLOSE

function close(d) {
  const blocks = [
    ['Method', 'Every filer with both Revenues and GrossProfit tagged in the SEC XBRL frames API for CY2024 annual periods. Margin is gross profit over revenue, as reported, with no restatement and no normalisation. Cohorts are six equal-count buckets on revenue.'],
    ['Excluded', '221 registrants reported one field and not the other, or reported a revenue of zero. They are dropped. They are not random with respect to margin and we have not tested how far that biases the result.'],
    ['Density', 'Gaussian kernel density estimate, Silverman bandwidth 0.046, evaluated on a fixed grid from -5% to 100% so the six cohorts are directly comparable.']
  ].map(([h, t]) => `
      <div style="display: flex; flex-direction: column; gap: 7px;">
        <span class="mono" style="font-size: 10px; color: ${d.accent}; letter-spacing: 0.06em;">${h.toUpperCase()}</span>
        <p style="margin: 0; font-size: 13px; line-height: 21px; color: #2B2B2A; text-wrap: pretty;">${t}</p>
      </div>`).join('');

  const body = `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: ${PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column; padding: 40px 60px 34px 60px;">
  <div style="position: absolute; right: 0; top: 0; width: 420px; height: 720px; background: ${d.tweakField ? '{{field}}' : fieldBlobCss(d.light, BLOBS_LIGHT, 1.1)};"></div>
  <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
    ${BAR(false, 'Piece 001')}
    <div style="display: flex; gap: 60px; margin-top: 40px; align-items: flex-start;">
      <div style="width: 236px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px;">
        <h2 style="margin: 0; font-size: 22px; line-height: 29px; font-weight: 500; letter-spacing: -0.02em;">Notes on the data</h2>
        <div style="height: 2px; width: 44px; background: ${d.accent};"></div>
        <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6C6C6A; text-wrap: pretty;">The source of record is the SEC frames API. Nothing in this piece is modelled and nothing is estimated beyond the density curves.</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 24px; width: 624px;">
        ${blocks}
      </div>
    </div>
    <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #DEDEDD;">
      <span class="mono" style="font-size: 10px; color: #8C8C8A;">${d.name.toLowerCase()}</span>
      <span class="mono" style="font-size: 10px; color: #8C8C8A;">elevenoneresearch.com</span>
    </div>
  </div>
</div>`;

  /* The back matter's wash is CSS, not canvas, so it can only follow a chip
     through a slot. Without this the last page of a candidate row sat still
     while the other six moved. */
  if (!d.tweakField) return shell({ dark: false, d, body, props: '{}' });

  const js = `${LANGJS}
${FXJS}
class Component extends DCLogic {
  renderVals() {
    var P = this.props, k = P.chroma != null ? P.chroma : 1;
    var FA = paperFromEnds(
      P.coolEnd != null ? P.coolEnd : '${d.fieldEnds.cool}',
      P.warmEnd != null ? P.warmEnd : '${d.fieldEnds.warm}',
      P.warmSpread != null ? P.warmSpread : ${d.fieldEnds.spread},
      P.balance != null ? P.balance : ${d.fieldEnds.balance});
    return { field: fxFieldCss(FA, ${JSON.stringify(BLOBS_LIGHT)}, k * 1.1) };
  }
}`;
  return shell({ dark: false, d, body, js, props: CHROMA_PROP(d, false, true) });
}

// --------------------------------------------------------------------- KEY

function key() {
  const swatchRow = (anchors) => {
    const cells = Array.from({ length: 9 }, (_, i) => `<div style="height: 26px; background: ${at(anchors, i / 8)};"></div>`).join('');
    return `<div style="display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 0;">${cells}</div>`;
  };
  const lbl = (t) => `<span class="mono" style="font-size: 9px; color: #8C8C8A; letter-spacing: 0.06em;">${t}</span>`;

  const cards = DIRS.map((d) => `
      <div style="display: flex; flex-direction: column; gap: 11px;">
        <div style="display: flex; align-items: baseline; gap: 12px;">
          <h3 style="margin: 0; font-size: 19px; line-height: 25px; font-weight: 500; letter-spacing: -0.02em;">${d.name}</h3>
          <span class="mono" style="font-size: 10px; color: #8C8C8A;">${d.treatment}</span>
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 20px; color: #2B2B2A; min-height: 40px; text-wrap: pretty;">${d.idea}</p>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${lbl('FIELD, ON PAPER')}
          <div style="height: 40px; background: ${fieldBlobCss(d.light, BLOBS_LIGHT, 1.5)};"></div>
          ${lbl('FIELD, ON DARK')}
          <div style="height: 40px; background: ${DARK}; background-image: ${fieldBlobCss(d.fieldDark, BLOBS_DARK, d.fieldK)};"></div>
          ${lbl('ENCODING, ON DARK')}
          ${swatchRow(d.dark)}
          ${lbl('ENCODING, ON PAPER')}
          ${swatchRow(d.light)}
        </div>
        <div style="display: flex; align-items: center; gap: 9px;">
          <div style="width: 13px; height: 13px; background: ${d.accent}; flex-shrink: 0;"></div>
          <span class="mono" style="font-size: 10px; color: #6C6C6A;">${d.accent} interface accent</span>
        </div>
        <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6C6C6A; text-wrap: pretty;">${d.tradeoff}</p>
      </div>`).join('');

  const body = `<div style="position: relative; width: 2680px; height: 820px; overflow: hidden; background: ${PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${DARK}; display: flex; flex-direction: column; padding: 40px 56px 36px 56px;">
  ${BAR(false, 'Design directions')}
  <div style="display: flex; gap: 56px; margin-top: 26px; align-items: flex-start;">
    <div style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
      <h1 style="margin: 0; font-size: 26px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em; text-wrap: pretty;">Four directions, one variable</h1>
      <p style="margin: 0; font-size: 13px; line-height: 21px; color: #2B2B2A; text-wrap: pretty;">Every column is the same page. Same type, same words, same objects, same layout, same dark and light assignment. Only the palette and how colour meets the surface change.</p>
      <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6C6C6A; text-wrap: pretty;">Three ramps, not two. The field is atmosphere and runs on both grounds; the two encoding ramps carry quantity. Field hue travel is capped near 160 degrees, the budget the accepted ramps already travel. The rejected full-spectrum generator swept 280.</p>
      <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6C6C6A; text-wrap: pretty;">Each board carries a chroma slider. Pull any direction to 0 and it collapses to Achromatic, the null the other three have to beat.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 40px; flex-grow: 1;">
      ${cards}
    </div>
  </div>
</div>`;

  return shell({ dark: false, d: DIRS[3], body, props: '{}' });
}

// --------------------------------------------------------------------- emit

const PAGES = [
  ['Cover', cover], ['CoverLight', coverLight], ['Section', section],
  ['Read', read], ['Exhibit', exhibit], ['Panel', panel], ['Close', close]
];

const out = [];
function put(file, src) { fs.writeFileSync(file, src); out.push([file, fs.statSync(file).size]); }

put('Main.dc.html', key());
for (const d of DIRS) for (const [pt, fn] of PAGES) put(d.key + pt + '.dc.html', fn(d));

for (const [f, s] of out) console.log(f.padEnd(30), s, 'bytes');
console.log('\n' + out.length + ' report artboards');

/* PAGES is exported so a candidate direction can be rendered as real pages
   without being added to DIRS and put on the canvas. See build-variants.cjs. */
module.exports = { PAGE_TYPES: PAGES.map(([n]) => n), PAGES };
