import { Store } from "@tanstack/store";

/**
 * Create a TanStack Store whose state is hydrated from and persisted to
 * localStorage under `key`. Replaces zustand's `persist` middleware.
 */
export function persistStore<T extends object>(key: string, initial: T): Store<T> {
  let hydrated = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) hydrated = { ...initial, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    // Ignore corrupt or unavailable storage and fall back to defaults.
  }

  const store = new Store<T>(hydrated);
  store.subscribe(() => {
    try {
      localStorage.setItem(key, JSON.stringify(store.state));
    } catch {
      // Ignore quota / unavailable storage errors.
    }
  });
  return store;
}
