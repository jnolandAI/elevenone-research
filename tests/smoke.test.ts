import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('project scaffold', () => {
  it('declares the exact integrations the spec allows and no others', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@astrojs/mdx',
      '@astrojs/sitemap',
      '@fontsource-variable/familjen-grotesk',
      '@fontsource-variable/martian-mono',
      'astro',
    ]);
  });

  it('runs check-briefs before every build', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.scripts.prebuild).toContain('check-briefs');
  });

  it('does not typecheck or build the frozen prototypes', () => {
    const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
    expect(tsconfig.exclude).toContain('prototypes');
  });

  it('pins the Node version for the Netlify build', () => {
    expect(existsSync('.nvmrc')).toBe(true);
    expect(readFileSync('netlify.toml', 'utf8')).toContain('NODE_VERSION');
  });
});
