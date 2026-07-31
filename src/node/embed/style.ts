import { getStyleProperties } from "@/node/utils";
import type { Embedder } from "../embed/types";

export const embedStyles: Embedder<HTMLElement | SVGElement> = ({
  clonedNode,
  originalNode,
  context,
}) => {
  const styleProps = getStyleProperties(context);
  // TODO: why not the clonedNode
  if (isChildOfSvg(originalNode)) {
    return;
  }

  // TODO: bad min support
  // eslint-disable-next-line no-restricted-syntax
  const computedStyles = originalNode.computedStyleMap();
  const isParentGridOrFlex =
    clonedNode.parentElement &&
    isFlexOrGridDisplay(
      window.getComputedStyle(clonedNode.parentElement).display,
    );

  const nodeStyles = new Map<string, { value: string; priority: string }>();

  styleProps.forEach((name) => {
    if (SKIPPED_STYLE_PROPS.has(name)) {
      return;
    }

    if ((name === "width" || name === "inline-size") && isParentGridOrFlex) {
      return;
    }

    let value = computedStyles.get(name)?.toString() ?? "";
    if (name === "font-kerning") {
      value = "normal";
    }

    if (name === "d" && clonedNode.getAttribute("d")) {
      value = `path(${clonedNode.getAttribute("d")})`;
    }

    nodeStyles.set(name, {
      value,
      priority: "",
    });
  });

  nodeStyles.forEach(({ value, priority }, key) => {
    clonedNode.style.setProperty(key, value, priority);
  });
};

const SKIPPED_STYLE_PROPS = new Set([
  "-webkit-text-fill-color",
  "-webkit-text-stroke",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
]);

function isChildOfSvg(node: Element) {
  const closestSvg = node.closest("svg");

  return closestSvg != null && closestSvg !== node;
}

function isFlexOrGridDisplay(display: string) {
  return display.includes("flex") || display.includes("grid");
}
