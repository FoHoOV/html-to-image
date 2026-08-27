import { toPng } from "../../src";
import { test } from "../fixtures";

describe("onImageErrorHandler", () => {
  test("should call the onImageErrorHandler when an error occurs", async ({
    createImageNode,
  }) => {
    const handlers = {
      onError: () => {},
    };
    vi.spyOn(handlers, "onError");

    await toPng(createImageNode("invalid_url"), {
      onImageErrorHandler: handlers.onError,
    });

    expect(handlers.onError).toHaveBeenCalled();
  });

  test("should reject with an error if no onImageErrorHandler is provided", async ({
    createImageNode,
  }) => {
    await expect(toPng(createImageNode("invalid_url"))).rejects.toEqual(
      expect.any(Error),
    );
  });

  test("should propagate errors from onImageErrorHandler", async ({
    createImageNode,
  }) => {
    const handlerError = new Error("image error handler failed");

    await expect(
      toPng(createImageNode("invalid_url"), {
        onImageErrorHandler: () => Promise.reject(handlerError),
      }),
    ).rejects.toBe(handlerError);
  });
});
