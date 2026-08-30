import type { Cloner } from "../types";
import { loadInlinedImage, setHref } from "@/node/utils";
import { getMimeType, isDataUrl, resourceToDataUrl } from "@/utils";
import { cloneSvgElement } from "./svg";

export const cloneSvgImageElement: Cloner<SVGImageElement> = (config) => {
  // Delegated rather than shallow-cloned here: an SVG `<image>` reaches
  // `cloneSvgElement` through the general SVG branch, so bypassing it would
  // drop the WebKit namespace fix along with href and clip-path normalization.
  const cloned = cloneSvgElement(config) as SVGImageElement;
  const { context } = config;
  const url = cloned.href.baseVal;

  if (isDataUrl(url)) {
    return cloned;
  }

  // Queued rather than awaited, for the same reason as the `<img>` cloner.
  context.embedding.image.add(async () => {
    const dataUrl = await resourceToDataUrl(
      url,
      getMimeType(url),
      context.options.imagePlaceholder,
      context,
    );

    setHref(cloned, dataUrl);

    await loadInlinedImage(dataUrl, context);
  });

  return cloned;
};
