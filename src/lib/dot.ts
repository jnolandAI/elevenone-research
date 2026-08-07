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

interface Entry { w: number; h: number; role: string; subject: string; webp?: string }

export interface DotAsset { src: string; width: number; height: number; alt: string }

/**
 * Resolve a subject and role to the WebP the site ships.
 *
 * Throws rather than returning a fallback. A hero that 404s still renders a
 * structurally correct page, so a silent miss reaches a visitor.
 */
export function dotAsset(subject: string, role: string): DotAsset {
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
