#!/usr/bin/env node
/**
 * portability.mjs: the rendered half of the portability gate.
 *
 * A deck kit is meant to render under either of two design systems by naming
 * every value through a shared token contract (--ct-*). This script proves
 * that at the pixel, not at the grep: given a base stylesheet (tokens.css)
 * and an adapter (contract-adapter.css), it swaps the same two imports
 * src/layouts/Deck.astro already carries, builds the site, serves the build,
 * loads each of a set of pages in a real browser, and reports every element
 * inside that page's content root whose computed fill, stroke, color,
 * background-color, or any of the four border-*-color longhands is a
 * fallback rather than a resolved token value.
 *
 * A property can go undetected if it is only ever set through a shorthand
 * (`background: var(--x)`, `border-top: 1px solid var(--x)`): Chromium
 * returns the empty string for the longhand in that case, so the check also
 * reads the shorthand's own declaration text whenever the longhand comes up
 * empty.
 *
 * It exits non-zero if any fallback site is found, and non-zero if any page
 * yields zero elements to check: a page with nothing to check is a refusal,
 * not a pass.
 *
 *   node portability.mjs <tokens.css> <contract-adapter.css> [--repo <path>] [--page /path ...]
 *
 * With no --page, it iterates the deck pages this branch already treats as
 * the rendered surface: /project-argo and /commercial-diligence (both
 * `.slide`), and /memo, a document layout whose content root is `#main`
 * rather than `.slide`. --page may be repeated to override the set; each
 * value may name its own selector as `/path:selector` (default `.slide`).
 *
 * THE RULE THIS SCRIPT EXISTS TO ENFORCE ON ITS OWN USE:
 *
 *   Run this against Noland's own tokens.css and contract-adapter.css FIRST,
 *   and it must report zero, before it is ever run against another system's
 *   files. A gate that has never returned clean on a system known to be
 *   correct is not a gate, it is a number. If a run against Noland's own
 *   files reports anything, the DETECTOR is wrong, not the kit: fix the
 *   detector before trusting any count this script prints for anyone else's
 *   tokens.
 *
 *   Noland's own files, to run first:
 *     node scripts/portability.mjs src/styles/tokens.css src/styles/contract-adapter.css
 *
 * How a fallback is told apart from a legitimate value: an undefined var()
 * makes the declaration invalid, and the property falls back to its initial
 * or inherited value (black, for SVG fill). A legitimate ink fill is also
 * black under some adapters, so black is never banned outright. Instead, for
 * every element and every one of the four properties, the script finds the
 * CSS rule that declares that property on that element, reads the custom
 * property name the rule's value names (its var(--x)), and asks the browser
 * what that custom property actually resolves to at that element via
 * getComputedStyle(el).getPropertyValue(name). Only a site where that
 * resolves to the empty string is reported: that is "black because nothing
 * resolved," not "black on purpose."
 *
 * This script never edits tokens.css, contract-adapter.css, or any
 * component. It edits only its own working copy of Deck.astro's two import
 * lines, for the duration of one run, and always restores the original file
 * afterward (even on failure). Running it against a system other than
 * Noland's own should still be done on a scratch checkout, so a crash mid-run
 * cannot leave the working tree changed: this script's own restore is a
 * safety net, not a substitute for that discipline.
 *
 * `color` on an SVG element is a special case: SVG never paints with `color`
 * directly, only through the `currentColor` keyword on `fill` or `stroke`,
 * so a `color` whose var() resolves empty is reported only when that same
 * element's own `fill` is `currentColor`, or its own `stroke` is
 * `currentColor`, or `fill` or `stroke` is itself unresolved (fails toward
 * reporting when it cannot tell). `color` on an HTML element is left alone:
 * there, it does paint.
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// --repo and its value are lifted out before the positional destructure
// further down, which reads argv[0] and argv[1] as the two stylesheets. A
// flag left in the array would be read as a file path and fail on a
// confusing error. This has to run before DECK/ASTRO_BIN below, which need
// REPO already resolved.
const allArgs = process.argv.slice(2);
const repoIdx = allArgs.indexOf('--repo');
const REPO = resolve(repoIdx === -1 ? process.cwd() : allArgs[repoIdx + 1] ?? process.cwd());
const rawArgs = repoIdx === -1 ? allArgs : [...allArgs.slice(0, repoIdx), ...allArgs.slice(repoIdx + 2)];

// The site under test, not the directory this script happens to sit in. The
// kit measures a consuming site; assuming its own parent was only ever right
// while the gate and the site were the same repository.
const DECK = resolve(REPO, 'src/layouts/Deck.astro');
const ASTRO_BIN = resolve(REPO, 'node_modules/astro/astro.js');
const PROPS = [
  'fill', 'stroke', 'color', 'background-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
];
// A longhand set only through a shorthand containing var() resolves empty on
// its own in Chromium's CSSOM (the engine cannot decompose an unresolved
// var() into per-side or per-channel longhands at parse time), so each
// longhand also falls back to reading these shorthand properties' own text.
const SHORTHAND_FALLBACK = {
  'background-color': ['background'],
  'border-top-color': ['border-top', 'border'],
  'border-right-color': ['border-right', 'border'],
  'border-bottom-color': ['border-bottom', 'border'],
  'border-left-color': ['border-left', 'border'],
};
const DEFAULT_PAGES = [
  { page: '/project-argo', selector: '.slide' },
  { page: '/commercial-diligence', selector: '.slide' },
  { page: '/memo', selector: '#main' },
];

function usageAndExit(code) {
  const text = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const banner = text.slice(text.indexOf('/**'), text.indexOf('*/') + 2);
  console.log(banner);
  process.exit(code);
}

