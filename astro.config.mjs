// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://elevenoneresearch.com',
  integrations: [mdx(), sitemap()],
  redirects: {
    '/briefs': '/',
  },
  build: {
    // one stylesheet rather than many small ones, so the ground and the
    // token layer are never painted in two passes
    inlineStylesheets: 'auto',
  },
});
