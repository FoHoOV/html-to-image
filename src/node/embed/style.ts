import { getComputedStyle, serializeComputedStyles } from "@/node/utils";
import type { Embedder } from "../embed/types";

export const embedStyles: Embedder<
  HTMLElement | SVGElement,
  Promise<void>
> = async ({ clonedNode, context }) => {
  if (isChildOfSvg(clonedNode)) {
    return;
  }

  const targetStyle = clonedNode.style;
  if (!targetStyle) {
    return;
  }
  await context.status.addedToDom.ready;
  const sourceStyle = getComputedStyle(clonedNode);

  const transformOrigin = sourceStyle.transformOrigin;
  const cssText = serializeComputedStyles(sourceStyle, clonedNode, context);

  targetStyle.cssText = cssText;
  // Safari historically omitted transform-origin from computed cssText.
  targetStyle.transformOrigin = transformOrigin;
};

function isChildOfSvg(node: Element) {
  const closestSvg = node.closest("svg");
  return closestSvg != null && closestSvg !== node;
}
