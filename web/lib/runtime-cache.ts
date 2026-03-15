type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type GlobalCacheState = {
  values: Map<string, CacheEntry<unknown>>;
  inflight: Map<string, Promise<unknown>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __openclawInspectorCache: GlobalCacheState | undefined;
}

function getCacheState(): GlobalCacheState {
  if (!globalThis.__openclawInspectorCache) {
    globalThis.__openclawInspectorCache = {
      values: new Map(),
      inflight: new Map(),
    };
  }

  return globalThis.__openclawInspectorCache;
}

export async function withRuntimeCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cache = getCacheState();
  const now = Date.now();
  const cached = cache.values.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const inflight = cache.inflight.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      cache.values.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      cache.inflight.delete(key);
      return value;
    })
    .catch((error) => {
      cache.inflight.delete(key);
      throw error;
    });

  cache.inflight.set(key, promise as Promise<unknown>);
  return promise;
}

export function clearRuntimeCache(prefix?: string) {
  const cache = getCacheState();

  if (!prefix) {
    cache.values.clear();
    cache.inflight.clear();
    return;
  }

  for (const key of cache.values.keys()) {
    if (key.startsWith(prefix)) {
      cache.values.delete(key);
    }
  }

  for (const key of cache.inflight.keys()) {
    if (key.startsWith(prefix)) {
      cache.inflight.delete(key);
    }
  }
}
