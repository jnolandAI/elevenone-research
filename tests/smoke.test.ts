import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('project scaffold', () => {
  // research-kit joined the list on 2026-08-28. It is a self-link,
  // file:./research-kit, which is this repository depending on a directory
  // inside itself. That is unusual and it is the right call: both sites then
  // import through the same specifier, so the kit's resolution surface is
  // exercised identically from each rather than proven on one and
  // approximated on the other. The predecessor plan argued against the link
  // on the grounds that nothing here resolved the kit by name. Piece.astro
  // does.
  it('declares the exact integrations the spec allows and no others', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@astrojs/mdx',
      '@astrojs/sitemap',
      '@fontsource-variable/familjen-grotesk',
      '@fontsource-variable/martian-mono',
      'astro',
      'research-kit',
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
