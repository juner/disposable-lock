/**
 * A type representing an object that can release a lock asynchronously.
 */
type Releasable<T extends boolean = boolean> = { release(): Promise<T> };

/**
 * Represents a result object when a lock could not be acquired
 * (e.g., when `ifAvailable: true` is set and the lock is unavailable).
 * It still provides the same interface as a lock but with undefined fields.
 */
type NotHaveLock = { name?: undefined, mode?: undefined } & Releasable<false> & AsyncDisposable;

/**
 * Represents a successfully acquired lock.
 */
type ReleasableLock = Lock & Releasable & AsyncDisposable;

/**
 * Internal type used to bind LockManager context with the lock name.
 */
type InnerLock = { locks: LockManager, name: string };

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
  return {
    request: request.bind(thisArgs),
    query: query.bind(thisArgs),
  };
}

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
async function request(this: InnerLock, options?: LockOptions): Promise<ReleasableLock | NotHaveLock> {
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
function returnTrue() {
  return true;
}

/**
 * Helper to return false
 */
function returnFalse() {
  return false;
}

/**
 * Dummy release function for "not acquired" locks.
 */
function notHaveLockRelease(): Promise<false> {
  return Promise.resolve(false);
}

/**
 * No-op async function.
 */
function noop() {
  return Promise.resolve();
}

/**
 * Queries the current lock state (held and pending) for the given lock name.
 *
 * @returns An object like `{ held: boolean, pending: boolean }`
 */
async function query(this: InnerLock) {
  const snapshot = await this.locks.query();
  const equal = equalName(this.name);
  const held = snapshot.held?.some(equal);
  const pending = snapshot.pending?.some(equal);
  return {
    held,
    pending,
  };
}

/**
 * Helper to compare lock names.
 */
function equalName(name: string) {
  return equal;
  function equal({ name: name2 }: LockInfo) {
    return name === name2;
  }
}
