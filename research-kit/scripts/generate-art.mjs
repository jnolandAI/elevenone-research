import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Generate the imagery a research piece references, once, and commit it.
 *
 *   node scripts/generate-art.mjs --manifest <path> --out <dir> --adapter <css> [flags]
 *
 *   --manifest  JSON: { "items": [ { id, role, subject, size?, alt } ] }
 *   --out       directory for <id>.png and <id>.json
 *   --adapter   the consuming site's contract-adapter.css, read for
 *               --ct-art-direction
 *   --prompts   print id and prompt only, for pasting into a chat UI
 *   --import <d> ingest <id>.png files from a staging directory instead of
 *               calling the API, writing the same provenance record
 *   --dry-run   compose and print every prompt, call nothing, spend nothing
 *   --force     regenerate even when the recorded prompt hash is unchanged
 *   --only <id> restrict to one item
 *   --model     default gpt-image-2
 *   --size      default 2560x1440
 *
 * Art direction is a contract token, not a constant in this script. The two
 * brands must not produce imagery that reads as the same model, so the style
 * half of every prompt comes from the site's own --ct-art-direction and only
 * the subject half comes from the manifest. A kit that hard-coded the style
 * would make both brands look alike, which is the failure the contract exists
 * to prevent.
 *
 * Nothing is fetched at render time. Generate once, commit the asset, and let
 * the recorded prompt hash make a rebuild free: an unchanged prompt is skipped,
 * so running this on every build costs nothing and changing a subject costs one
 * image.
 *
 * Provenance is recorded for our own tracking, not for disclosure. Generated
 * imagery carries no visible credit on the piece.
 *
 * Two ways to get an image, and the manifest does not care which was used.
 * The API path spends per image on the OpenAI platform. The import path costs
 * nothing beyond a ChatGPT subscription: run --prompts, generate each image in
 * the chat UI, save them as <id>.png into a staging directory, and run
 * --import. A ChatGPT subscription and the API platform are separately billed
 * and a subscription grants no API credit, so for anyone paying for the former
 * and not the latter, import is the cheaper route to the same committed asset.
 * The provenance record notes which path produced the file.
 */

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  if (!v || v.startsWith('--')) die(`${name} needs a value.`);
  return v;
};
const has = (name) => args.includes(name);
function die(msg, code = 2) {
  console.error(`generate-art.mjs: ${msg}`);
  process.exit(code);
}

const MANIFEST = flag('--manifest') ?? die('--manifest is required.');
const OUT = flag('--out') ?? die('--out is required.');
const ADAPTER = flag('--adapter') ?? die('--adapter is required.');
const MODEL = flag('--model', 'gpt-image-2');
const SIZE = flag('--size', '2560x1440');
const ONLY = flag('--only');
const IMPORT = flag('--import');
/* The model string that goes into the record AND into the prompt hash. These
   have to be the same value: artcheck recomputes the hash from record.model,
   so hashing with one name and recording another marks every imported image
   stale the moment it lands. */
const RECORD_MODEL = IMPORT ? flag('--model', 'chatgpt-ui') : MODEL;
const PROMPTS = has('--prompts');
const DRY = has('--dry-run');
const FORCE = has('--force');

for (const [label, p] of [['manifest', MANIFEST], ['adapter', ADAPTER]]) {
  if (!existsSync(p)) die(`no such ${label}: ${p}`);
}

/* ---- Art direction, from the contract ------------------------------------
   Matched on the token rather than on position, and the value is a CSS string
   literal so the quotes come off. A missing token is fatal: composing a prompt
   without the direction would silently produce imagery in no house style at
   all, which is worse than not generating. */
const adapterSrc = readFileSync(ADAPTER, 'utf8');
const dirMatch = adapterSrc.match(/--ct-art-direction:\s*"([^"]*)"\s*;/);
if (!dirMatch) {
  die(`${ADAPTER} declares no --ct-art-direction. The kit supplies no default: a prompt without the site's direction produces imagery in no house style.`);
}
const DIRECTION = dirMatch[1].replace(/\s+/g, ' ').trim();

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
  die('manifest carries no items.');
}

const ROLES = ['cover', 'opener', 'statement'];
const seen = new Set();
for (const item of manifest.items) {
  for (const field of ['id', 'role', 'subject', 'alt']) {
    if (!item[field]) die(`item ${item.id ?? '<no id>'} is missing "${field}".`);
  }
  if (!ROLES.includes(item.role)) {
    die(`item ${item.id}: role "${item.role}" is not one of ${ROLES.join(', ')}.`);
  }
  if (seen.has(item.id)) die(`duplicate id "${item.id}".`);
  seen.add(item.id);
}

