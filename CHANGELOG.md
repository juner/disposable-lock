# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0][1.0.0] - 2025-11-13

### Added

- Initial release of **disposable-lock**.
- `lock(name, options?)` function to create a simple lock handler.
- `request(options?)` method to acquire a lock (`ReleasableLock`) or a fallback (`NotHaveLock`).
- `query()` method to check the current lock state (held/pending).
- Full support for `await using` via `Symbol.asyncDispose`.
- Works with native `navigator.locks` or custom `LockManager` (for testing or Node.js environments).
- TypeScript types for all interfaces (`ReleasableLock`, `NotHaveLock`, `InnerLock`).

### Fixed

- N/A (initial release)

### Changed

- N/A (initial release)

### Deprecated

- N/A (initial release)

### Removed

- N/A (initial release)

---

[1.0.0]: https://github.com/juner/disposable-lock/releases/tag/v1.0.0
