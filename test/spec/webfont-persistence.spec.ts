import * as htmlToImage from "../../src";
import { test } from "../fixtures";

describe("web font persistence", () => {
  test("reuses cached families without leaking them into another render", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/persistence/leaking/node.html",
      "fonts/persistence/leaking/style.css",
    );
    const rootA = node.querySelector("#root-a") as HTMLElement;
    const rootB = node.querySelector("#root-b") as HTMLElement;
    const cache = new htmlToImage.Cache();

    const first = await htmlToImage.toSvg(rootA, { cache });
    const firstCSS = first.querySelector("style")?.textContent ?? "";
    expect(firstCSS).toContain("Q0FDSEVEQQ==");
    expect(firstCSS).not.toContain("Q0FDSEVEQg==");

    const second = await htmlToImage.toSvg(rootB, { cache });
    const secondCSS = second.querySelector("style")?.textContent ?? "";
    expect(secondCSS).toContain("Q0FDSEVEQg==");
    expect(secondCSS).not.toContain("Q0FDSEVEQQ==");

    document.getElementById("style")!.remove();
    const reused = await htmlToImage.toSvg(rootA, { cache });
    const reusedCSS = reused.querySelector("style")?.textContent ?? "";
    expect(reusedCSS).toContain("Q0FDSEVEQQ==");
    expect(reusedCSS).not.toContain("Q0FDSEVEQg==");
  });

  test("reuses a FontCache through different Cache instances", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/persistence/reused-formats/node.html",
      "fonts/persistence/reused-formats/style.css",
    );
    const fontCache = new htmlToImage.FontCache();

    const first = await htmlToImage.toSvg(node, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
    });
    const firstCSS = first.querySelector("style")?.textContent ?? "";
    expect(firstCSS.match(/@font-face/g)).toHaveLength(2);

    document.getElementById("style")!.remove();
    const reused = await htmlToImage.toSvg(node, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
    });
    const reusedCSS = reused.querySelector("style")?.textContent ?? "";
    expect(reusedCSS.match(/@font-face/g)).toHaveLength(2);
    expect(reusedCSS.indexOf("UkVTVVNFMQ==")).toBeLessThan(
      reusedCSS.indexOf("UkVTVVNFMg=="),
    );
  });

  test("does not store fonts in a shared FetchCache", async ({ bootstrap }) => {
    const node = await bootstrap(
      "fonts/persistence/fetch-isolation/node.html",
      "fonts/persistence/fetch-isolation/style.css",
    );
    const fetchCache = new htmlToImage.FetchCache();
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => new Response("isolated font"));

    const first = await htmlToImage.toSvg(node, {
      cache: new htmlToImage.Cache(fetchCache),
    });
    expect(first.querySelector("style")?.textContent ?? "").toContain("data:");

    document.getElementById("style")!.remove();
    const isolated = await htmlToImage.toSvg(node, {
      cache: new htmlToImage.Cache(fetchCache),
    });
    expect(isolated.querySelector("style")?.textContent ?? "").toBe("");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("keeps preferred font formats separate in a shared cache", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/persistence/preferred-formats/node.html",
      "fonts/persistence/preferred-formats/style.css",
    );
    const cache = new htmlToImage.Cache();

    const woff2 = await htmlToImage.toSvg(node, {
      cache,
      preferredFontFormat: "woff2",
    });
    const woff2CSS = woff2.querySelector("style")?.textContent ?? "";
    expect(woff2CSS).toContain("VzJPTkU=");
    expect(woff2CSS).toContain("VzJUV08=");
    expect(woff2CSS).not.toContain("V09ORQ==");
    expect(woff2CSS).not.toContain("V1RXTw==");

    const woff = await htmlToImage.toSvg(node, {
      cache,
      preferredFontFormat: "woff",
    });
    const woffCSS = woff.querySelector("style")?.textContent ?? "";
    expect(woffCSS).toContain("V09ORQ==");
    expect(woffCSS).toContain("V1RXTw==");
    expect(woffCSS).not.toContain("VzJPTkU=");
    expect(woffCSS).not.toContain("VzJUV08=");
  });

  test("bypasses processed font css when cache busting", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/persistence/cache-bust/node.html",
      "fonts/persistence/cache-bust/style.css",
    );
    const cache = new htmlToImage.Cache();
    let responseIndex = 0;
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(responseIndex++ === 0 ? "A" : "B")),
      );

    const first = await htmlToImage.toSvg(node, { cache });
    const busted = await htmlToImage.toSvg(node, { cache, cacheBust: true });
    const reused = await htmlToImage.toSvg(node, { cache });

    expect(first.querySelector("style")?.textContent ?? "").toMatch(
      /data:[^;]+;base64,QQ==/,
    );
    expect(busted.querySelector("style")?.textContent ?? "").toMatch(
      /data:[^;]+;base64,Qg==/,
    );
    expect(reused.querySelector("style")?.textContent ?? "").toMatch(
      /data:[^;]+;base64,QQ==/,
    );

    const fontRequests = fetchSpy.mock.calls.map(([input]) => input.toString());
    expect(fontRequests).toHaveLength(2);
    expect(fontRequests[0]).not.toContain("?");
    expect(fontRequests[1]).toMatch(/cache-bust-font\.woff2\?\d+$/);
  });

  test("keeps successful cached formats when another format is unavailable", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/persistence/single-format/node.html",
      "fonts/persistence/single-format/style.css",
    );
    const fontCache = new htmlToImage.FontCache();

    const first = await htmlToImage.toSvg(node, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
      preferredFontFormat: "woff",
    });
    expect(first.querySelector("style")?.textContent ?? "").toContain(
      "V09GRk9OTFk=",
    );

    document.getElementById("style")!.remove();
    const unavailable = await htmlToImage.toSvg(node, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
      preferredFontFormat: "woff2",
    });
    expect(unavailable.querySelector("style")?.textContent ?? "").toBe("");

    const reused = await htmlToImage.toSvg(node, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
      preferredFontFormat: "woff",
    });
    expect(reused.querySelector("style")?.textContent ?? "").toContain(
      "V09GRk9OTFk=",
    );
  });

  test("treats empty fontEmbedCSS as an automatic embedding override", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/persistence/auto-embed-override/node.html",
      "fonts/persistence/auto-embed-override/style.css",
    );

    const empty = await htmlToImage.toSvg(node, { fontEmbedCSS: "" });
    expect(empty.querySelectorAll("style")).toHaveLength(0);

    const skipped = await htmlToImage.toSvg(node, {
      fontEmbedCSS: "@font-face { font-family: Supplied; }",
      skipFonts: true,
    });
    expect(skipped.querySelectorAll("style")).toHaveLength(0);
  });

  test("does not track fonts in a removed subtree", async ({ bootstrap }) => {
    const node = await bootstrap(
      "fonts/persistence/removed-subtree/node.html",
      "fonts/persistence/removed-subtree/style.css",
    );
    const removed = node.querySelector("#removed") as HTMLElement;

    const svg = await htmlToImage.toSvg(node, {
      filter: (candidate) => (candidate === removed ? "remove" : "keep"),
    });
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("S0VQVA==");
    expect(cssText).not.toContain("UkVNT1ZFRA==");
  });

  test("clears a reused cache when the render targets another document", async ({
    bootstrap,
  }) => {
    // Both documents define the same family name with different bytes. A
    // cache holds one document's fonts, so the second render must
    // rediscover rather than answer with the first document's faces.
    const node = await bootstrap(
      "fonts/persistence/cross-document/node.html",
      "fonts/persistence/cross-document/style.css",
    );
    const pageRoot = node.querySelector("div") as HTMLElement;
    const iframe = node.querySelector("iframe")!;
    const iframeDocument = iframe.contentDocument!;
    const iframeStyle = iframeDocument.createElement("style");
    iframeStyle.textContent = `
      @font-face {
        font-family: "Shared Name";
        src: url("data:font/woff2;base64,SUZSQU1F") format("woff2");
      }
    `;
    iframeDocument.head.appendChild(iframeStyle);
    const iframeRoot = iframeDocument.createElement("div");
    iframeRoot.style.fontFamily = "Shared Name";
    iframeRoot.textContent = "Font test";
    iframeDocument.body.appendChild(iframeRoot);

    const cache = new htmlToImage.Cache();

    const page = await htmlToImage.toSvg(pageRoot, { cache });
    expect(page.querySelector("style")?.textContent ?? "").toContain(
      "UEFHRQ==",
    );

    // Rendering a node that lives in the iframe resolves against the
    // iframe's own document, so the page's cached face must not be reused.
    const framed = await htmlToImage.toSvg(iframeRoot, { cache });
    const framedCSS = framed.querySelector("style")?.textContent ?? "";
    expect(framedCSS).toContain("SUZSQU1F");
    expect(framedCSS).not.toContain("UEFHRQ==");
  });

  test("does not rescan a document for definitive missing families", async ({
    bootstrap,
  }) => {
    const node = await bootstrap("fonts/cache/missing/node.html");
    const cache = new htmlToImage.Cache();

    const first = await htmlToImage.toSvg(node, { cache });
    expect(first.querySelector("style")?.textContent ?? "").toBe("");

    Object.defineProperty(document, "styleSheets", {
      configurable: true,
      get() {
        throw new Error("The source document was scanned again");
      },
    });

    try {
      const second = await htmlToImage.toSvg(node, { cache });
      expect(second.querySelector("style")?.textContent ?? "").toBe("");
    } finally {
      Reflect.deleteProperty(document, "styleSheets");
    }
  });
});
