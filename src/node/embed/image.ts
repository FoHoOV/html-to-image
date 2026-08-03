import type { Context } from "@/context";
import { isInstanceOfElement } from "@/node/utils";
import { getMimeType, resourceToDataUrl, isDataUrl } from "@/utils";
import { getEmbeddableResource } from "../utils/resources";
import type { Embedder } from "./types";

export const embedImages: Embedder<
  HTMLElement | SVGElement,
  Promise<void>
> = async ({ clonedNode, context }) => {
  await Promise.all([
    embedBackground(clonedNode, context),
    embedMask(clonedNode, context),
    embedImageNode(clonedNode, context),
  ]);
};

async function embedProp(
  propName: string,
  propValue: string,
  node: HTMLElement | SVGElement,
  context: Context,
) {
  const cssString = await getEmbeddableResource(propValue, null, context);

  await context.status.embedding.css.ready;

  node.style.setProperty(
    propName,
    cssString,
    node.style.getPropertyPriority(propName),
  );
}

async function embedBackground<T extends HTMLElement | SVGElement>(
  clonedNode: T,
  context: Context,
) {
  const { prop, value } = getFirstHitFromProperty(clonedNode, [
    "background",
    "background-image",
  ]);
  if (!prop) {
    return;
  }
  await embedProp(prop, value, clonedNode, context);
}

async function embedMask<T extends HTMLElement | SVGElement>(
  clonedNode: T,
  context: Context,
) {
  const { prop, value } = getFirstHitFromProperty(clonedNode, [
    "mask",
    "-webkit-mask",
    "mask-image",
    "-webkit-mask-image",
  ]);
  if (!prop) {
    return;
  }
  await embedProp(prop, value, clonedNode, context);
}

function getFirstHitFromProperty<T extends HTMLElement | SVGElement>(
  clonedNode: T,
  props: string[],
) {
  for (const prop of props) {
    const value = clonedNode.style?.getPropertyValue(prop);
    if (value) {
      return { value, prop };
    }
  }
  return {};
}

async function embedImageNode<T extends HTMLElement | SVGElement>(
  clonedNode: T,
  context: Context,
) {
  const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement);
  if (!isImageElement && !isInstanceOfElement(clonedNode, SVGImageElement)) {
    return;
  }

  const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal;
  if (isDataUrl(url)) {
    return;
  }

  const dataURL = await resourceToDataUrl(url, getMimeType(url), context);
  let imageErrorHandled = false;
  await new Promise((resolve, reject) => {
    clonedNode.onload = resolve;
    clonedNode.onerror = (...args: Parameters<OnErrorEventHandlerNonNull>) => {
      if (!context.options.onImageErrorHandler) {
        const imageLoadError = new Error("image load failed") as Error & {
          cause: unknown;
        };
        imageLoadError.cause = args;
        reject(imageLoadError);
        return;
      }

      try {
        imageErrorHandled = true;
        resolve(context.options.onImageErrorHandler(...args));
      } catch (error) {
        reject(error);
      }
    };

    const image = clonedNode as HTMLImageElement;
    if (image.loading === "lazy") {
      image.loading = "eager";
    }
    image.decoding = "sync";

    if (isImageElement) {
      clonedNode.srcset = "";
      clonedNode.src = dataURL;
    } else {
      clonedNode.href.baseVal = dataURL;
    }
  });

  if (!imageErrorHandled) {
    await (clonedNode as HTMLImageElement).decode();
  }
}
