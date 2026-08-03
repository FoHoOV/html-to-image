import type { Context } from "@/context";

const SKIPPED_STYLE_PROPS = new Set([
  "-webkit-text-fill-color",
  "-webkit-text-stroke",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
]);

let styleProps: string[] | null = null;
export function getStyleProperties({ options }: Context): string[] {
  if (options.includeStyleProperties) {
    return options.includeStyleProperties;
  }

  if (!styleProps) {
    styleProps = Array.from(getComputedStyle(document.documentElement));
  }

  return styleProps;
}

export function getComputedStyle(element: HTMLElement | SVGElement) {
  const sourceWindow = element.ownerDocument.defaultView ?? window;
  return sourceWindow.getComputedStyle(element);
}

export function serializeComputedStyles(
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

export function applyCustomStyles<TElement extends HTMLElement>(
  node: TElement,
  { options }: Context,
) {
  if (options.width) {
    node.style.width = `${options.width}px`;
  }

  if (options.height) {
    node.style.height = `${options.height}px`;
  }

  const manual = options.style;
  if (!manual) {
    return;
  }
  for (const key of Object.keys(manual)) {
    const value = manual[key as keyof typeof manual];

    if (value == null) {
      continue;
    }

    node.style.setProperty(
      toCssPropertyName(key),
      value.toString(),
      "important",
    );
  }
}

function toCssPropertyName(property: string) {
  if (property.startsWith("--") || property.includes("-")) {
    return property;
  }
  if (property === "cssFloat") {
    return "float";
  }

  const cssProperty = property.replace(
    /[A-Z]/g,
    (letter) => `-${letter.toLowerCase()}`,
  );
  return cssProperty;
}
