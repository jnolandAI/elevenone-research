import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Generate the imagery a research piece references, once, and commit it.
 *
 *   node scripts/generate-art.mjs --manifest <path> --out <dir> --adapter <css> [flags]
 *
 *   --manifest   JSON: { format?, quality?, items: [ { id, role, subject, size?, alt } ] }
 *   --out        directory for the committed web assets and their records
 *   --adapter    the consuming site's contract-adapter.css, read for
 *                --ct-art-direction
 *   --originals  archival masters, default <manifest dir>/original
 *   --prompts    print id and prompt only, for pasting into a chat UI
 *   --import <d> ingest <id>.png from a staging directory instead of calling
 *                the API, writing the same provenance record
 *   --dry-run    compose and print every prompt, call nothing, spend nothing
 *   --force      redo even when the recorded prompt hash is unchanged
 *   --only <id>  restrict to one item
 *   --model      default gpt-image-2
 *   --size       default 2560x1440
 *
 * Art direction is a contract token, not a constant in this script. The two
 * brands must not produce imagery that reads as the same model, so the style
 * half of every prompt comes from the site's own --ct-art-direction and only
 * the subject half comes from the manifest. A kit that hard-coded the style
 * would make both brands look alike, which is the failure the contract exists
 * to prevent.
 *
 * THREE STAGES, AND ONLY THE FIRST COSTS ANYTHING.
 *
 *   1. The API returns a PNG. It is written to --originals as the archival
 *      master and never committed: the three images for the first piece came
 *      back at 5.7, 4.2 and 3.2MB, and 13MB of PNG has no business in a
 *      repository or on a page.
 *   2. The master is encoded to the manifest's format, default JPEG at quality
 *      82, and THAT is the committed web asset. A photograph is not a PNG.
 *   3. The provenance record is written beside it.
 *
 * Because the master is kept, changing the format or the quality re-encodes
 * from disk and calls nothing. Only a changed prompt costs an image. That is
 * the difference between a pipeline you can tune and one you pay to tune.
 *
 * Provenance is recorded for our own tracking, not for disclosure. Generated
 * imagery carries no visible credit on the piece.
 *
 * Two ways to get a master, and the manifest does not care which was used.
 * The API path spends per image on the OpenAI platform. The import path costs
 * nothing beyond a ChatGPT subscription: run --prompts, generate each image in
 * the chat UI, save them as <id>.png into a staging directory, and run
 * --import. A ChatGPT subscription and the API platform are separately billed
 * and a subscription grants no API credit, so for anyone paying for the former
 * and not the latter, import is the cheaper route to the same asset. The
 * record notes which path produced the file.
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
const PROMPTS = has('--prompts');
const DRY = has('--dry-run');
const FORCE = has('--force');
/* The model string that goes into the record AND into the prompt hash. These
   have to be the same value: artcheck recomputes the hash from record.model,
   so hashing with one name and recording another marks every imported image
   stale the moment it lands. */
const RECORD_MODEL = IMPORT ? flag('--model', 'chatgpt-ui') : MODEL;

for (const [label, p] of [['manifest', MANIFEST], ['adapter', ADAPTER]]) {
  if (!existsSync(p)) die(`no such ${label}: ${p}`);
}
const ORIGINALS = flag('--originals', join(dirname(MANIFEST), 'original'));

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
const FORMAT = manifest.format ?? 'jpg';
const QUALITY = manifest.quality ?? 82;
if (!['jpg', 'png', 'webp'].includes(FORMAT)) {
  die(`format "${FORMAT}" is not one of jpg, png, webp.`);
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

/* sharp is an optional peer: it ships with astro, so a consuming site almost
   always has it, but the kit does not depend on it directly and says so if it
   is missing rather than writing an unencoded master into public/. */
let sharp = null;
if (!DRY) {
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    die('sharp is not resolvable, and the web asset has to be encoded from the master. Install sharp, or set "format": "png" in the manifest to commit the master unchanged.');
  }
}

async function encode(master) {
  const img = sharp(master);
  if (FORMAT === 'jpg') return img.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
  if (FORMAT === 'webp') return img.webp({ quality: QUALITY }).toBuffer();
  return img.png().toBuffer();
}

/* One writer for every path. A master that arrived by API and one that arrived
   by import must carry the same provenance shape, or artcheck's staleness
   comparison would only work for images that came down one of the routes. */
