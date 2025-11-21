import { describe, test, vi } from "vitest";
import type { BeforeEachListener, AfterEachListener } from "@vitest/runner";
import { lock } from "./index.js";
describe("simple use", (args) => {
  useUnhandleRejectionLogging(args);
  {
    const name = "simple lock";
    test.concurrent("simple lock", async ({ expect }) => {
      const { request, query } = lock(name);
      await expect(query()).resolves.toEqual({
        held: undefined,
        pending: undefined,
      });

      {
        await using l = await request();
        expect(l).toBeDefined();
        expect(l.name).toEqual(name);
        expect(l.mode).toEqual("exclusive");
        expect(l.release).instanceOf(Function);
        expect(l[Symbol.asyncDispose]).instanceOf(Function);
        await expect(query()).resolves.toEqual({
          held: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
        });
      }

      await expect(query()).resolves.toEqual({
        held: undefined,
        pending: undefined,
      });
    });
  }
  {
    const name = "mode:exclusive";
    test.concurrent("mode:exclusive", async ({ expect }) => {
      const { request, query } = lock(name);
      let lock2Wait;
      let counter = 0;
      {
        await using lock1 = await request({
          mode: "exclusive",
        });
        expect(lock1).toBeDefined();
        expect(counter++).toEqual(0);
        await expect(query()).resolves.toEqual({
          held: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
          pending: undefined,
        });
        lock2Wait = request({
          mode: "exclusive",
        });
        expect(counter++).toEqual(1);
        await expect(query()).resolves.toEqual({
          held: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
          pending: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
        });
        lock2Wait.finally(() => expect(counter++).toEqual(2));
        await lock1.release();
        await using lock2 = await lock2Wait;
        expect(lock2).toBeDefined();
        expect(lock2.name).toBeDefined();
        expect(counter++).toEqual(3);
      }
      await expect(query()).resolves.toEqual({
        held: undefined,
        pending: undefined,
      });
    });
  }
  {
    const name = "mode:shared";
    test.concurrent("mode:shared", async ({ expect }) => {
      const { request, query } = lock(name);
      {
        await using lock1 = await request({
          mode: "shared",
        });
        expect(lock1).toBeDefined();
        await expect(query()).resolves.toHaveProperty("held");
        await using lock2 = await request({
          mode: "shared",
        });
        expect(lock2).toBeDefined();
        expect(lock2.name).toBe(name);
        const lock3Wait = request({
          mode: "exclusive",
        });

        await expect(query()).resolves.toEqual({
          held: [
            {
              clientId: expect.any(String),
              mode: "shared",
              name,
            }, {
              clientId: expect.any(String),
              mode: "shared",
              name,
            }
          ],
          pending: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
        });
        await expect(lock1.release()).resolves.toBeUndefined();
        await expect(lock2.release()).resolves.toBeUndefined();

        await expect(query()).resolves.toEqual({
          held: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
          pending: undefined,
        });
        await using lock3 = await lock3Wait;
        expect(lock3).toBeDefined();
        expect(lock3.name).toBe(name);
        await expect(query()).resolves.toEqual({
          held: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
          pending: undefined,
        });
      }
    });
  }
  {
    const name = "use signal";
    test.concurrent("use signal", async ({ expect }) => {
      const { request } = lock(name);
      {
        const controller = new AbortController();
        const signal = controller.signal;
        await using _ = await request();
        let reasonWait: Promise<unknown>;
        let abortWait: Promise<void>;
        {
          await using _ = fakeTimeer();
          reasonWait = request({ signal }).catch(reason => reason);
          abortWait = timeout().then(() => controller.abort());
        }
        await Promise.allSettled([reasonWait, abortWait]);
        await expect(reasonWait).resolves.toEqual(expect.objectContaining({
          message: "This operation was aborted",
          name: "AbortError",
        }));
      }
      // `signal` only affects the lock acquisition and does not affect the release.
      {
        const controller = new AbortController();
        const signal = controller.signal;
        await using lock1 = await request({ signal });
        controller.abort();
        await expect(lock1.release()).resolves.toBeUndefined();
      }
    });
  }
  {
    const name = "ifAvailable:true";
    test.concurrent("ifAvailable:true", async ({ expect }) => {
      const { request } = lock(name);
      {
        await using _ = await request();
        await using lock2 = await request({
          ifAvailable: true
        });
        expect(lock2).toBeNull();
      }
    });
  }
  {
    const name = "steal:true";
    test.concurrent("steal:true", async ({ expect }) => {
      const { request } = lock(name);
      {
        await using lock1 = await request();
        expect(lock1).toBeDefined();
        const lock2Wait = request();
        await using lock3 = await request({
          steal: true,
        });
        expect(lock3).toBeDefined();
        expect(lock3.name).toBe(name);
        await expect(lock1.release()).resolves.toBeUndefined();
        await expect(lock3.release()).resolves.toBeUndefined();
        await using lock2 = await lock2Wait;
        expect(lock2).toBeDefined();
        if (!lock2) return;
        expect(lock2.name).toBe(name);
      }
    });
  }
  {
    const name = "steal:true and ifAvailable:true";
    test.concurrent("steal:true and ifAvailable:true", async ({ expect }) => {
      const { request } = lock(name);
      {
        const lockWait = request({
          ifAvailable: true,
          steal: true,
        });
        await expect(lockWait).rejects.toThrowError(expect.objectContaining({
          message: "ifAvailable and steal are mutually exclusive",
          name: "NotSupportedError"
        }));
      }
    });
  }
});
describe("hard error pattern", (args) => {
  useUnhandleRejectionLogging(args);
  const name = "not found navigator.locks";
  test("not found navigator.locks", async ({ expect }) => {
    const locks = (globalThis.navigator as unknown as { locks: LockManager }).locks;
    Object.defineProperty(globalThis.navigator, "locks", {
      writable: true,
      value: undefined,
    });
    try {
      expect(() => lock(name)).toThrowError(expect.objectContaining({
        message: "navigator.locks is not found. required options.locks argument."
      }));

      const { request, query } = lock(name, { locks });
      {
        await using _ = await request();
        await expect(query()).resolves.toEqual({
          held: [
            {
              clientId: expect.any(String),
              mode: "exclusive",
              name,
            }
          ],
          pending: undefined,
        });
      }
      await expect(query()).resolves.toEqual({
        held: undefined,
        pending: undefined,
      });
    } finally {
      Object.defineProperty(globalThis.navigator, "locks", {
        writable: true,
        value: locks,
      });
    }
  });
});

