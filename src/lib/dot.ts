import manifest from '../../public/assets/dot/manifest.json';

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

export interface DotAsset { src: string; width: number; height: number; alt: string }

/**
 * The single engine version the whole library was rendered at.
 *
 * Throws when assets disagree. `docs/dot-imagery.md` rule 6 permits a version
 * bump but not a library split across two of them, and a half-finished
 * re-render is invisible when images are looked at one at a time.
 */
export function manifestEngineVersion(): string {
  const seen = new Map<string, string[]>();
  for (const [name, entry] of Object.entries(manifest as Record<string, Entry>)) {
    const v = entry.engine_version ?? 'missing';
    seen.set(v, [...(seen.get(v) ?? []), name]);
  }
  if (seen.size === 0) {
    throw new Error('public/assets/dot/manifest.json is empty. Run: python scripts/render_dot.py --all --role hero');
  }
  if (seen.size > 1) {
    const split = [...seen.entries()]
      .map(([v, names]) => `  ${v}: ${names.length} asset(s), e.g. ${names[0]}`)
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
export function dotAsset(subject: string, role: string): DotAsset {
  manifestEngineVersion();
  const meta = SUBJECTS[subject];
  if (!meta) {
    throw new Error(
      `Unknown dot subject ${JSON.stringify(subject)}. Known: ${Object.keys(SUBJECTS).join(', ')}`,
    );
  }
  const key = `${subject}-${role}-dot.png`;
  const entry = (manifest as Record<string, Entry>)[key];
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
