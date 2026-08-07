import { Cache, FetchCache, FontCache } from "../../src";
import { createContext } from "../../src/context";
import { fetchResource } from "../../src/utils";

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

  test("does not repopulate a reset cache from a request already in flight", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.spyOn(window, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const fetchCache = new FetchCache();
    const context = createContext({ cache: new Cache(fetchCache) });
    const pending = fetchResource("/reset-in-flight.txt", undefined, context);

    fetchCache.reset();
    resolveFetch(new Response("late response"));
    await pending;

    expect(fetchCache.has("/reset-in-flight.txt")).toBe(false);
  });

  test("releases failed requests so they can be retried", async () => {
    let requestCount = 0;
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return requestCount === 1
        ? new Response("", { status: 500, statusText: "Failed" })
        : new Response("retry response");
    });
    const context = createContext();
    const firstPromise = fetchResource("/retry.txt", undefined, context);
    const secondPromise = fetchResource("/retry.txt", undefined, context);

    await Promise.all([
      expect(firstPromise).rejects.toThrow(/cannot fetch/),
      expect(secondPromise).rejects.toThrow(/cannot fetch/),
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const retry = await fetchResource("/retry.txt", undefined, context);
    expect(retry.asString()).toBe("retry response");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("does not share requests between different fetch caches", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () =>
        Promise.resolve(new Response("shared response")),
      );

    const firstContext = createContext();
    const secondContext = createContext();

    const [first, second] = await Promise.all([
      fetchResource("/shared.txt", undefined, firstContext),
      fetchResource("/shared.txt", undefined, secondContext),
    ]);
    expect(first.asString()).toBe("shared response");
    expect(second.asString()).toBe("shared response");

    await fetchResource("/shared.txt", undefined, firstContext);
    await fetchResource("/shared.txt", undefined, secondContext);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("coalesces concurrent requests across shared fetch caches", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => new Response("shared response"));
    const fetchCache = new FetchCache();
    const firstContext = createContext({ cache: new Cache(fetchCache) });
    const secondContext = createContext({ cache: new Cache(fetchCache) });

    const [first, second] = await Promise.all([
      fetchResource("/shared-concurrent.txt", undefined, firstContext),
      fetchResource("/shared-concurrent.txt", undefined, secondContext),
    ]);

    expect(first.asString()).toBe("shared response");
    expect(second.asString()).toBe("shared response");
    expect(first).toBe(second);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("reuses a FetchCache through different Cache instances", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => new Response("shared response"));
    const fetchCache = new FetchCache();
    const firstContext = createContext({
      cache: new Cache(fetchCache, new FontCache()),
    });
    const secondContext = createContext({
      cache: new Cache(fetchCache, new FontCache()),
    });

    const first = await fetchResource("/shared.txt", undefined, firstContext);
    const second = await fetchResource("/shared.txt", undefined, secondContext);

    expect(first.asString()).toBe("shared response");
    expect(second.asString()).toBe("shared response");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("reuses a cached string response", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async (input) =>
        Promise.resolve(
          new Response(String(input), {
            headers: { "Content-Type": "text/plain" },
          }),
        ),
      );
    const context = createContext();

    const first = await fetchResource(
      "/asset.txt?version=1",
      undefined,
      context,
    );
    expect(first.asString()).toContain("version=1");

    const second = await fetchResource(
      "/asset.txt?version=1",
      undefined,
      context,
    );
    expect(second.asString()).toContain("version=1");

    const third = await fetchResource(
      "/asset.txt?version=1",
      undefined,
      context,
    );
    expect(third.asString()).toContain("version=1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("includes query parameters in cache keys by default", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async (input) =>
        Promise.resolve(new Response(String(input))),
      );
    const context = createContext();
    const first = await fetchResource(
      "/asset.txt?version=1",
      undefined,
      context,
    );
    first.asString();
    const second = await fetchResource(
      "/asset.txt?version=2",
      undefined,
      context,
    );
    second.asString();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("strips query parameters from cache keys when disabled", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async (input) =>
        Promise.resolve(new Response(String(input))),
      );

    const context = createContext({ includeQueryParams: false });
    const first = await fetchResource(
      "/asset.txt?version=1",
      undefined,
      context,
    );
    expect(first.asString()).toContain("version=1");

    const second = await fetchResource(
      "/asset.txt?version=2",
      undefined,
      context,
    );
    expect(second.asString()).toContain("version=1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("bypasses cache reads and writes when cache busting", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async (input) =>
        Promise.resolve(new Response(String(input))),
      );
    const context = createContext();

    const cached = await fetchResource("/asset.txt", undefined, context);
    cached.asString();
    const busted = await fetchResource("/asset.txt", undefined, {
      ...context,
      options: {
        ...context.options,
        cacheBust: true,
        includeQueryParams: false,
      },
    });
    busted.asString();
    const reused = await fetchResource("/asset.txt", undefined, context);
    reused.asString();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toMatch(/^\/asset\.txt\?\d+$/);
  });
});
