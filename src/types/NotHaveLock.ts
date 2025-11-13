import type { Releasable } from "./Releasable.ts";

/**
 * Represents a result object when a lock could not be acquired
 * (e.g., when `ifAvailable: true` is set and the lock is unavailable).
 * It still provides the same interface as a lock but with undefined fields.
 */

export type NotHaveLock = { name?: undefined; mode?: undefined; } & Releasable<false> & AsyncDisposable;
