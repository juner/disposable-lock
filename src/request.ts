import type { InnerLock, ReleasableLock, NotHaveLock } from "./types/index.ts";

/**
 * Requests a lock with the given name and options.
 * If the lock is acquired, returns an object that provides:
 *   - `name`: lock name
 *   - `mode`: "exclusive" or "shared"
 *   - `release()`: release the lock
 *   - `[Symbol.asyncDispose]`: supports the `await using` keyword for automatic disposal
 *
 * If the lock cannot be obtained (e.g., `ifAvailable: true` case),
 * a fallback object is returned with a dummy `release()` that does nothing.
 *
 * @param options - LockOptions (mode, ifAvailable, steal, signal, etc.)
 * @returns A promise that resolves to either a ReleasableLock or a NotHaveLock.
 */
export async function request(this: InnerLock, options?: LockOptions): Promise<ReleasableLock | NotHaveLock> {
  // #region Create resolvers to coordinate async lock lifecycle

  // case1: called callback 
  const { resolve: callbackResolve, promise: callbackPromise } = Promise.withResolvers<Lock | null>();

  // case2: called release
  const { resolve: releaseResolve, promise: releasePromise } = Promise.withResolvers<void>();

  // case3: LockManager.request() result
  const { resolve: requestResolve, promise: requestPromise, reject: requestReject } = Promise.withResolvers<void>();

  // #endregion

  // Request the lock using LockManager API
  (options
    ? this.locks.request(this.name, options, callback)
    : this.locks.request(this.name, callback))
    .then(requestResolve, requestReject);

  // Wait for either successful acquisition or rejection
  const result = await Promise.race([
    callbackPromise,
    requestPromise
      .then(
        () => null,
        reason => ({ reason })
      ),
  ]);

  // If LockManager.request() was rejected, rethrow the error
  if (result && "reason" in result) throw result.reason;

  // Wait for the callback to resolve with the actual lock
  const lock = await callbackPromise;

  // Case: lock not acquired (ifAvailable: true)
  if (!lock) {
    releaseResolve();
    requestResolve();
    return {
      release: notHaveLockRelease,
      [Symbol.asyncDispose]: noop,
    };
  }

  // Case: lock successfully acquired
  return {
    name: lock.name,
    mode: lock.mode,
    release,
    [Symbol.asyncDispose]: asyncDispose,
  };

  /**
   * Called by LockManager once a lock is granted.
   * Returns a promise that resolves when the lock is released.
   */
  function callback(lock: Lock | null) {
    callbackResolve(lock);
    return releasePromise;
  }

  /**
   * Release the lock by resolving the promise returned to LockManager.
   * Returns true if released successfully, or false if the lock has already been released or lost.
   */
  function release() {
    releaseResolve();
    return requestPromise.then(returnTrue, returnFalse);
  }

  /**
   * Implements AsyncDisposable support.
   * Allows automatic cleanup when used with the `using` keyword.
   */
  async function asyncDispose(): Promise<void> {
    await release();
  }
}

/**
 * Helper to return true 
 */
export function returnTrue() {
  return true;
}

/**
 * Helper to return false
 */
export function returnFalse() {
  return false;
}

/**
 * Dummy release function for "not acquired" locks.
 */
export function notHaveLockRelease(): Promise<false> {
  return Promise.resolve(false);
}

/**
 * No-op async function.
 */
export function noop() {
  return Promise.resolve();
}
