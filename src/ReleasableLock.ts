import type { Releasable } from "./Releasable.js";

/**
 * Represents a successfully acquired lock.
 */

export type ReleasableLock = Lock & Releasable & AsyncDisposable;
