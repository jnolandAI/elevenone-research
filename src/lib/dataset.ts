import { readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';

export interface Quartiles {
  p10: number; p25: number; p50: number; p75: number; p90: number;
}

export interface Cohort extends Quartiles {
  label: string;
  n: number;
  /** density samples across [kde_x0, kde_x1] */
  kde: number[];
}

export interface MarginDataset {
  source: string;
  retrieved: string;
  n_kept: number;
  n_excluded: number;
  n_above_70: number;
  median_margin: number;
  /** whole-universe density, kde_n samples across [kde_x0, kde_x1] */
  kde: number[];
  kde_n: number;
  kde_bw: number;
  kde_x0: number;
  kde_x1: number;
  q: Quartiles;
  cohorts: Cohort[];
  /** binned density surface, rows by cols, over log revenue and margin */
  grid: number[][];
  rows: number;
  cols: number;
  peak: { rev: number; margin: number; band_count: number; col: number; row: number };
  ridge: { rev: number; margin: number; band_count: number; col: number; row: number };
}

const PUBLIC_DATA = '/assets/data/';

/**
 * Read a brief's dataset from public/ at build time.
 *
 * public/ is deliberately the only source. The same file the figures are
 * computed from is the file the brief links to, so a reader recomputing the
 * numbers is working from exactly what we worked from.
 */
export function loadDataset(publicPath: string): MarginDataset {
  if (!publicPath.startsWith(PUBLIC_DATA) || publicPath.includes('..')) {
    throw new Error(`dataset path must sit under ${PUBLIC_DATA}, got ${publicPath}`);
  }
  const file = normalize(join('public', publicPath));
  return JSON.parse(readFileSync(file, 'utf8')) as MarginDataset;
}

// Must lead with the Variable family shipped in src/styles/base.css:9,21.
// The static family names ('Familjen Grotesk', 'Martian Mono') are not
// fontsource packages this site installs, so leading with them made every
// chart text node fall through to the platform generic silently: no error,
// just the wrong metrics. Verified by measuring rendered glyph widths.
export const SANS = 'Familjen Grotesk Variable, Familjen Grotesk, sans-serif';
export const MONO = 'Martian Mono Variable, Martian Mono, ui-monospace, monospace';

/** Escape text destined for an SVG text node or attribute. */
export const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const pct = (v: number) => Math.round(v * 100) + '%';
