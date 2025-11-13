type Releasable = { release(): Promise<boolean> };
type NotHaveLock = { name?: undefined, mode?: undefined } & Releasable & AsyncDisposable;
type RelesableLock = Lock & Releasable & AsyncDisposable;


type InnerLock = { locks: LockManager, name: string };

/**
 * 
 * @param name 
 * @param options 
 * @returns 
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

async function request(this: InnerLock, options?: LockOptions): Promise<RelesableLock | NotHaveLock> {
  const { resolve: resolve1, promise: promise1 } = Promise.withResolvers<Lock | null>();
  const { resolve: resolve2, promise: promise2 } = Promise.withResolvers<void>();
  const { resolve: resolve3, promise: promise3, reject: reject3 } = Promise.withResolvers<void>();
  (options
    ? this.locks.request(this.name, options, callback)
    : this.locks.request(this.name, callback))
    .then(resolve3, reject3);
  const result = await Promise.race([
    promise1,
    promise3
      .then(
        () => null,
        reason => ({ reason })
      ),
  ]);
  if (result && "reason" in result) throw result.reason;
  const lock = await promise1;
  if (!lock) {
    resolve2();
    return {
      release: notHaveLockRelease,
      [Symbol.asyncDispose]: noop,
    };
  }
  return {
    name: lock.name,
    mode: lock.mode,
    release,
    [Symbol.asyncDispose]: asyncDispose,
  };
  function callback(lock: Lock | null) {
    resolve1(lock);
    return promise2;
  }
  function release() {
    resolve2();
    return promise3.then(() => true, () => false);
  }
  function asyncDispose() {
    return release().then(() => undefined);
  }
}
function notHaveLockRelease() {
  return Promise.resolve(false);
}
function noop() {
  return Promise.resolve();
}

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

function equalName(name: string) {
  return equal;
  function equal({ name: name2 }: LockInfo) {
    return name === name2;
  }
}
export default lock;