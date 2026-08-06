import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkBrief } from '../scripts/check-briefs.mjs';

const load = (name: string) =>
  readFileSync(`tests/fixtures/briefs/${name}.mdx`, 'utf8');

describe('body to frontmatter correspondence', () => {
  it('passes a brief where every claim is marked exactly once', () => {
    expect(checkBrief(load('good'), 'good.mdx')).toEqual([]);
  });

  it('catches a claim declared in the rail that no sentence rests on', () => {
    const problems = checkBrief(load('orphan-claim'), 'orphan-claim.mdx');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/B/);
    expect(problems[0]).toMatch(/never marked/i);
  });

  it('catches a marked sentence with no claim behind it', () => {
    const problems = checkBrief(load('unmarked-claim'), 'unmarked-claim.mdx');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/Q/);
    expect(problems[0]).toMatch(/not declared/i);
  });

  it('catches a claim marked on more than one sentence', () => {
    const problems = checkBrief(load('doubled-claim'), 'doubled-claim.mdx');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/A/);
    expect(problems[0]).toMatch(/2 times/);
  });
});
