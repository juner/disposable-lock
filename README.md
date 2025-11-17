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
  // Create a lock handler
  const { request } = lock("user-data");

  // Request a lock
  const acquired = await request({ mode: "exclusive" });

  if (acquired) {
    console.log(`✅ Lock acquired: ${acquired.name}`);

    // Do something critical
    await doSomething();

    // Release explicitly
    await acquired.release();
  } else {
    console.warn("⚠️ Lock was not available");
  }
}
```

## Using `await using` for automatic cleanup

```ts
import { lock } from "disposable-lock";

async function autoRelease() {
  const cacheLock = lock("cache-update");

  // Automatically releases the lock when the block ends
  await using acquired = await cacheLock.request();

  if (acquired) {
    // Do something critical
    await doSomething();
  } else {
    console.warn("⚠️ Lock was not available");
  }
}
```

## API

`lock(name: string, options?: { locks?: LockManager })`

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
