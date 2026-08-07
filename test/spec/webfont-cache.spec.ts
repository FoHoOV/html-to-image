import { Cache, FontCache } from "../../src";
import { test } from "../fixtures";
import { addRoot, addStyle, getEmbeddedFontCSS } from "../webfont-helpers";

describe("web font cache", () => {
  test("embeds quoted generic-looking names but skips generic families", async ({
    getSvgDocument,
  }) => {
    const style = addStyle(`
      @font-face {
        font-family: "serif";
        src: url("data:font/woff2;base64,UVVPVEVE") format("woff2");
      }
    `);
    const customRoot = addRoot('"serif", sans-serif');
    const genericRoot = addRoot("serif, sans-serif");

    try {
      const { cssText: customCSS } = await getEmbeddedFontCSS(
        customRoot,
        getSvgDocument,
      );
      const { cssText: genericCSS } = await getEmbeddedFontCSS(
        genericRoot,
        getSvgDocument,
      );

      expect(customCSS).toContain("UVVPVEVE");
      expect(genericCSS).toBe("");
    } finally {
      customRoot.remove();
      genericRoot.remove();
      style.remove();
    }
  });

  test("does not rescan a document for definitive missing families", async ({
    getSvgDocument,
  }) => {
    const root = addRoot('"Missing Web Font", Arial, sans-serif');
    const fontCache = new FontCache();
    const cache = new Cache(undefined, fontCache);

    try {
      const first = await getEmbeddedFontCSS(root, getSvgDocument, { cache });
      expect(first.cssText).toBe("");
      expect(fontCache.isMissing(document, "missing web font")).toBe(true);
      expect(fontCache.isMissing(document, "arial")).toBe(true);
      expect(fontCache.isMissing(document, "sans-serif")).toBe(false);

      Object.defineProperty(document, "styleSheets", {
        configurable: true,
        get() {
          throw new Error("The source document was scanned again");
        },
      });

      const second = await getEmbeddedFontCSS(root, getSvgDocument, { cache });
      expect(second.cssText).toBe("");
    } finally {
      Reflect.deleteProperty(document, "styleSheets");
      root.remove();
    }
  });
});
