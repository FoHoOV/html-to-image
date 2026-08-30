import { toDataUrl } from "../../src";
import { test } from "../fixtures";

describe("work with svg element as dataurl", () => {
  test("should render nested svg with broken namespace", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/namespace/node.html",
      "svg/namespace/style.css",
      "svg/namespace/reference",
    );
    await renderAndCheck(node);
  });

  test("should render svg `<rect>` with width and height", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/rect/node.html",
      "svg/rect/style.css",
      "svg/rect/reference",
    );
    await renderAndCheck(node);
  });

  test("should render svg `<rect>` with applied css styles", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/color/node.html",
      "svg/color/style.css",
      "svg/color/reference",
    );
    await renderAndCheck(node);
  });

  test("should include a viewBox attribute", async ({
    bootstrap,
    getSvgDocument,
  }) => {
    const node = await bootstrap(
      "document/baseline/node.html",
      "document/baseline/style.css",
      "document/baseline/reference",
    );
    const dataUrl = await toDataUrl(node);
    const svgDocument = await getSvgDocument(dataUrl);
    const width = svgDocument.documentElement.getAttribute("width");
    const height = svgDocument.documentElement.getAttribute("height");
    const viewBox = svgDocument.documentElement.getAttribute("viewBox");

    expect(viewBox).toEqual(`0 0 ${width} ${height}`);
  });

  test("should render svg `<image>` with href", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/image/node.html",
      "svg/image/style.css",
      "svg/image/reference",
    );
    await renderAndCheck(node);
  });

  test("should render SVG use tags", async ({ bootstrap, renderAndCheck }) => {
    const node = await bootstrap(
      "svg/use/tag/node.html",
      "svg/use/tag/style.css",
      "svg/use/tag/reference",
    );
    await renderAndCheck(node);
  });

  test("should inline external SVG use definitions and dependencies", async ({
    bootstrap,
    getSvgDocument,
  }) => {
    const node = await bootstrap("svg/use/external/node.html");
    const sourceUse = node.querySelector("use");
    const sourceHref = sourceUse?.getAttribute("href");

    const dataUrl = await toDataUrl(node);
    const svgDocument = await getSvgDocument(dataUrl);
    const clonedUse = svgDocument.querySelector("use");

    expect(clonedUse?.getAttribute("href")).toBe("#icon");
    expect(svgDocument.querySelector("defs #icon")).not.toBeNull();
    expect(svgDocument.querySelector("defs #paint")).not.toBeNull();
    expect(sourceUse?.getAttribute("href")).toBe(sourceHref);
  });

  test("should render multiple parts from an external SVG sprite", async ({
    bootstrap,
    getSvgDocument,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/use/external-parts/node.html",
      undefined,
      "svg/use/external-parts/reference",
    );
    node.style.cssText = "width: 40px; height: 20px; overflow: hidden;";

    const dataUrl = await toDataUrl(node, { fonts: { strategy: "none" } });
    const svgDocument = await getSvgDocument(dataUrl);
    const uses = Array.from(svgDocument.querySelectorAll("use"));
    const targetIds = uses.map(
      (use) => use.getAttribute("href")?.match(/^#(.+)$/)?.[1],
    );

    expect(uses.length).toBe(2);
    expect(new Set(targetIds).size).toBe(2);
    expect(
      svgDocument
        .querySelector('[data-sprite-part="part1"]')
        ?.getAttribute("id"),
    ).toBe(targetIds[0]);
    expect(
      svgDocument
        .querySelector('[data-sprite-part="part2"]')
        ?.getAttribute("id"),
    ).toBe(targetIds[1]);

    await renderAndCheck(node, { fonts: { strategy: "none" } });
  });

  test("should render SVG with clip-path", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/same-doc-ref/node.html",
      undefined,
      "svg/same-doc-ref/reference",
    );
    node.style.cssText = "width: 680px; height: 180px; overflow: hidden;";
    await renderAndCheck(node);
  });
});
