/** A normalized engine error. Fixers only ever see this shape. */
export interface PineError {
  message: string;
  raw: unknown;
}

/** One possible rewrite of the script. */
export interface Candidate {
  label: string; // shown in logs, e.g. "params:hoistTaFromBlocks+cloneSecurityFns"
  source: string; // the rewritten Pine source
}

/**
 * A Fixer = "when error looks like THIS, try rewriting the script like THAT".
 * To support a new error class, write one Fixer and add it to fixers/index.ts.
 */
export interface Fixer {
  /** unique id, used for logs and to stop a fixer being applied twice in one chain */
  id: string;

  /** Return true if this fixer knows how to handle this error. Keep it cheap and specific. */
  matches(error: PineError): boolean;

  /**
   * Candidate rewrites, least invasive first. Return [] if nothing applies.
   * Candidates identical to the input are skipped by the runner.
   */
  candidates(source: string, error: PineError): Candidate[];
}

export interface SolveOptions {
  fixers: Fixer[];
  /** stop after this many TOTAL engine runs spent on fixes (default 12) */
  maxAttempts?: number;
  /** how many fixers may be chained on one script (default 3) */
  maxDepth?: number;
  log?: (msg: string) => void;
  /** called before every retry, so the caller can clear partial chart state */
  beforeRetry?: () => void;
}

export interface SolveSuccess<T> {
  result: T;
  source: string; // source that finally ran
  applied: string[]; // candidate labels in order ([] = original ran untouched)
}
