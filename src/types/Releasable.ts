/**
 * A type representing an object that can release a lock asynchronously.
 */
export type Releasable = { release(): Promise<void>; };
