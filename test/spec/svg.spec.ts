import { toDataUrl } from "../../src";
import { test } from "../fixtures";

describe("svg clip-path references", () => {
  test("should localize a reference on the root svg, id punctuation included", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/clip-path/root/node.html",
      "svg/clip-path/root/style.css",
      "svg/clip-path/root/reference",
    );
    await renderAndCheck(node);
  });

  test("should localize a reference coming from a stylesheet", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/clip-path/html/node.html",
      "svg/clip-path/html/style.css",
      "svg/clip-path/html/reference",
    );
    await renderAndCheck(node);
  });

  test("should localize a reference given through `options.style`", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/clip-path/html/node.html",
      "svg/clip-path/html/host-style.css",
      "svg/clip-path/html/reference",
    );
    await renderAndCheck(node, {
      style: { clipPath: `url("/context.html#clip-html")` },
    });
  });

  test("should preserve an external reference that collides with a local id", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "svg/clip-path/external/node.html",
      "svg/clip-path/external/style.css",
      "svg/clip-path/external/reference",
    );
    await renderAndCheck(node);
  });

  test("should not mutate the source document", async ({ bootstrap }) => {
    const node = await bootstrap("svg/clip-path/root/node.html");

    await toDataUrl(node);

    expect(node.querySelector("svg")!.getAttribute("clip-path")).toBe(
      `url('/context.html#clip.root:1')`,
    );
  });
});