/**
 * Promise base setTimeout with abort signal
 * @param ms 
 * @param options 
 * @returns 
 */
async function timeout(ms?: number, options?: { signal?: AbortSignal }) {
  const { resolve, promise } = Promise.withResolvers<void>();
  const clear = setTimeout(resolve, ms);
  if (options?.signal) {
    options.signal.addEventListener("abort", abort, { once: true });
  }
  try {
    return await promise;
  } finally {
    if (options?.signal) {
      options.signal.removeEventListener("abort", abort);
    }
  }
  function abort() {
    clearTimeout(clear);
    resolve();
  }
}

/**
 * Handle unhandledRejection event and return disposable to off the event.
 * @param onUnhandledRejection 
 * @returns 
 */
function unhandleRejection(onUnhandledRejection?: (reason: unknown, promise: Promise<unknown>) => void) {
  onUnhandledRejection ??= () => undefined;
  process.on("unhandledRejection", onUnhandledRejection);
  return {
    [Symbol.dispose]: off,
  };
  function off() {
    process.off("unhandledRejection", onUnhandledRejection!);
  }
}

/**
 * use fake timer and return async disposable to restore real timer.
 * @returns 
 */
function fakeTimeer() {
  vi.useFakeTimers();
  return {
    advanceTimersByTimeAsync,
    runAllTimersAsync,
    [Symbol.asyncDispose]: runAllTimersAsync,
  };
  async function advanceTimersByTimeAsync(time: number) {
    await vi.advanceTimersByTimeAsync(time);
  }
  async function runAllTimersAsync() {
    await vi.runAllTimersAsync();
  }
}

/**
 * describe unhandledRejection logging utility
 * @param param0 
 */
function useUnhandleRejectionLogging({ beforeEach, afterEach }
  : {
    beforeEach: (fn: BeforeEachListener<object>, timeout?: number) => void,
    afterEach: (fn: AfterEachListener<object>, timeout?: number) => void
  }) {
  type HandlerInstance = {
    [Symbol.dispose]: () => void,
    reasones?: unknown[] | undefined,
  }
  const handles = new Map<string, HandlerInstance>();
  beforeEach(({ task: { id } }) => {
    const instance = {} as HandlerInstance;
    const disposable = unhandleRejection(callback.bind(instance));
    (instance as { [Symbol.dispose]?: () => void })[Symbol.dispose] = disposable[Symbol.dispose].bind(disposable);

    handles.set(id, instance);
  });
  afterEach(({ task: { id } }) => {
    const instance = handles.get(id);
    {
      using _ = instance;
    }
    if (!(instance?.reasones)) return;
    for (const reason of instance.reasones) {
      console.error(reason);
    }
  });
  function callback(this: HandlerInstance, reason: unknown) {
    (this.reasones ??= []).push(reason);
  }
}