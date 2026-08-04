import { normalizeClipPath } from "./utils";
import type { Cloner } from "../types";
import { normalizeHref } from "@/node/utils";

export const cloneSvgElement: Cloner<SVGElement> = ({ originalNode }) => {
  const cloned = originalNode.cloneNode(false) as SVGElement;

  if (!cloned.hasAttribute("xmlns") && cloned.namespaceURI) {
    cloned.setAttribute("xmlns", cloned.namespaceURI);
  }

  normalizeHref(cloned);
  normalizeClipPath(cloned);

  return cloned;
};
