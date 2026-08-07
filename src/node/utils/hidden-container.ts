import type { Context } from "@/context";
import { getComputedStyle, serializeComputedStyles } from "./style";

/**
 * Attaches the clone to a hidden container so it reflows before its computed
 * styles are read. The container copies the original parent's computed styles,
 * so inherited and layout-dependent values resolve as they would in place.
 *
 * Returns a function that detaches it again.
 */
export function addHiddenDomElement(
  clonedNode: Node,
  originalNode: Node,
  context: Context,
) {
  const hiddenNode = document.createElement("div");

  const parent = originalNode.parentNode ?? document.body;
  const parentComputedStyles = getComputedStyle(parent as HTMLElement);
  hiddenNode.style.cssText = serializeComputedStyles(
    parentComputedStyles,
    hiddenNode,
    context,
  );

  hiddenNode.style.position = "fixed";
  hiddenNode.style.zIndex = "-100000";
  hiddenNode.style.opacity = "0";
  hiddenNode.style.top = "0";
  hiddenNode.style.left = "-200%";

  hiddenNode.appendChild(clonedNode);
  parent.insertBefore(hiddenNode, parent.firstChild);
  return () => {
    hiddenNode.remove();
  };
}
