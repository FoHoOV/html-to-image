import type { Options } from "@/types";
import type { Context } from "@/context";
import { getNodeHeight, getNodeWidth } from "./size";

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img
        .decode()
        .then(() => {
          requestAnimationFrame(() => resolve(img));
        })
        .catch(reject);
    };
    img.onerror = reject;
    if (!url.startsWith("data:") && !url.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.decoding = "sync";
    img.src = url;
  });
}

/**
 * NOTE: the element should be mounted to dom for this to work
 *
 * @param targetNode
 * @param options
 * @returns calculated dom sizes including borders
 */
export function getImageSize(targetNode: HTMLElement, options: Options) {
  const width = options.width ?? getNodeWidth(targetNode);
  const height = options.height ?? getNodeHeight(targetNode);

  return { width, height };
}

/**
 * Loads an inlined source to prove it decodes, applying the caller's
 * `onImageErrorHandler` policy when it does not.
 */
export async function loadInlinedImage(dataUrl: string, context: Context) {
  try {
    await createImage(dataUrl);
  } catch (error) {
    const { onImageErrorHandler } = context.options;

    if (!onImageErrorHandler) {
      const failure = new Error("image load failed") as Error & {
        cause: unknown;
      };
      failure.cause = error;
      throw failure;
    }

    await onImageErrorHandler(error as Event);
  }
}
