import { test, expect } from '@playwright/test';

const BRIEF = '/briefs/001-gross-margin';

test('the brief carries four claims, each with its full working', async ({ page }) => {
  await page.goto(BRIEF);

  const claims = page.locator('.rail details');
  await expect(claims).toHaveCount(4);

  const seen: string[] = [];
  for (const [id, standing] of [['A', 'Firm'], ['B', 'Firm'], ['C', 'Supported'], ['D', 'Provisional']]) {
    const claim = page.locator(`#c-${id}`);
    await expect(claim).toContainText(standing!);
    await claim.locator('summary').click();
    await expect(claim).toContainText('Rests on');
    await expect(claim).toContainText('Assumes');
    await expect(claim).toContainText('Breaks if');
    // those three are static <dt> labels and would render over empty or
    // duplicated content. The apparatus is only real if each claim's rows
    // carry their own words.
    const rows = (await claim.locator('dd').allInnerTexts()).map((t) => t.trim());
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.length).toBeGreaterThan(20);
    seen.push(rows.join('|'));
  }
  expect(new Set(seen).size).toBe(4);
});

test('the conclusion is capped by its weakest member', async ({ page }) => {
  await page.goto(BRIEF);
  const cap = page.locator('#concl .cap');
  await expect(cap).toContainText('Rendered supported');
  await expect(cap).toContainText('capped by claim C');
});

test('claim D is held but kept off the load path', async ({ page }) => {
  await page.goto(BRIEF);
  await expect(page.locator('#members .member')).toHaveCount(3);
  // a count of three is satisfied by any three of the four; name them
  const onPath = await page.locator('#members .member .id').allInnerTexts();
  expect(onPath.map((t) => t.trim()).sort()).toEqual(['Claim A', 'Claim B', 'Claim C']);
  await expect(page.locator('.offpath')).toContainText('Claim D is not in the path');
});

test('every figure is in the page rather than drawn on load', async ({ page }) => {
  await page.goto(BRIEF);
  // three figure cards, each with an SVG that has an accessible name
  const figures = page.locator('.fig svg[role="img"]');
  await expect(figures).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    // length alone passes a stale boilerplate caption. The accessible name has
    // to carry a real figure, the same way the visible marks do.
    await expect(figures.nth(i)).toHaveAttribute('aria-label', /\d+(\.\d+)?\s?(percent|%)/);
  }
});

test('the wires draw once the load path is in view', async ({ page }) => {
  await page.goto(BRIEF);
  await page.locator('#path').scrollIntoViewIfNeeded();
  await expect(page.locator('#wires path')).toHaveCount(3);
  await expect(page.locator('#path')).toHaveClass(/\bon\b/);
  // the whole point of the object is that a wire is drawn at the weight of its
  // own claim. A count of three passes an implementation that draws them all
  // the same, which would be a false claim about the argument's structure.
  const widths = await page.locator('#wires path')
    .evaluateAll((els) => els.map((el) => el.getAttribute('stroke-width')));
  expect(new Set(widths).size).toBeGreaterThan(1);
});

test('hovering a marked sentence lights its rail entry', async ({ page }) => {
  await page.goto(BRIEF);
  await page.locator('#t-A').hover();
  await expect(page.locator('#c-A')).toHaveClass(/\blit\b/);
});

test('the apparatus is legible on paper, not collapsed', async ({ page }) => {
  await page.goto(BRIEF);
  await page.emulateMedia({ media: 'print' });
  // A CSS assertion that the opening rule exists says nothing about whether it
  // works: display on the child alone leaves a closed <details> withholding
  // its content, and the printed page carries the summary line and nothing
  // else. Assert the falsifier text is actually rendered.
  const printed = await page.evaluate(() => document.body.innerText);
  for (const row of ['Rests on', 'Assumes', 'Breaks if']) {
    expect(printed).toContain(row);
  }
  expect(printed).toContain('The 221 excluded filers are not random');
  await page.emulateMedia({ media: 'screen' });
});

test('every rail claim is reachable by keyboard', async ({ page }) => {
  await page.goto(BRIEF);
  // every, not just the first: a regression can break one claim and leave the
  // others working
  for (const id of ['A', 'B', 'C', 'D']) {
    await page.locator(`#c-${id} summary`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(`#c-${id}`)).toHaveAttribute('open', '');
  }
});

test('a draft is not linked from the index and says it is a draft', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(`a[href="${BRIEF}"]`)).toHaveCount(0);
  await page.goto(BRIEF);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('the four routes exist and the nav marks the current one', async ({ page }) => {
  for (const [path, label] of [['/', 'Briefs'], ['/reports', 'Reports'], ['/method', 'Method'], ['/about', 'About']]) {
    await page.goto(path!);
    await expect(page.locator(`nav a[aria-current="page"]`)).toHaveText(label!);
  }
});

test('/briefs redirects to the index', async ({ page }) => {
  await page.goto('/briefs');
  // any trailing-slash URL satisfies /\/$/, including /reports/ and /about/
  await expect(page).toHaveURL('http://localhost:4321/');
});

test('the sitemap excludes the draft brief and lists a real page', async ({ request }) => {
  // astro.config.mjs:29-31's draftSlugs() filter is the only thing keeping an
  // unpublished brief out of the sitemap: @astrojs/sitemap builds its list
  // from resolved routes and never reads the rendered HTML's noindex meta, so
  // replacing the filter with a bare sitemap() call would still list
  // 001-gross-margin. No unit test touches astro.config.mjs at all, so this
  // was unguarded. Both conditions are checked together so an empty or
  // missing sitemap cannot pass by vacuously excluding everything.
  const res = await request.get('/sitemap-0.xml');
  expect(res.ok()).toBeTruthy();
  const xml = await res.text();
  expect(xml).not.toContain('001-gross-margin');
  expect(xml).toContain('/reports/');
});
