/** A size-bounded TTL cache. Map iteration order is insertion order, so the first key is the oldest. */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expires: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): V | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    if (e.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // refresh recency
    this.entries.delete(key);
    this.entries.set(key, e);
    return e.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expires: this.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
