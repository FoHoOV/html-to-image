import { createImage } from "@/node/utils";
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

    return createVideoImage(canvas.toDataURL(), originalNode);
  }

  const poster = originalNode.poster;
  const dataURL = await resourceToDataUrl(poster, getMimeType(poster), context);
  return createVideoImage(dataURL, originalNode);
};

async function createVideoImage(dataURL: string, originalNode: HTMLElement) {
  const image = await createImage(dataURL);
  image.className = originalNode.className;
  image.style.cssText = originalNode.style.cssText;
  image.style.display = window.getComputedStyle(originalNode).display;
  return image;
}
