import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const value = (name: string) => {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  return m ? m[1]!.trim() : null;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// tokens.css only covers the token layer. base.css's own rules (the ground
// gradient, in particular, which is where the WCAG failure elsewhere in this
// fix wave actually lived) and every component's scoped <style> block are
// just as much in scope for "greyscale absolutely" and were previously
// unchecked by any automated test.
const otherSources: Record<string, string> = { 'base.css': readFileSync('src/styles/base.css', 'utf8') };
// Full file text, keyed the same way as otherSources, minus base.css (no
// markup to walk). Only the contrast sweep below needs this: it has to know
// what a rule's markup sits inside, not just what the rule says.
const rawSources: Record<string, string> = {};
for (const file of walk('src/components').concat(walk('src/layouts'), walk('src/pages'))) {
  if (file.endsWith('.astro')) {
    const src = readFileSync(file, 'utf8');
    // <style> blocks only: component markup can legitimately carry a
    // non-neutral value inside inline SVG paths that were computed
    // elsewhere and aren't a design-system colour choice at all.
    const blocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!);
    if (blocks.length) {
      otherSources[file] = blocks.join('\n');
      rawSources[file] = src;
    }
  }
}

describe('design tokens', () => {
  it('carries the twelve interface greys at their exact literals', () => {
    const greys: Record<string, string> = {
      w: '#FFFFFF', g05: '#FAFAF9', g10: '#F4F4F3', g20: '#EBEBEA',
      g30: '#DEDEDD', g40: '#C9C9C7', g50: '#AEAEAC', g60: '#8C8C8A',
      g70: '#6C6C6A', g80: '#4A4A48', g90: '#2B2B2A', ink: '#131312',
    };
    for (const [name, hex] of Object.entries(greys)) {
      expect(value(name), `--${name}`).toBe(hex);
    }
  });

  it('carries the two brief widths and no third', () => {
    expect(value('read')).toBe('624px');
    expect(value('doc')).toBe('1044px');
  });

  it('carries the four elevations and the rail geometry', () => {
    for (const n of ['e1', 'e2', 'e3', 'e4', 'rail', 'gut', 'ez']) {
      expect(value(n), `--${n}`).not.toBeNull();
    }
  });

  it('introduces no colour: every token is neutral or a shadow', () => {
    // any hex token must have R, G and B within 4 of each other
    const hexes = [...css.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1]!);
    for (const h of hexes) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      const spread = Math.max(r!, g!, b!) - Math.min(r!, g!, b!);
      expect(spread, `#${h} is not neutral`).toBeLessThanOrEqual(4);
    }
  });

  it('stays greyscale in base.css and every component style block, not just the token layer', () => {
    for (const [name, src] of Object.entries(otherSources)) {
      const hexes = [...src.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1]!);
      for (const h of hexes) {
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        const spread = Math.max(r!, g!, b!) - Math.min(r!, g!, b!);
        expect(spread, `${name}: #${h} is not neutral`).toBeLessThanOrEqual(4);
      }
    }
  });

  // Commit 47fd661 swept the whole site moving every sub-18px --g70-over-
  // the-ground text to --g80, for WCAG failures in exactly this range. That
  // sweep was a one-off script and never became a test, so the homepage
  // branch put Coverage's .covers and .intro straight back into the failing
  // set and nothing caught it. This makes the sweep permanent.
  //
  // It is not enough to flag every sub-18px --g70-or-lighter rule against
  // .ground: plenty of the codebase's small grey text (ClaimRail's .let and
  // .std, Working's own dt, every LoadPath/Prose/Method card) sits inside an
  // opaque local card, not on the bare page background, and is already
  // compliant there. Flagging those would be a false positive on sight,
  // exactly the kind of noisy test nobody would keep green. So this walks
  // each file's actual markup with a small tag-stack parser and only holds a
  // rule to the .ground floor where at least one element it matches is NOT
  // nested inside a selector that establishes its own opaque-ish background
  // (a hex colour or a gradient) elsewhere in the same file.
  it('keeps sized text on the bare page ground at its WCAG floor, worst-case', () => {
    const greys: Record<string, string> = {
      w: '#FFFFFF', g05: '#FAFAF9', g10: '#F4F4F3', g20: '#EBEBEA',
      g30: '#DEDEDD', g40: '#C9C9C7', g50: '#AEAEAC', g60: '#8C8C8A',
      g70: '#6C6C6A', g80: '#4A4A48', g90: '#2B2B2A', ink: '#131312',
    };
    // base.css's .ground runs a linear gradient from #F6F6F5 to #EAEAE9,
    // under three radial highlights layered on top. Every one of those
    // radials is lighter than the linear gradient beneath it except the
    // last, #E3E3E1 at 70% 106%, which is darker than every linear stop and
    // paints at full opacity at its own centre. That is the single darkest
    // point .ground ever reaches, and dark text loses contrast as its
    // backdrop darkens, so it is the case that has to hold.
    const worstGround = '#E3E3E1';

    const toLinear = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return 0.2126 * toLinear(r!) + 0.7152 * toLinear(g!) + 0.0722 * toLinear(b!);
    };
    const contrast = (hexA: string, hexB: string) => {
      const [la, lb] = [luminance(hexA), luminance(hexB)];
      const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
      return (lighter + 0.05) / (darker + 0.05);
    };

    // Every class a style block gives its own background, hex or gradient.
    // A plain colour keyword or a shadow-only rule doesn't count: those
    // don't lighten what sits on top of them.
    const surfaceClasses = (styleSrc: string): Set<string> => {
      const set = new Set<string>();
      for (const m of styleSrc.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const decls = m[2]!;
        if (/(?<![\w-])background(?:-color)?:\s*[^;]*(#[0-9A-Fa-f]{6}|gradient\()/.test(decls)) {
          for (const cls of m[1]!.matchAll(/\.([\w-]+)/g)) set.add(cls[1]!);
        }
      }
      return set;
    };

    // A set:html={...} value is a JS string, not markup: LoadPath.astro's
    // is a template literal that happens to contain a literal `<b>...</b>`,
    // which would otherwise read to the tag walker below as a real element
    // opening before the `<p>` carrying it ever does, losing the `<p>` entirely.
    // Strips the whole attribute with real brace balancing, since the braces
    // inside it nest (`${standing}` inside the outer `{...}`).
    const stripBracedAttr = (text: string, attrName: string) => {
      const marker = `${attrName}={`;
      let out = '';
      let i = 0;
      while (i < text.length) {
        const idx = text.indexOf(marker, i);
        if (idx === -1) {
          out += text.slice(i);
          break;
        }
        out += text.slice(i, idx);
        let depth = 1;
        let j = idx + marker.length;
        while (j < text.length && depth > 0) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') depth--;
          j++;
        }
        i = j;
      }
      return out;
    };

    // Strip frontmatter and <style>/<script> so the tag walk below only
    // sees real markup: JS frontmatter's own `<`/`>` (generics, comparisons)
    // and the CSS itself would otherwise feed the tag-stack parser noise.
    const bodyMarkup = (rawSrc: string) =>
      stripBracedAttr(
        rawSrc
          .replace(/^---[\s\S]*?---/, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/g, ''),
        'set:html',
      );

    // A compound selector token ("p", ".offpath", ".ci.firm") split into an
    // optional tag requirement and zero or more class requirements, so a
    // descendant selector like ".offpath p" can be checked as "a <p> that
    // has some .offpath ancestor", not just "any <p> anywhere in the file".
    // Without this, a bare tag as the rightmost token (very common here:
    // "dt", "dd", "p") would match every such tag in the whole component,
    // including unrelated ones the rule never touches.
    const parseCompound = (token: string) => {
      const dot = token.indexOf('.');
      const tag = dot === -1 ? token : dot > 0 ? token.slice(0, dot) : null;
      const classes = dot === -1 ? [] : token.slice(dot).split('.').filter(Boolean);
      return { tag, classes };
    };
    const compoundMatches = (c: { tag: string | null; classes: string[] }, tagName: string, wholeTagText: string) => {
      if (c.tag && c.tag !== tagName) return false;
      return c.classes.every((cls) => new RegExp(`\\b${cls}\\b`).test(wholeTagText));
    };

    // Walks a file's markup with a tag stack so nesting is real, not just
    // textual proximity, and checks the FULL descendant chain (not just the
    // rightmost token) so a bare-tag selector like ".offpath p" only counts
    // <p> elements that actually have an .offpath ancestor. Returns null if
    // the selector's target never appears validly in the markup at all (an
    // unused rule, or a selector this simple matcher can't resolve), which
    // the caller treats as "cannot verify, don't fail on it".
    const sitsOnBareGround = (rawSrc: string, styleSrc: string, selector: string): boolean | null => {
      // :global(...) unwraps to its inner selector rather than being
      // dropped: "article :global(.tier .status)" still needs to require
      // both .tier and .status, it just isn't scoped to this component.
      const tokens = selector
        .replace(/:global\(([^)]*)\)/g, '$1')
        .replace(/>/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(parseCompound);
      if (tokens.length === 0) return null;
      const target = tokens[tokens.length - 1]!;
      const ancestorsRequired = tokens.slice(0, -1);
      if (target.tag && !/^[a-zA-Z][\w-]*$/.test(target.tag)) return null; // pseudo etc, not a real tag

      const markup = bodyMarkup(rawSrc);
      const surfaces = surfaceClasses(styleSrc);
      const stack: { tag: string; whole: string; onSurface: boolean }[] = [];
      const tagRe = /<\/?([a-zA-Z][\w-]*)((?:\s+[^<>]*)?)\/?>/g;
      const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'path', 'circle', 'rect']);
      let sawTarget = false;
      let anyOffGround = false;
      let m: RegExpExecArray | null;
      while ((m = tagRe.exec(markup))) {
        const whole = m[0]!;
        const tag = m[1]!;
        const isClose = whole.startsWith('</');
        if (isClose) {
          stack.pop();
          continue;
        }
        const selfClose = whole.endsWith('/>') || voidTags.has(tag.toLowerCase());
        const onSurface =
          (stack.length > 0 && stack[stack.length - 1]!.onSurface) ||
          [...surfaces].some((c) => new RegExp(`\\b${c}\\b`).test(whole));
        const selfMatches = compoundMatches(target, tag, whole);
        const ancestorsOk = ancestorsRequired.every((req) => stack.some((s) => compoundMatches(req, s.tag, s.whole)));
        if (selfMatches && ancestorsOk) {
          sawTarget = true;
          if (!onSurface) anyOffGround = true;
        }
        if (!selfClose) stack.push({ tag, whole, onSurface });
      }
      if (!sawTarget) return null;
      return anyOffGround;
    };

    let checked = 0;
    for (const [name, src] of Object.entries(otherSources)) {
      const rawSrc = rawSources[name]; // undefined for base.css, which has no markup and no such rules
      // Innermost `{ ... }` blocks only. This CSS is flat, at most one
      // level of @media nesting, so a global scan for non-nested brace
      // pairs finds every declaration block whether or not it sits inside
      // a media query, without needing to track nesting depth.
      for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = m[1]!.trim();
        const decls = m[2]!;
        // Excludes background-color, border-color, outline-color etc: a
        // standalone "color" property is never preceded by a letter or
        // hyphen.
        const sizeMatch = decls.match(/(?<![\w-])font-size:\s*(?:clamp\(\s*)?(\d+(?:\.\d+)?)px/);
        const colorMatch = decls.match(/(?<![\w-])color:\s*var\(--([a-zA-Z0-9]+)\)/);
        if (!sizeMatch || !colorMatch) continue;
        const hex = greys[colorMatch[1]!];
        if (!hex) continue; // not one of the twelve interface greys

        if (rawSrc) {
          const verdict = sitsOnBareGround(rawSrc, src, selector);
          // false: every match sits on its own opaque surface, compliant there.
          // null: the selector's target never resolved in this file's own
          // markup (cross-file :global() reaching into a consumer page's
          // slot content, most often), so this walker cannot see it either
          // way. Skip rather than assume the worst: a rule this sweep can't
          // verify is not the same thing as a rule it caught failing.
          if (verdict === false || verdict === null) continue;
        }

        checked++;
        const px = parseFloat(sizeMatch[1]!);
        const floor = px >= 18 ? 3 : 4.5;
        const ratio = contrast(hex, worstGround);
        expect(
          ratio,
          `${name} "${selector}" sets ${px}px text in --${colorMatch[1]} directly on .ground ` +
            `(${ratio.toFixed(2)}:1 against ${worstGround}, needs ${floor}:1)`,
        ).toBeGreaterThanOrEqual(floor);
      }
    }
    // Guards the sweep itself: if the regex ever stops matching anything
    // (a markup change moves colour out of scoped style blocks, say), this
    // test would otherwise pass by finding nothing to check.
    expect(checked).toBeGreaterThan(0);
  });

  it('declares the body family in the token layer, not in base.css', () => {
    expect(value('font')).toMatch(/Familjen Grotesk/);
    const base = readFileSync('src/styles/base.css', 'utf8');
    // One font-family declaration naming a real family may remain: .mono's,
    // which reads var(--font-mono). Nothing else may name a family directly.
    const families = [...base.matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1]!.trim());
    for (const f of families) {
      expect(f, `base.css names a family directly: ${f}`).toMatch(/^var\(--font(-mono)?\)$/);
    }
  });

  it('carries a ten-step type scale', () => {
    for (const n of ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']) {
      expect(value(`text-${n}`), `--text-${n}`).toMatch(/^\d+px$/);
    }
  });

  it('keeps the type scale strictly ascending', () => {
    const px = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']
      .map((n) => parseInt(value(`text-${n}`)!, 10));
    for (let i = 1; i < px.length; i++) {
      expect(px[i]!, `--text step ${i}`).toBeGreaterThan(px[i - 1]!);
    }
  });

  it('carries five weights inside the variable font range', () => {
    // Familjen Grotesk Variable ships 400 to 700. A weight outside that range
    // is synthesised by the browser, which is a different face, not a lighter
    // one, so the scale is declared inside what the shipped font can do.
    for (const n of ['light', 'normal', 'medium', 'semibold', 'bold']) {
      const w = parseInt(value(`weight-${n}`)!, 10);
      expect(w, `--weight-${n}`).toBeGreaterThanOrEqual(400);
      expect(w, `--weight-${n}`).toBeLessThanOrEqual(700);
    }
  });

  it('carries four tracking values and no fifth', () => {
    for (const n of ['tight', 'snug', 'normal', 'wide']) {
      expect(value(`tracking-${n}`), `--tracking-${n}`).toMatch(/em$/);
    }
  });

  it('puts every leading and space step on the four-pixel baseline', () => {
    const steps = [
      ...[4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22].map((n) => `leading-${n}`),
      ...[1, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((n) => `space-${n}`),
    ];
    for (const n of steps) {
      const v = value(n);
      expect(v, `--${n}`).toMatch(/^\d+px$/);
      expect(parseInt(v!, 10) % 4, `--${n} is off the four-pixel baseline`).toBe(0);
    }
  });

  it('names a leading step for the multiple of four it actually is', () => {
    for (const n of [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22]) {
      expect(parseInt(value(`leading-${n}`)!, 10), `--leading-${n}`).toBe(n * 4);
    }
  });

  it('carries a slide profile whose measure is the width it actually leaves', () => {
    const n = (name: string) => parseInt(value(name)!, 10);
    expect(n('slide-w')).toBe(1280);
    expect(n('slide-h')).toBe(720);
    // The lane runs down one side only; the pad insets the other three edges.
    expect(n('slide-measure')).toBe(n('slide-w') - n('slide-margin') - 2 * n('slide-pad'));
  });
});
