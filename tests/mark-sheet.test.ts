import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The sheet is a decision artifact. It is generated from the generator so a
// candidate on the page cannot differ from what shipping that candidate would
// draw, which is the same reason scripts/build_dot_pages.py exists.
//
// Every assertion below reads the committed file. An earlier version ran
// --sheet into prototypes/ first and then read it back, so a stale commit was
// silently repaired and then validated: the guarantee held for the working
// tree and never for what was checked in. The regeneration now goes to a
// temporary path and is compared against the commit, which is the thing that
// actually needs to be true, and no test writes into prototypes/.
const COMMITTED = 'prototypes/marks-micro.html';
let fresh = '';
let dir = '';

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'mark-sheet-'));
  const out = join(dir, 'marks-micro.html');
  execFileSync('python', ['scripts/render_mark.py', '--sheet', '--out', out], {
    encoding: 'utf8',
  });
  fresh = readFileSync(out, 'utf8');
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('the micro contact sheet', () => {
  it('is the file the generator produces today, not a stale copy of one', () => {
    expect(existsSync(COMMITTED)).toBe(true);
    // ANGLE, S, RMIN, INK, INK_INVERSE and BAR all feed these bytes, and none
    // of them is pinned anywhere else, so a change to any one of them lands
    // here and nowhere else in the suite.
    expect(readFileSync(COMMITTED, 'utf8').replace(/\r\n/g, '\n')).toBe(
      fresh.replace(/\r\n/g, '\n'),
    );
  });

  it('shows every candidate in both polarities at true size', () => {
    const html = readFileSync(COMMITTED, 'utf8');
    // twelve candidates, each drawn ink-on-light and light-on-ink. Count
    // distinct ids, not occurrences: each polarity is emitted four times, at
    // 16, 19 and 20px plus the zoom.
    const ids = new Set([...html.matchAll(/data-candidate="([^"]+)"/g)].map((m) => m[1]));
    expect(ids.size).toBe(24);
    // true 16, 19 and 20px, plus a 6x zoom, per polarity
    expect(html).toContain('width:16px');
    expect(html).toContain('width:19px');
    expect(html).toContain('width:20px');
    expect(html).toContain('width:96px');
  });

  it('prints the measurable criteria beside each candidate so the choice is informed', () => {
    const html = readFileSync(COMMITTED, 'utf8');
    for (const label of ['dots', 'densest', 'coverage', 'legible at 16']) {
      expect(html).toContain(label);
    }
  });

  it('does not touch the shipped assets', () => {
    const before = readFileSync('public/assets/mark/mark.svg', 'utf8');
    execFileSync('python', ['scripts/render_mark.py', '--sheet', '--out', join(dir, 'again.html')], {
      encoding: 'utf8',
    });
    expect(readFileSync('public/assets/mark/mark.svg', 'utf8')).toBe(before);
  });
});