if (rawArgs.includes('--help') || rawArgs.includes('-h')) usageAndExit(0);
if (rawArgs.length < 2) {
  console.error('portability.mjs: needs a tokens.css path and a contract-adapter.css path.\n');
  usageAndExit(2);
}

const [tokensArg, adapterArg, ...rest] = rawArgs;
const pageArgs = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--page') {
    const val = rest[++i];
    if (!val) {
      console.error('portability.mjs: --page needs a value.');
      process.exit(2);
    }
    // "/path:selector" names its own content-root selector; bare "/path"
    // defaults to ".slide", the selector every Deck.astro page uses.
    const colonIdx = val.indexOf(':');
    if (colonIdx > 0 && val.slice(0, colonIdx).startsWith('/')) {
      pageArgs.push({ page: val.slice(0, colonIdx), selector: val.slice(colonIdx + 1) });
    } else {
      pageArgs.push({ page: val, selector: '.slide' });
    }
  }
}
const PAGES = pageArgs.length > 0 ? pageArgs : DEFAULT_PAGES;

const tokensPath = resolve(process.cwd(), tokensArg);
const adapterPath = resolve(process.cwd(), adapterArg);
for (const [label, p] of [['tokens stylesheet', tokensPath], ['contract adapter', adapterPath]]) {
  if (!existsSync(p)) {
    console.error(`portability.mjs: no such ${label}: ${p}`);
    process.exit(2);
  }
}

