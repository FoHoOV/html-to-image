import { normalizeClipPath, normalizeHref } from "./utils";
import { Cloner } from "../types";

export const cloneSvgElement: Cloner<SVGElement> = ({ originalNode }) => {
  const cloned = originalNode.cloneNode(false) as SVGElement;

  normalizeHref(cloned);
  normalizeClipPath(cloned);

  return cloned;
};
