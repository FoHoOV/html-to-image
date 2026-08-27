import { toPng } from "../../src";

function createBrokenImageNode() {
  const node = document.createElement("div");
  const img = document.createElement("img");
  img.src = "invalid_url";
  node.appendChild(img);
  return node;
}

describe("onImageErrorHandler", () => {
  test("should call the onImageErrorHandler when an error occurs", async () => {
    const handlers = {
      onError: () => {},
    };
    vi.spyOn(handlers, "onError");

    await toPng(createBrokenImageNode(), {
      onImageErrorHandler: handlers.onError,
    });

    expect(handlers.onError).toHaveBeenCalled();
  });

  test("should reject with an error if no onImageErrorHandler is provided", async () => {
    await expect(toPng(createBrokenImageNode())).rejects.toEqual(
      expect.any(Error),
    );
  });

  test("should propagate errors from onImageErrorHandler", async () => {
    const handlerError = new Error("image error handler failed");

    await expect(
      toPng(createBrokenImageNode(), {
        onImageErrorHandler: () => Promise.reject(handlerError),
      }),
    ).rejects.toBe(handlerError);
  });
});
