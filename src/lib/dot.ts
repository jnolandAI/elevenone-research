import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Subject captions, from the library table in docs/dot-imagery.md. */
export const SUBJECTS: Record<string, { name: string; covers: string }> = {
  port: { name: 'Container port', covers: 'Logistics, trade, supply chain, freight' },
  datacenter: { name: 'Data centre', covers: 'Compute demand, colocation, power draw' },
  wind: { name: 'Wind generation', covers: 'Renewables, interconnection, capacity build' },
  robotics: { name: 'Industrial robotics', covers: 'Automation, factory capex, throughput' },
  grid: { name: 'Transmission grid', covers: 'Utilities, grid constraint, siting' },
  urban: { name: 'Urban density', covers: 'Real estate, site selection, catchment' },
};

interface Entry { w: number; h: number; role: string; subject: string; webp?: string; engine_version?: string }

// The library is not shipped with the site. A static JSON import would make
// its absence a build error in every module that touches this file, which is
// the wrong place for it: the seam should stay importable and fail only when
// something asks it for an image.
const MANIFEST = fileURLToPath(new URL('../../public/assets/dot/manifest.json', import.meta.url));

export function loadManifest(): Record<string, Entry> {
  if (!existsSync(MANIFEST)) return {};
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, Entry>;
}

export interface DotAsset { src: string; width: number; height: number; alt: string }

/**
 * The single engine version the whole library was rendered at.
 *
 * Throws when assets disagree, or when one is missing the field outright.
 * `docs/dot-imagery.md` rule 6 says published work keeps the look it shipped
 * with when the version bumps; a library split across two versions, or an
 * asset that silently lost the field, is this function's reading of what
 * that rule requires it to catch, since a half-finished re-render is
 * invisible when images are looked at one at a time.
 *
 * Takes the manifest as an optional parameter, defaulting to the one the
 * site ships, so tests can exercise the throw paths against a hand-built
 * manifest instead of only the real, already-consistent one.
 */
export function manifestEngineVersion(
  entries: Record<string, Entry> = loadManifest(),
): string {
  const names = Object.keys(entries);
  if (names.length === 0) {
    throw new Error(
      'public/assets/dot/manifest.json is empty or absent. The library is not shipped with the site. Render it: python scripts/render_dot.py --all --role <role>, once per role.',
    );
  }
  const missing = names.filter((name) => !entries[name].engine_version);
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} of ${names.length} manifest entries have no engine_version, e.g. ${missing[0]}. ` +
        'Re-render to record it: python scripts/render_dot.py --all --role <role>',
    );
  }
  const seen = new Map<string, string[]>();
  for (const name of names) {
    const v = entries[name].engine_version!;
    seen.set(v, [...(seen.get(v) ?? []), name]);
  }
  if (seen.size > 1) {
    const split = [...seen.entries()]
      .map(([v, group]) => `  ${v}: ${group.length} asset(s), e.g. ${group[0]}`)
      .join('\n');
    throw new Error(
      `The dot library is split across engine versions:\n${split}\n` +
        'Re-render everything at the current version: python scripts/render_dot.py --all --role <role>',
    );
  }
  return [...seen.keys()][0];
}

/**
 * Resolve a subject and role to the WebP the site ships.
 *
 * Throws rather than returning a fallback. A hero that 404s still renders a
 * structurally correct page, so a silent miss reaches a visitor.
 */
export function dotAsset(
  subject: string,
  role: string,
  entries: Record<string, Entry> = loadManifest(),
): DotAsset {
  manifestEngineVersion(entries);
  const meta = SUBJECTS[subject];
  if (!meta) {
    throw new Error(
      `Unknown dot subject ${JSON.stringify(subject)}. Known: ${Object.keys(SUBJECTS).join(', ')}`,
    );
  }
  const key = `${subject}-${role}-dot.png`;
  const entry = entries[key];
  if (!entry) {
    throw new Error(`No manifest entry for ${key}. Render it first.`);
  }
  if (!entry.webp) {
    throw new Error(
      `Manifest entry ${key} has no derived webp. Run: python scripts/webp_derive.py --all`,
    );
  }
  return {
    src: `/assets/dot/${entry.webp}`,
    width: entry.w,
    height: entry.h,
    alt: `${meta.name}, rendered as a halftone field`,
  };
}
