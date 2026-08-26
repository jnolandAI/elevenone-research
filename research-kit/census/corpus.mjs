import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Patterns are data, not code. The client list names real engagements, so it
   lives with the corpus outside this public repository. */
export function loadPatterns(corpusPath) {
  const raw = readFileSync(join(corpusPath, 'census-classification.json'), 'utf8');
  const { client, published } = JSON.parse(raw);
  if (!Array.isArray(client) || !Array.isArray(published)) {
    throw new Error('census-classification.json needs client and published arrays');
  }
  return { client, published };
}

export function makeClassifier({ client, published }) {
  const CLIENT = new RegExp(client.join('|'), 'i');
  const PUBLISHED = new RegExp(published.join('|'), 'i');

  /* Client is tested first: a client market study matches the published pattern
     on the word "study", and the client signal is the more specific one. */
  function classifyDeck(slug) {
    if (CLIENT.test(slug)) return 'client';
    if (PUBLISHED.test(slug)) return 'published';
    return 'unplaced';
  }

  function population(slug, which) {
    const c = classifyDeck(slug);
    if (which === 'strict') return c === 'published';
    if (which === 'broad') return c !== 'client';
    throw new Error(`unknown population: ${which}`);
  }

  return { classifyDeck, population };
}

export function deckOf(tagKey) {
  return tagKey.split('::')[0];
}

export function pageOf(tagKey) {
  return Number(tagKey.split('::')[1]);
}
