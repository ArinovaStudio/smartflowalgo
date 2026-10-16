import type { Fixer, Candidate } from '../types';

/**
 * Handles:  "display is not a function"  (also "x.display is not a function",
 *           "(In 'display(a)', 'display' is an instance of Object / is undefined)")
 *
 * Typical cause: a USER-defined function/method shares its name with something the engine
 * resolves first:
 *   - a Pine namespace / global   (method display(...)  vs  display.all)
 *   - a user variable             (overlap(...)  vs  bool overlap = false)
 *   - a method the engine only registers for dotted calls (display(obs, ...) function-style)
 *
 * Candidates (least invasive first, duplicates are dropped):
 *   1. rename only the function(s) named in the error
 *   2. 1 + every user function that collides with a Pine name or a user variable
 *   3. 1 + drop the `method` keyword where the function is only ever called function-style
 *   4. rename EVERY user function (+ drop `method` where safe)
 */

const PREFIX = '__u_';

// receivers that are Pine namespaces: `x.name(` is NOT a user method call when x is one of these
const PINE_NAMESPACES = new Set([
  'ta', 'math', 'str', 'array', 'map', 'matrix', 'color', 'line', 'label', 'box', 'table', 'linefill',
  'polyline', 'chart', 'request', 'input', 'syminfo', 'timeframe', 'session', 'barstate', 'strategy',
  'log', 'runtime', 'display', 'alert', 'currency', 'dayofweek', 'format', 'location', 'order', 'plot',
  'position', 'scale', 'shape', 'size', 'text', 'xloc', 'yloc', 'extend', 'font', 'hline', 'adjustment',
  'backadjustment', 'settlement_as_close', 'dividends', 'earnings', 'splits', 'barmerge', 'ticker',
]);

// global built-ins a user function must not share a name with
const PINE_GLOBALS = new Set([
  'plotshape', 'plotchar', 'plotcandle', 'plotbar', 'plotarrow', 'bgcolor', 'barcolor', 'fill',
  'alertcondition', 'indicator', 'library', 'nz', 'na', 'fixnan', 'timestamp', 'time', 'year', 'month',
  'dayofmonth', 'hour', 'minute', 'second', 'weekofyear', 'int', 'float', 'bool', 'string',
]);

const RESERVED = new Set([...PINE_NAMESPACES, ...PINE_GLOBALS]);
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'else']);

// column-0 definition; parameter list may span lines and contain one level of nested parens
const DEF_RE = /^(export[ \t]+)?(method[ \t]+)?([A-Za-z_]\w*)[ \t]*\((?:[^()]|\([^()]*\))*\)[ \t]*=>/gm;

interface Def {
  name: string;
  method: boolean;
}

function userFunctions(src: string): Def[] {
  const out: Def[] = [];
  for (const m of src.matchAll(DEF_RE)) if (!KEYWORDS.has(m[3])) out.push({ name: m[3], method: !!m[2] });
  return out;
}

/** names assigned/declared as variables: `x = `, `x := `, `var x = `, `float x = `, `array<T> x = ` */
function variableNames(src: string): Set<string> {
  const out = new Set<string>();
  const re =
    /^[ \t]*(?:(?:var|varip)[ \t]+)?(?:[A-Za-z_][\w.]*(?:<[^>\n]*>)?(?:\[\])?[ \t]+)?([A-Za-z_]\w*)[ \t]*(?::=|=)(?![=>])/gm;
  for (const m of src.matchAll(re)) out.add(m[1]);
  return out;
}

