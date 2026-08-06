#!/usr/bin/env node
/**
 * Every claim in a brief's frontmatter must be attached to exactly one
 * sentence in the body, and every marked sentence must have a claim behind it.
 *
 * Zod validates the frontmatter and cannot see the body, so this is the check
 * that catches a claim sitting in the rail with nothing in the prose depending
 * on it. Rule 1 of docs/the-working.md: if removing the sentence would not
 * change the conclusion, it is prose, not a claim.
 *
 * Runs from `prebuild`, so it gates every build including the Netlify one.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const BRIEFS_DIR = 'src/content/briefs';

/** @returns {string[]} zero or more problems, each a full sentence */
export function checkBrief(source, path) {
  const problems = [];

  const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return [`${path}: no frontmatter block.`];

  // Tolerant of the YAML an author actually writes: `- id: A`, `- id: "A"`,
  // and a trailing comment all mean the same thing. A stricter pattern makes a
  // quoted id invisible to BOTH lists at once, so an orphaned claim written
  // that way would slip through the very check built to catch it.
  const declared = [...fm[1].matchAll(/^\s*-\s+id:\s*["']?([A-Z])["']?\s*(?:#.*)?$/gm)]
    .map((m) => m[1]);
  const body = source.slice(fm[0].length);
  // Attribute-order independent. Anchoring id= to first position would let a
  // second marking of the same claim hide behind any other attribute, which
  // turns a real doubled-claim violation into a silent pass.
  const marked = [...body.matchAll(/<Claim[^>]*?\sid=["']([A-Z])["']/g)].map((m) => m[1]);

  const counts = new Map();
  for (const id of marked) counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const id of declared) {
    const n = counts.get(id) ?? 0;
    if (n === 0) {
      problems.push(
        `${path}: claim ${id} is declared in frontmatter but is never marked in the body. ` +
          `Either attach it to the sentence it carries, or it is not a claim.`,
      );
    } else if (n > 1) {
      problems.push(
        `${path}: claim ${id} is marked ${n} times in the body. ` +
          `A claim attaches to one sentence, or the rail link is ambiguous.`,
      );
    }
  }

  for (const id of new Set(marked)) {
    if (!declared.includes(id)) {
      problems.push(
        `${path}: the body marks claim ${id}, which is not declared in frontmatter. ` +
          `A marked sentence with no apparatus behind it is the thing this brand does not do.`,
      );
    }
  }

  return problems;
}

function main() {
  if (!existsSync(BRIEFS_DIR)) {
    console.log('check-briefs: no briefs yet, nothing to check');
    return 0;
  }
  // Recursive, because the collection's loader is glob('**/*.mdx'). A flat scan
  // against a recursive loader means a brief in a subdirectory ships unchecked,
  // which breaks the one guarantee this file exists to make.
  const files = readdirSync(BRIEFS_DIR, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.mdx'));
  const problems = files.flatMap((f) =>
    checkBrief(readFileSync(join(BRIEFS_DIR, f), 'utf8'), join(BRIEFS_DIR, f)),
  );
  if (problems.length) {
    console.error('\ncheck-briefs failed:\n');
    for (const p of problems) console.error('  ' + p);
    console.error('');
    return 1;
  }
  console.log(`check-briefs: ${files.length} brief(s), every claim attached`);
  return 0;
}

// Only run the CLI when invoked directly, so the test can import checkBrief.
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  process.exit(main());
}
