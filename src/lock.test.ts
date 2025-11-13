import { describe, test } from "vitest";
import { lock } from "./index.js";
describe("simple use", () => {
  {
    const name = "simple lock";
    test.concurrent("simple lock", async ({ expect }) => {
      const { request, query } = lock(name);
      await expect(query()).resolves.toEqual({
        held: false,
        pending: false,
      });

      {
        await using l = await request();
        expect(l.name).toEqual(name);
        expect(l.mode).toEqual("exclusive");
        expect(l.release).instanceOf(Function);
        expect(l[Symbol.asyncDispose]).instanceOf(Function);
        await expect(query()).resolves.toEqual({
          held: true,
          pending: false,
        });
      }

      await expect(query()).resolves.toEqual({
        held: false,
        pending: false,
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
        expect(counter++).toEqual(0);
        await expect(query()).resolves.toEqual({
          held: true,
          pending: false,
        });
        lock2Wait = request({
          mode: "exclusive",
        });
        expect(counter++).toEqual(1);
        await expect(query()).resolves.toEqual({
          held: true,
          pending: true,
        });
        lock2Wait.finally(() => expect(counter++).toEqual(2));
        await lock1.release();
        await using lock2 = await lock2Wait;
        expect(lock2.name).toBeDefined();
        expect(counter++).toEqual(3);
      }
      await expect(query()).resolves.toEqual({
        held: false,
        pending: false,
      });
    });
  }
  {
    const name = "mode:shared";
    test.concurrent("mode:shared", async ({expect}) => {
      const {request, query} = lock(name);
      {
        await using lock1 = await request({
          mode: "shared",
        });
        await expect(query()).resolves.toEqual({
          held: true,
          pending: false,
        });
        await using lock2 = await request({
          mode: "shared",
        });
        expect(lock2.name).toBe(name);
        const lock3Wait = request({
          mode: "exclusive",
        });
        
        await expect(query()).resolves.toEqual({
          held: true,
          pending: true,
        });
        await expect(lock1.release()).resolves.toBe(true);
        await expect(lock2.release()).resolves.toBe(true);
        
        await expect(query()).resolves.toEqual({
          held: true,
          pending: false,
        });
        await using lock3 = await lock3Wait;
        expect(lock3.name).toBe(name);
        await expect(query()).resolves.toEqual({
          held: true,
          pending: false,
        });
      }
    });
  }
  {
    const name = "use signal";
    test.concurrent("use signal", async ({expect}) => {
      const {request} = lock(name);
      {
        const controller = new AbortController();
        const signal = controller.signal;
        await using _ = await request();
        const lock2Wait = request({signal});
        controller.abort();
        await expect(lock2Wait).rejects.toThrow("This operation was aborted");
      }
    });
  }
  {
    const name = "ifAvailable:true";
    test.concurrent("ifAvailable:true", async ({expect}) => {
      const {request} = lock(name);
      {
        await using _ = await request();
        await using lock2 = await request({
          ifAvailable:true
        });
        expect(lock2.name).toBeUndefined();
        expect(lock2.mode).toBeUndefined();
        expect(lock2.release).instanceOf(Function);
        expect(lock2[Symbol.asyncDispose]).instanceOf(Function);
        await expect(lock2.release()).resolves.toBe(false);
      }
    });
  }
  {
    const name = "steal:true";
    test.concurrent("steal:true", async({expect}) => {
      const {request} = lock(name);
      {
        await using lock1 = await request();
        const lock2Wait = request();
        await using lock3 = await request({
          steal: true,
        });
        expect(lock3.name).toBe(name);
        await expect(lock1.release()).resolves.toBe(false);
        await expect(lock3.release()).resolves.toBe(true);
        await using lock2 = await lock2Wait;
        expect(lock2.name).toBe(name);
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
      expect(() => lock(name)).toThrow("navigator.locks is not found. required options.locks argument.");

      const { request, query } = lock(name, { locks });
      {
        await using _ = await request();
        await expect(query()).resolves.toEqual({
          held: true,
          pending: false,
        });
      }
      await expect(query()).resolves.toEqual({
        held: false,
        pending: false,
      });
    } finally {
      Object.defineProperty(globalThis.navigator, "locks", {
        writable: true,
        value: locks,
      });
    }
  });
});
