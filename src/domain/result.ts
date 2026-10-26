/**
 * Every rule check returns either a value or a reason a person can read.
 * The UI shows `reason` verbatim, so write it as a full sentence.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(reason: string): Result<T> => ({ ok: false, reason });
