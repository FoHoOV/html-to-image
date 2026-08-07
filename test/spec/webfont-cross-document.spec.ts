import * as htmlToImage from "../../src";
import { test } from "../fixtures";
import { addRoot, addStyle, getEmbeddedFontCSS } from "../webfont-helpers";

describe("font embedding across documents", () => {
  test("embeds a font used only inside an iframe", async ({
    getSvgDocument,
  }) => {
    const root = document.createElement("div");
    const iframe = document.createElement("iframe");
    root.appendChild(iframe);
    document.body.appendChild(root);
    const iframeDocument = iframe.contentDocument!;
    addStyle(
      `@font-face { font-family: "Iframe Font"; src: url("data:font/woff2;base64,SUZSQU1F") format("woff2"); }`,
      iframeDocument,
    );
    addRoot("Iframe Font", iframeDocument);

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
      expect(cssText).toContain("Iframe Font");
      expect(cssText).toContain("SUZSQU1F");
    } finally {
      root.remove();
    }
  });
});

test("reuses the first same-name family encountered across documents", async ({
  getSvgDocument,
}) => {
  const parentStyle = addStyle(`
      @font-face { font-family: "Collision Font"; src: url("data:font/woff2;base64,UEFSRU5U") format("woff2"); }
    `);
  const root = addRoot("Collision Font");
  const iframe = document.createElement("iframe");
  root.appendChild(iframe);
  const iframeDocument = iframe.contentDocument!;
  addStyle(
    `@font-face { font-family: "Collision Font"; src: url("data:font/woff2;base64,SUZSQU1F") format("woff2"); }`,
    iframeDocument,
  );
  addRoot("Collision Font", iframeDocument);

  try {
    const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
    expect(cssText).toContain("UEFSRU5U");
    expect(cssText).not.toContain("SUZSQU1F");
    expect(cssText).not.toMatch(/html-to-image|iframe-/i);
  } finally {
    root.remove();
    parentStyle.remove();
  }
});

test("uses a later document when an earlier one does not define the family", async ({
  getSvgDocument,
}) => {
  const root = addRoot("Later Font");
  const iframe = document.createElement("iframe");
  root.appendChild(iframe);
  const iframeDocument = iframe.contentDocument!;
  addStyle(
    `@font-face { font-family: "Later Font"; src: url("data:font/woff2;base64,TEFURVI=") format("woff2"); }`,
    iframeDocument,
  );
  addRoot("Later Font", iframeDocument);

  try {
    const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
    expect(cssText).toContain("Later Font");
    expect(cssText).toContain("TEFURVI=");
  } finally {
    root.remove();
  }
});

test("uses a later document when the earlier font lacks the preferred format", async ({
  getSvgDocument,
}) => {
  const parentStyle = addStyle(`
      @font-face {
        font-family: "Format Collision";
        src: url("data:font/woff;base64,UEFSRU5UV09GRg==") format("woff");
      }
    `);
  const root = addRoot("Format Collision");
  const iframe = document.createElement("iframe");
  root.appendChild(iframe);
  const iframeDocument = iframe.contentDocument!;
  addStyle(
    `@font-face {
        font-family: "Format Collision";
        src: url("data:font/woff2;base64,SUZSQU1FV09GRjI=") format("woff2");
      }`,
    iframeDocument,
  );
  addRoot("Format Collision", iframeDocument);

  try {
    const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument, {
      preferredFontFormat: "woff2",
    });
    expect(cssText.match(/@font-face/g)).toHaveLength(1);
    expect(cssText).toContain("SUZSQU1FV09GRjI=");
    expect(cssText).not.toContain("UEFSRU5UV09GRg==");
    expect(cssText).toMatch(/src\s*:/);
  } finally {
    root.remove();
    parentStyle.remove();
  }
});

test("uses a later document when the earlier font condition is inactive", async ({
  getSvgDocument,
}) => {
  const parentStyle = addStyle(`
      @media (max-width: 0px) {
        @font-face {
          font-family: "Conditional Collision";
          src: url("data:font/woff2;base64,SU5BQ1RJVkU=") format("woff2");
        }
      }
    `);
  const root = addRoot("Conditional Collision");
  const iframe = document.createElement("iframe");
  root.appendChild(iframe);
  const iframeDocument = iframe.contentDocument!;
  addStyle(
    `@font-face {
        font-family: "Conditional Collision";
        src: url("data:font/woff2;base64,QUNUSVZF") format("woff2");
      }`,
    iframeDocument,
  );
  addRoot("Conditional Collision", iframeDocument);

  try {
    const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
    expect(cssText).toContain("QUNUSVZF");
    expect(cssText).not.toContain("SU5BQ1RJVkU=");
  } finally {
    root.remove();
    parentStyle.remove();
  }
});

