/* The entry artboard: what this canvas is, and what is still open on it.

   Main.dc.html used to be the key to the four-directions matrix, and that
   matrix has been retired. It is rebuilt here rather than deleted for two
   reasons. The editor treats Main as the entry board and falls back to
   whatever sorts first without one. And a canvas of eleven pages with no page
   saying what was decided makes a reader reconstruct the argument from the
   boards, which is exactly what the pages were meant to save them from.

   No canvas element on this board. It is the lightest thing on the file and
   it sits on the first page a reader opens. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { GRADIENTS } = require('./_gradients.cjs');
const { G, NEUTRAL, bar } = require('./_applied.cjs');

const W = 2200, H = 1080, PAD = 56;

const swatch = (g) => `
      <div style="display: flex; flex-direction: column; gap: 6px; width: 158px;">
        <div style="height: 46px; background: ${g.css.replace('180deg', '90deg')};"></div>
        <span class="mono" style="font-size: 9px; color: ${G.g70};">${g.id}</span>
      </div>`;

const DEVICES = [
  ['Field', 'A soft gradient wash, no marks.', 'Covers, section openers, the site hero, behind a headline.'],
  ['Shape', 'A gradient in an organic mass.', 'Decoration. A margin, a corner, beside a pull quote.'],
  ['Form', 'An abstract stipple: dispersion, convergence, erosion.', 'Illustration of an idea. Margin, background, divider. Never data.'],
  ['Hero', 'A recognisable subject in dots: racks, a port, a city, a mark.', 'The image at the front of a piece. One per piece.']
];

const PAGES = [
  ['Gradient palettes', 'Four constructions the set was chosen between. Superseded, kept as the record.'],
  ['Gradients', 'The set as it stands, plus the six crossings stretched and thrown off centre.'],
  ['Application', 'Figures on the set, the eight abstract Forms, and the halftone kept for hard-edged objects.'],
  ['Hero images', 'Five subjects, and the pipeline that turns anything drawable into one.'],
  ['Homepages', 'Four bands. The device is the variable and everything else is held.'],
  ['Report covers', 'Six covers, one piece. Same words, same title block, different device.'],
  ['Body pages', 'Six pages of one report in reading order. Judge the RATE, not the pages.'],
  ['The whole set', 'Every member doing one job, on dark and on paper.']
];

const OPEN = [
  'How often a piece is allowed each device. The budget in the skill is proposed and has never been validated. The six body pages are the first time it has been visible.',
  'Whether the eight abstract Forms are the right eight.',
  'Whether a Hero belongs in a homepage band at all, or whether a band that changes every month wants a Field that is about nothing.',
  'How many members of the set a practice can hold in rotation before its pieces stop looking related to each other.'
];

const col = (rows) => rows.map(([h, a, b]) => `
      <div style="display: flex; gap: 18px; padding: 11px 0; border-bottom: 1px solid ${G.g20};">
        <span style="width: 132px; flex-shrink: 0; font-size: 14px; font-weight: 500; letter-spacing: -0.01em;">${h}</span>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <span style="font-size: 13px; line-height: 20px; color: ${G.g90};">${a}</span>
          ${b ? `<span style="font-size: 12px; line-height: 19px; color: ${G.g70};">${b}</span>` : ''}
        </div>
      </div>`).join('');

const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box; display: flex; flex-direction: column; gap: 26px;">
  ${bar(false, 'The visual system &#183; what is decided and what is not')}

  <div style="display: flex; gap: 56px; align-items: flex-start;">
    <div style="width: 420px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px;">
      <h1 style="margin: 0; font-size: 34px; line-height: 40px; font-weight: 500; letter-spacing: -0.028em; text-wrap: pretty;">The system is black, white and grey. Colour is the exception.</h1>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: ${G.g80}; text-wrap: pretty;">Colour only ever arrives as a gradient, and only where a gradient earns its place. Rules, borders, keylines, labels, axes, ticks, table strokes, panel edges and page numbers are greyscale on every page, including the pages that carry an image.</p>
      <p style="margin: 0; font-size: 13px; line-height: 21px; color: ${G.g70}; text-wrap: pretty;">Judgement about WHEN to use what does not live in this repository. It lives in the <span class="mono" style="font-size: 12px; color: ${G.g90};">elevenone-design</span> skill, which carries the four devices, the rules for choosing between them, and the craft constraints that were learned by getting them wrong. <span class="mono" style="font-size: 12px; color: ${G.g90};">gradients.json</span> is the source of record for the colour itself.</p>
    </div>

    <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 22px;">
      <div>
        <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${G.g60};">DECIDED &#183; ELEVEN GRADIENTS, CLOSED</span>
        <div style="display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
${GRADIENTS.map(swatch).join('')}
        </div>
        <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 19px; color: ${G.g70}; max-width: 1400px; text-wrap: pretty;">Five singles held inside one hue family, six crossings running between two. A piece runs ONE of them throughout. <span style="color: ${G.g90};">slate</span> is the most important member: it carries almost no chroma and exists so colour is never forced onto a piece that does not want it. A report rendered entirely in slate is a correct outcome. Do not invent a twelfth.</p>
      </div>

      <div>
        <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${G.g60};">DECIDED &#183; FOUR DEVICES, NOT INTERCHANGEABLE</span>
        <div style="margin-top: 4px;">${col(DEVICES)}</div>
      </div>
    </div>
  </div>

  <div style="display: flex; gap: 56px; align-items: flex-start; flex-grow: 1;">
    <div style="width: 420px; flex-shrink: 0;">
      <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${G.g60};">OPEN, AND NOT PRETENDED OTHERWISE</span>
      <div style="display: flex; flex-direction: column; gap: 9px; margin-top: 10px;">
${OPEN.map((t) => `        <p style="margin: 0; font-size: 12px; line-height: 19px; color: ${G.g80}; text-wrap: pretty;">${t}</p>`).join('')}
      </div>
    </div>
    <div style="flex-grow: 1;">
      <span class="mono" style="font-size: 10px; letter-spacing: 0.06em; color: ${G.g60};">THE PAGES</span>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 48px; margin-top: 4px;">
${PAGES.map(([n, t]) => `
        <div style="display: flex; gap: 16px; padding: 9px 0; border-bottom: 1px solid ${G.g20};">
          <span style="width: 132px; flex-shrink: 0; font-size: 13px; font-weight: 500; letter-spacing: -0.01em;">${n}</span>
          <span style="font-size: 12px; line-height: 19px; color: ${G.g70}; text-wrap: pretty;">${t}</span>
        </div>`).join('')}
      </div>
      <p style="margin: 14px 0 0 0; font-size: 11px; line-height: 18px; color: ${G.g60}; text-wrap: pretty;">Four earlier pages have been retired: the four-direction report matrix, the same four on the site, and the two Ember candidate rows. They were the argument that led to the set rather than the set, they are written up in <span class="mono">README.md</span>, and between them they were three fifths of the weight of this file. A canvas that will not mount is worth less than a record in git.</p>
    </div>
  </div>
</div>`;

fs.writeFileSync('Main.dc.html', D.shell({ dark: false, d: NEUTRAL, body, js: 'class Component extends DCLogic {\n  componentDidMount() {}\n  renderVals() { return {}; }\n}' }));

console.log('Main.dc.html'.padEnd(24) + W + 'x' + H + '  ' + fs.statSync('Main.dc.html').size + ' bytes');

module.exports = { MAIN_BOARD: { file: 'Main.dc.html', w: W, h: H } };
