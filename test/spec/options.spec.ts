import { cloneNodeTree } from "../../src/node";
import { toCanvas, toPng, toDataUrl } from "../../src";
import { createContext } from "../../src/context";
import { test } from "../fixtures";

describe("work with options", () => {
  test("should apply width and height options to node copy being rendered", async ({
    bootstrap,
    compareToRefImage,
    drawDataUrl,
  }) => {
    const node = await bootstrap(
      "options/dimensions/node.html",
      "options/dimensions/style.css",
      "options/dimensions/reference",
    );
    const dataUrl = await toPng(node, {
      width: 200,
      height: 200,
    });
    const imageData = await drawDataUrl(dataUrl, {
      width: 200,
      height: 200,
    });

    compareToRefImage(imageData);
  });

  test("should render backgroundColor", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "options/background-color/node.html",
      "options/background-color/style.css",
      "options/background-color/reference",
    );
    const dataUrl = await toPng(node, {
      style: {
        backgroundColor: "#ff0000",
      },
    });

    await check(dataUrl);
  });

  test("should render backgroundColor in SVG as dataurl", async ({
    bootstrap,
    check,
  }) => {
    const node = await bootstrap(
      "options/background-color/node.html",
      "options/background-color/style.css",
      "options/background-color/reference",
    );
    const dataUrl = await toDataUrl(node, {
      style: {
        backgroundColor: "#ff0000",
      },
    });

    await check(dataUrl);
  });

  test("should apply style text to node copy being rendered", async ({
    bootstrap,
    check,
  }) => {
    const node = await bootstrap(
      "options/style/node.html",
      "options/style/style.css",
      "options/style/reference",
    );
    const dataUrl = await toPng(node, {
      style: { background: "red", transform: "scale(0.5)" },
    });

    await check(dataUrl);
  });

  test("should only clone specified style properties when includeStyleProperties is provided", async ({
    bootstrap,
    check,
  }) => {
    const node = await bootstrap(
      "options/style/node.html",
      "options/style/style.css",
      "options/style/reference-include-style",
    );
    const dataUrl = await toPng(node, {
      includeStyleProperties: ["width", "height"],
    });

    await check(dataUrl);
  });

  test("should combine dimensions and style", async ({
    bootstrap,
    compareToRefImage,
    drawDataUrl,
  }) => {
    const node = await bootstrap(
      "options/scale/node.html",
      "options/scale/style.css",
      "options/scale/reference",
    );
    const dataUrl = await toPng(node, {
      width: 200,
      height: 200,
      style: {
        transform: "scale(2)",
        transformOrigin: "top left",
      },
    });
    const imageData = await drawDataUrl(dataUrl, {
      width: 200,
      height: 200,
    });

    compareToRefImage(imageData);
  });

  test("should measure dimensions supplied through style on the cloned node", async () => {
    const node = document.createElement("div");
    node.style.cssText = "width: 40px; height: 30px; background: red;";
    document.body.appendChild(node);

    try {
      const canvas = await toCanvas(node, {
        pixelRatio: 1,
        skipFonts: true,
        style: {
          width: "160px",
          height: "90px",
        },
      });

      expect(canvas.width).toBe(160);
      expect(canvas.height).toBe(90);
      expect(canvas.style.width).toBe("160px");
      expect(canvas.style.height).toBe("90px");
      expect(node.style.width).toBe("40px");
      expect(node.style.height).toBe("30px");
    } finally {
      node.remove();
    }
  });

  test("should measure reflow after applying a consumer-provided width", async () => {
    const node = document.createElement("div");
    node.style.cssText = "width: 40px; aspect-ratio: 2 / 1; background: red;";
    document.body.appendChild(node);

    try {
      const canvas = await toCanvas(node, {
        width: 160,
        pixelRatio: 1,
        skipFonts: true,
      });

      expect(canvas.width).toBe(160);
      expect(canvas.height).toBe(80);
      expect(node.getBoundingClientRect().width).toBe(40);
      expect(node.getBoundingClientRect().height).toBe(20);
    } finally {
      node.remove();
    }
  });

  test("should preserve logical size and full content at high pixel ratios", async () => {
    const node = document.createElement("div");
    node.style.cssText = "position: relative; width: 100px; height: 100px;";

    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00"];
    colors.forEach((color, index) => {
      const child = document.createElement("div");
      child.style.cssText = `
        position: absolute;
        left: ${(index % 2) * 50}px;
        top: ${Math.floor(index / 2) * 50}px;
        width: 50px;
        height: 50px;
        background: ${color};
      `;
      node.appendChild(child);
    });
    document.body.appendChild(node);

    try {
      const canvas = await toCanvas(node, {
        pixelRatio: 2,
        skipFonts: true,
      });
      const context = canvas.getContext("2d")!;
      const pixelAt = (x: number, y: number) =>
        Array.from(context.getImageData(x, y, 1, 1).data);

      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(200);
      expect(canvas.style.width).toBe("100px");
      expect(canvas.style.height).toBe("100px");
      expect(pixelAt(50, 50)).toEqual([255, 0, 0, 255]);
      expect(pixelAt(150, 50)).toEqual([0, 255, 0, 255]);
      expect(pixelAt(50, 150)).toEqual([0, 0, 255, 255]);
      expect(pixelAt(150, 150)).toEqual([255, 255, 0, 255]);
    } finally {
      node.remove();
    }
  });

  test("should redraw canvas output on WebKit", async () => {
    const userAgentDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "userAgent",
    );
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
        "Version/26.0 Safari/605.1.15",
    });

    const drawImage = vi.spyOn(CanvasRenderingContext2D.prototype, "drawImage");
    const clearRect = vi.spyOn(CanvasRenderingContext2D.prototype, "clearRect");
    const node = document.createElement("div");
    node.style.cssText = "width: 20px; height: 20px; background: red;";
    document.body.appendChild(node);

    try {
      await toCanvas(node, { pixelRatio: 1, skipFonts: true });

      expect(drawImage).toHaveBeenCalledTimes(2);
      expect(clearRect).toHaveBeenCalledTimes(1);
    } finally {
      node.remove();
      restoreProperty(navigator, "userAgent", userAgentDescriptor);
    }
  });

  test("should use node filter", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "options/filter/node.html",
      "options/filter/style.css",
      "options/filter/reference",
    );
    const dataUrl = await toPng(node, {
      filter(node) {
        if ((node as HTMLElement).classList) {
          return (node as HTMLElement).classList.contains("omit")
            ? "remove"
            : "keep";
        }
        return "keep";
      },
    });

    await check(dataUrl);
  });

  test("should apply node filter to root node", async () => {
    const root = document.createElement("div");
    root.appendChild(document.createElement("div"));

    const clone = await cloneNodeTree(
      root,
      createContext({
        filter: (node) => (node === root ? "remove" : "keep"),
      }),
    );

    expect(clone.style.display).toBe("inline-block");
    expect(clone.childNodes.length).toEqual(0);
  });

  test("should preserve children when the filter unwraps the root", async () => {
    const root = document.createElement("section");
    const child = document.createElement("span");
    child.textContent = "preserved";
    root.appendChild(child);

    const clone = await cloneNodeTree(
      root,
      createContext({
        filter: (node) => (node === root ? "unwrap" : "keep"),
      }),
    );
    expect(clone instanceof HTMLDivElement).toBe(true);
    expect(clone?.textContent).toBe("preserved");
  });

  test("should render when the filter unwraps the root", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const root = await bootstrap(
      "options/filter/node.html",
      "options/filter/style.css",
      "options/filter/reference",
    );

    await renderAndCheck(root, {
      width: 100,
      height: 50,
      skipFonts: true,
      filter(node) {
        if (node === root) {
          return "unwrap";
        }
        return (node as HTMLElement).classList?.contains("omit")
          ? "remove"
          : "keep";
      },
    });
  });

  test("should apply styles and infer size when the filter unwraps the root", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const root = await bootstrap(
      "options/filter/root-unwrap/node.html",
      "options/filter/root-unwrap/style.css",
      "options/filter/root-unwrap/reference",
    );

    await renderAndCheck(root, {
      filter: (node) => (node === root ? "unwrap" : "keep"),
      skipFonts: true,
      style: {
        background: "#ff0000",
        padding: "10px",
      },
    });
  });

  test("should exclude descendants when the filter removes their parent", async () => {
    const root = document.createElement("div");
    const excluded = document.createElement("section");
    excluded.className = "excluded";
    excluded.appendChild(document.createElement("span"));
    root.appendChild(excluded);

    const clone = await cloneNodeTree(
      root,
      createContext({
        filter: (node) =>
          (node as HTMLElement).classList.contains("excluded")
            ? "remove"
            : "keep",
      }),
    );

    expect(clone?.querySelector(".excluded")).toBeNull();
    expect(clone?.children).toHaveLength(0);
  });

  test("should preserve descendants when the filter unwraps their parent", async () => {
    const root = document.createElement("div");
    const excluded = document.createElement("section");
    const preserved = document.createElement("span");
    preserved.className = "preserved";
    excluded.appendChild(preserved);
    root.appendChild(excluded);

    const clone = await cloneNodeTree(
      root,
      createContext({
        filter: (node) => (node === excluded ? "unwrap" : "keep"),
      }),
    );

    expect(clone?.querySelector("section")).toBeNull();
    expect(clone?.querySelector(".preserved")).not.toBeNull();
  });

  test("should only use fontEmbedCss if it is supplied", async ({
    bootstrap,
    getSvgDocument,
  }) => {
    const testCss = `
        @font-face {
          name: "Arial";
          src: url("data:AAA") format("woff2");
        }
      `;
    const node = await bootstrap(
      "fonts/web-fonts/empty.html",
      "fonts/web-fonts/remote.css",
    );
    const dataUrl = await toDataUrl(node, { fontEmbedCSS: testCss });
    const document = await getSvgDocument(dataUrl);
    const styles = Array.from(document.getElementsByTagName("style"));

    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toEqual(testCss);
  });

  test("should embed only the preferred font", async ({
    bootstrap,
    getSvgDocument,
  }) => {
    const node = await bootstrap(
      "fonts/web-fonts/empty.html",
      "fonts/web-fonts/remote.css",
    );
    const dataUrl = await toDataUrl(node, {
      preferredFontFormat: "woff2",
    });
    const document = await getSvgDocument(dataUrl);
    const [style] = Array.from(document.getElementsByTagName("style"));

    expect(style.textContent).toMatch(/url\([^)]+\) format\("woff2"\)/);
    expect(style.textContent).not.toMatch(/url\([^)]+\) format\("woff"\)/);
  });

  test("should use the placeholder image when fetching an image fails", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const imagePlaceholder =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50' viewBox='0 0 100 50'%3E%3Crect width='100' height='50' fill='%23f2f2f2'/%3E%3Crect x='1' y='1' width='98' height='48' fill='none' stroke='%23999'/%3E%3Cpath d='M0 0 100 50M100 0 0 50' fill='none' stroke='%23999'/%3E%3C/svg%3E";
    const node = await bootstrap(
      "options/image-placeholder/node.html",
      "options/image-placeholder/style.css",
      "options/image-placeholder/reference",
    );
    await renderAndCheck(node, { imagePlaceholder });
  });

  test("should support cache busting", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap(
      "media/images/node.html",
      "media/images/style.css",
    );
    await assertTextRendered(["PNG", "JPG"], node, { cacheBust: true });
  });
});

function restoreProperty(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
  } else {
    delete (target as Record<PropertyKey, unknown>)[property];
  }
}
