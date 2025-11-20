import { describe, test } from "vitest";
import { lock } from "./index.js";
describe("simple use", () => {
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
        const lock2Wait = request({ signal });
        controller.abort();
        await expect(lock2Wait).rejects.toThrow(expect.objectContaining({
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
        await expect(lockWait).rejects.toThrow(expect.objectContaining({
          message: "ifAvailable and steal are mutually exclusive",
          name: "NotSupportedError"
        }));
      }
    });
  }
});
describe("hard error pattern", () => {
  const name = "not found navigator.locks";
  test("not found navigator.locks", async ({ expect }) => {
    const locks = (globalThis.navigator as unknown as { locks: LockManager }).locks;
    Object.defineProperty(globalThis.navigator, "locks", {
      writable: true,
      value: undefined,
    });
    try {
      expect(() => lock(name)).toThrow(expect.objectContaining({
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
