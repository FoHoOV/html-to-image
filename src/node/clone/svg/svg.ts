import { normalizeClipPath, normalizeHref } from "@/node/utils";
import type { Cloner } from "../types";

export const cloneSvgElement: Cloner<SVGElement> = ({ originalNode }) => {
  const cloned = originalNode.cloneNode(false) as SVGElement;

  // fix broken namespace issue on webkit which fails rendering
  if (cloned.namespaceURI) {
    cloned.setAttribute("xmlns", cloned.namespaceURI);
  }

  normalizeHref(cloned);
  normalizeClipPath(cloned);

  return cloned;
};
