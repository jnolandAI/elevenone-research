import { test, expect } from '@playwright/test';

/**
 * The render's own dissolve is the only edge treatment the imagery gets. A
 * container that clips cuts the render before any dissolve reaches a reader,
 * which is what HomeHero did: overflow hidden on the hero, the image pushed to
 * right -10%.
 *
 * Scoped to /assets/dot/ deliberately. BriefHero also clips, but what it clips
 * is dotField() output from src/lib/charts/halftone.ts, which is the brief's own
 * dataset drawn as halftone rather than an imagery-engine render. That output
 * goes through set:html as an inline element, never an <img>, so the selector
 * below cannot match it regardless of BriefHero's own overflow: hidden.
 *
 * Each page below carries an exact expected count rather than a bare presence
 * check. A page with zero renders is a recorded expectation, not a silent
 * skip: without the count, a selector that matches nothing lets the clip loop
 * pass vacuously, which is exactly what happened on /briefs before this file
 * asserted a count for it.
 */
const PAGES: { path: string; count: number }[] = [
  // The homepage carries no dot render since the band became a field
  // (docs/field.md). Zero is a recorded expectation: if a component starts
  // calling dotAsset again, this is what notices.
  { path: '/', count: 0 },
  // The briefs index lists brief metadata only; it renders no dotAsset image.
  { path: '/briefs', count: 0 },
  // The brief detail page is where BriefHero, Figure and DataFigure live, and
  // the plausible place a future component starts calling dotAsset. BriefHero
  // clips deliberately, but it renders dotField() through set:html as inline
  // markup rather than an <img>, so it cannot trip this selector either way.
  { path: '/briefs/001-gross-margin', count: 0 },
];

for (const { path, count } of PAGES) {
  test(`${path} carries exactly ${count} dot render(s), none clipped by an ancestor`, async ({ page }) => {
    await page.goto(path);
    const renders = page.locator('img[src^="/assets/dot/"]');
    await expect(renders).toHaveCount(count);

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
