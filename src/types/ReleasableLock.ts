import type { Releasable } from "./Releasable.ts";

/**
 * Represents a successfully acquired lock.
 */

export type ReleasableLock = Lock & Releasable & AsyncDisposable;
