import { test } from "../fixtures";

describe("work with canvas element", () => {
  test("should render canvas element when it can be retrieved via toDataUrl", async ({
    bootstrap,
    renderAndCompareCanvas,
  }) => {
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
    context.fillText("AB2哈", 40, 40);

    // since the tests run on mozilla/chromium/safari different browsers have different font rasterization,
    // so we can just compare to the rendered browser node to prevent flaky tests
    await renderAndCompareCanvas(canvas, node);
  });
});
