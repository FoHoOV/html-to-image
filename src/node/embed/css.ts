import { Embedder } from "../embed/types";

export const embedCssText: Embedder<HTMLElement | SVGElement> = ({
  originalNode,
  clonedNode,
}) => {
  const targetStyle = clonedNode.style;
  if (!targetStyle) {
    return;
  }

  const sourceWindow = originalNode.ownerDocument.defaultView ?? window;
  // TODO: why get style like this? why not node.style.cssText, the property specific clone is done in a later step!
  const sourceStyle = sourceWindow.getComputedStyle(originalNode);
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText;
    // TODO: why this is done separately?
    targetStyle.transformOrigin = sourceStyle.transformOrigin;
  }
  return;
};
