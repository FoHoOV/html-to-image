import { toPng } from "../../src";
import { test } from "../fixtures";

describe("onEmbeddedImageError", () => {
  test("should call the handler when an error occurs", async ({
    createImageNode,
  }) => {
    const handlers = {
      onError: () => {},
    };
    vi.spyOn(handlers, "onError");

    await toPng(createImageNode("invalid_url"), {
      onEmbeddedImageError: handlers.onError,
    });

    expect(handlers.onError).toHaveBeenCalled();
  });

  test("should call the handler when a video poster cannot be fetched", async ({
    bootstrap,
  }) => {
    const handlers = {
      onError: () => {},
    };
    vi.spyOn(handlers, "onError");
    const node = await bootstrap(
      "media/video/missing-poster.html",
      "media/video/style.css",
    );

    await toPng(node, { onEmbeddedImageError: handlers.onError });

    expect(handlers.onError).toHaveBeenCalled();
  });

  test("should reject with an error if no handler is provided", async ({
    createImageNode,
  }) => {
    await expect(toPng(createImageNode("invalid_url"))).rejects.toEqual(
      expect.any(Error),
    );
  });

  test("should propagate errors from the handler", async ({
    createImageNode,
  }) => {
    const handlerError = new Error("image error handler failed");

    await expect(
      toPng(createImageNode("invalid_url"), {
        onEmbeddedImageError: () => Promise.reject(handlerError),
      }),
    ).rejects.toBe(handlerError);
  });
});