const toImportSpecifier = (fromDir, target) => {
  let rel = relative(fromDir, target).split(sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
};

const layoutDir = dirname(DECK);
const original = readFileSync(DECK, 'utf8');
const TOKENS_IMPORT_RE = /^import ['"]\.\.\/styles\/tokens\.css['"];$/m;
const ADAPTER_IMPORT_RE = /^import ['"]\.\.\/styles\/contract-adapter\.css['"];$/m;

if (!TOKENS_IMPORT_RE.test(original)) {
  console.error(`portability.mjs: ${DECK} does not import '../styles/tokens.css' the way this script expects to swap. Refusing to guess.`);
  process.exit(2);
}
if (!ADAPTER_IMPORT_RE.test(original)) {
  console.error(`portability.mjs: ${DECK} does not import '../styles/contract-adapter.css' the way this script expects to swap. Refusing to guess.`);
  process.exit(2);
}

const swapped = original
  .replace(TOKENS_IMPORT_RE, `import '${toImportSpecifier(layoutDir, tokensPath)}';`)
  .replace(ADAPTER_IMPORT_RE, `import '${toImportSpecifier(layoutDir, adapterPath)}';`);

console.log(`portability.mjs: base   = ${tokensPath}`);
console.log(`portability.mjs: adapter = ${adapterPath}`);
console.log(`portability.mjs: pages  = ${PAGES.map((p) => `${p.page} (${p.selector})`).join(', ')}`);

let restored = false;
function restoreDeck() {
  if (restored) return;
  writeFileSync(DECK, original);
  restored = true;
}
process.on('exit', restoreDeck);
process.on('SIGINT', () => { restoreDeck(); process.exit(130); });

function runBuild() {
  console.log('portability.mjs: building...');
  const res = spawnSync(process.execPath, [ASTRO_BIN, 'build'], { cwd: REPO, stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`astro build failed (exit ${res.status})`);
  }
}

function startPreview() {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [ASTRO_BIN, 'preview', '--port', '0'], { cwd: REPO });
    let buf = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      rejectPromise(new Error('astro preview did not report a port within 15s'));
    }, 15000);
    const onData = (d) => {
      // Astro colours "Local" and the URL separately, so an ANSI escape sits
      // between them even though the terminal renders them as adjacent text.
      buf += d.toString().replace(/\x1b\[[0-9;]*m/g, '');
      const m = buf.match(/Local\s+https?:\/\/localhost:(\d+)\//);
      if (m && !settled) {
        settled = true;
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolvePromise({ child, port: Number(m[1]) });
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        rejectPromise(new Error(`astro preview exited early (code ${code})`));
      }
    });
  });
}

