import { toPng } from "../../src";
import { test } from "../fixtures";

describe("special cases", () => {
  test("should not crash when loading external stylesheet causes error", async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap("ext-css/node.html", "ext-css/style.css");
    await delay(1000);
    await toPng(node);
  });

  test("should caputre lazy loading images", async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap("images/loading.html", "images/style.css");
    await assertTextRendered(["PNG", "JPG"], node);
  });
});
