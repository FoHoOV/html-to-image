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

  test("should caputre lazy loading images", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap(
      "media/images/loading.html",
      "media/images/style.css",
    );
    await assertTextRendered(["PNG", "JPG"], node);
  });
});
