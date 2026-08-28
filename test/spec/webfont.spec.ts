import * as htmlToImage from "../../src";
import { test } from "../fixtures";

describe("font embedding", () => {
  test("embeds only the families nodes actually use, including a nested one", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/used-families/node.html",
      "fonts/used-families/style.css",
    );
    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("Font 1");
    expect(cssText).toContain("Font 2");
    expect(cssText).not.toContain("Font 0");
  });

  test("embeds every face of a repeatedly used family once", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/repeated-family/node.html",
      "fonts/repeated-family/style.css",
    );
    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText.match(/@font-face/g)).toHaveLength(2);
    expect(cssText).toContain("Tk9STUFM");
    expect(cssText).toContain("SVRBTElD");
    expect(cssText).toMatch(/font-(?:stretch|width): condensed/);
    expect(cssText.indexOf("Tk9STUFM")).toBeLessThan(
      cssText.indexOf("SVRBTElD"),
    );
  });

  test("embeds a media-conditional face that the output size would not match", async ({
    bootstrap,
  }) => {
    // Active on the page, but false for an output narrower than the
    // breakpoint. Re-emitting the query would drop the face from the
    // rendered image.
    const node = await bootstrap(
      "fonts/conditional/narrow-output/node.html",
      "fonts/conditional/narrow-output/style.css",
    );
    const svg = await htmlToImage.toSvg(node, { width: 40, height: 40 });
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("TkFSUk9X");
    expect(cssText).not.toContain("@media");
  });

  test("embeds a face behind an active condition without its wrapper", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/conditional/nested/node.html",
      "fonts/conditional/nested/style.css",
    );
    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    // The `@media`/`@supports` condition was evaluated as active when the
    // face was collected, in the same engine that renders the output, so
    // neither wrapper is reproduced around it.
    expect(cssText.match(/@font-face/g)).toHaveLength(2);
    expect(cssText).not.toContain("@media");
    expect(cssText).not.toContain("@supports");
    expect(cssText).toContain("TkVTVEVE");
    expect(cssText).toContain("VU5XUkFQUEVE");
  });

  test("embeds a face behind an active declaration-form supports import without its wrapper", async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "fonts/web-fonts/imports/supports.html",
      undefined,
    );
    await delay(1000);
    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText.match(/@font-face/g)).toHaveLength(1);
    expect(cssText).not.toContain("@supports");
    expect(cssText).toContain("U1VQUE9SVFM=");
  });

  test("does not embed a face behind an inactive supports import", async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "fonts/web-fonts/imports/inactive-supports.html",
      undefined,
    );
    await delay(1000);
    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toBe("");
  });

  test("ignores font faces from disabled stylesheets", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/disabled/node.html",
      "fonts/disabled/style.css",
    );
    (document.getElementById("style") as HTMLStyleElement).sheet!.disabled =
      true;

    const svg = await htmlToImage.toSvg(node);
    expect(svg.querySelectorAll("style")).toHaveLength(0);
  });

  test("tracks a quoted root font override containing a comma", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "fonts/comma-family/node.html",
      "fonts/comma-family/style.css",
    );
    const svg = await htmlToImage.toSvg(node, {
      style: { fontFamily: '"Comma, Font", sans-serif' },
    });
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("Comma, Font");
    expect(cssText).toContain("Q09NTUE=");
  });

  test("embeds quoted generic-looking names but skips generic families", async ({
    bootstrap,
  }) => {
    const customNode = await bootstrap(
      "fonts/cache/quoted-generic/custom.html",
      "fonts/cache/quoted-generic/style.css",
    );
    const customSvg = await htmlToImage.toSvg(customNode);
    const customCSS = customSvg.querySelector("style")?.textContent ?? "";
    expect(customCSS).toContain("UVVPVEVE");

    const genericNode = await bootstrap(
      "fonts/cache/quoted-generic/generic.html",
      "fonts/cache/quoted-generic/style.css",
    );
    const genericSvg = await htmlToImage.toSvg(genericNode);
    const genericCSS = genericSvg.querySelector("style")?.textContent ?? "";
    expect(genericCSS).toBe("");
  });

  test("embeds nested imports without changing source stylesheets", async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap("fonts/web-fonts/imports/nested.html");
    await delay(1000);
    const link = document.querySelector(
      "link[rel=stylesheet]",
    ) as HTMLLinkElement | null;
    const sheet = link!.sheet as CSSStyleSheet;
    const before = Array.from(sheet.cssRules, (rule) => rule.cssText);

    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("Nested Font");
    expect(cssText).toContain("data:");
    expect(cssText).toContain("Zm9udAo=");
    expect(cssText.match(/@font-face/g)).toHaveLength(1);
    expect(Array.from(sheet.cssRules, (rule) => rule.cssText)).toEqual(before);
  });

  test("embeds a root-document family used only inside an iframe", async ({
    bootstrap,
  }) => {
    // The face is defined in the root document; only an element inside the
    // iframe uses it. Families are collected from every visited node,
    // including across the iframe boundary, and resolved against the root's
    // own document.
    const node = await bootstrap(
      "fonts/iframe-usage/node.html",
      "fonts/iframe-usage/style.css",
    );
    const iframe = node.querySelector("iframe")!;
    const iframeDocument = iframe.contentDocument!;
    const inner = iframeDocument.createElement("div");
    inner.style.fontFamily = '"Iframe Used Font"';
    inner.textContent = "inner text";
    iframeDocument.body.appendChild(inner);

    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("SUZSQU1FVVNFRA==");
  });

  test("embeds a real font from an installed package via a linked stylesheet", async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "fonts/icon-font/node.html",
      "fonts/icon-font/style.css",
    );
    await delay(1000);

    const svg = await htmlToImage.toSvg(node);
    const cssText = svg.querySelector("style")?.textContent ?? "";

    expect(cssText).toContain("Font Awesome 6 Brands");
    expect(cssText).toContain("@font-face");
  });
});
