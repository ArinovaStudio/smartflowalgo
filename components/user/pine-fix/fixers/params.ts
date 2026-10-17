import type { Fixer, Candidate } from '../types';
import { PASSES, applyPasses } from '../passes/params-passes';

/** Handles: "undefined is not an object (evaluating 'x.params[a][b]')" */
export const paramsFixer: Fixer = {
  id: 'params',

  matches: (e) =>
    /\.?params\s*\[/i.test(e.message) ||
    /evaluating\s*['"][^'"]*params/i.test(e.message),

  candidates(source): Candidate[] {
    const names = PASSES.map((p) => p.name);
    const fixed = applyPasses(source, names);
    if (fixed === source) return []; // nothing to rewrite, so a retry would fail the same way
    return [{ label: `params:${names.join('+')}`, source: fixed }];
  },
};