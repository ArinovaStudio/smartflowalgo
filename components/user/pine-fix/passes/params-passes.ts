/**
 * passes/params-passes.ts
 *
 * Fix for: "undefined is not an object (evaluating 'x.params[a][b]')"
 * Cause:   bare `ta.vwap` as a request.security expression has no params entry.
 * Fix:     rewrite bare `ta.vwap` -> `ta.vwap(hlc3)` (same value, hlc3 is the default source).
 */

export type Pass = { name: string; run: (src: string) => string };

/** Same-length copy of src with string literals and // comments blanked out. */
function maskNonCode(src: string): string {
  const out = src.split('');
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') out[i++] = ' ';
    } else if (c === '"' || c === "'") {
      out[i++] = ' ';
      while (i < src.length && src[i] !== c && src[i] !== '\n') {
        if (src[i] === '\\' && i + 1 < src.length) out[i++] = ' ';
        out[i++] = ' ';
      }
      if (i < src.length && src[i] === c) out[i++] = ' ';
    } else {
      i++;
    }
  }
  return out.join('');
}

/** ta.vwap -> ta.vwap(hlc3). Skips existing calls, ta.vwapX, strings and comments. */
export function normalizeBareVwap(src: string): string {
  const masked = maskNonCode(src);
  const re = /(?<![\w.])ta\s*\.\s*vwap(?!\w)(?!\s*\()/g;

  const hits: number[] = [];
  const lens: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    hits.push(m.index);
    lens.push(m[0].length);
  }

  let out = src;
  for (let k = hits.length - 1; k >= 0; k--)
    out = out.slice(0, hits[k]) + 'ta.vwap(hlc3)' + out.slice(hits[k] + lens[k]);
  return out;
}

export const PASSES: Pass[] = [{ name: 'normalizeBareVwap', run: normalizeBareVwap }];

export function applyPasses(src: string, names: string[]): string {
  let out = src;
  for (const p of PASSES) if (names.includes(p.name)) out = p.run(out);
  return out;
}