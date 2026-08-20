import { LRUCache } from 'lru-cache';

/**
 * High-Performance In-Memory LRU Cache Service
 * Provides sub-millisecond retrieval for search queries, pagination slices,
 * individual game AI rationales, and full LLM synthesized game code.
 */

// 1. Search Pages Cache (Stores ranked & paginated search results with rationales)
export const searchCache = new LRUCache({
  max: 500, // store up to 500 query pages
  ttl: 1000 * 60 * 30, // 30 minutes TTL
  allowStale: false,
  updateAgeOnGet: true
});

// 2. Individual Game Rationale Cache (Stores AI rationale per game & prompt)
export const rationaleCache = new LRUCache({
  max: 2500, // store up to 2500 game rationales
  ttl: 1000 * 60 * 60, // 1 hour TTL
  allowStale: false,
  updateAgeOnGet: true
});

// 3. Synthesized Game Code Cache (Stores full executable HTML5 Canvas code)
export const codeSynthesisCache = new LRUCache({
  max: 200, // store up to 200 custom synthesized games
  ttl: 1000 * 60 * 60 * 2, // 2 hours TTL
  allowStale: false,
  updateAgeOnGet: true
});

// 4. Prompt Attribute Extraction Cache (Stores parsed attributes per prompt)
export const attributeCache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour TTL
  allowStale: false,
  updateAgeOnGet: true
});

// Cache telemetry & metrics
let hits = 0;
let misses = 0;

export function recordCacheHit() {
  hits++;
}

export function recordCacheMiss() {
  misses++;
}

export function getCacheStats() {
  const total = hits + misses;
  const hitRatio = total > 0 ? ((hits / total) * 100).toFixed(1) : '0.0';
  return {
    hits,
    misses,
    totalRequests: total,
    hitRatio: `${hitRatio}%`,
    searchCacheSize: searchCache.size,
    rationaleCacheSize: rationaleCache.size,
    codeCacheSize: codeSynthesisCache.size
  };
}
