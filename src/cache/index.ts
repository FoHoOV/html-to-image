export * from "./fetch-cache";
export * from "./font-cache";

import { FetchCache } from "./fetch-cache";
import { FontCache } from "./font-cache";

/** Composes the caller-owned caches a render reads and writes. */
export class Cache {
  constructor(
    public readonly fetchCache = new FetchCache(),
    public readonly fontCache = new FontCache(),
  ) {}

  /**
   * Resets both component caches. Reset them individually when only one kind
   * of work went stale.
   */
  reset() {
    this.fetchCache.reset();
    this.fontCache.reset();
  }
}
