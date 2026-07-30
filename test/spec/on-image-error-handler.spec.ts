import { createContext } from "../../src/context";
import { embedImages } from "../../src/node/embed";

describe("Error Handling in resourceToDataURL", () => {
  test("should call the onImageErrorHandler when an error occurs", async () => {
    const handlers = {
      onError: () => {},
    };
    vi.spyOn(handlers, "onError");
    const options = { onImageErrorHandler: handlers.onError };
    const node = document.createElement("img");
    node.src = "invalid_url";

    // Assuming resourceToDataURL is the function being tested
    await embedImages({
      originalNode: node,
      clonedNode: node.cloneNode() as HTMLImageElement,
      clonedParentNode: null,
      context: createContext(options),
    });
    expect(handlers.onError).toHaveBeenCalled();
  });

  test("should reject with an error if no onImageErrorHandler is provided", async () => {
    const node = document.createElement("img");
    node.src = "invalid_url";
    let rejection: unknown;

    try {
      await embedImages({
        originalNode: node,
        clonedNode: node.cloneNode() as HTMLImageElement,
        clonedParentNode: null,
        context: createContext(),
      });
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toEqual(expect.any(Error));
  });

  test("should propagate errors from onImageErrorHandler", async () => {
    const handlerError = new Error("image error handler failed");
    const node = document.createElement("img");
    node.src = "invalid_url";
    let rejection: unknown;

    try {
      await embedImages({
        originalNode: node,
        clonedNode: node.cloneNode() as HTMLImageElement,
        clonedParentNode: null,
        context: createContext({
          onImageErrorHandler: () => Promise.reject(handlerError),
        }),
      });
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBe(handlerError);
  });
});