/* The subject leads and the direction follows. Image models weight the opening
   of a prompt most heavily, and the subject is the part that differs per
   image; leading with a house style shared by every prompt in the piece pulls
   the whole set toward one picture. */
const compose = (subject) => `${subject.trim().replace(/\.$/, '')}. ${DIRECTION}`;
const hashOf = (prompt, model, size) =>
  createHash('sha256').update(`${model}|${size}|${prompt}`).digest('hex').slice(0, 16);

if (PROMPTS) {
  for (const item of manifest.items) {
    if (ONLY && item.id !== ONLY) continue;
    console.log(`${item.id}  [${item.role}, ${item.size ?? SIZE}]`);
    console.log(compose(item.subject));
    console.log('');
  }
  process.exit(0);
}

/* One writer for both paths. An imported file and a generated one must carry
   the same provenance shape, or artcheck's staleness comparison would only
   work for images that came down one of the two routes. */
function record(item, size, prompt, promptHash, bytes, source) {
  return (
    JSON.stringify(
      {
        id: item.id,
        role: item.role,
        model: RECORD_MODEL,
        size,
        prompt,
        promptHash,
        subject: item.subject,
        direction: DIRECTION,
        alt: item.alt,
        bytes: bytes.length,
        source,
        generated: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n'
  );
}

mkdirSync(OUT, { recursive: true });

const targets = ONLY ? manifest.items.filter((i) => i.id === ONLY) : manifest.items;
if (ONLY && targets.length === 0) die(`--only ${ONLY} matches no item.`);

let generated = 0;
let skipped = 0;

for (const item of targets) {
  const size = item.size ?? SIZE;
  const prompt = compose(item.subject);
  const promptHash = hashOf(prompt, RECORD_MODEL, size);
  const png = join(OUT, `${item.id}.png`);
  const rec = join(OUT, `${item.id}.json`);

  const current =
    existsSync(rec) && existsSync(png)
      ? JSON.parse(readFileSync(rec, 'utf8'))
      : null;

  if (!FORCE && current?.promptHash === promptHash) {
    console.log(`skip      ${item.id}  (prompt unchanged)`);
    skipped++;
    continue;
  }

  if (DRY) {
    const why = current ? 'prompt changed' : 'no recorded image';
    console.log(`would generate  ${item.id}  [${item.role}, ${size}, ${why}]`);
    console.log(`  ${prompt}`);
    generated++;
    continue;
  }

  if (IMPORT) {
    const staged = join(IMPORT, `${item.id}.png`);
    if (!existsSync(staged)) {
      const near = ['jpg', 'jpeg', 'webp'].find((e) => existsSync(join(IMPORT, `${item.id}.${e}`)));
      if (near) {
        die(`${item.id}: found ${item.id}.${near} but the pages reference .png. Convert it and retry.`);
      }
      console.log(`missing   ${item.id}  (nothing at ${staged})`);
      continue;
    }
    const bytes = readFileSync(staged);
    writeFileSync(png, bytes);
    writeFileSync(rec, record(item, size, prompt, promptHash, bytes, 'imported'));
    console.log(`imported  ${item.id}  from ${staged} (${Math.round(bytes.length / 1024)}KB)`);
    generated++;
    continue;
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) die('OPENAI_API_KEY is not set. Use --prompts and --import, or --dry-run.');

  console.log(`generating  ${item.id}  [${item.role}, ${size}]`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, prompt, size, n: 1 }),
  });

  if (!res.ok) {
    const body = await res.text();
    die(`${item.id}: ${res.status} ${res.statusText}\n${body.slice(0, 600)}`, 1);
  }

  const json = await res.json();
  const datum = json.data?.[0];
  let bytes;
  if (datum?.b64_json) {
    bytes = Buffer.from(datum.b64_json, 'base64');
  } else if (datum?.url) {
    // Some models return a URL rather than inline base64. Fetch it here, not
    // at render time: the point of this script is that the asset is committed.
    const img = await fetch(datum.url);
    if (!img.ok) die(`${item.id}: could not fetch returned url (${img.status})`, 1);
    bytes = Buffer.from(await img.arrayBuffer());
  } else {
    die(`${item.id}: response carried neither b64_json nor url.`, 1);
  }

  writeFileSync(png, bytes);
  writeFileSync(rec, record(item, size, prompt, promptHash, bytes, 'api'));
  console.log(`  wrote ${png} (${Math.round(bytes.length / 1024)}KB) and ${rec}`);
  generated++;
}

const verb = DRY ? 'would generate' : 'generated';
console.log(`\n${verb} ${generated}, skipped ${skipped} of ${targets.length}`);
if (DRY) console.log('dry run: nothing was called and nothing was spent.');
