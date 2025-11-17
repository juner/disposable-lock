import type { InnerLock, ReleasableLock } from "./types/index.ts";
import { query } from "./query.js";
import { request as originalRequest } from "./request.js";

/**
 * Creates a simple lock handler for the specified `name`.
 * The returned object has two methods:
 *   - `request(options)`: request a lock and return a ReleasableLock-like object.
 *   - `query()`: query the current lock state.
 *
 * If `navigator.locks` is unavailable (e.g. not in a browser environment),
 * you must pass `{ locks: <LockManager> }` via the `options` argument.
 *
 * @param name - The name of the lock.
 * @param options - Optional configuration (e.g., a custom LockManager).
 * @returns An object with `request` and `query` functions.
 * @throws Error if `navigator.locks` is not available.
 */
export function lock(name: string, options?: { locks?: LockManager }) {
  const locks = options?.locks ?? navigator?.locks;
  if (typeof locks === "undefined") {
    throw new Error("navigator.locks is not found. required options.locks argument.");
  }
  const thisArgs: InnerLock = { locks, name };
  const request = originalRequest.bind(thisArgs) as {
    (options: Omit<LockOptions, "ifAvailable"> & { ifAvailable: true }): Promise<ReleasableLock | null>;
    (options?: Omit<LockOptions, "ifAvailable"> & { ifAvailable?: false }): Promise<ReleasableLock>;
  };
  return {
    request,
    query: query.bind(thisArgs),
  };
}
