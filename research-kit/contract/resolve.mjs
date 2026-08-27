/* Resolves an adapter's var() chains against the design system it maps onto.
   An adapter is deliberately a map and not a value sheet, so nothing about it
   can be checked until the chains are followed to real values.

   This is not a CSS parser. It reads custom property declarations and follows
   var() references, which is all a token file contains. Anything more (media
   queries, cascade layers, specificity) would be a false sense of rigour: the
   token layer is flat by rule in both systems, and a token file that needed a
   real parser would already be violating the contract's own principle. */

const MAX_DEPTH = 32;

export function collectDeclarations(cssText) {
  const out = new Map();
  const src = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  /* Name, then everything to the terminating semicolon or closing brace. The
     value class excludes both so a shadow list full of commas and parentheses
     survives whole. */
  for (const m of src.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

/* Splits "--x, some, fallback" into its name and its fallback, respecting the
   fact that the fallback may itself contain commas. */
function splitReference(inner) {
  const comma = inner.indexOf(',');
  if (comma === -1) return { name: inner.trim(), fallback: null };
  return { name: inner.slice(0, comma).trim(), fallback: inner.slice(comma + 1).trim() };
}

/* Finds the first var(...) and returns its span with brace balancing, since a
   fallback can itself be a var(). */
function findVar(value) {
  const start = value.indexOf('var(');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start + 3; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') {
      depth--;
      if (depth === 0) return { start, end: i + 1, inner: value.slice(start + 4, i) };
    }
  }
  return null;
}

export function resolveTokens(cssTexts) {
  const declared = new Map();
  for (const text of cssTexts) {
    for (const [k, v] of collectDeclarations(text)) declared.set(k, v);
  }

  const resolved = new Map();

  const resolveValue = (value, seen, depth) => {
    if (depth > MAX_DEPTH) throw new Error(`var() nested deeper than ${MAX_DEPTH} levels`);
    let out = value;
    for (;;) {
      const ref = findVar(out);
      if (!ref) return out.trim();
      const { name, fallback } = splitReference(ref.inner);
      if (seen.has(name)) {
        throw new Error(`var() cycle: ${[...seen, name].join(' -> ')}`);
      }
      let replacement;
      if (declared.has(name)) {
        replacement = resolveValue(declared.get(name), new Set([...seen, name]), depth + 1);
      } else if (fallback !== null) {
        replacement = resolveValue(fallback, seen, depth + 1);
      } else {
        /* Undeclared and no fallback. The empty string is the honest answer;
           tokencheck reports it as a missing value with the name that was
           actually missing, which is more use than a throw from in here. */
        replacement = '';
      }
      out = out.slice(0, ref.start) + replacement + out.slice(ref.end);
    }
  };

  for (const [name, value] of declared) {
    resolved.set(name, resolveValue(value, new Set([name]), 0));
  }
  return resolved;
}
