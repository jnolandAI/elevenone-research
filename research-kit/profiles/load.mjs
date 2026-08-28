import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve a piece profile by name.
 *
 * A profile carries the page budget, the section template and the gate
 * constants for one shape of document. It exists because the constants were
 * measured from a client deliverable and were being applied to research
 * pieces, where they are wrong in a direction that matters: a research page
 * carries fewer words than a client page and its titles are shorter by three
 * words at the median, so the deliverable numbers ask a research piece to be
 * fuller and wordier than the corpus it is imitating.
 *
 * There is no default. A gate that guesses the profile scores a research
 * piece against client constants and says nothing about having guessed, which
 * is the exact failure this replaces.
 */
const HERE = dirname(fileURLToPath(import.meta.url));

export function profileNames() {
  return readdirSync(HERE)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();
}

export function loadProfile(name) {
  if (!name) {
    throw new Error(
      `a profile is required: --profile <${profileNames().join('|')}>. ` +
        'There is no default, because the constants differ by shape and a ' +
        'silent guess is what this replaces.',
    );
  }
  const names = profileNames();
  if (!names.includes(name)) {
    throw new Error(`no such profile "${name}". Available: ${names.join(', ')}.`);
  }
  return JSON.parse(readFileSync(join(HERE, `${name}.json`), 'utf8'));
}

/**
 * Pull `--profile <name>` out of an argv slice, returning the profile and the
 * remaining arguments. Each gate parses its own flags; this only owns one.
 */
export function takeProfile(args) {
  const i = args.indexOf('--profile');
  if (i === -1) return { profile: loadProfile(null), rest: args };
  const name = args[i + 1];
  if (!name || name.startsWith('--')) {
    throw new Error('--profile needs a value.');
  }
  return {
    profile: loadProfile(name),
    rest: [...args.slice(0, i), ...args.slice(i + 2)],
  };
}
