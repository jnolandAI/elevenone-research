/* Client deliverables: work produced for one buyer. Checked first, because a
   client market study matches the published pattern on the word "study" and
   the client signal is the more specific one. */
const CLIENT = /vixxo|m-a-options|strategy-workshop|adjacency-deep-dive|project-drive|parthenon-pexco|deloitte-service-ops|steering-committee|investor-day/i;

/* Published research: a piece the firm put its own name on in public. */
const PUBLISHED = /report|barometer|perspective|white-paper|insight|study|monitor|e-conomy|green-economy|luxury|future-of|covid|sdg|gen-ai|deep-tech|capital-markets|tourism|hydrogen|mobility|trash|sentiment|playbook|briefing/i;

export function classifyDeck(slug) {
  if (CLIENT.test(slug)) return 'client';
  if (PUBLISHED.test(slug)) return 'published';
  return 'unplaced';
}

export function population(slug, which) {
  const c = classifyDeck(slug);
  if (which === 'strict') return c === 'published';
  if (which === 'broad') return c !== 'client';
  throw new Error(`unknown population: ${which}`);
}

export function deckOf(tagKey) {
  return tagKey.split('::')[0];
}

export function pageOf(tagKey) {
  return Number(tagKey.split('::')[1]);
}
