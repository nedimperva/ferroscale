/**
 * "Storage was rewritten under you." Hooks load a collection once and then own
 * it in React state, so a write that does not come from the hook itself — a
 * restored backup, records pulled from Drive — never reaches the screen unless
 * something says so. Those writers call `notifyCollectionsReplaced()` after the
 * last persist; every collection hook re-reads storage when it fires.
 */
type Listener = () => void;

let listeners: Listener[] = [];

export function subscribeCollectionsReplaced(listener: Listener): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function notifyCollectionsReplaced(): void {
  for (const listener of listeners) listener();
}
