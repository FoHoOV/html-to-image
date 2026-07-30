export type Resource = {
  contentType: string;
  asString: () => string;
  asDataUrl: () => string | Promise<string>;
};

export class Cache {
  private values = new Map<string, Resource>();

  add(key: string, value: Resource) {
    this.values.set(key, value);
  }

  get(key: string) {
    return this.values.get(key);
  }

  has(key: string) {
    return this.values.has(key);
  }
}
