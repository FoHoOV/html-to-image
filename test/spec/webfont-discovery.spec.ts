import * as htmlToImage from "../../src";
import { test } from "../fixtures";

function addUnreadableStylesheet(href: string, media?: string) {
  const style = document.createElement("style");
  if (media) {
    style.media = media;
  }
  document.getElementById("style")!.after(style);

  const sheet = style.sheet!;
  vi.spyOn(sheet, "href", "get").mockReturnValue(href);
  vi.spyOn(sheet, "cssRules", "get").mockImplementation(() => {
    throw new DOMException("Cannot access rules", "SecurityError");
  });
}

describe("font discovery", () => {
  test("continues when an imported stylesheet cannot be fetched", async ({
    bootstrap,
  }) => {
    const node = await bootstrap("fonts/discovery/import-failure/node.html");

    // Unreadable, so its rules must be refetched by text rather than read live.
    const stylesheetHref = "https://styles.invalid/remote.css";
    addUnreadableStylesheet(stylesheetHref);

    const stylesheetCSS = `
      @import url("https://fonts.invalid/missing.css");
      @font-face {
        font-family: "Available Font";
        src: url("data:font/woff2;base64,QVZBSUxBQkxF") format("woff2");
      }
    `;
    const nativeFetch = window.fetch.bind(window);
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementation((input) => {
      if (input.toString().includes("fonts.invalid")) {
        return Promise.reject(new Error("Remote stylesheet failed"));
      }
      if (input.toString() === stylesheetHref) {
        return Promise.resolve(new Response(stylesheetCSS));
      }
      return nativeFetch(input);
    });

    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("QVZBSUxBQkxF");
    expect(
      fetchSpy.mock.calls.filter(
        ([input]) => input.toString() === stylesheetHref,
      ),
    ).toHaveLength(1);
    expect(
      fetchSpy.mock.calls.filter(([input]) =>
        input.toString().includes("fonts.invalid"),
      ),
    ).toHaveLength(1);
  });

  test("resolves a relative font src url against the declaring stylesheet's own url", async ({
    bootstrap,
    delay,
  }) => {
    const nativeFetch = window.fetch.bind(window);
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementation((input) => {
      const url = input.toString();
      if (
        url.endsWith("/fonts/font1.woff") ||
        url.endsWith("/fonts/web-fonts/font2.woff2")
      ) {
        return Promise.resolve(
          new Response("FAKEFONTDATA", {
            headers: { "Content-Type": "font/woff2" },
          }),
        );
      }
      return nativeFetch(input);
    });

    // Font1's src is `../font1.woff`, relative to rules-relative.css's own
    // directory (fonts/web-fonts/) rather than to the page.
    const node = await bootstrap("fonts/discovery/relative-src/node.html");
    await delay(1000);

    await htmlToImage.toSvg(node);

    expect(
      fetchSpy.mock.calls.some(([requested]) =>
        requested.toString().endsWith("/fonts/font1.woff"),
      ),
    ).toBe(true);
  });

  test("retries a failed import when nothing was cached for the family", async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "fonts/discovery/retry-import/node.html",
      "fonts/discovery/retry-import/style.css",
    );
    await delay(1000);

    const stylesheetUrl = new URL(
      "/fonts/web-fonts/failure.css",
      window.location.href,
    );
    const importRule = (document.getElementById("style") as HTMLStyleElement)
      .sheet!.cssRules[0] as CSSImportRule;
    vi.spyOn(importRule, "styleSheet", "get").mockReturnValue(null);

    let importFetches = 0;
    const nativeFetch = window.fetch.bind(window);
    vi.spyOn(window, "fetch").mockImplementation((input) => {
      if (input.toString() !== stylesheetUrl.href) {
        return nativeFetch(input);
      }

      importFetches += 1;
      return importFetches === 1
        ? Promise.reject(new Error("Import failed"))
        : Promise.resolve(
            new Response(`@font-face {
                font-family: "Retryable Import";
                src: url("data:font/woff2;base64,UkVUUlk=") format("woff2");
              }`),
          );
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cache = new htmlToImage.Cache();

    // The failure leaves the family unresolved, so nothing is cached for it.
    const first = await htmlToImage.toSvg(node, { cache });
    expect(first.querySelector("style")?.textContent ?? "").toBe("");

    const second = await htmlToImage.toSvg(node, { cache });
    expect(second.querySelector("style")?.textContent ?? "").toContain(
      "UkVUUlk=",
    );
    expect(importFetches).toBe(2);
  });

  test("reuses a cached family without refetching an unrelated stylesheet", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/discovery/cache-first/node.html",
      "fonts/discovery/cache-first/style.css",
    );

    // Unreadable, and it declares no family this render uses.
    const stylesheetHref = "https://styles.invalid/remote.css";
    addUnreadableStylesheet(stylesheetHref, "screen");

    const nativeFetch = window.fetch.bind(window);
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementation((input) =>
      input.toString().startsWith(stylesheetHref)
        ? Promise.resolve(
            new Response(`@font-face {
                font-family: "Different External Font";
                src: url("data:font/woff2;base64,RVhURVJOQUw=") format("woff2");
              }`),
          )
        : nativeFetch(input),
    );
    const cache = new htmlToImage.Cache();

    const first = await htmlToImage.toSvg(node, { cache, cacheBust: true });
    const second = await htmlToImage.toSvg(node, { cache, cacheBust: true });

    expect(first.querySelector("style")?.textContent ?? "").toContain(
      "TE9DQUw=",
    );
    expect(second.querySelector("style")?.textContent ?? "").toContain(
      "TE9DQUw=",
    );
    expect(
      fetchSpy.mock.calls.filter(([input]) =>
        input.toString().startsWith(stylesheetHref),
      ),
    ).toHaveLength(1);
  });
});
