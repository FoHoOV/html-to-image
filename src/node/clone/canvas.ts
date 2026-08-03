import { copyAttributes, createImage } from "@/node/utils";
import type { Cloner } from "./types";

export const cloneCanvasElement: Cloner<HTMLCanvasElement> = async ({
  originalNode,
}) => {
  const dataURL = originalNode.toDataURL();

  if (dataURL === "data:,") {
    return originalNode.cloneNode(false) as HTMLCanvasElement;
  }

  const cloned = await createImage(dataURL);
  copyAttributes(cloned, originalNode);
  return cloned;
};
