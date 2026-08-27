import * as htmlToImage from "../../src";
import { test } from "../fixtures";

describe("basic usage", () => {
  test("should render to svg as dataurl", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "document/baseline/node.html",
      "document/baseline/style.css",
      "document/baseline/reference",
    );
    const dataUrl = await htmlToImage.toDataUrl(node);
    await check(dataUrl);
  });

  test("should render to png", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "document/baseline/node.html",
      "document/baseline/style.css",
      "document/baseline/reference",
    );
    const dataUrl = await htmlToImage.toPng(node);
    await check(dataUrl);
  });

  test("should render to blob", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "document/baseline/node.html",
      "document/baseline/style.css",
      "document/baseline/reference",
    );
    const blob = await htmlToImage.toBlob(node);
    const dataUrl = globalThis.URL.createObjectURL(blob!);
    await check(dataUrl);
  });

  test("should render to jpeg", async ({ bootstrap, check }) => {
    // JPEG encoders can apply different chroma subsampling. This grayscale
    // fixture has distinct regions without browser-specific color artifacts.
    const node = await bootstrap(
      "document/baseline/node.html",
      "document/baseline/jpeg-style.css",
      "document/baseline/reference-jpeg",
    );
    const dataUrl = await htmlToImage.toJpeg(node);
    await check(dataUrl);
  });

  test("should use quality parameter when rendering to jpeg", async ({
    bootstrap,
    check,
  }) => {
    const node = await bootstrap(
      "document/baseline/node.html",
      "document/baseline/style.css",
      "document/baseline/reference-jpeg-low",
    );
    const dataUrl = await htmlToImage.toJpeg(node, { quality: 0.5 });
    await check(dataUrl);
  });

  test("should convert an element to an array of pixels", async ({
    bootstrap,
  }) => {
    const node = await bootstrap(
      "document/pixel-data/node.html",
      "document/pixel-data/style.css",
    );
    const pixels = await htmlToImage.toPixelData(node);

    for (let y = 0; y < node.scrollHeight; y += 1) {
      for (let x = 0; x < node.scrollWidth; x += 1) {
        const rgba = [0, 0, 0, 0];

        if (y < 10) {
          rgba[0] = 255;
        } else if (y < 20) {
          rgba[1] = 255;
        } else {
          rgba[2] = 255;
        }

        if (x < 10) {
          rgba[3] = 255;
        } else if (x < 20) {
          rgba[3] = 0.4 * 255;
        } else {
          rgba[3] = 0.2 * 255;
        }

        const offset = 4 * y * node.scrollHeight + 4 * x;
        const target: number[] = [];
        pixels.slice(offset, offset + 4).forEach((value) => target.push(value));
        expect(target).toEqual(rgba);
      }
    }
  });

  test("should handle border", async ({ bootstrap, renderAndCheck }) => {
    const node = await bootstrap(
      "document/border/node.html",
      "document/border/style.css",
      "document/border/reference",
    );
    await renderAndCheck(node);
  });

  test("should render bigger node", async ({ bootstrap, renderAndCheck }) => {
    const parent = await bootstrap(
      "document/bigger/node.html",
      "document/bigger/style.css",
      "document/bigger/reference",
    );
    const child = parent.querySelector(".dom-child-node") as HTMLDivElement;

    for (let i = 0; i < 10; i += 1) {
      parent.appendChild(child.cloneNode(true));
    }

    await renderAndCheck(parent);
  });

  test('should handle "#" in colors and attributes', async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "document/hash/node.html",
      "document/hash/style.css",
      "document/baseline/reference",
    );
    await renderAndCheck(node);
  });

  test("should render whole node when its scrolled", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "document/scroll/node.html",
      "document/scroll/style.css",
      "document/scroll/reference",
    );
    const scrolled = node.querySelector("#scrolled") as HTMLDivElement;
    await renderAndCheck(scrolled);
  });

  test("should render with external stylesheet", async ({
    bootstrap,
    delay,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "document/stylesheet/node.html",
      "document/stylesheet/style.css",
      "document/stylesheet/reference",
    );
    await delay(1000);
    await renderAndCheck(node);
  });

  test("should render text nodes", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap(
      "document/text/node.html",
      "document/text/style.css",
    );
    await assertTextRendered(["SOME TEXT", "SOME MORE TEXT"], node);
  });

  test("should preserve content of ::before and ::after pseudo elements", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap(
      "document/pseudo/node.html",
      "document/pseudo/style.css",
    );
    await assertTextRendered(
      ["JUSTBEFORE", "BOTHBEFORE", "JUSTAFTER", "BOTHAFTER"],
      node,
    );
  });

  test("should render web fonts", async ({
    assertTextRendered,
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "fonts/icon-font/node.html",
      "fonts/icon-font/style.css",
    );
    await delay(1000);
    await assertTextRendered(["apper"], node);
  });

  test("should render images", async ({
    assertTextRendered,
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "media/images/node.html",
      "media/images/style.css",
    );
    await delay(500);
    await assertTextRendered(["PNG", "JPG"], node);
  });

  test("should render webp images", async ({
    assertTextRendered,
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "media/webp/node.html",
      "media/webp/style.css",
    );
    await delay(500);
    await assertTextRendered(["PNG"], node);
  });

  test("should render background images", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap(
      "media/background-image/node.html",
      "media/background-image/style.css",
    );
    await assertTextRendered(["JPG"], node);
  });

  test("should render user input from <input>", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const text = "USER INPUT";
    const node = await bootstrap(
      "forms/input/node.html",
      "forms/input/style.css",
    );
    const input = document.getElementById("input") as HTMLInputElement;
    input.value = text;

    await assertTextRendered([text], node);
  });

  test("should render user input from <textarea>", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const text = `USER\nINPUT`;
    const node = await bootstrap(
      "forms/textarea/node.html",
      "forms/textarea/style.css",
    );
    const input = document.getElementById("input") as HTMLInputElement;
    input.value = text;

    await assertTextRendered([text], node);
  });

  test("should render content from <canvas>", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const text = "AB2哈";
    const node = await bootstrap(
      "media/canvas/node.html",
      "media/canvas/style.css",
    );
    const canvas = node.querySelector("#content") as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#000000";
    context.font = "40px serif";
    context.fillText(text, 40, 40);

    await assertTextRendered([text], node);
  });
});
