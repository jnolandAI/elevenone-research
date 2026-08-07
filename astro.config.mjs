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

export default defineConfig({
  site: 'https://elevenoneresearch.com',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !DRAFTS.some((slug) => new RegExp(`/briefs/${slug}/?$`).test(page)),
    }),
  ],
  build: {
    // one stylesheet rather than many small ones, so the ground and the
    // token layer are never painted in two passes
    inlineStylesheets: 'auto',
  },
});
