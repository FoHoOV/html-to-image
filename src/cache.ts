export interface CacheValue {
  contentType: string
  response: ArrayBuffer
}

export class Cache {
  private values = new Map<string, CacheValue>()

  add(key: string, value: CacheValue) {
    this.values.set(key, value)
  }

  get(key: string) {
    return this.values.get(key)
  }

  has(key: string) {
    return this.values.has(key)
  }
}
