import type { Candidate, Fixer, PineError, SolveOptions, SolveSuccess } from './types';

export function toPineError(e: unknown): PineError {
  const anyE = e as any;
  const raw = anyE?.error ?? anyE; // accepts a thrown Error, a string, or a Vela { ok:false, error } result
  const message =
    typeof raw === 'string' ? raw : typeof raw?.message === 'string' ? raw.message : safeJson(raw);
  return { message, raw: e };
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

// original source -> what finally worked, so live refreshes skip all retries
const solved = new Map<string, { source: string; applied: string[] }>();

/**
 * run(src) must THROW when the engine fails. The ORIGINAL source always runs first;
 * fixers are consulted only if it fails, and only those whose matches() accepts the error.
 * If no fix works, the ORIGINAL error is rethrown, with `.attempts` attached.
 */
export async function solve<T>(
  run: (source: string) => Promise<T>,
  original: string,
  opts: SolveOptions,
): Promise<SolveSuccess<T>> {
  const log = opts.log ?? (() => {});
  const maxAttempts = opts.maxAttempts ?? 12;
  const maxDepth = opts.maxDepth ?? 3;
  const attempts: { label: string; error?: string }[] = [];
  let used = 0;

  const attempt = async (src: string, isRetry: boolean): Promise<T> => {
    if (isRetry) opts.beforeRetry?.();
    return run(src);
  };

  // 0) known fix from an earlier run of this exact script
  const known = solved.get(original);
  if (known) {
    try {
      const result = await attempt(known.source, false);
      return { result, source: known.source, applied: known.applied };
    } catch {
      solved.delete(original); // stale, fall through to the normal path
    }
  }

  // 1) original, untouched
  let firstError: unknown;
  try {
    const result = await attempt(original, false);
    return { result, source: original, applied: [] };
  } catch (e) {
    firstError = e;
  }

  // 2) fixers
  const fix = async (
    src: string,
    err: PineError,
    chain: string[],
    appliedSoFar: string[],
  ): Promise<SolveSuccess<T> | null> => {
    if (chain.length >= maxDepth) return null;

    for (const fixer of opts.fixers) {
      if (chain.includes(fixer.id) || !safeMatches(fixer, err)) continue;

      let cands: Candidate[] = [];
      try {
        cands = fixer.candidates(src, err);
      } catch (e) {
        log(`[pine-fix] ${fixer.id}.candidates() crashed: ${String(e)}`);
        continue;
      }

      const tried = new Set<string>();
      for (const c of cands) {
        if (c.source === src || tried.has(c.source)) continue;
        tried.add(c.source);
        if (used >= maxAttempts) return null;
        used++;

        try {
          const result = await attempt(c.source, true);
          attempts.push({ label: c.label });
          log(`[pine-fix] fixed with ${[...appliedSoFar, c.label].join(' -> ')}`);
          return { result, source: c.source, applied: [...appliedSoFar, c.label] };
        } catch (e2) {
          const err2 = toPineError(e2);
          attempts.push({ label: c.label, error: err2.message });

          // The error CHANGED: this candidate may have fixed the first problem and exposed
          // another one. Let the other fixers continue from this candidate.
          if (err2.message !== err.message) {
            const deeper = await fix(c.source, err2, [...chain, fixer.id], [...appliedSoFar, c.label]);
            if (deeper) return deeper;
          }
        }
      }
    }
    return null;
  };

  const ok = await fix(original, toPineError(firstError), [], []);
  if (ok) {
    if (ok.applied.length) solved.set(original, { source: ok.source, applied: ok.applied });
    return ok;
  }

  // nothing worked: surface the ORIGINAL error, plus what was tried
  const err: any = firstError instanceof Error ? firstError : Object.assign(new Error(toPineError(firstError).message), { cause: firstError });
  err.attempts = attempts;
  throw err;
}

function safeMatches(f: Fixer, e: PineError): boolean {
  try {
    return f.matches(e);
  } catch {
    return false;
  }
}
