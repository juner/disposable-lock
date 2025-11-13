import { describe, test } from "vitest";
import { lock } from ".";
describe("simple use", () => {
  {
    const name = "simple use exclusive lock";
    test.concurrent("simple use exclusive lock", async ({ expect }) => {
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
    const name = "exclusive lock";
    test.concurrent("exclusive lock", async ({ expect }) => {
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
