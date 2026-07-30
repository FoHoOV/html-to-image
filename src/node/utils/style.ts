import type { Context } from "@/context";

let styleProps: string[] | null = null;
export function getStyleProperties({ options }: Context): string[] {
  if (options.includeStyleProperties) {
    return options.includeStyleProperties;
  }

  if (!styleProps) {
    styleProps = Array.from(window.getComputedStyle(document.documentElement));
  }

  return styleProps;
}

export function applyStyle<TElement extends HTMLElement>(
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
  if (manual != null) {
    Object.entries(manual).forEach(([key, value]) => {
      if (value == null) {
        return;
      }
      node.style.setProperty(
        toCssPropertyName(key),
        value.toString(),
        "important",
      );
    });
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
