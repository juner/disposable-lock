import type { InnerLock } from "./InnerLock.js";

/**
 * Queries the current lock state (held and pending) for the given lock name.
 *
 * @returns An object like `{ held: LockInfo[] | undefined, pending: LockInfo[] | undefined  }`
 */
export async function query(this: InnerLock) {
  const snapshot = await this.locks.query();
  const equal = equalName(this.name);
  const held = snapshot.held?.filter(equal);
  const pending = snapshot.pending?.filter(equal);
  return {
    held: (held && held.length > 0 ? held : undefined),
    pending: (pending && pending.length > 0 ? pending : undefined),
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
