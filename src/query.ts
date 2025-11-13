import type { InnerLock } from "./InnerLock.js";

/**
 * Queries the current lock state (held and pending) for the given lock name.
 *
 * @returns An object like `{ held: boolean, pending: boolean }`
 */
export async function query(this: InnerLock) {
  const snapshot = await this.locks.query();
  const equal = equalName(this.name);
  const held = snapshot.held?.some(equal);
  const pending = snapshot.pending?.some(equal);
  return {
    held,
    pending,
  };
}

/**
 * Helper to compare lock names.
 */
export function equalName(name: string) {
  return equal;
  function equal({ name: name2 }: LockInfo) {
    return name === name2;
  }
}
