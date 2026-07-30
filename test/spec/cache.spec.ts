import { createContext } from "../../src/context";
import { fetchResource } from "../../src/utils";

describe("resource cache", () => {
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
      expect(firstPromise).rejects.toThrowError(/cannot fetch/),
      expect(secondPromise).rejects.toThrowError(/cannot fetch/),
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const retry = await fetchResource("/retry.txt", undefined, context);
    expect(retry.asString()).toBe("retry response");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("stores a shared request in each caller context", async () => {
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
