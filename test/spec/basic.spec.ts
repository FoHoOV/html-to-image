import * as htmlToImage from "../../src";
import { test } from "../fixtures";

describe("basic usage", () => {
  test("should render to svg as dataurl", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "small/node.html",
      "small/style.css",
      "small/image",
    );
    const dataUrl = await htmlToImage.toDataUrl(node);
    await check(dataUrl);
  });

  test("should render to png", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "small/node.html",
      "small/style.css",
      "small/image",
    );
    const dataUrl = await htmlToImage.toPng(node);
    await check(dataUrl);
  });

  test("should render to blob", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "small/node.html",
      "small/style.css",
      "small/image",
    );
    const blob = await htmlToImage.toBlob(node);
    const dataUrl = globalThis.URL.createObjectURL(blob!);
    await check(dataUrl);
  });

  test("should render to jpeg", async ({ bootstrap, check }) => {
    const node = await bootstrap(
      "small/node.html",
      "small/style.css",
      "small/image-jpeg",
    );
    const dataUrl = await htmlToImage.toJpeg(node);
    await check(dataUrl);
  });

  test("should use quality parameter when rendering to jpeg", async ({
    bootstrap,
    check,
  }) => {
    const node = await bootstrap(
      "small/node.html",
      "small/style.css",
      "small/image-jpeg-low",
    );
    const dataUrl = await htmlToImage.toJpeg(node, { quality: 0.5 });
    await check(dataUrl);
  });

  test("should convert an element to an array of pixels", async ({
    bootstrap,
  }) => {
    const node = await bootstrap("pixeldata/node.html", "pixeldata/style.css");
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
      "border/node.html",
      "border/style.css",
      "border/image",
    );
    await renderAndCheck(node);
  });

  test("should render bigger node", async ({ bootstrap, renderAndCheck }) => {
    const parent = await bootstrap(
      "bigger/node.html",
      "bigger/style.css",
      "bigger/image",
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
      "hash/node.html",
      "hash/style.css",
      "small/image",
    );
    await renderAndCheck(node);
  });

  test("should render whole node when its scrolled", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "scroll/node.html",
      "scroll/style.css",
      "scroll/image",
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
      "sheet/node.html",
      "sheet/style.css",
      "sheet/image",
    );
    await delay(1000);
    await renderAndCheck(node);
  });

  test("should render text nodes", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap("text/node.html", "text/style.css");
    await assertTextRendered(["SOME TEXT", "SOME MORE TEXT"], node);
  });

  test("should preserve content of ::before and ::after pseudo elements", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap("pseudo/node.html", "pseudo/style.css");
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
    const node = await bootstrap("fonts/node.html", "fonts/style.css");
    await delay(1000);
    await assertTextRendered(["apper"], node);
  });

  test("should render images", async ({
    assertTextRendered,
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap("images/node.html", "images/style.css");
    await delay(500);
    await assertTextRendered(["PNG", "JPG"], node);
  });

  test("should render webp images", async ({
    assertTextRendered,
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap("webp/node.html", "webp/style.css");
    await delay(500);
    await assertTextRendered(["PNG"], node);
  });

  test("should render background images", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap("css-bg/node.html", "css-bg/style.css");
    await assertTextRendered(["JPG"], node);
  });

  test("should render user input from <input>", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const text = "USER INPUT";
    const node = await bootstrap("input/node.html", "input/style.css");
    const input = document.getElementById("input") as HTMLInputElement;
    input.value = text;

    await assertTextRendered([text], node);
  });

  test("should render user input from <textarea>", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const text = `USER\nINPUT`;
    const node = await bootstrap("textarea/node.html", "textarea/style.css");
    const input = document.getElementById("input") as HTMLInputElement;
    input.value = text;

    await assertTextRendered([text], node);
  });

  test("should render content from <canvas>", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const text = "AB2哈";
    const node = await bootstrap("canvas/node.html", "canvas/style.css");
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
