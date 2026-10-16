/**
 * HOW TO ADD A NEW FIXER (3 steps)
 *
 *  1. Copy this file to fixers/<yourError>.ts and fill it in.
 *  2. Import it in fixers/index.ts and add it to the ALL_FIXERS array.
 *  3. Done. It is only consulted when matches() returns true for the engine's error.
 *
 * Rules of thumb
 *  - matches() should be SPECIFIC (match the message text), otherwise you waste engine runs.
 *  - candidates() returns rewrites ordered least -> most invasive.
 *  - A fixer must never throw; return [] when it has nothing to offer.
 *  - Put the actual text transforms in fixers' own file or in passes/, keep them pure (string in, string out).
 */
import type { Fixer, Candidate } from './../types';

export const exampleFixer: Fixer = {
  id: 'example',

  matches: (e) => /some exact text from the error/.test(e.message),

  candidates(source): Candidate[] {
    const rewritten = source.replace(/old\(/g, 'new(');
    return [{ label: 'example:old->new', source: rewritten }];
  },
};
