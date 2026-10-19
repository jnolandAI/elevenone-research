// The citation contract. docs/citations.md is the prose version and the tests
// hold the code to it. Every number a tool returns points at one of these by id.

import type { SourceId } from '../sources/registry.js';

export interface Citation {
  /** "c1", "c2", ... unique within one tool result */
  id: string;
  source: SourceId;
  /** The body that published the data, not the service that relayed it */
  publisher: string;
  /** The programme or product the figure belongs to */
  dataset: string;
  /** What the cited thing is called by its publisher */
  title: string;
  /** Series id, table id, or filing accession number */
  identifier?: string;
  /** A page a person can open to see the same figure */
  url: string;
  /** The exact request that produced the figure, credentials removed */
  api_url: string;
  /** When this service fetched it from the publisher (ISO 8601) */
  retrieved_at: string;
  /** The publisher's own date for the figure: last update, release, or filing date */
  as_of?: string;
  units?: string;
  license: string;
  /** The service the figure was retrieved through, where that is not the publisher (FRED relays BLS, BEA, ...) */
  via?: string;
  /** One line, ready to paste into a footnote */
  text: string;
}

export type CitationInput = Omit<Citation, 'id' | 'text'>;

export function formatCitation(c: CitationInput): string {
  const parts = [c.publisher];
  parts.push(`"${c.title}"${c.identifier ? ` (${c.identifier})` : ''}`);
  if (c.dataset && c.dataset !== c.title) parts.push(c.dataset);
  if (c.as_of) parts.push(`as of ${c.as_of}`);
  const via = c.via && c.via !== c.publisher ? ` from ${c.via}` : '';
  parts.push(`retrieved${via} ${c.retrieved_at.slice(0, 10)}`);
  parts.push(c.url);
  return `${parts.join(', ')}.`;
}

/** Collects the citations for one tool result, numbering them and folding duplicates. */
export class Citations {
  private readonly byKey = new Map<string, Citation>();

  add(input: CitationInput): string {
    const key = `${input.source}|${input.identifier ?? ''}|${input.url}|${input.api_url}`;
    const existing = this.byKey.get(key);
    if (existing) return existing.id;
    const id = `c${this.byKey.size + 1}`;
    this.byKey.set(key, { id, ...input, text: formatCitation(input) });
    return id;
  }

  list(): Citation[] {
    return [...this.byKey.values()];
  }
}
