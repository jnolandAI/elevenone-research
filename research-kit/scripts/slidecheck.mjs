import { chromium } from 'playwright';

// What the scroll-height check missed: a flex child with min-height:0 shrinks
// below its content, and the content paints straight over whatever sits after
// it. Nothing scrolls, nothing reports, and the slide has two paragraphs on top
// of each other. So check geometry directly.
const URL = process.argv[2] || 'http://localhost:4321/commercial-diligence';
const SHOT = process.argv[3] || null;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });

  const findings = await page.evaluate(() => {
    const out = [];
    const slides = [...document.querySelectorAll('.slide')];
    const scale = 1280 / slides[0].getBoundingClientRect().width;
    const px = (v) => Math.round(v * scale);

    slides.forEach((slide, i) => {
      const n = 's' + String(i + 1).padStart(2, '0');
      const body = slide.querySelector('.slide__body');
      const bb = body.getBoundingClientRect();

      // text-bearing leaves only
      const leaves = [...body.querySelectorAll('*')].filter((e) => {
        if (e.children.length) return false;
        if (!e.textContent.trim()) return false;
        const r = e.getBoundingClientRect();
        return r.height > 0 && r.width > 0;
      });

      // 1. anything painting outside the body box
      leaves.forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.bottom > bb.bottom + 1) {
          out.push(`${n} OUTSIDE  "${e.textContent.trim().slice(0, 44)}" runs ${px(r.bottom - bb.bottom)}px past the slide`);
        }
      });

      // 2. two pieces of text occupying the same space
      for (let a = 0; a < leaves.length; a++) {
        for (let b = a + 1; b < leaves.length; b++) {
          const A = leaves[a].getBoundingClientRect();
          const B = leaves[b].getBoundingClientRect();
          const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
          const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (ox > 4 && oy > 4) {
            out.push(`${n} COLLIDE  "${leaves[a].textContent.trim().slice(0, 30)}" over "${leaves[b].textContent.trim().slice(0, 30)}" (${px(ox)}x${px(oy)}px)`);
          }
        }
      }

      // 2b. text crossing a drawn rule. The 2026-08-25 slide 10 miss: an
      // overflowing flex zone painted its last text lines across the border
      // of the finding band below it, and the text-vs-text check saw nothing
      // because a border is not a leaf.
      const ruled = [...body.querySelectorAll('*')].filter((e) => {
        const cs = getComputedStyle(e);
        return e.tagName === 'HR' || parseFloat(cs.borderTopWidth) > 0;
      });
      ruled.forEach((el) => {
        const R = el.getBoundingClientRect();
        leaves.forEach((leaf) => {
          if (el.contains(leaf) || leaf.contains(el)) return;
          const r = leaf.getBoundingClientRect();
          const ox = Math.min(r.right, R.right) - Math.max(r.left, R.left);
          if (ox > 4 && r.top < R.top - 2 && r.bottom > R.top + 2) {
            out.push(`${n} RULE-X   "${leaf.textContent.trim().slice(0, 44)}" crosses a rule at y=${px(R.top - bb.top)}`);
          }
        });
      });

      // 3. a void at the foot of the content zone
      const grow = slide.querySelector('.s-grow');
      if (grow) {
        const gr = grow.getBoundingClientRect();
        let low = gr.top;
        grow.querySelectorAll('*').forEach((e) => {
          if (e.children.length) return;
          const r = e.getBoundingClientRect();
          if (r.height > 0 && r.bottom > low && r.bottom <= gr.bottom + 2) low = r.bottom;
        });
        // 160 and not 90: John's August 2026 direction is that even spacing
        // between rules beats stretching content to the foot, so a page is
        // allowed to end where its content ends. The check now only catches a
        // genuinely abandoned lower third.
        const gap = px(gr.bottom - low);
        if (gap > 160) out.push(`${n} VOID     ${gap}px of empty canvas at the foot of the content zone`);
      }

      // 4. an exhibit that does not spend the height it was given.
      //
      // The foot-void check above cannot see this: on slide 63 the annotation
      // strip sat at the bottom of the zone, so the zone ended where its
      // content ended, and 154px of blank canvas sat between the chart and the
      // strip. Every one of these reads as an unfinished page. John, 2026-08-26,
      // on three of them at once: "there's so much white space under the chart
      // ... the chart could be expanded slightly vertically and then just
      // brought down vertically." The fix is always the exhibit's height prop.
      if (grow) {
        // Every exhibit form, not only the drawn ones: a panel set or a
        // definition list that stops 200px short of the band under it reads
        // exactly as unfinished as a chart that does.
        const EXHIBITS = 'svg, .s-panels, .s-layers, .s-matrix, .s-dense, .s-flow';
        slide.querySelectorAll(EXHIBITS).forEach((svg) => {
          if (!grow.contains(svg)) return;
          if (svg.closest('.s-split__side')) return;
          // A main column beside a tinted field is not short: the field runs
          // the full height and carries the eye down past the exhibit.
          const split = svg.closest('.s-split');
          if (split && split.querySelector('.s-split__side--field')) return;
          const s = svg.getBoundingClientRect();
          let nextTop = grow.getBoundingClientRect().bottom;
          body.querySelectorAll('*').forEach((e) => {
            if (e.contains(svg) || svg.contains(e)) return;
            if (e.children.length && e.tagName !== 'HR') return;
            const r = e.getBoundingClientRect();
            if (r.height <= 0 || r.width <= 0) return;
            if (!e.textContent.trim() && e.tagName !== 'HR') return;
            if (r.top >= s.bottom - 1 && r.top < nextTop) nextTop = r.top;
          });
          // A drawn exhibit can be made taller for free, so 60px is already
          // slack. A text exhibit cannot: its height is its content, and the
          // fix is more content or a form that fills the zone, so it gets a
          // wider allowance before the page is called unfinished.
          const drawn = svg.tagName.toLowerCase() === 'svg';
          const slack = px(nextTop - s.bottom);
          if (slack > (drawn ? 60 : 110)) {
            out.push(
              drawn
                ? `${n} SLACK    a chart leaves ${slack}px unused below it; raise its height`
                : `${n} SLACK    a text exhibit leaves ${slack}px unused below it; the page needs more`,
            );
          }
        });
      }

      // 5. text with no clearance from a drawn rule.
      //
      // Nothing collides and nothing overflows, so every other check passes
      // while the page reads as cramped. John, 2026-08-26: "there just needs to
      // be a little bit of breathing room in between any kind of dividing line
      // and whatever is next to it."
      //
      // Measured on the text, not on the box: a paragraph's own padding sits
      // inside its bounding rect, so comparing boxes reports 0px whether the
      // element has clearance or none at all. A Range over the contents gives
      // the last glyph's baseline box, which is what a reader actually sees
      // against the rule.
      const textBox = (el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return r.height > 0 ? r : el.getBoundingClientRect();
      };
      ruled.forEach((el) => {
        const R = el.getBoundingClientRect();
        leaves.forEach((leaf) => {
          if (el.contains(leaf) || leaf.contains(el)) return;
          const r = textBox(leaf);
          const ox = Math.min(r.right, R.right) - Math.max(r.left, R.left);
          if (ox < 4) return;
          const above = R.top - r.bottom;
          if (above >= 0 && above < 6) {
            out.push(`${n} TIGHT    "${leaf.textContent.trim().slice(0, 36)}" sits ${px(above)}px above a rule`);
          }
        });
      });

      // 6. the same sentence twice on one page.
      //
      // It arrives the same way every time: a page is re-cut into a better
      // form, the reading moves inside the new exhibit, and the old commentary
      // strip is left where it was. Slide 74 shipped with its panel notes and
      // its annotation strip saying the same three things in slightly
      // different words, and every other check passed.
      //
      // Rendered rather than source, because a data-driven component keeps its
      // text in frontmatter: the page is the only place where everything on
      // the slide is on the slide. Keys are the first nine long words of a
      // clause, because a restatement is usually trimmed rather than copied.
      const clauses = new Map();
      leaves.forEach((leaf) => {
        const text = leaf.textContent.replace(/\s+/g, ' ').toLowerCase();
        (text.match(/[^.;:]{40,}/g) ?? []).forEach((clause) => {
          const key = clause
            .replace(/[^a-z0-9 ]/g, '')
            .split(' ')
            .filter((w) => w.length > 3)
            .slice(0, 9)
            .join(' ');
          if (key.split(' ').length < 7) return;
          if (clauses.has(key)) {
            out.push(`${n} ECHO     "${clause.trim().slice(0, 46)}" is said twice on this page`);
          }
          clauses.set(key, true);
        });
      });

      // 6. two rules with nothing between them.
      //
      // A ledger closes on an ink rule and the finding band under it opens on
      // one, so when the page has spare height the reader sees two heavy lines
      // 50px apart framing an empty strip. Neither element is wrong on its own,
      // which is why this only shows up on the rendered page.
      const rails = ruled
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.width > 200)
        .sort((a, b) => a.r.top - b.r.top);
      for (let a = 0; a < rails.length - 1; a++) {
        const A = rails[a];
        const B = rails[a + 1];
        const gap = B.r.top - A.r.top;
        if (gap < 8 || gap > 90) continue;
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        // Side by side, not stacked: two panels' notes sit at different heights
        // in adjacent columns and are not a doubled rule.
        const ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
        if (ox < Math.min(A.r.width, B.r.width) * 0.6) continue;
        const between = leaves.some((leaf) => {
          const r = leaf.getBoundingClientRect();
          return r.top >= A.r.top - 2 && r.bottom <= B.r.top + 2;
        });
        if (!between) {
          out.push(`${n} DOUBLE   two rules ${px(gap)}px apart with nothing between them`);
        }
      }

      // 6. a table row padded far beyond its own text.
      //
      // The measured failure: 33 of 34 ledgers in the first cut had rows
      // between 43px and 163px taller than the text in them, because the
      // ledger was set to hand its spare height to the rows.
      slide.querySelectorAll('.s-matrix, table').forEach((t) => {
        const rows = t.classList.contains('s-matrix')
          ? [...t.querySelectorAll('.s-matrix__row')].filter((r) => !r.className.includes('head'))
          : [...t.querySelectorAll('tbody tr')];
        let worst = 0;
        rows.forEach((row) => {
          const rb = row.getBoundingClientRect();
          let textH = 0;
          row.querySelectorAll('.s-matrix__cell, td, th').forEach((cell) => {
            const range = document.createRange();
            range.selectNodeContents(cell);
            textH = Math.max(textH, range.getBoundingClientRect().height);
          });
          worst = Math.max(worst, rb.height - textH);
        });
        if (px(worst) > 40) {
          out.push(`${n} STRETCH  a table row runs ${px(worst)}px taller than its text`);
        }
      });
    });
    return out;
  });

  if (SHOT) {
    const cards = await page.locator('.scale').count();
    for (let i = 0; i < cards; i++) {
      await page.locator('.scale').nth(i).screenshot({ path: `${SHOT}/s${String(i + 1).padStart(2, '0')}.png` });
    }
  }

  console.log(
    findings.length
      ? findings.join('\n')
      : 'clean: no overflow, collision, void, slack, tight or doubled rule, stretched table or repeated line',
  );
  await browser.close();
})();
