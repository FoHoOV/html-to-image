import type { Context } from "@/context";
import { getStyleProperties } from "@/node/utils";
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
  const sourceWindow = clonedNode.ownerDocument.defaultView ?? window;
  const sourceStyle = sourceWindow.getComputedStyle(clonedNode);
  const transformOrigin = sourceStyle.transformOrigin;
  const cssText = serializeComputedStyles(sourceStyle, clonedNode, context);

  targetStyle.cssText = cssText;
  // Safari historically omitted transform-origin from computed cssText.
  targetStyle.transformOrigin = transformOrigin;
};

const SKIPPED_STYLE_PROPS = new Set([
  "-webkit-text-fill-color",
  "-webkit-text-stroke",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
]);

function serializeComputedStyles(
  sourceStyles: CSSStyleDeclaration,
  clonedNode: HTMLElement | SVGElement,
  context: Context,
) {
  const path = clonedNode.getAttribute("d");

  return getStyleProperties(context)
    .filter((property) => !SKIPPED_STYLE_PROPS.has(property))
    .map((property) => {
      let value = sourceStyles.getPropertyValue(property);
      if (property === "font-kerning") {
        value = "normal";
      } else if (property === "d" && path) {
        value = `path(${path})`;
      }

      const priority = sourceStyles.getPropertyPriority(property);
      return `${property}: ${value}${priority ? " !important" : ""};`;
    })
    .join(" ");
}

function isChildOfSvg(node: Element) {
  const closestSvg = node.closest("svg");
  return closestSvg != null && closestSvg !== node;
}
