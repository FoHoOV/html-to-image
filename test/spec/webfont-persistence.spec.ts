import * as htmlToImage from "../../src";
import { test } from "../fixtures";
import { addRoot, addStyle, getEmbeddedFontCSS } from "../webfont-helpers";

describe("web font persistence", () => {
  test("reuses cached families without leaking them into another render", async ({
    getSvgDocument,
  }) => {
    const style = addStyle(`
      @font-face {
        font-family: "Cached A";
        src: url("data:font/woff2;base64,Q0FDSEVEQQ==") format("woff2");
      }
      @font-face {
        font-family: "Cached B";
        src: url("data:font/woff2;base64,Q0FDSEVEQg==") format("woff2");
      }
    `);
    const rootA = addRoot("Cached A");
    const rootB = addRoot("Cached B");
    const cache = new htmlToImage.Cache();

    try {
      const first = await getEmbeddedFontCSS(rootA, getSvgDocument, { cache });
      expect(first.cssText).toContain("Q0FDSEVEQQ==");
      expect(first.cssText).not.toContain("Q0FDSEVEQg==");

      const second = await getEmbeddedFontCSS(rootB, getSvgDocument, { cache });
      expect(second.cssText).toContain("Q0FDSEVEQg==");
      expect(second.cssText).not.toContain("Q0FDSEVEQQ==");

      style.remove();
      const reused = await getEmbeddedFontCSS(rootA, getSvgDocument, { cache });
      expect(reused.cssText).toContain("Q0FDSEVEQQ==");
      expect(reused.cssText).not.toContain("Q0FDSEVEQg==");
    } finally {
      rootA.remove();
      rootB.remove();
      style.remove();
    }
  });
});

test("reuses a FontCache through different Cache instances", async ({
  getSvgDocument,
}) => {
  const style = addStyle(`
      @font-face {
        font-family: "Reusable Font";
        font-weight: 400;
        src: url("data:font/woff2;base64,UkVTVVNFMQ==") format("woff2");
      }
      @font-face {
        font-family: "Reusable Font";
        font-weight: 700;
        src: url("data:font/woff2;base64,UkVTVVNFMg==") format("woff2");
      }
    `);
  const root = addRoot("Reusable Font");
  const fontCache = new htmlToImage.FontCache();

  try {
    const first = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
    });
    expect(first.cssText.match(/@font-face/g)).toHaveLength(2);

    style.remove();
    const reused = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
    });
    expect(reused.cssText.match(/@font-face/g)).toHaveLength(2);
    expect(reused.cssText.indexOf("UkVTVVNFMQ==")).toBeLessThan(
      reused.cssText.indexOf("UkVTVVNFMg=="),
    );
  } finally {
    root.remove();
    style.remove();
  }
});

test("does not store fonts in a shared FetchCache", async ({
  getSvgDocument,
}) => {
  const style = addStyle(`
      @font-face {
        font-family: "Font Cache Isolation";
        src: url("/font-cache-isolation.woff2") format("woff2");
      }
    `);
  const root = addRoot("Font Cache Isolation");
  const fetchCache = new htmlToImage.FetchCache();
  const fetchSpy = vi
    .spyOn(window, "fetch")
    .mockImplementation(async () => new Response("isolated font"));

  try {
    const first = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache: new htmlToImage.Cache(fetchCache),
    });
    expect(first.cssText).toContain("data:");

    style.remove();
    const isolated = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache: new htmlToImage.Cache(fetchCache),
    });
    expect(isolated.cssText).toBe("");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  } finally {
    root.remove();
    style.remove();
  }
});

test("keeps preferred font formats separate in a shared cache", async ({
  getSvgDocument,
}) => {
  const style = addStyle(`
      @font-face {
        font-family: "Format Font";
        font-weight: 400;
        src: url("data:font/woff2;base64,VzJPTkU=") format("woff2"), url("data:font/woff;base64,V09ORQ==") format("woff");
      }
      @font-face {
        font-family: "Format Font";
        font-weight: 700;
        src: url("data:font/woff2;base64,VzJUV08=") format("woff2"), url("data:font/woff;base64,V1RXTw==") format("woff");
      }
    `);
  const root = addRoot("Format Font");
  const cache = new htmlToImage.Cache();

  try {
    const woff2 = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache,
      preferredFontFormat: "woff2",
    });
    expect(woff2.cssText).toContain("VzJPTkU=");
    expect(woff2.cssText).toContain("VzJUV08=");
    expect(woff2.cssText).not.toContain("V09ORQ==");
    expect(woff2.cssText).not.toContain("V1RXTw==");

    const woff = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache,
      preferredFontFormat: "woff",
    });
    expect(woff.cssText).toContain("V09ORQ==");
    expect(woff.cssText).toContain("V1RXTw==");
    expect(woff.cssText).not.toContain("VzJPTkU=");
    expect(woff.cssText).not.toContain("VzJUV08=");
  } finally {
    root.remove();
    style.remove();
  }
});

