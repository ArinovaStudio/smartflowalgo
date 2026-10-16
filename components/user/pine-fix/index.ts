import { solve } from './runner';
import { ALL_FIXERS } from './fixers';
import type { SolveOptions } from './types';

export { solve, toPineError } from './runner';
export { ALL_FIXERS } from './fixers';
export type { Fixer, Candidate, PineError, SolveOptions, SolveSuccess } from './types';

type Chart = {
  runIndicator: (source: string, options?: Record<string, unknown>) => Promise<any>;
};

/**
 * Drop-in replacement for your runPostProcessedPineScript.
 * Vela returns { ok:false, error } instead of throwing, so we convert that into a throw
 * for the solver, then convert the final failure back into the same { ok:false } result.
 */
export async function runPostProcessedPineScript(
  chart: Chart,
  source: string,
  options: Record<string, unknown> | (() => Record<string, unknown>),
  extra: Partial<SolveOptions> = {},
) {
  const run = async (src: string) => {
    const opts = typeof options === 'function' ? options() : options; // fresh options per attempt if you pass a function
    const result = await chart.runIndicator(src, opts);
    if (!result?.ok) {
      const e = result?.error;
      throw Object.assign(new Error(typeof e === 'string' ? e : e?.message ?? JSON.stringify(e)), { result });
    }
    return result;
  };

  try {
    const { result } = await solve(run, source, {
      fixers: ALL_FIXERS,
      log: (m) => console.info(m),
      ...extra,
    });
    return result;
  } catch (error: any) {
    console.log(error?.message ?? error);
    if (error?.attempts?.length) console.table(error.attempts);
    if (error?.result) return error.result; // same contract as before: { ok:false, error }
    throw error;
  }
}
