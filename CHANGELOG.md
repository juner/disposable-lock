# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.0.1] - 2025-11-18

### Fixed

- Improved TypeScript overloads for `request()`:
  - `ifAvailable: true` → returns `Promise<ReleasableLock | null>`
  - default → returns `Promise<ReleasableLock>`
- Improved JSDoc comments for better IntelliSense and documentation clarity.

---

## [2.0.0] - 2025-11-17

### Changed

- `lock(name).request()` now returns `Promise<ReleasableLock | null>` instead of `Promise<ReleasableLock | NotHaveLock>`.
- When a lock cannot be acquired (e.g., `ifAvailable: true`), `null` is returned instead of a dummy object.
- Ensures compatibility with `await using` and AsyncDisposable patterns.

---

## [1.0.1] - 2025-11-14

### Fixed

- Minor adjustments for initial npm publishing (metadata and docs).
- Updated README for clarity and formatting.

---

## [1.0.0] - 2025-11-13

### Added

- Initial release of **disposable-lock**.
- `lock(name, options?)` function to create a simple lock handler.
- `request(options?)` method to acquire a lock (`ReleasableLock`) or fallback (`NotHaveLock`).
- `query()` method to check current lock state (held/pending).
- Full support for `await using` via `Symbol.asyncDispose`.
- Works with native `navigator.locks` or custom `LockManager` (for testing or Node.js environments).
- TypeScript definitions for all interfaces (`ReleasableLock`, `NotHaveLock`, `InnerLock`).

---

[2.0.1]: https://github.com/juner/disposable-lock/releases/tag/v2.0.1
[2.0.0]: https://github.com/juner/disposable-lock/releases/tag/v2.0.0
[1.0.1]: https://github.com/juner/disposable-lock/releases/tag/v1.0.1  
[1.0.0]: https://github.com/juner/disposable-lock/releases/tag/v1.0.0
