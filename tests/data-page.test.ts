import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ADDRESS, cursorLink, vscodeLink } from '../src/lib/connect';
import { SOURCES } from '../services/data/src/sources/registry';

// The /data page tells people how to connect to Eleven One Data. Its address
// has three other homes (the registry entry, the plugin, the service README),
// and a reader who copies a stale one gets nothing back.
const page = readFileSync('src/pages/data.astro', 'utf8');
const launched = /const LAUNCHED = true;/.test(page);

describe('the data page', () => {
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

  // FRED, Census and BEA require their notice "prominently within the application", and
  // BLS requires its own. The page and the service's results must say the same words.
  it('shows each publisher notice exactly as the service returns it, and links the FRED terms', () => {
    for (const s of Object.values(SOURCES)) {
      if (s.notice) expect(page, s.id).toContain(`body: '${s.notice}'`);
    }
    expect(page).toContain('href="https://fred.stlouisfed.org/docs/api/terms_of_use.html"');
  });

  // Launch is one edit in two places: set LAUNCHED to true in data.astro and
  // drop '/data' from UNLAUNCHED in astro.config.mjs. This case fails until
  // both are done, so neither can happen alone.
  it('stays out of search until the service it describes is live', () => {
    expect(page).toMatch(/noindex=\{!LAUNCHED\}/);
    const listed = /UNLAUNCHED = \[[^\]]*'\/data'/.test(readFileSync('astro.config.mjs', 'utf8'));
    expect(listed, "'/data' in UNLAUNCHED").toBe(!launched);
  });

  it('is linked from no nav or footer while it is a draft', () => {
    if (launched) return;
    expect(readFileSync('src/components/Nav.astro', 'utf8')).not.toMatch(/\/data/);
    expect(readFileSync('src/components/Footer.astro', 'utf8')).not.toMatch(/\/data/);
  });
});