function namesFromError(msg: string): string[] {
  const out = new Set<string>();
  const add = (s: string) => out.add(s.split('.').pop()!);
  for (const m of msg.matchAll(/([A-Za-z_$][\w$.]*)\s+is not a function/g)) add(m[1]);
  for (const m of msg.matchAll(/\(In '([A-Za-z_$][\w$.]*)\(/g)) add(m[1]);
  for (const m of msg.matchAll(/'([A-Za-z_$][\w$.]*)'\s+is (?:undefined|an instance)/g)) add(m[1]);
  out.delete('undefined');
  return [...out];
}

/** apply fn to the CODE parts of a line only (not string literals, not // comments) */
function mapCode(line: string, fn: (code: string) => string): string {
  let out = '';
  let buf = '';
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      out += c;
      if (c === '\\' && i + 1 < line.length) out += line[++i];
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'") {
      out += fn(buf);
      buf = '';
      quote = c;
      out += c;
    } else if (c === '/' && line[i + 1] === '/') {
      out += fn(buf) + line.slice(i);
      return out;
    } else buf += c;
  }
  return out + fn(buf);
}

/** does `recv.name(` appear anywhere in code (strings/comments ignored)? */
function hasReceiverCall(src: string, name: string): boolean {
  const re = new RegExp(`\\.\\s*${name}\\s*\\(`);
  return src.split('\n').some((line) => {
    let hit = false;
    mapCode(line, (code) => {
      if (re.test(code)) hit = true;
      return code;
    });
    return hit;
  });
}

/** `method f(...)` -> `f(...)` when f is a single definition that is only called function-style */
function demethod(src: string, names: string[], defs: Def[]): string {
  const ok = names.filter((n) => {
    const mine = defs.filter((d) => d.name === n);
    return mine.length === 1 && mine[0].method && !hasReceiverCall(src, n);
  });
  if (!ok.length) return src;
  const re = new RegExp(`^(export[ \\t]+)?method[ \\t]+(${ok.join('|')})(?=[ \\t]*\\()`, 'gm');
  return src.replace(re, (_m, ex: string | undefined, nm: string) => (ex ?? '') + nm);
}

function rename(src: string, names: string[]): string {
  if (names.length === 0) return src;
  const re = new RegExp(`(?<![\\w$])(${names.join('|')})(?=\\s*\\()`, 'g');
  return src
    .split('\n')
    .map((line) =>
      mapCode(line, (code) =>
        code.replace(re, (name: string, _g: string, offset: number) => {
          // `receiver.name(`: leave Pine namespaces alone (math.max, array.size, ...)
          if (offset > 0 && code[offset - 1] === '.') {
            const recv = /([A-Za-z_]\w*)\s*$/.exec(code.slice(0, offset - 1));
            if (recv && PINE_NAMESPACES.has(recv[1])) return name;
          }
          return PREFIX + name;
        }),
      ),
    )
    .join('\n');
}

export const notAFunctionFixer: Fixer = {
  id: 'not-a-function',

  matches: (e) => /is not a function/.test(e.message) && namesFromError(e.message).length > 0,

  candidates(src, error): Candidate[] {
    const defs = userFunctions(src);
    const defined = new Set(defs.map((d) => d.name));
    const named = namesFromError(error.message).filter((n) => defined.has(n));
    if (named.length === 0) return []; // the missing function is not one of ours: nothing to rename

    const vars = variableNames(src);
    const colliding = [...defined].filter((n) => RESERVED.has(n) || vars.has(n));
    const withNamed = [...new Set([...named, ...colliding])];
    const all = [...defined];

    const out: Candidate[] = [];
    const seen = new Set<string>([src]);
    const push = (label: string, source: string) => {
      if (seen.has(source)) return;
      seen.add(source);
      out.push({ label: `not-a-function:${label}`, source });
    };

    push(`rename ${named.join(',')}`, rename(src, named));
    push(`rename ${withNamed.join(',')}`, rename(src, withNamed));
    push(`demethod+rename ${named.join(',')}`, rename(demethod(src, named, defs), named));
    push(`demethod+rename ${withNamed.join(',')}`, rename(demethod(src, withNamed, defs), withNamed));
    push('rename all user fns', rename(src, all));
    push('demethod+rename all user fns', rename(demethod(src, all, defs), all));
    return out;
  },
};