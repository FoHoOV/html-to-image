import type { Cloner } from "./types";
import { loadInlinedImage } from "@/node/utils";
import { getMimeType, isDataUrl, resourceToDataUrl } from "@/utils";

export const cloneImageElement: Cloner<HTMLImageElement> = ({
  originalNode,
  context,
}) => {
  const cloned = originalNode.cloneNode(false) as HTMLImageElement;
  const url = cloned.src;

  if (isDataUrl(url)) {
    return cloned;
  }

  // Queued rather than awaited: the traversal awaits every cloner, so awaiting
  // here would serialize one fetch, load, and decode per image into the walk
  // rather than running them concurrently.
  context.embedding.image.add(async () => {
    const dataUrl = await resourceToDataUrl(
      url,
      getMimeType(url),
      context.options.imagePlaceholder,
      context,
    );

    if (cloned.loading === "lazy") {
      cloned.loading = "eager";
    }
    cloned.decoding = "sync";
    cloned.srcset = "";
    cloned.src = dataUrl;

    await loadInlinedImage(dataUrl, context);
  });

  return cloned;
};
