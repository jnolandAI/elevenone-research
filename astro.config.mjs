// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// A draft carries a noindex meta, but @astrojs/sitemap builds its list from
// resolved routes and never reads the rendered HTML, so noindex alone does not
// keep a draft out of the sitemap. Without this, an unpublished brief's URL is
// advertised to search engines by the same build that asks them not to index it.
function draftSlugs() {
  const dir = 'src/content/briefs';
  let files = [];
  try {
    files = readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.mdx'));
  } catch {
    return [];
  }
  return files
    .filter((f) => /^published:\s*null\s*$/m.test(readFileSync(`${dir}/${f}`, 'utf8').split('---')[1] ?? ''))
    .map((f) => f.replace(/\\/g, '/').replace(/\.mdx$/, ''));
}
const DRAFTS = draftSlugs();

// Pages drafted ahead of what they describe, and noindexed until it exists. The same
// gap applies: the sitemap would advertise them anyway. tests/data-page.test.ts holds
// /data's entry here to the LAUNCHED flag in its page.
const UNLAUNCHED = ['/data'];

export default defineConfig({
  site: 'https://elevenoneresearch.com',
  // Reports became Work on 2026-09-02. A static redirect page is enough for
  // a link in an old email.
  redirects: { '/reports': '/work' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !DRAFTS.some((slug) => new RegExp(`/briefs/${slug}/?$`).test(page)) &&
        !UNLAUNCHED.some((path) => new URL(page).pathname.replace(/\/$/, '') === path),
    }),
  ],
  build: {
    // one stylesheet rather than many small ones, so the ground and the
    // token layer are never painted in two passes
    inlineStylesheets: 'auto',
  },
});
