import { createImage } from "@/node/utils";
import type { Cloner } from "./types";

export const cloneCanvasElement: Cloner<HTMLCanvasElement> = ({
  originalNode,
}) => {
  const dataURL = originalNode.toDataURL();

  if (dataURL === "data:,") {
    return originalNode.cloneNode(false) as HTMLCanvasElement;
  }

  return createImage(dataURL);
};
