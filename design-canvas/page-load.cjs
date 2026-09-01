/* What does one PAGE of the canvas cost to mount?

   This exists because four checks passed a canvas that did not render.

   dc-smoke proves a board runs. dc-paint proves it painted inside its frame.
   dc-markup proves the template is well formed. time-board proves it draws
   inside a budget. Every one of them measures a board ALONE, and the fault
   that shipped is a property of a page: every artboard is its own sandboxed
   iframe carrying its own copy of the runtime, and enough of them mounting
   together take the canvas past its patience. Every frame comes back

     "Preview stopped: the preview stopped answering the editor
      (replaced by a navigation, or unresponsive for too long)."

   time-board is blind to it twice over. Its own header says the stub charges
   for property access and nothing for drawing, so forty thousand arc fills
   cost it about what four hundred do. And it runs one file at a time.

   What is measured here, per page: how many boards, how many canvas pixels,
   and how many stipple marks. The budget is not derived from theory. It is
   two observations:

     WORKED   1 board,  12.4 Mpx, 242k marks   (Hero images)
     WORKED   6 boards, 14.2 Mpx,  82k marks   (Report covers, after cuts)
     FAILED   6 boards, 22.1 Mpx, 264k marks   (Report covers, before)
     FAILED  12 boards, 44.3 Mpx, 528k marks   (The whole set, as 12 boards)

   So the axis that matters is marks TIMES boards, not marks. One board can
   carry a quarter of a million marks; six boards cannot carry that each. The
   cap below sits between the worked and failed cases with room either side.

   One thing this still cannot see: the canvas degrades as a reader moves
   BETWEEN heavy pages in a session, because the runtime keeps the iframes of
   pages already visited. A page that mounts cleanly from a fresh load can
   fail when it is the third heavy page opened. Keeping every page inside the
   budget is what buys the headroom for that; there is no way to measure it
   from here. */
const fs = require('fs');

const MARK_BOARD_CAP = 800000;   // marks x boards, on one page
const MPX_CAP = 30;              // canvas megapixels on one page
const BOARD_CAP = 8;             // artboards on one page, when any of them stipples

const manifest = JSON.parse(fs.readFileSync(__dirname + '/canvas-directions.json', 'utf8'));

function measure(file) {
  const src = fs.readFileSync(__dirname + '/' + file, 'utf8');
  let px = 0, canvases = 0, m;
  const rc = /<canvas[^>]*\swidth="(\d+)"[^>]*\sheight="(\d+)"/g;
  while ((m = rc.exec(src)) !== null) { px += (+m[1]) * (+m[2]); canvases++; }
  const counts = [];
  const rm = /count:\s*(\d+)/g;
  while ((m = rm.exec(src)) !== null) counts.push(+m[1]);
  const sum = counts.reduce((a, b) => a + b, 0);
  /* A board that draws N panels from ONE count literal in a loop spends that
     count N times. Scale by canvases per literal so a comparison sheet is not
     reported as costing one panel. */
  const marks = counts.length && canvases > counts.length
    ? Math.round(sum * (canvases / counts.length))
    : sum;
  return { px, canvases, marks };
}

const pages = new Map();
for (const a of manifest.artboards) {
  const key = a.page || manifest.pages[0].id;
  if (!pages.has(key)) pages.set(key, { boards: 0, px: 0, marks: 0, files: [] });
  const p = pages.get(key);
  const s = measure(a.file);
  p.boards++; p.px += s.px; p.marks += s.marks; p.files.push({ file: a.file, ...s });
}

let bad = 0;
for (const page of manifest.pages) {
  const p = pages.get(page.id);
  if (!p) continue;
  const mpx = p.px / 1e6;
  const product = p.marks * p.boards;
  const faults = [];
  if (product > MARK_BOARD_CAP) faults.push('marks x boards ' + Math.round(product / 1000) + 'k over ' + MARK_BOARD_CAP / 1000 + 'k');
  if (mpx > MPX_CAP) faults.push('canvas ' + mpx.toFixed(1) + 'Mpx over ' + MPX_CAP);
  if (p.marks > 0 && p.boards > BOARD_CAP) faults.push(p.boards + ' drawing boards over ' + BOARD_CAP);
  if (faults.length) bad++;
  console.log(
    page.id.padEnd(9) + page.name.padEnd(20) +
    String(p.boards).padStart(3) + ' boards  ' +
    mpx.toFixed(1).padStart(6) + ' Mpx  ' +
    (Math.round(p.marks / 1000) + 'k').padStart(6) + ' marks  ' +
    (Math.round(product / 1000) + 'k').padStart(7) + ' m*b' +
    (faults.length ? '   <-- ' + faults.join('; ') : ''));
  if (faults.length) {
    for (const f of p.files.sort((a, b) => b.marks - a.marks).slice(0, 4)) {
      console.log('          ' + f.file.padEnd(30) + (Math.round(f.marks / 1000) + 'k').padStart(6) + ' marks  ' + (f.px / 1e6).toFixed(1) + ' Mpx');
    }
  }
}

console.log('\n' + (bad ? bad + ' page(s) over budget' : 'every page inside the mount budget'));
process.exit(bad ? 1 : 0);
