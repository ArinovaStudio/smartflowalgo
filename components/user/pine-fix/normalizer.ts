/**
 * Normalizes Pine Script sources before execution so that TradingView-specific
 * patterns run out of the box in PineTS without trial-and-error fixers.
 */

// Pine namespaces that must not be treated as method calls or function targets
const PINE_NAMESPACES = new Set([
  'ta', 'math', 'str', 'array', 'map', 'matrix', 'color', 'line', 'label', 'box', 'table',
  'linefill', 'polyline', 'chart', 'request', 'input', 'syminfo', 'timeframe', 'session',
  'barstate', 'strategy', 'log', 'runtime', 'display', 'alert', 'currency', 'dayofweek',
  'format', 'location', 'order', 'plot', 'position', 'scale', 'shape', 'size', 'text',
  'xloc', 'yloc', 'extend', 'font', 'hline', 'adjustment', 'barmerge', 'ticker',
]);

const PRIMITIVE_TYPES = new Set(['bool', 'int', 'float', 'string']);

interface UserMethodInfo {
  name: string;
  firstParamType: string;
  firstParamName: string;
}

/**
 * Parses user methods declared as `method <name>(<type> <firstArg>, ...) =>`
 */
function findUserMethods(src: string): UserMethodInfo[] {
  const methods: UserMethodInfo[] = [];
  const defRe = /^[ \t]*(?:export[ \t]+)?method[ \t]+([A-Za-z_]\w*)[ \t]*\([ \t]*([A-Za-z_][\w.<>]*)[ \t]+([A-Za-z_]\w*)/gm;
  let m: RegExpExecArray | null;
  while ((m = defRe.exec(src)) !== null) {
    methods.push({
      name: m[1],
      firstParamType: m[2].trim(),
      firstParamName: m[3].trim(),
    });
  }
  return methods;
}

/**
 * Rewrites function-style calls of declared methods to dot-syntax method calls:
 * e.g. `display(obs, blob, i)` -> `obs.display(blob, i)`
 * e.g. `dispFVG(fvg, i, true)` -> `fvg.dispFVG(i, true)`
 */
export function normalizeMethodCalls(src: string): string {
  const methods = findUserMethods(src);
  if (methods.length === 0) return src;

  let out = src;

  // 1. If method is declared on a primitive type (like `bool`), convert to regular function
  for (const m of methods) {
    if (PRIMITIVE_TYPES.has(m.firstParamType)) {
      const declRe = new RegExp(`(^[ \\t]*(?:export[ \\t]+)?)method[ \\t]+(${m.name})(?=[ \\t]*\\()`, 'gm');
      out = out.replace(declRe, '$1$2');
    }
  }

  // 2. For remaining methods declared on objects/UDTs/arrays:
  // Convert any bare function-style calls `methodName(recv, ...)` to `recv.methodName(...)`
  const objectMethods = methods.filter((m) => !PRIMITIVE_TYPES.has(m.firstParamType));
  if (objectMethods.length === 0) return out;

  for (const m of objectMethods) {
    const methodName = m.name;
    const lines = out.split('\n');
    const processedLines = lines.map((line) => {
      // Don't modify comments or definitions
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || /^(?:export[ \t]+)?(?:method[ \t]+)?[A-Za-z_]\w*[ \t]*\(.*?\)[ \t]*=>/.test(trimmed)) {
        return line;
      }

      // Check if line contains `methodName(` not preceded by `.`
      const callRe = new RegExp(`(?<![.\\w$])(${methodName})\\s*\\(\\s*([A-Za-z_][\\w.\\[\\]]*)(?:\\s*,\\s*([\\s\\S]*?))?\\)`, 'g');
      return line.replace(callRe, (_match, _fn, receiver, restArgs) => {
        // If receiver is a Pine namespace or type keyword, leave alone
        if (PINE_NAMESPACES.has(receiver) || PRIMITIVE_TYPES.has(receiver)) {
          return _match;
        }
        if (restArgs !== undefined && restArgs.trim().length > 0) {
          return `${receiver}.${methodName}(${restArgs})`;
        }
        return `${receiver}.${methodName}()`;
      });
    });

    out = processedLines.join('\n');
  }

  return out;
}

/**
 * Normalizes bare `ta.vwap` expressions that fail in PineTS request.security
 */
export function normalizeBareVwap(src: string): string {
  return src.replace(/(?<![\w.])ta\s*\.\s*vwap(?!\w)(?!\s*\()/g, 'ta.vwap(hlc3)');
}

/**
 * Enable opt-in dashboard/statistics inputs by default so their Pine table rows
 * are available in the shared chart UI.
 */
export function enableDashboardInputs(src: string): string {
  const byName = /(^[ \t]*(?:(?:var|bool)\s+)?([A-Za-z_]\w*)\s*=\s*input(?:\.bool)?\s*\(\s*)false(?=\s*,)/gim;
  let result = src.replace(byName, (match, declaration: string, name: string) =>
    /dashboard|backtest|stats|table/i.test(name) ? `${declaration}true` : match,
  );

  const byLabel = /(^[ \t]*(?:(?:var|bool)\s+)?[A-Za-z_]\w*\s*=\s*input(?:\.bool)?\s*\(\s*)false(?=\s*,\s*["'][^"']*(?:dashboard|backtest|stats|table)[^"']*["'])/gim;
  result = result.replace(byLabel, (_match, declaration: string) => `${declaration}true`);
  return result;
}

/**
 * Guards statement calls on nullable drawing objects:
 * `obj.delete()` -> `if not na(obj)\n    obj.delete()`
 * `ln.delete()`  -> `if not na(ln)\n    ln.delete()`
 * `pl.delete()`  -> `if not na(pl)\n    pl.delete()`
 */
export function normalizeNullReceivers(src: string): string {
  const lines = src.split('\n');
  const out: string[] = [];

  const stmtRe = /^([ \t]*)([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\.(delete|set_\w+|get_\w+)\s*\((.*?)\)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) {
      out.push(line);
      continue;
    }

    const m = stmtRe.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }

    const indent = m[1];
    const receiver = m[2];
    const method = m[3];
    const args = m[4];

    const rootRecv = receiver.split('.')[0];
    if (PINE_NAMESPACES.has(rootRecv)) {
      out.push(line);
      continue;
    }

    let alreadyGuarded = false;
    for (let j = out.length - 1; j >= 0; j--) {
      const prevTrimmed = out[j].trim();
      if (!prevTrimmed || prevTrimmed.startsWith('//')) continue;
      if (prevTrimmed === `if not na(${receiver})` || prevTrimmed.includes(`not na(${receiver})`)) {
        alreadyGuarded = true;
      }
      break;
    }

    if (alreadyGuarded) {
      out.push(line);
      continue;
    }

    const unit = indent.includes('\t') && !indent.includes(' ') ? '\t' : '    ';
    out.push(`${indent}if not na(${receiver})`);
    out.push(`${indent}${unit}${receiver}.${method}(${args})`);
  }

  return out.join('\n');
}

/**
 * Main normalization pipeline applied to all Pine scripts before execution
 */
export function normalizePineScript(src: string): string {
  if (!src || typeof src !== 'string') return src;
  let result = src;
  result = enableDashboardInputs(result);
  result = normalizeBareVwap(result);
  result = normalizeNullReceivers(result);
  result = normalizeMethodCalls(result);
  return result;
}
