import manifest from '../../public/assets/field/manifest.json';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** One entry of public/assets/field/manifest.json, written by scripts/render_field.mjs. */
interface Entry {
  w: number;
  h: number;
  webp?: string;
  gradient?: string;
  grain?: number;
  seed?: number;
  scale?: number;
  composite?: string;
  fx_sha?: string;
  png_sha?: string;
  webp_sha?: string;
}

export interface FieldAsset {
  /** The WebP, which is what ships. */
  src: string;
  /** The PNG, the render of record. Not referenced by the page today. */
  png: string;
  width: number;
  height: number;
}

/**
 * Resolve a field render to the file the band ships.
 *
 * Throws rather than returning a fallback, for the reason dot.ts gives: a
 * band that 404s still renders a structurally correct page, so a silent miss
 * reaches a visitor. Takes the manifest as an optional parameter so the throw
 * paths can be exercised against a hand-built one.
 */
export function fieldAsset(
  name: string,
  entries: Record<string, Entry> = manifest as Record<string, Entry>,
): FieldAsset {
  const key = `${name}.png`;
  const entry = entries[key];
  if (!entry) {
    const known = Object.keys(entries).map((k) => k.replace(/\.png$/, '')).join(', ');
    throw new Error(
      `No field render named ${key} in public/assets/field/manifest.json. Known: ${known}. Render with: node scripts/render_field.mjs`,
    );
  }
  if (!entry.webp) {
    throw new Error(`Field render ${key} has no derived webp. Render again: node scripts/render_field.mjs`);
  }
  // The manifest can name a file that is not there, if someone deleted a
  // render and left the manifest behind. A 404 reaches a visitor; a throw
  // here reaches the build.
  const onDisk = fileURLToPath(new URL(`../../public/assets/field/${entry.webp}`, import.meta.url));
  if (!existsSync(onDisk)) {
    throw new Error(`Field render ${entry.webp} is named in the manifest but is not on disk. Render again: node scripts/render_field.mjs`);
  }
  return {
    src: `/assets/field/${entry.webp}`,
    png: `/assets/field/${key}`,
    width: entry.w,
    height: entry.h,
  };
}