// Evaluated inside the page. For every element inside .slide and each of the
// four paint properties, finds the CSS rule that declares that property for
// that element (last document-order match wins, which is the cascade this
// kit's flat, single-bundled scoped stylesheet actually produces: there is
// no !important and no cross-component override in this codebase to make a
// fuller cascade simulation worth the complexity), extracts the custom
// property it names via var(), and reports a site only where that custom
// property resolves to the empty string at that element.
function inBrowserCheck(selector, props, shorthandFallback) {
  const collectPropertyRules = (prop) => {
    const out = [];
    const shorthands = shorthandFallback[prop] || [];
    // Chromium's CSSStyleRule carries its own `.cssRules` (CSS Nesting), an
    // empty-but-truthy CSSRuleList when the rule has no nested children. A
    // plain truthiness check on rule.cssRules therefore misfiles every leaf
    // style rule as a grouping rule (@media, @layer) and skips its own
    // declarations, so nested rules are walked by length, not by presence,
    // and a rule's own style is always checked regardless.
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.style && rule.selectorText) {
          let raw = rule.style.getPropertyValue(prop);
          // A shorthand containing var() (`background: var(--x)`,
          // `border-top: 1px solid var(--x)`) resolves the longhand to the
          // empty string in Chromium's CSSOM, so a longhand miss falls back
          // to the shorthand's own declaration text before giving up.
          if (!raw || !raw.includes('var(')) {
            for (const sh of shorthands) {
              const shRaw = rule.style.getPropertyValue(sh);
              if (shRaw && shRaw.includes('var(')) { raw = shRaw; break; }
            }
          }
          // A bare `currentColor` (no var()) never needs resolving on its
          // own, but the SVG `color` check below needs to find a `fill:
          // currentColor` or `stroke: currentColor` CSS rule the same way it
          // finds a var()-bearing one, so both are collected here.
          if (raw && (raw.includes('var(') || raw.trim().toLowerCase() === 'currentcolor')) {
            out.push({ selectorText: rule.selectorText, raw });
          }
        }
        if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      if (rules) walk(rules);
    }
    return out;
  };

  const rulesByProp = {};
  for (const prop of props) rulesByProp[prop] = collectPropertyRules(prop);

  const varNameOf = (raw) => {
    const m = raw.match(/var\(\s*(--[A-Za-z0-9_-]+)\s*(,|\))/);
    if (!m) return null;
    // A var() with a literal fallback (var(--x, black)) is not a broken
    // reference even if --x is undefined: the browser uses the fallback
    // text, not the initial value, so it is out of scope for this check.
    if (m[2] === ',') return null;
    return m[1];
  };

  // Resolves the declared value (and the origin that produced it) for one
  // element and one property, using the same precedence the main loop below
  // applies: inline style (or its shorthand), then the last matching CSS
  // rule (falling back to that rule's own shorthand text), then an SVG
  // presentation attribute. Shared with the SVG `color` check below, which
  // needs this same lookup for `fill` and `stroke` on the very element being
  // checked, not just for the property the main loop is currently on.
  const resolveDeclared = (el, prop) => {
    let raw = el.style ? el.style.getPropertyValue(prop) : '';
    let matchedSelector = '(inline style)';
    if ((!raw || !raw.includes('var(')) && el.style) {
      for (const sh of (shorthandFallback[prop] || [])) {
        const shRaw = el.style.getPropertyValue(sh);
        if (shRaw && shRaw.includes('var(')) { raw = shRaw; matchedSelector = '(inline style shorthand)'; break; }
      }
    }
    if (!raw || !raw.includes('var(')) {
      const candidates = (rulesByProp[prop] || []).filter((r) => {
        try { return el.matches(r.selectorText); } catch { return false; }
      });
      if (candidates.length > 0) {
        const last = candidates[candidates.length - 1];
        raw = last.raw;
        matchedSelector = last.selectorText;
      } else {
        raw = '';
      }
    }
    if ((!raw || !raw.includes('var(')) && el.getAttribute) {
      const attr = el.getAttribute(prop);
      if (attr) { raw = attr; matchedSelector = '(presentation attribute)'; }
    }
    return { raw, matchedSelector };
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // For SVG, `color` paints nothing on its own: it only reaches the canvas
  // when something on the same element reads it back through the
  // `currentColor` keyword, which in this kit is always `fill` or `stroke`
  // (Bars.astro's `.note` sets `color` purely as inherited HTML furniture
  // that never gets referenced; Glyph.astro's `stroke="currentColor"` is the
  // case that does). Fails toward reporting, not away from it: if `fill` or
  // `stroke` is itself an unresolved var(), we cannot prove it isn't
  // currentColor by inheritance, so this does not suppress on that element.
  // This checks the element's own declaration only, the same one-element
  // scope every other check in this script uses; it does not walk ancestors
  // for an inherited fill/stroke, because nothing in this kit's flat,
  // per-element style declarations relies on that (see the file banner).
  const svgColorPaints = (el) => {
    for (const paintProp of ['fill', 'stroke']) {
      const { raw } = resolveDeclared(el, paintProp);
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (trimmed.toLowerCase() === 'currentcolor') return true;
      if (trimmed.includes('var(')) {
        const paintVarName = varNameOf(trimmed);
        if (paintVarName && getComputedStyle(el).getPropertyValue(paintVarName).trim() === '') {
          return true;
        }
      }
    }
    return false;
  };

  const findings = [];
  const slides = [...document.querySelectorAll(selector)];
  if (slides.length === 0) {
    // Following scripts/paint-capture.mjs's precedent: a page with nothing
    // matching the selector reports zero findings for the same reason an
    // empty capture reports zero diffs, which is indistinguishable from a
    // real, clean pass. Refuse it instead of returning a silent 0.
    throw new Error(`0 elements matched selector "${selector}" on this page. Refusing an empty check.`);
  }
  slides.forEach((slide, i) => {
    const slideId = 's' + String(i + 1).padStart(2, '0');
    const els = [slide, ...slide.querySelectorAll('*')];
    els.forEach((el) => {
      for (const prop of props) {
        // Inline style wins over any stylesheet rule, which in turn wins over
        // an SVG presentation attribute (fill="...", stroke="..."): the exact
        // form this kit uses for a per-element computed tone, e.g. Bridge's
        // `fill={fill(b)}` rendering as <rect fill="var(--color-grey-80)">.
        // A presentation attribute never appears in el.style or in
        // document.styleSheets, so a check that stops at those two misses it
        // entirely, silently, on every element that sets colour this way.
        const { raw, matchedSelector } = resolveDeclared(el, prop);
        if (!raw || !raw.includes('var(')) continue;
        const varName = varNameOf(raw);
        if (!varName) continue;
        const resolved = getComputedStyle(el).getPropertyValue(varName).trim();
        if (resolved === '') {
          // `color` never paints an SVG element unless `fill` or `stroke`
          // reads it back via `currentColor`; HTML elements are unaffected.
          if (prop === 'color' && el.namespaceURI === SVG_NS && !svgColorPaints(el)) continue;
          const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '';
          findings.push({
            slide: slideId,
            tag: el.tagName.toLowerCase() + cls,
            selector: matchedSelector,
            property: prop,
            varName,
            declared: raw,
          });
        }
      }
    });
  });
  return findings;
}

