import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const SAMPLE = 'research-kit/census/out/visual-sample.md';
const READ = 'research-kit/census/out/visual-read.md';

describe('visual read', () => {
  it('has an entry for every sampled page', () => {
    if (!existsSync(READ)) throw new Error('visual-read.md not written yet');
    const sampled = [...readFileSync(SAMPLE, 'utf8').matchAll(/:: (\S+) :: page_(\d+)\.png/g)]
      .map((m) => `${m[1]} :: page_${m[2]}`);
    const read = readFileSync(READ, 'utf8');
    const missing = sampled.filter((s) => !read.includes(s));
    expect(missing).toEqual([]);
  });

  it('records a form name and a layout note for every entry', () => {
    const read = readFileSync(READ, 'utf8');
    const sections = read.split(/^## /m).slice(1);
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) {
      expect(s, `section missing Form:\n${s.slice(0, 80)}`).toMatch(/\*\*Form:\*\*/);
      expect(s, `section missing Layout:\n${s.slice(0, 80)}`).toMatch(/\*\*Layout:\*\*/);
    }
  });
});
