import type { Fixer, Candidate } from '../types';

/**
 * Null receiver on a drawing object:
 *   JSC     : null is not an object (evaluating 'obj.delete')
 *   V8      : Cannot read properties of null (reading 'delete')
 *   Firefox : can't access property "delete", obj is null
 *
 * Candidates (least invasive first, duplicates dropped):
 *   1. obj.delete()  ->  line.delete(obj)   (type inferred, loop-scoped)
 *   2. same, with a default namespace for receivers whose type can't be inferred
 *   3. fallback: wrap statement in `if not na(obj)`
 */

const DRAWING = ['line', 'label', 'box', 'linefill', 'polyline', 'table'] as const;

const PINE_NAMESPACES = new Set([
  'ta', 'math', 'str', 'array', 'map', 'matrix', 'color', 'line', 'label', 'box', 'table', 'linefill',
  'polyline', 'chart', 'request', 'input', 'syminfo', 'timeframe', 'session', 'barstate', 'strategy',
  'log', 'runtime', 'display', 'alert', 'currency', 'dayofweek', 'format', 'location', 'order', 'plot',
  'position', 'scale', 'shape', 'size', 'text', 'xloc', 'yloc', 'extend', 'font', 'hline', 'adjustment',
  'backadjustment', 'settlement_as_close', 'dividends', 'earnings', 'splits', 'barmerge', 'ticker',
]);

// methods that exist as `<ns>.<method>(id, ...)` on every drawing type
const DRAWING_METHOD = /^(delete|copy|set_\w+|get_\w+)$/;

const IDENT = String.raw`[A-Za-z_]\w*`;
const RECEIVER = String.raw`${IDENT}(?:\.${IDENT})*(?:\[[^\]\n]*\])?`;
const ARGS = String.raw`(?:[^()\n]|\([^()\n]*\))*`;
const FOR_IN = new RegExp(
  String.raw`^[ \t]*for[ \t]+(?:\[[ \t]*${IDENT}[ \t]*,[ \t]*)?(${IDENT})\]?[ \t]+in[ \t]+(${IDENT}(?:\.${IDENT})*)`,
);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const strip = (s: string) => s.replace(/\s+/g, '');
const continues = (prev: string) => /[,(+\-*/?:=]$|\b(?:and|or)$/.test(prev);

function parseError(msg: string): { method: string } | null {
  let m = /(?:null|undefined) is not an object \(evaluating '[^']*\.([\w$]+)'\)/.exec(msg);
  if (m) return { method: m[1] };
  m = /can't access property "([\w$]+)", [\w$.]+ is (?:null|undefined)/.exec(msg);
  if (m) return { method: m[1] };
  m = /Cannot read propert(?:y|ies) of (?:null|undefined) \(reading '([\w$]+)'\)/.exec(msg);
  if (m) return { method: m[1] };
  return null;
}

/** index where a trailing // comment starts (outside string literals), else line.length */
function codeEnd(line: string): number {
  let q = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = '';
    } else if (c === '"' || c === "'") q = c;
    else if (c === '/' && line[i + 1] === '/') return i;
  }
  return line.length;
}

type NsMap = Map<string, Set<string>>;
const addTo = (m: NsMap, k: string, v: string) => {
  if (!m.has(k)) m.set(k, new Set());
  m.get(k)!.add(v);
};
const unique = (s?: Set<string>) => (s && s.size === 1 ? [...s][0] : undefined);

/** which names hold which drawing type (vars/fields) and which arrays hold which element type */
function collectTypes(src: string) {
  const vars: NsMap = new Map();
  const arrays: NsMap = new Map();
  const alt = DRAWING.join('|');
  const re = (s: string, f: string) => new RegExp(s, f);

  for (const m of src.matchAll(re(`array<(${alt})>[ \\t]+(${IDENT})`, 'g'))) addTo(arrays, m[2], m[1]);
  for (const m of src.matchAll(re(`(${IDENT})[ \\t]*(?::=|=)[ \\t]*array\\.new<(${alt})>`, 'g')))
    addTo(arrays, m[1], m[2]);
  for (const m of src.matchAll(re(`^[ \\t]*(?:(?:var|varip)[ \\t]+)?(${alt})[ \\t]+(${IDENT})\\b`, 'gm')))
    addTo(vars, m[2], m[1]);
  for (const m of src.matchAll(re(`(${IDENT})[ \\t]*(?::=|=)[ \\t]*(${alt})\\.new\\(`, 'g')))
    addTo(vars, m[1], m[2]);
  return { vars, arrays };
}

