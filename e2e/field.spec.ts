import { test, expect } from '@playwright/test';

/**
 * Two rules from the elevenone-design skill, made measurable on the built
 * page rather than trusted from the board.
 *
 * COVER. The field fills the band. Ground showing through at an edge means
 * object-fit or the picture's inset has gone wrong, and at 390 wide it is the
 * narrow render that has to do it.
 *
 * QUIET THIRD. The headline sits on the quiet part of the field. Measured by
 * drawing the displayed crop of the image to a small canvas, taking the mean
 * luminance of the region under the h1, and comparing it with the brightest
 * vertical third of the same crop. The h1's patch has to be at most 0.8 of
 * the brightest third. A failure here at a width the board never showed is
 * a real finding about BLOBS_HOME at that crop, not a test to loosen: take
 * it back to the human.
 */
for (const width of [1440, 390]) {
  test(`at ${width} wide the field covers the band and the headline sits on its quiet third`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const img = page.locator('.band picture img');
    await expect(img).toBeVisible();

    const r = await page.evaluate(async () => {
      const band = document.querySelector('.band')!.getBoundingClientRect();
      const el = document.querySelector('.band picture img') as HTMLImageElement;
      await el.decode();
      const ib = el.getBoundingClientRect();
      const h1 = document.querySelector('.band h1')!.getBoundingClientRect();

      // The part of the source the browser shows under object-fit: cover
      // and object-position: left center.
      const nw = el.naturalWidth, nh = el.naturalHeight;
      const scale = Math.max(ib.width / nw, ib.height / nh);
      const sw = ib.width / scale, sh = ib.height / scale;
      const sx = 0, sy = (nh - sh) / 2;

      const c = document.createElement('canvas');
      const cw = 96, ch = Math.max(8, Math.round((96 * ib.height) / ib.width));
      c.width = cw; c.height = ch;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(el, sx, sy, sw, sh, 0, 0, cw, ch);
      const d = ctx.getImageData(0, 0, cw, ch).data;
      const lum = (x: number, y: number) => {
        const i = (y * cw + x) * 4;
        return 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
      };
      const mean = (x0: number, y0: number, x1: number, y1: number) => {
        let s = 0, n = 0;
        for (let y = Math.max(0, y0); y < Math.min(ch, y1); y++)
          for (let x = Math.max(0, x0); x < Math.min(cw, x1); x++) { s += lum(x, y); n++; }
        return n ? s / n : 0;
      };
      const thirds = [0, 1, 2].map((t) => mean(Math.round((t * cw) / 3), 0, Math.round(((t + 1) * cw) / 3), ch));
      const fx = (px: number) => Math.round(((px - ib.left) / ib.width) * cw);
      const fy = (px: number) => Math.round(((px - ib.top) / ib.height) * ch);
      const underH1 = mean(fx(h1.left), fy(h1.top), fx(h1.right), fy(h1.bottom));

      return {
        band: { l: band.left, t: band.top, r: band.right, b: band.bottom },
        img: { l: ib.left, t: ib.top, r: ib.right, b: ib.bottom },
        src: el.currentSrc,
        thirds, underH1,
      };
    });

    // The field covers the band, and the width chose the right render.
    expect(Math.abs(r.img.l - r.band.l), 'left').toBeLessThanOrEqual(1);
    expect(Math.abs(r.img.r - r.band.r), 'right').toBeLessThanOrEqual(1);
    expect(Math.abs(r.img.t - r.band.t), 'top').toBeLessThanOrEqual(1);
    expect(Math.abs(r.img.b - r.band.b), 'bottom').toBeLessThanOrEqual(1);
    expect(r.src, 'which render').toContain(width < 900 ? 'home-narrow' : 'home-wide');

    // The headline sits on the quiet third of what is displayed.
    const brightest = Math.max(...r.thirds);
    // An all-black field passes the ratio below trivially, and nothing else
    // on the branch looks at pixels. Say that there is a field at all.
    const darkest = Math.min(...r.thirds);
    expect(brightest, `thirds ${r.thirds.map((t) => t.toFixed(1)).join(' / ')}; the field is flat`).toBeGreaterThan(darkest + 8);
    expect(
      r.underH1,
      `under the h1 ${r.underH1.toFixed(1)} against brightest third ${brightest.toFixed(1)}; thirds ${r.thirds.map((t) => t.toFixed(1)).join(' / ')}`,
    ).toBeLessThanOrEqual(0.8 * brightest);
  });
}
