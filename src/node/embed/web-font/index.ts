import type { Context } from "@/context";
import { getComputedStyle, isInstanceOfElement } from "@/node/utils";
import { addUsedFontFamilies, normalizeFontFamily } from "./font-family";
import { FontResolver } from "./resolver";
import { addFontStyleNode } from "./serialize";

import type { EmbedContext, Embedder } from "../types";

/**
 * Runs per node during the single source-DOM traversal, recording the families
 * that node uses. The root additionally queues the one deferred job that turns
 * those families into CSS; it waits for `context.cloning` because the families
 * are still being collected while it is queued.
 */
export const embedWebFonts: Embedder<HTMLElement | SVGElement, void> = (
  config,
) => {
  const context = config.context;
  const fonts = context.options.fonts;

  if (fonts?.strategy === "none") {
    return;
  }

  if (fonts?.strategy === "provided") {
    if (config.isRoot) {
      context.embedding.font.add(() =>
        addFontStyleNode(config.clonedNode, [fonts.fontFaces]),
      );
    }
    return;
  }

  trackUsedFamilies(config);

  if (config.isRoot) {
    // Every family the tree uses, wherever it was found, is resolved against
    // the rendered root's own document.
    const rootDocument = config.originalNode.ownerDocument ?? document;
    context.embedding.font.add(async () => {
      await context.cloning.ready;

      const usedFamilies = context.embedding.font.usedFamilies;
      let wanted: ReadonlySet<string> = usedFamilies;
      const overrideCSS: string[] = [];

      if (fonts?.fontFaces) {
        // A family listed here is never discovered: this render's whole
        // stylesheet scan is smaller by exactly the families overridden.
        const overrides = new Map<string, string>();
        for (const family of Object.keys(fonts.fontFaces)) {
          overrides.set(normalizeFontFamily(family), fonts.fontFaces[family]);
        }
        const remaining = new Set<string>();
        for (const family of usedFamilies) {
          const css = overrides.get(family);
          if (css) {
            overrideCSS.push(css);
          } else {
            remaining.add(family);
          }
        }
        wanted = remaining;
      }

      const resolver = new FontResolver(context);
      await resolver.resolveAll(rootDocument, wanted);
      addFontStyleNode(config.clonedNode, [
        ...resolver.cssTexts,
        ...overrideCSS,
      ]);
    });
  }
};

function trackUsedFamilies({
  originalNode,
  context,
  isRoot,
}: EmbedContext<HTMLElement | SVGElement>) {
  const fontSource = getFontSourceElement(originalNode);

  if (fontSource) {
    trackFamilies(
      getComputedStyle(fontSource).getPropertyValue("font-family"),
      context,
    );
  }

  // The root also honors an explicit root font-family override.
  if (isRoot) {
    const style = context.options.style as
      Record<string, string | number | null | undefined> | undefined;
    trackFamilies(style?.fontFamily ?? style?.["font-family"], context);
  }
}

function trackFamilies(
  value: string | number | null | undefined,
  context: Context,
) {
  if (value == null) {
    return;
  }

  const font = context.embedding.font;

  // Identical to a value already parsed, so the families it names are already
  // recorded regardless of which node produced it.
  const sourceValue = String(value);
  if (font.parsedFontValues.has(sourceValue)) {
    return;
  }
  font.parsedFontValues.add(sourceValue);

  addUsedFontFamilies(sourceValue, font.usedFamilies);
}

function getFontSourceElement(node: HTMLElement | SVGElement) {
  if (!isInstanceOfElement(node, HTMLIFrameElement)) {
    return node;
  }

  try {
    return node.contentDocument?.body ?? null;
  } catch {
    return null;
  }
}