interface Scope {
  indent: number;
  v: string;
  ns?: string;
}

function typeOf(r: string, scope: Scope[], vars: NsMap): string | undefined {
  const base = r.replace(/\[[^\]]*\]$/, '');
  if (!base.includes('.')) {
    for (let i = scope.length - 1; i >= 0; i--) if (scope[i].v === base) return scope[i].ns; // loop var shadows
    return unique(vars.get(base));
  }
  return unique(vars.get(base.split('.').pop()!)); // field access: bin.ln, z.top
}

function transform(src: string, method: string, mode: 'fn' | 'guard', fallbackNs?: string): string {
  const { vars, arrays } = collectTypes(src);
  const call = new RegExp(`(?<![\\w$.])(${RECEIVER})\\.${esc(method)}\\(`, 'g');
  const stmt = new RegExp(`^([ \\t]*)(${RECEIVER})\\.${esc(method)}\\(${ARGS}\\)$`);
  const scope: Scope[] = [];
  const out: string[] = [];
  let prev = '';

  for (const line of src.split('\n')) {
    const cr = line.endsWith('\r');
    const body = cr ? line.slice(0, -1) : line;
    const eol = cr ? '\r' : '';
    const t = body.trim();
    const live = t !== '' && !t.startsWith('//');

    if (live) {
      const indent = /^[ \t]*/.exec(body)![0].replace(/\t/g, '    ').length;
      while (scope.length && scope[scope.length - 1].indent >= indent) scope.pop();
      const f = FOR_IN.exec(body);
      if (f) scope.push({ indent, v: f[1], ns: unique(arrays.get(f[2].split('.').pop()!)) });
    }

    const end = codeEnd(body);
    const code = body.slice(0, end);
    const rest = body.slice(end);

    if (mode === 'fn') {
      const next = code.replace(call, (full: string, r: string, off: number) => {
        if (PINE_NAMESPACES.has(r.split(/[.[]/)[0])) return full;
        const ns = typeOf(r, scope, vars) ?? fallbackNs;
        if (!ns) return full;
        const after = code.slice(off + full.length);
        return `${ns}.${method}(${r}` + (/^\s*\)/.test(after) ? '' : ', ');
      });
      out.push(next + rest + eol);
    } else {
      const m = stmt.exec(code.trimEnd());
      const r = m?.[2];
      const skip =
        !m ||
        PINE_NAMESPACES.has(r!.split(/[.[]/)[0]) ||
        continues(prev) ||
        strip(prev) === strip(`if not na(${r})`);
      if (skip) out.push(line);
      else {
        const indent = m![1];
        const unit = indent.includes('\t') && !indent.includes(' ') ? '\t' : '    ';
        out.push(`${indent}if not na(${r})${eol}`);
        out.push(`${indent}${unit}${body.slice(indent.length)}${eol}`);
      }
    }
    if (live) prev = t;
  }
  return out.join('\n');
}

export const nullReceiverFixer: Fixer = {
  id: 'null-receiver',

  matches: (e) => parseError(e.message) !== null,

  candidates(src, error): Candidate[] {
    const p = parseError(error.message);
    if (!p) return [];

    const out: Candidate[] = [];
    const seen = new Set<string>([src]);
    const push = (label: string, source: string) => {
      if (seen.has(source)) return;
      seen.add(source);
      out.push({ label: `null-receiver:${label}`, source });
    };

    if (DRAWING_METHOD.test(p.method)) {
      push(`fn-style .${p.method}()`, transform(src, p.method, 'fn'));
      for (const ns of ['line', 'label', 'box', 'linefill', 'polyline'])
        push(`fn-style .${p.method}() default ${ns}`, transform(src, p.method, 'fn', ns));
    }
    push(`guard .${p.method}()`, transform(src, p.method, 'guard'));
    return out;
  },
};