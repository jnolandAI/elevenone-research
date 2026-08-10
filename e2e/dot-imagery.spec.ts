import { test, expect } from '@playwright/test';

/**
 * The render's own dissolve is the only edge treatment the imagery gets. A
 * container that clips cuts the render before any dissolve reaches a reader,
 * which is what HomeHero did: overflow hidden on the hero, the image pushed to
 * right -10%.
 *
 * Scoped to /assets/dot/ deliberately. BriefHero also clips, but what it clips
 * is dotField() output from src/lib/charts/halftone.ts, which is the brief's own
 * dataset drawn as halftone rather than an imagery-engine render.
 */
const PAGES = ['/', '/briefs'];

for (const path of PAGES) {
  test(`no dot render is clipped by an ancestor on ${path}`, async ({ page }) => {
    await page.goto(path);
    const renders = page.locator('img[src^="/assets/dot/"]');
    const count = await renders.count();

    for (let i = 0; i < count; i++) {
      const img = renders.nth(i);
      const offence = await img.evaluate((el: HTMLElement) => {
        const box = el.getBoundingClientRect();
        for (let p = el.parentElement; p; p = p.parentElement) {
          const style = getComputedStyle(p);
          const clips = ['hidden', 'clip', 'auto', 'scroll'];
          if (!clips.includes(style.overflowX) && !clips.includes(style.overflowY)) continue;
          const pb = p.getBoundingClientRect();
          const over =
            box.left < pb.left - 0.5 || box.right > pb.right + 0.5 ||
            box.top < pb.top - 0.5 || box.bottom > pb.bottom + 0.5;
          if (over) {
            return `${el.getAttribute('src')} is clipped by ${p.tagName.toLowerCase()}.${p.className}`;
          }
        }
        return null;
      });
      expect(offence, offence ?? '').toBeNull();
    }
  });
}

test('the homepage actually carries a render, so the check above is not vacuous', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('img[src^="/assets/dot/"]').first()).toBeVisible();
});