test("retries a failed import when nothing was cached for the family", async ({
  getSvgDocument,
}) => {
  const stylesheetUrl = new URL(
    "/fonts/web-fonts/failure.css",
    window.location.href,
  );
  const parentStyle = document.createElement("style");
  parentStyle.textContent = `@import url("${stylesheetUrl.href}");`;
  const loaded = new Promise<void>((resolve, reject) => {
    parentStyle.onload = () => resolve();
    parentStyle.onerror = () =>
      reject(new Error("Could not load font fixture"));
  });
  document.head.appendChild(parentStyle);
  await loaded;

  const importRule = parentStyle.sheet!.cssRules[0] as CSSImportRule;
  const styleSheetSpy = vi
    .spyOn(importRule, "styleSheet", "get")
    .mockReturnValue(null);
  const root = addRoot("Retryable Import");

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

  try {
    // The failure leaves the family unresolved, so nothing is cached for it.
    const first = await getEmbeddedFontCSS(root, getSvgDocument, { cache });
    expect(first.cssText).toBe("");

    const second = await getEmbeddedFontCSS(root, getSvgDocument, { cache });
    expect(second.cssText).toContain("UkVUUlk=");
    expect(importFetches).toBe(2);
  } finally {
    styleSheetSpy.mockRestore();
    root.remove();
    parentStyle.remove();
  }
});

test("reuses a cached family without refetching an unrelated stylesheet", async ({
  getSvgDocument,
}) => {
  const stylesheetUrl = new URL(
    "/fonts/web-fonts/failure.css",
    window.location.href,
  );
  stylesheetUrl.hostname =
    stylesheetUrl.hostname === "localhost" ? "127.0.0.1" : "localhost";
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.media = "screen";
  link.href = stylesheetUrl.href;
  const loaded = new Promise<void>((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("Could not load font fixture"));
  });
  document.head.appendChild(link);
  await loaded;

  const localStyle = addStyle(`
      @font-face {
        font-family: "Unrelated Local Font";
        src: url("data:font/woff2;base64,TE9DQUw=") format("woff2");
      }
    `);
  const root = addRoot("Unrelated Local Font");
  const nativeFetch = window.fetch.bind(window);
  const fetchSpy = vi.spyOn(window, "fetch").mockImplementation((input) =>
    input.toString().startsWith(stylesheetUrl.href)
      ? Promise.resolve(
          new Response(`@font-face {
              font-family: "Different External Font";
              src: url("data:font/woff2;base64,RVhURVJOQUw=") format("woff2");
            }`),
        )
      : nativeFetch(input),
  );
  const cache = new htmlToImage.Cache();

  try {
    const first = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache,
      cacheBust: true,
    });
    const second = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache,
      cacheBust: true,
    });

    expect(first.cssText).toContain("TE9DQUw=");
    expect(second.cssText).toContain("TE9DQUw=");
    expect(
      fetchSpy.mock.calls.filter(([input]) =>
        input.toString().startsWith(stylesheetUrl.href),
      ),
    ).toHaveLength(1);
  } finally {
    root.remove();
    localStyle.remove();
    link.remove();
  }
});

test("uses a later document when the earlier family cannot be embedded", async ({
  getSvgDocument,
}) => {
  const parentStyle = addStyle(`
      @font-face { font-family: "Recoverable Font"; src: url("/missing-font.woff2") format("woff2"); }
    `);
  const root = addRoot("Recoverable Font");
  const iframe = document.createElement("iframe");
  root.appendChild(iframe);
  const iframeDocument = iframe.contentDocument!;
  addStyle(
    `@font-face { font-family: "Recoverable Font"; src: url("data:font/woff2;base64,UkVDT1ZFUkVE") format("woff2"); }`,
    iframeDocument,
  );
  addRoot("Recoverable Font", iframeDocument);
  const nativeFetch = window.fetch.bind(window);
  const fetchSpy = vi
    .spyOn(window, "fetch")
    .mockImplementation((input) =>
      input.toString().includes("missing-font.woff2")
        ? Promise.reject(new Error("Font fetch failed"))
        : nativeFetch(input),
    );
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const cache = new htmlToImage.Cache();

  try {
    const first = await getEmbeddedFontCSS(root, getSvgDocument, { cache });
    const second = await getEmbeddedFontCSS(root, getSvgDocument, {
      cache,
    });

    expect(first.cssText).toContain("UkVDT1ZFUkVE");
    expect(second.cssText).toContain("UkVDT1ZFUkVE");
    expect(second.cssText).not.toContain("missing-font.woff2");
    expect(
      fetchSpy.mock.calls.filter(([input]) =>
        input.toString().includes("missing-font.woff2"),
      ),
    ).toHaveLength(1);
  } finally {
    root.remove();
    parentStyle.remove();
  }
});
