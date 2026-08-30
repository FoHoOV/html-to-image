import { toPng } from "../../src";
import { test } from "../fixtures";

describe("special cases", () => {
  test("should not crash when loading external stylesheet causes error", async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap(
      "document/external-stylesheet/node.html",
      "document/external-stylesheet/style.css",
    );
    await delay(1000);
    await toPng(node);
  });

  test("should render lazy loading images", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    // embedImageNode forces `loading` to "eager" before decoding, so this
    // renders identically to media/images and reuses its reference.
    const node = await bootstrap(
      "media/images/loading.html",
      "media/images/style.css",
      "media/images/reference",
    );
    await renderAndCheck(node);
  });
});
