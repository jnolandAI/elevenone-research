import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ADDRESS, EFFECTIVE, LAUNCHED, cursorLink, vscodeLink } from '../src/lib/connect';
import { SOURCES } from '../services/data/src/sources/registry';

// /data tells people how to connect to Eleven One Data; /privacy and /terms are the documents
// the directories ask for. All three describe a service that is not live yet, and launch with it.
const PAGES = ['data', 'privacy', 'terms'] as const;
const src = (name: string) => readFileSync(`src/pages/${name}.astro`, 'utf8');
const page = src('data');

describe('the data page', () => {
  // Its address has three other homes, and a reader who copies a stale one gets nothing back.
  it('gives the address the registry entry and the plugin give', () => {
    const server = JSON.parse(readFileSync('services/data/server.json', 'utf8'));
    const plugin = JSON.parse(readFileSync('services/data/plugin/.mcp.json', 'utf8'));
    expect(server.remotes[0].url).toBe(ADDRESS);
    expect(plugin.mcpServers['eleven-one'].url).toBe(ADDRESS);
    expect(readFileSync('services/data/README.md', 'utf8')).toContain(ADDRESS);
  });

  it('builds editor links that carry the address and no key', () => {
    const cursor = new URL(cursorLink);
    expect(cursor.protocol + cursor.host + cursor.pathname).toBe('cursor:anysphere.cursor-deeplink/mcp/install');
    expect(cursor.searchParams.get('name')).toBe('eleven-one');
    expect(JSON.parse(atob(cursor.searchParams.get('config')!))).toEqual({ url: ADDRESS });
    expect(vscodeLink.startsWith('vscode:mcp/install?')).toBe(true);
    expect(JSON.parse(decodeURIComponent(vscodeLink.slice('vscode:mcp/install?'.length)))).toEqual({ name: 'eleven-one', type: 'http', url: ADDRESS });
    expect(page).toMatch(/href=\{cursorLink\}/);
    expect(page).toMatch(/href=\{vscodeLink\}/);
  });

  it('links the terms and the privacy policy', () => {
    expect(page).toContain('href="/terms"');
    expect(page).toContain('href="/privacy"');
  });
});

describe('the publisher notices', () => {
  // FRED, Census and BEA require their notice "prominently within the application", and BLS
  // requires its own. The pages and the service's results must say the same words.
  it('appear on /data exactly as the service returns them, with the link to the FRED terms', () => {
    for (const s of Object.values(SOURCES)) if (s.notice) expect(page, s.id).toContain(`body: '${s.notice}'`);
    expect(page).toContain('href="https://fred.stlouisfed.org/docs/api/terms_of_use.html"');
  });

  it('appear in the terms exactly as the service returns them, for every publisher that requires one', () => {
    const terms = src('terms');
    for (const id of ['fred', 'census', 'bea', 'bls'] as const) expect(terms, id).toContain(`body: '${SOURCES[id].notice}'`);
    for (const s of Object.values(SOURCES)) expect(terms, `${s.id} terms link`).toContain(`href: '${s.terms_url}'`);
  });
});

describe('launch', () => {
  // Launch is one change in two files: set LAUNCHED (and EFFECTIVE) in src/lib/connect.ts, and
  // empty UNLAUNCHED in astro.config.mjs. These cases fail until both are done, so neither can
  // happen alone.
  it('keeps every page out of search until the service it describes is live', () => {
    const config = readFileSync('astro.config.mjs', 'utf8');
    for (const name of PAGES) {
      expect(src(name), name).toMatch(/noindex=\{!LAUNCHED\}/);
      expect(new RegExp(`UNLAUNCHED = \\[[^\\]]*'/${name}'`).test(config), `'/${name}' in UNLAUNCHED`).toBe(!LAUNCHED);
    }
  });

  it('dates the privacy policy and terms when they take effect', () => {
    if (LAUNCHED) expect(EFFECTIVE, 'set EFFECTIVE when LAUNCHED').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const name of ['privacy', 'terms']) expect(src(name), name).toMatch(/EFFECTIVE \?/);
  });

  it('is linked from no nav or footer before launch', () => {
    if (LAUNCHED) return;
    const chrome = readFileSync('src/components/Nav.astro', 'utf8') + readFileSync('src/components/Footer.astro', 'utf8');
    for (const name of PAGES) expect(chrome, name).not.toMatch(new RegExp(`/${name}\\b`));
  });
});
