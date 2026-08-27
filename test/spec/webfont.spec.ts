import * as htmlToImage from "../../src";
import { test } from "../fixtures";
import { addRoot, addStyle, getEmbeddedFontCSS } from "../webfont-helpers";

describe("font embedding", () => {
  describe("should embed only used fonts", () => {
    test("should embed 1 font when use 1", async ({ getSvgDocument }) => {
      const root = document.createElement("div");
      document.body.append(root);
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <p style="font-family: 'Font 1'">Hello world</p>
        `;
        const dataUrl = await htmlToImage.toDataUrl(root);
        const doc = await getSvgDocument(dataUrl);
        const [style] = Array.from(doc.getElementsByTagName("style"));
        expect(style.textContent).toContain("Font 1");
        expect(style.textContent).not.toContain("Font 0");
        expect(style.textContent).not.toContain("Font 2");
      } finally {
        root.remove();
      }
    });
    test("should embed 2 fonts when use 2", async ({ getSvgDocument }) => {
      const root = document.createElement("div");
      document.body.append(root);
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <p style="font-family: 'Font 0'">Hello world</p>
          <p style="font-family: 'Font 2'">Hello world</p>
        `;
        const svg = await htmlToImage.toDataUrl(root);
        const doc = await getSvgDocument(svg);
        const [style] = Array.from(doc.getElementsByTagName("style"));
        expect(style.textContent).toContain("Font 0");
        expect(style.textContent).toContain("Font 2");
        expect(style.textContent).not.toContain("Font 1");
      } finally {
        root.remove();
      }
    });
    test("should embed font used by deeply nested child", async ({
      getSvgDocument,
    }) => {
      const root = document.createElement("div");
      document.body.append(root);
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <div>
            <div>
                <div>
                    <div style="font-family: 'Font 1'">Hello world</div>
                </div>
            </div>
          </div>
        `;
        const svg = await htmlToImage.toDataUrl(root);
        const doc = await getSvgDocument(svg);
        const [style] = Array.from(doc.getElementsByTagName("style"));
        expect(style.textContent).toContain("Font 1");
        expect(style.textContent).not.toContain("Font 0");
        expect(style.textContent).not.toContain("Font 2");
      } finally {
        root.remove();
      }
    });
  });

  test("embeds every face of a repeatedly used family once", async ({
    getSvgDocument,
  }) => {
    const style = addStyle(`
      @font-face {
        font-family: "Repeated Font";
        font-style: normal;
        font-weight: 400;
        unicode-range: U+0000-00FF;
        src: url("data:font/woff2;base64,Tk9STUFM") format("woff2");
      }
      @font-face {
        font-family: "Repeated Font";
        font-style: italic;
        font-stretch: condensed;
        font-weight: 700;
        src: url("data:font/woff2;base64,SVRBTElD") format("woff2");
      }
      @font-face {
        font-family: "Unused Font";
        src: url("data:font/woff2;base64,VU5VU0VE") format("woff2");
      }
    `);
    const root = addRoot("Repeated Font");
    const second = document.createElement("span");
    second.style.fontFamily = "Repeated Font";
    root.appendChild(second);

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
      expect(cssText.match(/@font-face/g)).toHaveLength(2);
      expect(cssText).toContain("Tk9STUFM");
      expect(cssText).toContain("SVRBTElD");
      expect(cssText).toMatch(/font-(?:stretch|width): condensed/);
      expect(cssText).not.toContain("VU5VU0VE");
      expect(cssText.indexOf("Tk9STUFM")).toBeLessThan(
        cssText.indexOf("SVRBTElD"),
      );
    } finally {
      root.remove();
      style.remove();
    }
  });

  test("emits a media-conditional face without its media wrapper", async ({
    getSvgDocument,
  }) => {
    const style = addStyle(`
      @media all {
        @font-face {
          font-family: "Conditional Font";
          src: url("data:font/woff2;base64,Q09ORElUSU9OQUw=") format("woff2");
        }
      }
    `);
    const root = addRoot("Conditional Font");

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
      const parsed = document.implementation.createHTMLDocument();
      const embeddedStyle = parsed.createElement("style");
      embeddedStyle.textContent = cssText;
      parsed.head.appendChild(embeddedStyle);
      const rules = embeddedStyle.sheet!.cssRules;

      // The media query was evaluated against the page when the face was
      // collected. The exported SVG has its own viewport, so re-emitting it
      // could suppress a face the page is really using.
      expect(rules).toHaveLength(1);
      expect(rules[0].type).toBe(CSSRule.FONT_FACE_RULE);
      expect(cssText).not.toContain("@media");
      expect(cssText.match(/Q09ORElUSU9OQUw=/g)).toHaveLength(1);
    } finally {
      root.remove();
      style.remove();
    }
  });

  test("embeds a media-conditional face that the output size would not match", async ({
    getSvgDocument,
  }) => {
    // Active on the page, but false for an output narrower than the breakpoint.
    // Re-emitting the query would drop the face from the rendered image.
    const style = addStyle(`
      @media (min-width: ${window.innerWidth - 1}px) {
        @font-face {
          font-family: "Narrow Output Font";
          src: url("data:font/woff2;base64,TkFSUk9X") format("woff2");
        }
      }
    `);
    const root = addRoot("Narrow Output Font");

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument, {
        width: 40,
        height: 40,
      });

      expect(cssText).toContain("TkFSUk9X");
      expect(cssText).not.toContain("@media");
    } finally {
      root.remove();
      style.remove();
    }
  });

  test("keeps engine-level conditions while dropping media wrappers", async ({
    getSvgDocument,
  }) => {
    const style = addStyle(`
      @media all {
        @supports (display: grid) {
          @font-face {
            font-family: "Nested Conditions Font";
            font-weight: 400;
            src: url("data:font/woff2;base64,TkVTVEVE") format("woff2");
          }
        }
      }
      @font-face {
        font-family: "Nested Conditions Font";
        font-weight: 700;
        src: url("data:font/woff2;base64,VU5XUkFQUEVE") format("woff2");
      }
    `);
    const root = addRoot("Nested Conditions Font");

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
      const parsed = document.implementation.createHTMLDocument();
      const embeddedStyle = parsed.createElement("style");
      embeddedStyle.textContent = cssText;
      parsed.head.appendChild(embeddedStyle);
      const rules = embeddedStyle.sheet!.cssRules;
      const supportsRule = rules[0] as CSSSupportsRule;

      // `@supports` is resolved by the engine, which is the same engine that
      // renders the SVG, so it survives. The enclosing `@media` does not.
      expect(rules).toHaveLength(2);
      expect(supportsRule.type).toBe(CSSRule.SUPPORTS_RULE);
      expect(supportsRule.cssRules).toHaveLength(1);
      expect(supportsRule.cssRules[0].type).toBe(CSSRule.FONT_FACE_RULE);
      expect(rules[1].type).toBe(CSSRule.FONT_FACE_RULE);
      expect(cssText).not.toContain("@media");
      expect(cssText).toContain("TkVTVEVE");
      expect(cssText).toContain("VU5XUkFQUEVE");
    } finally {
      root.remove();
      style.remove();
    }
  });

  test("preserves declaration-form supports conditions on imports", async ({
    getSvgDocument,
  }) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(
      "/fonts/web-fonts/imports/supports.css",
      window.location.href,
    ).href;
    const loaded = new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("Could not load font fixture"));
    });
    document.head.appendChild(link);
    await loaded;
    const root = addRoot("Supports Import Font");

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
      const parsed = document.implementation.createHTMLDocument();
      const embeddedStyle = parsed.createElement("style");
      embeddedStyle.textContent = cssText;
      parsed.head.appendChild(embeddedStyle);
      const supportsRule = embeddedStyle.sheet!.cssRules[0] as CSSSupportsRule;

      expect(supportsRule.type).toBe(CSSRule.SUPPORTS_RULE);
      expect(supportsRule.cssRules).toHaveLength(1);
      expect(supportsRule.cssRules[0].type).toBe(CSSRule.FONT_FACE_RULE);
      expect(cssText).toContain("U1VQUE9SVFM=");
    } finally {
      root.remove();
      link.remove();
    }
  });

  test("ignores font faces from disabled stylesheets", async ({
    getSvgDocument,
  }) => {
    const style = addStyle(`
      @font-face {
        font-family: "Disabled Font";
        src: url("data:font/woff2;base64,RElTQUJMRUQ=") format("woff2");
      }
    `);
    style.sheet!.disabled = true;
    const root = addRoot("Disabled Font");

    try {
      const { cssText, output } = await getEmbeddedFontCSS(
        root,
        getSvgDocument,
      );
      expect(cssText).toBe("");
      expect(output.querySelectorAll("style")).toHaveLength(0);
    } finally {
      root.remove();
      style.remove();
    }
  });

  test("tracks a quoted root font override containing a comma", async ({
    getSvgDocument,
  }) => {
    const style = addStyle(`
      @font-face {
        font-family: "Comma, Font";
        src: url("data:font/woff2;base64,Q09NTUE=") format("woff2");
      }
    `);
    const root = addRoot("sans-serif");

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument, {
        style: { fontFamily: '"Comma, Font", sans-serif' },
      });
      expect(cssText).toContain("Comma, Font");
      expect(cssText).toContain("Q09NTUE=");
    } finally {
      root.remove();
      style.remove();
    }
  });

  test("embeds nested imports without changing source stylesheets", async ({
    getSvgDocument,
  }) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(
      "/fonts/web-fonts/imports/root.css",
      window.location.href,
    ).href;
    const loaded = new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("Could not load font fixture"));
    });
    document.head.appendChild(link);
    await loaded;

    const root = addRoot("Nested Font");
    try {
      const sheet = link.sheet as CSSStyleSheet;
      const before = Array.from(sheet.cssRules, (rule) => rule.cssText);
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);

      expect(cssText).toContain("Nested Font");
      expect(cssText).toContain("data:");
      expect(cssText).toContain("Zm9udAo=");
      expect(cssText.match(/@font-face/g)).toHaveLength(1);
      expect(Array.from(sheet.cssRules, (rule) => rule.cssText)).toEqual(
        before,
      );
    } finally {
      root.remove();
      link.remove();
    }
  });

  test("continues when an imported stylesheet cannot be fetched", async ({
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
    link.href = stylesheetUrl.href;
    const loaded = new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("Could not load font fixture"));
    });
    document.head.appendChild(link);
    await loaded;

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
      if (input.toString() === stylesheetUrl.href) {
        return Promise.resolve(new Response(stylesheetCSS));
      }
      return nativeFetch(input);
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root = addRoot("Available Font");

    try {
      const { cssText } = await getEmbeddedFontCSS(root, getSvgDocument);
      expect(cssText).toContain("QVZBSUxBQkxF");
      expect(
        fetchSpy.mock.calls.filter(
          ([input]) => input.toString() === stylesheetUrl.href,
        ),
      ).toHaveLength(1);
      expect(
        fetchSpy.mock.calls.filter(([input]) =>
          input.toString().includes("fonts.invalid"),
        ),
      ).toHaveLength(1);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      root.remove();
      link.remove();
    }
  });

  test("resolves a relative font src url against the declaring stylesheet's own url", async ({
    getSvgDocument,
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

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/fonts/web-fonts/rules-relative.css";
    const loaded = new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("Could not load font fixture"));
    });
    document.head.appendChild(link);
    await loaded;

    // Font1's src is `../font1.woff`, relative to rules-relative.css's own
    // directory (fonts/web-fonts/) rather than to the page.
    const root = addRoot("Font1");

    try {
      await getEmbeddedFontCSS(root, getSvgDocument);

      expect(
        fetchSpy.mock.calls.some(([requested]) =>
          requested.toString().endsWith("/fonts/font1.woff"),
        ),
      ).toBe(true);
    } finally {
      root.remove();
      link.remove();
    }
  });
});
