interface CacheEntry<T> {
  value: T;
  expiry: number;
  created: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(defaultTTLMs: number = 300000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTLMs;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    };

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTTL);
    
    this.cache.set(key, {
      value,
      expiry,
      created: Date.now()
    });

    this.stats.sets++;
    this.stats.size = this.cache.size;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.deletes++;
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  // Get or set pattern - common caching pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get hit rate
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.stats.deletes += deletedCount;
      this.stats.size = this.cache.size;
    }
  }

  // Get all keys (for debugging)
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache size in bytes (approximate)
  getSizeBytes(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.value).length * 2;
      size += 24; // Approximate overhead for entry metadata
    }
    return size;
  }

  // Destroy the cache service
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
} 