function record(item, size, prompt, promptHash, recordModel, sourceBytes, outBytes, source) {
  return (
    JSON.stringify(
      {
        id: item.id,
        role: item.role,
        model: recordModel,
        size,
        format: FORMAT,
        quality: FORMAT === 'png' ? null : QUALITY,
        prompt,
        promptHash,
        subject: item.subject,
        direction: DIRECTION,
        alt: item.alt,
        sourceBytes,
        bytes: outBytes,
        source,
        generated: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n'
  );
}

mkdirSync(OUT, { recursive: true });
mkdirSync(ORIGINALS, { recursive: true });

const targets = ONLY ? manifest.items.filter((i) => i.id === ONLY) : manifest.items;
if (ONLY && targets.length === 0) die(`--only ${ONLY} matches no item.`);

let called = 0;
let reencoded = 0;
let skipped = 0;

for (const item of targets) {
  const size = item.size ?? SIZE;
  const prompt = compose(item.subject);
  let recordModel = RECORD_MODEL;
  let promptHash = hashOf(prompt, recordModel, size);
  const asset = join(OUT, `${item.id}.${FORMAT}`);
  const rec = join(OUT, `${item.id}.json`);
  const master = join(ORIGINALS, `${item.id}.png`);

  const current =
    existsSync(rec) && existsSync(asset) ? JSON.parse(readFileSync(rec, 'utf8')) : null;

  const currentMatches =
    current?.prompt === prompt &&
    current?.format === FORMAT &&
    (FORMAT === 'png' || current?.quality === QUALITY);

  if (!FORCE && currentMatches) {
    console.log(`skip       ${item.id}  (prompt, format and quality unchanged)`);
    skipped++;
    continue;
  }

  if (DRY) {
    const why = !current
      ? 'no committed asset'
      : current.promptHash !== promptHash
        ? 'prompt changed'
        : 'format or quality changed';
    console.log(`would produce  ${item.id}  [${item.role}, ${size}, ${why}]`);
    console.log(`  ${prompt}`);
    called++;
    continue;
  }

  /* Stage 1: obtain the master, from disk if we already paid for it. */
  let masterBytes = null;
  let source = null;

  if (IMPORT) {
    const staged = join(IMPORT, `${item.id}.png`);
    if (!existsSync(staged)) {
      const near = ['jpg', 'jpeg', 'webp'].find((e) => existsSync(join(IMPORT, `${item.id}.${e}`)));
      if (near) die(`${item.id}: found ${item.id}.${near} but the importer takes .png masters. Convert it and retry.`);
      console.log(`missing    ${item.id}  (nothing at ${staged})`);
      continue;
    }
    masterBytes = readFileSync(staged);
    writeFileSync(master, masterBytes);
    source = 'imported';
    console.log(`imported   ${item.id}  from ${staged} (${Math.round(masterBytes.length / 1024)}KB master)`);
  } else if (existsSync(master) && !FORCE) {
    /* The prompt may have moved or only the encoding may have, and the master
       on disk answers the first question. Re-encoding costs nothing, so a
       master whose prompt still matches is never bought twice. */
    const masterRecord = existsSync(rec) ? JSON.parse(readFileSync(rec, 'utf8')) : current;
    /* Compare the prompt, not the hash. The hash folds in the model name, so a
       master imported from the chat UI would not match on a later API-mode run
       and the same picture would be bought a second time to no purpose. What
       decides whether a master is still the right master is the prompt; the
       model is provenance and travels with the record.

       A master with no record is trusted, because the only way one gets into
       the originals directory is this script putting it there from this
       manifest. Buying the picture again to recover a JSON file someone
       deleted would be paying to restore bookkeeping. --force overrides. */
    const masterPromptMatches = !masterRecord || masterRecord.prompt === prompt;
    if (masterPromptMatches) {
      masterBytes = readFileSync(master);
      source = masterRecord?.source ?? 'api';
      recordModel = masterRecord?.model ?? RECORD_MODEL;
      console.log(`re-encode  ${item.id}  (master on disk, no API call)`);
      reencoded++;
    }
  }

  if (masterBytes === null) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) die('OPENAI_API_KEY is not set. Use --prompts and --import, or --dry-run.');

    console.log(`generating ${item.id}  [${item.role}, ${size}]`);
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
    if (datum?.b64_json) {
      masterBytes = Buffer.from(datum.b64_json, 'base64');
    } else if (datum?.url) {
      const img = await fetch(datum.url);
      if (!img.ok) die(`${item.id}: could not fetch returned url (${img.status})`, 1);
      masterBytes = Buffer.from(await img.arrayBuffer());
    } else {
      die(`${item.id}: response carried neither b64_json nor url.`, 1);
    }
    writeFileSync(master, masterBytes);
    source = 'api';
    called++;
  }

  /* Stage 2 and 3: encode the web asset and record what produced it. */
  const outBytes = await encode(masterBytes);
  promptHash = hashOf(prompt, recordModel, size);
  writeFileSync(asset, outBytes);
  writeFileSync(
    rec,
    record(item, size, prompt, promptHash, recordModel, masterBytes.length, outBytes.length, source),
  );
  const pct = Math.round((1 - outBytes.length / masterBytes.length) * 100);
  console.log(
    `  ${asset}  ${Math.round(outBytes.length / 1024)}KB from a ${Math.round(masterBytes.length / 1024)}KB master, ${pct}% smaller`,
  );
}

if (DRY) {
  console.log(`\nwould produce ${called}, skipped ${skipped} of ${targets.length}`);
  console.log('dry run: nothing was called and nothing was spent.');
} else {
  console.log(`\n${called} API call(s), ${reencoded} re-encoded from disk, ${skipped} skipped, of ${targets.length}`);
}
