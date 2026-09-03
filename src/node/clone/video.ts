import type { Context } from "@/context";
import { copyAttributes, loadInlinedImage } from "@/node/utils";
import { getMimeType, resourceToDataUrl } from "@/utils";
import type { Cloner } from "./types";

export const cloneVideoElement: Cloner<HTMLVideoElement> = async ({
  originalNode,
  context,
}) => {
  if (originalNode.currentSrc) {
    const canvas = document.createElement("canvas");
    const canvasContext = canvas.getContext("2d");

    canvas.width = originalNode.clientWidth;
    canvas.height = originalNode.clientHeight;
    canvasContext?.drawImage(originalNode, 0, 0, canvas.width, canvas.height);

    return createVideoImage(canvas.toDataURL(), originalNode, context);
  }

  const poster = originalNode.poster;
  const dataURL = await resourceToDataUrl(
    poster,
    getMimeType(poster),
    context.options.imagePlaceholder,
    context,
  );
  return createVideoImage(dataURL, originalNode, context);
};

async function createVideoImage(
  dataURL: string,
  originalNode: HTMLElement,
  context: Context,
) {
  const image = new Image();
  image.decoding = "sync";
  copyAttributes(image, originalNode);
  image.src = dataURL;

  await loadInlinedImage(dataURL, context);

  return image;
}
