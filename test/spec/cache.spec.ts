import { Cache, FetchCache, FontCache, toDataUrl } from "../../src";
import { test } from "../fixtures";

function pngResponse(body = "resource") {
  return new Response(body, { headers: { "Content-Type": "image/png" } });
}

function decodablePngResponse() {
  const base64Png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";

  const bytes = Uint8Array.from(atob(base64Png), (char) => char.charCodeAt(0));
  return new Response(bytes, { headers: { "Content-Type": "image/png" } });
}

describe("resource cache", () => {
  test("keeps cache operations on the component caches", () => {
    const fetchCache = new FetchCache();
    const resource = {
      asDataUrl: () => "data:text/plain,cache",
      asString: () => "cache",
      contentType: "text/plain",
    };

    fetchCache.add("resource", resource);

    expect(fetchCache.has("resource")).toBe(true);
    expect(fetchCache.get("resource")).toBe(resource);
    expect(new Cache()).not.toHaveProperty("add");
  });

  test("keeps font discovery state behind the FontCache api", () => {
    const fontCache = new FontCache();

    expect(fontCache.isMissing(document, "inter")).toBe(false);
    fontCache.rememberMissing(document, "inter");
    expect(fontCache.isMissing(document, "inter")).toBe(true);
  });

  test("resets component caches in place", () => {
    const fetchCache = new FetchCache();
    const fontCache = new FontCache();
    const cache = new Cache(fetchCache, fontCache);

    fetchCache.add("resource", {
      asDataUrl: () => "data:text/plain,cache",
      asString: () => "cache",
      contentType: "text/plain",
    });
    fontCache.rememberMissing(document, "inter");

    cache.reset();

    // The same instances stay usable, so a caller holding a reference keeps it.
    expect(cache.fetchCache).toBe(fetchCache);
    expect(cache.fontCache).toBe(fontCache);
    expect(fetchCache.has("resource")).toBe(false);
    expect(fontCache.isMissing(document, "inter")).toBe(false);
  });

  test("does not repopulate a reset cache from a request already in flight", async ({
    createBackgroundNode,
  }) => {
    let resolveFetch!: (response: Response) => void;
    let fetchStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      fetchStarted = resolve;
    });
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementationOnce(() => {
      fetchStarted();
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });

    const fetchCache = new FetchCache();
    const pending = toDataUrl(createBackgroundNode("/reset-in-flight.png"), {
      cache: new Cache(fetchCache),
    });

    // Rendering reaches the fetch call only after several more async hops
    // than calling fetchResource directly did, so wait for it to actually
    // start before resolving/resetting around it.
    await started;
    fetchCache.reset();
    resolveFetch(pngResponse());
    await pending;

    // The reset entry was not stored, so a render sharing the same cache
    // re-fetches instead of reusing it.
    fetchSpy.mockResolvedValue(pngResponse());
    await toDataUrl(createBackgroundNode("/reset-in-flight.png"), {
      cache: new Cache(fetchCache),
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("releases failed requests so they can be retried", async ({
    createImageNode,
  }) => {
    let requestCount = 0;
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return requestCount === 1
        ? new Response("", { status: 500, statusText: "Failed" })
        : decodablePngResponse();
    });
    const cache = new Cache();
    const url = "/retry.png";

    await expect(toDataUrl(createImageNode(url), { cache })).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // The failed request was not cached, so retrying re-fetches and succeeds.
    await toDataUrl(createImageNode(url), { cache });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("does not share requests between different fetch caches", async ({
    createBackgroundNode,
  }) => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => pngResponse("shared response"));
    const url = "/shared.png";

    await Promise.all([
      toDataUrl(createBackgroundNode(url), { cache: new Cache() }),
      toDataUrl(createBackgroundNode(url), { cache: new Cache() }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("coalesces concurrent requests across shared fetch caches", async ({
    createBackgroundNode,
  }) => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => pngResponse("shared response"));
    const cache = new Cache(new FetchCache());
    const url = "/shared-concurrent.png";

    await Promise.all([
      toDataUrl(createBackgroundNode(url), { cache }),
      toDataUrl(createBackgroundNode(url), { cache }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("reuses a FetchCache through different Cache instances", async ({
    createBackgroundNode,
  }) => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => pngResponse("shared response"));
    const fetchCache = new FetchCache();
    const url = "/shared.png";

    await toDataUrl(createBackgroundNode(url), {
      cache: new Cache(fetchCache, new FontCache()),
    });
    await toDataUrl(createBackgroundNode(url), {
      cache: new Cache(fetchCache, new FontCache()),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("reuses a cached response", async ({ createBackgroundNode }) => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => pngResponse());
    const cache = new Cache();
    const url = "/asset.png?version=1";

    await toDataUrl(createBackgroundNode(url), { cache });
    await toDataUrl(createBackgroundNode(url), { cache });
    await toDataUrl(createBackgroundNode(url), { cache });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("includes query parameters in cache keys by default", async ({
    createBackgroundNode,
  }) => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => pngResponse());
    const cache = new Cache();

    await toDataUrl(createBackgroundNode("/asset.png?version=1"), { cache });
    await toDataUrl(createBackgroundNode("/asset.png?version=2"), { cache });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("strips query parameters from cache keys when disabled", async ({
    createBackgroundNode,
  }) => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => pngResponse());
    const cache = new Cache();
    const options = { cache, includeQueryParams: false };

    await toDataUrl(createBackgroundNode("/asset.png?version=1"), options);
    await toDataUrl(createBackgroundNode("/asset.png?version=2"), options);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("bypasses cache reads and writes when cache busting", async ({
    createBackgroundNode,
  }) => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => pngResponse());
    const cache = new Cache();
    const url = "/asset.png";

    await toDataUrl(createBackgroundNode(url), { cache });
    await toDataUrl(createBackgroundNode(url), {
      cache,
      cacheBust: true,
      includeQueryParams: false,
    });
    await toDataUrl(createBackgroundNode(url), { cache });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toMatch(/^\/asset\.png\?\d+$/);
  });
});
