const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function get<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidate(pattern?: string): void {
  if (!pattern) {
    store.clear();
    return;
  }
  const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
