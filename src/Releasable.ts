/**
 * A type representing an object that can release a lock asynchronously.
 */
export type Releasable<T extends boolean = boolean> = { release(): Promise<T>; };
