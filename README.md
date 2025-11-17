# disposable-lock

[![npm version](https://img.shields.io/npm/v/disposable-lock.svg)](https://www.npmjs.com/package/disposable-lock)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

> 🔒 A tiny, modern wrapper around the [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)  
> Provides a clean Promise-based and `async dispose`-friendly interface for lock management.

---

## Features

- 🧩 Minimal and dependency-free — pure TypeScript  
- 🔁 Promise-based lifecycle with `release()`  
- 🪄 Built-in support for `await using` via `Symbol.asyncDispose`  
- 🧠 Works with `navigator.locks` or any custom `LockManager` (great for testing)

---

## Installation

```bash
npm install disposable-lock
# or
pnpm add disposable-lock
```

## Quick Start

```ts
import { lock } from "disposable-lock";

async function main() {
  const { request } = lock("user-data");

  // --- Standard lock acquisition ---
  const acquired = await request({ mode: "exclusive" });

  if (acquired) {
    console.log(`✅ Lock acquired: ${acquired.name}`);
    await doSomething();
    await acquired.release();
  }

  // --- ifAvailable: true ---
  const maybeLock = await request({ ifAvailable: true });
  if (maybeLock) {
    console.log(`✅ Lock acquired (ifAvailable): ${maybeLock.name}`);
    await doSomething();
    await maybeLock.release();
  } else {
    console.log("⚠️ Lock not available (ifAvailable: true), skipping critical section");
  }
}
```

## Using `await using` for automatic cleanup

```ts
import { lock } from "disposable-lock";

async function autoRelease() {
  const cacheLock = lock("cache-update");

  // --- Standard await using ---
  await using acquired = await cacheLock.request();
  if (acquired) {
    console.log("Lock acquired, performing critical section...");
    await doSomething();
  }

  // --- await using with ifAvailable: true ---
  await using maybeLock = await cacheLock.request({ ifAvailable: true });
  if (maybeLock) {
    console.log("Lock acquired (ifAvailable), performing critical section...");
    await doSomething();
  } else {
    console.log("Lock not available (ifAvailable: true), safe to skip");
  }
}
```

### Key Points

- `request()` returns a `ReleasableLock` when successful, or `null` if the lock could not be obtained  
- Wrapping with `await using` ensures automatic release at the end of the block  
- `ifAvailable: true` attempts to acquire the lock but immediately returns `null` if unavailable

## API

### `lock(name: string, options?: { locks?: LockManager })`

Creates a lock handler bound to the given `name`.

Returns an object with:

| Method | Description
| - | -
| `request(options?: LockOptions)` | Request a lock. Returns a `ReleasableLock` or a null.
| `query()` | Query the current state (held and pending locks) for this name.

Throws if `navigator.locks` is unavailable and no custom `LockManager` is provided.

---

### `ReleasableLock`

Represents a successfully acquired lock.

| Property / Method | Type | Description
| - | - | -
| `name` | `string` | Lock name
| `mode` | `"exclusive"` \| `"shared"` | Lock mode
| `release()` | `() => Promise<boolean>` | Releases the lock
| `[Symbol.asyncDispose]()` | `() => Promise<void>` | Enables await using syntax

## Querying lock state

```ts
const userLock = lock("user-data");
const state = await userLock.query();

if (state.held) {
  console.log("Currently held by:", state.held.map(x => x.clientId));
}
if (state.pending) {
  console.log("Pending requests:", state.pending.length);
}
```

## Testing with a custom `LockManager`

When running in Node.js or a test environment where `navigator.locks` is not available,
you can provide your own LockManager instance:

```ts
import { lock } from "disposable-lock";
import { createMockLockManager } from "./test-utils"; // your mock

const locks = createMockLockManager();
const fileLock = lock("file-write", { locks });
```

## Motivation

The [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) provides powerful coordination primitives in browsers,
but its callback-based API can be cumbersome.
disposable-lock offers a clean, composable Promise interface and modern async dispose support — perfect for structured concurrency and testable code.

---

MIT © [juner](https://github.com/juner)
