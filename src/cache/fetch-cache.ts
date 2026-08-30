export type Resource = {
  contentType: string;
  asString: () => string;
  asDataUrl: () => string | Promise<string>;
};

export class FetchCache {
  private resources = new Map<string, Resource>();
  private requests = new Map<string, Promise<Resource>>();
  /** Bumped by `reset`, so a request started before it does not repopulate. */
  private generation = 0;

  /**
   * Drops every fetched resource, so the next render requests them again.
   * Requests already in flight still settle for whoever awaits them, but their
   * results are not stored.
   */
  reset() {
    this.resources = new Map();
    this.requests = new Map();
    this.generation += 1;
  }

  get(key: string) {
    return this.resources.get(key);
  }

  add(key: string, resource: Resource) {
    this.resources.set(key, resource);
  }

  has(key: string) {
    return this.resources.has(key);
  }

  /**
   * Returns the cached resource, joins a request already in flight for the same
   * key, or starts one. Failed requests are released so a later call can retry.
   */
  async load(key: string, loader: () => Promise<Resource>) {
    const resource = this.resources.get(key);
    if (resource) {
      return resource;
    }

    let request = this.requests.get(key);
    if (!request) {
      request = loader();
      this.requests.set(key, request);
    }

    const generation = this.generation;
    try {
      const loadedResource = await request;
      if (generation === this.generation) {
        this.resources.set(key, loadedResource);
      }
      return loadedResource;
    } finally {
      if (this.requests.get(key) === request) {
        this.requests.delete(key);
      }
    }
  }
}