test("bypasses processed font css when cache busting", async ({
  getSvgDocument,
}) => {
  const style = addStyle(`
      @font-face {
        font-family: "Cache Bust Font";
        src: url("/cache-bust-font.woff2") format("woff2");
      }
    `);
  const root = addRoot("Cache Bust Font");
  const cache = new htmlToImage.Cache();
  let responseIndex = 0;
  const fetchSpy = vi
    .spyOn(window, "fetch")
    .mockImplementation(() =>
      Promise.resolve(new Response(responseIndex++ === 0 ? "A" : "B")),
    );

  try {
    const first = await getEmbeddedFontCSS(root, getSvgDocument, { cache });
    const busted = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache,
      cacheBust: true,
    });
    const reused = await getEmbeddedFontCSS(root, getSvgDocument, { cache });

    expect(first.cssText).toMatch(/data:[^;]+;base64,QQ==/);
    expect(busted.cssText).toMatch(/data:[^;]+;base64,Qg==/);
    expect(reused.cssText).toMatch(/data:[^;]+;base64,QQ==/);

    const fontRequests = fetchSpy.mock.calls.map(([input]) => input.toString());
    expect(fontRequests).toHaveLength(2);
    expect(fontRequests[0]).not.toContain("?");
    expect(fontRequests[1]).toMatch(/cache-bust-font\.woff2\?\d+$/);
  } finally {
    root.remove();
    style.remove();
  }
});

test("keeps successful cached formats when another format is unavailable", async ({
  getSvgDocument,
}) => {
  const style = addStyle(`
      @font-face {
        font-family: "Single Format Font";
        src: url("data:font/woff;base64,V09GRk9OTFk=") format("woff");
      }
    `);
  const root = addRoot("Single Format Font");
  const fontCache = new htmlToImage.FontCache();

  try {
    const first = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
      preferredFontFormat: "woff",
    });
    expect(first.cssText).toContain("V09GRk9OTFk=");

    style.remove();
    const unavailable = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
      preferredFontFormat: "woff2",
    });
    expect(unavailable.cssText).toBe("");

    const reused = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache: new htmlToImage.Cache(new htmlToImage.FetchCache(), fontCache),
      preferredFontFormat: "woff",
    });
    expect(reused.cssText).toContain("V09GRk9OTFk=");
  } finally {
    root.remove();
    style.remove();
  }
});

test("treats empty fontEmbedCSS as an automatic embedding override", async ({
  getSvgDocument,
}) => {
  const style = addStyle(`
      @font-face {
        font-family: "Automatic Font";
        src: url("data:font/woff2;base64,QVVUTw==") format("woff2");
      }
    `);
  const root = addRoot("Automatic Font");

  try {
    const empty = await getEmbeddedFontCSS(root, getSvgDocument, {
      fontEmbedCSS: "",
    });
    expect(empty.output.querySelectorAll("style")).toHaveLength(0);

    const skipped = await getEmbeddedFontCSS(root, getSvgDocument, {
      fontEmbedCSS: "@font-face { font-family: Supplied; }",
      skipFonts: true,
    });
    expect(skipped.output.querySelectorAll("style")).toHaveLength(0);
  } finally {
    root.remove();
    style.remove();
  }
});

test("does not track fonts in a removed subtree", async ({
  getSvgDocument,
}) => {
  const style = addStyle(`
      @font-face { font-family: "Kept Font"; src: url("data:font/woff2;base64,S0VQVA=="); }
      @font-face { font-family: "Removed Font"; src: url("data:font/woff2;base64,UkVNT1ZFRA=="); }
    `);
  const root = addRoot("Kept Font");
  const removed = document.createElement("span");
  removed.style.fontFamily = "Removed Font";
  root.appendChild(removed);

  try {
    const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument, {
      filter: (node) => (node === removed ? "remove" : "keep"),
    });
    expect(cssText).toContain("S0VQVA==");
    expect(cssText).not.toContain("UkVNT1ZFRA==");
  } finally {
    root.remove();
    style.remove();
  }
});