// child.kill() alone does not guarantee the preview server is actually gone
// before this script exits: the default signal is delivered but nothing
// here ever confirmed the process left. Escalate to a hard kill if the
// child has not reported its own exit within a short window, so teardown
// cannot hang the caller.
async function stopPreview(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = () => new Promise((res) => {
    const timer = setTimeout(() => res(false), 3000);
    child.once('exit', () => { clearTimeout(timer); res(true); });
  });
  try { child.kill(); } catch { /* already gone */ }
  if (await exited()) return;
  try { child.kill('SIGKILL'); } catch { /* already gone */ }
  await exited();
}

(async () => {
  let browser;
  let child;
  let port;
  try {
    writeFileSync(DECK, swapped);
    runBuild();
    ({ child, port } = await startPreview());
  } catch (err) {
    console.error(`portability.mjs: ${err.message}`);
    process.exitCode = 1;
    restoreDeck();
    return;
  }

  try {
    const baseUrl = `http://localhost:${port}/`;
    // Inline the check function's source so page.evaluate can call it
    // without Playwright's serialization stripping the nested closures.
    const inBrowserCheckSource = inBrowserCheck.toString();
    browser = await chromium.launch();
    const allFindings = [];

    for (const { page: pagePath, selector } of PAGES) {
      console.log(`portability.mjs: serving ${baseUrl}, loading ${pagePath} (selector "${selector}")...`);
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
      const p = await ctx.newPage();
      await p.goto(new URL(pagePath, baseUrl).toString(), { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      const findings = await p.evaluate(
        ({ src, selector, props, shorthandFallback }) => {
          const fn = new Function(`return (${src})`)();
          return fn(selector, props, shorthandFallback);
        },
        { src: inBrowserCheckSource, selector, props: PROPS, shorthandFallback: SHORTHAND_FALLBACK },
      );
      await ctx.close();
      for (const f of findings) allFindings.push({ ...f, page: pagePath });
    }

    if (allFindings.length === 0) {
      console.log(`portability.mjs: 0 fallback sites found across ${PAGES.length} page(s).`);
    } else {
      console.log(`portability.mjs: ${allFindings.length} fallback site(s) found:\n`);
      for (const f of allFindings) {
        console.log(
          `  ${f.page}  ${f.slide}  ${f.tag}  ${f.property}: ${f.declared.trim()}  (matched "${f.selector}", --${f.varName.replace(/^--/, '')} resolves empty)`,
        );
      }
    }
    process.exitCode = allFindings.length === 0 ? 0 : 1;
  } catch (err) {
    console.error(`portability.mjs: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (child) await stopPreview(child);
    restoreDeck();
  }
})();
