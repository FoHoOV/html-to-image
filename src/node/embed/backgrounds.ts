import type { Context } from "@/context";
import {
  getComputedStyle,
  getEmbeddableResource,
  shouldEmbed,
} from "@/node/utils";
import type { Embedder } from "./types";

const BACKGROUND_PROPS = ["background", "background-image"];
const MASK_PROPS = ["mask", "-webkit-mask", "mask-image", "-webkit-mask-image"];

/**
 * Inlines the `url(...)` resources a node's CSS properties point at. */
export const embedBackgrounds: Embedder<
  HTMLElement | SVGElement,
  Promise<void>
> = async ({ originalNode, clonedNode, context }) => {
  const originalStyles = getComputedStyle(originalNode);

  await Promise.all([
    embedFirstHit(BACKGROUND_PROPS, originalStyles, clonedNode, context),
    embedFirstHit(MASK_PROPS, originalStyles, clonedNode, context),
  ]);
};

async function embedFirstHit(
  props: ReadonlyArray<string>,
  originalStyles: CSSStyleDeclaration,
  clonedNode: HTMLElement | SVGElement,
  context: Context,
) {
  const { prop, value } = getFirstHitFromProperty(
    originalStyles,
    clonedNode,
    props,
  );
  if (!prop) {
    return;
  }

  const { cssText } = await getEmbeddableResource(
    value,
    undefined,
    context.options.imagePlaceholder,
    context,
  );

  await context.embedding.css.ready;

  clonedNode.style.setProperty(
    prop,
    cssText,
    clonedNode.style.getPropertyPriority(prop),
  );
}

/**
 * Finds the first of `props` carrying an embeddable `url(...)`.
 *
 * The two sources are complementary. `options.style` exists only on the clone,
 * because it is never applied to the caller's DOM. Anything a stylesheet
 * contributes is visible only through the original's computed style, because
 * the clone does not receive computed styles until `embedStyles` runs a frame
 * later. So the clone is searched in full first — a `background` shorthand on
 * the original must not win over a `background-image` longhand the caller
 * supplied — and the original answers only what the clone could not.
 *
 * Every candidate is gated on `shouldEmbed`. Computed styles serialize
 * `background` on every element (`… none … rgba(0, 0, 0, 0)`), so without that
 * check every node would match and write a property back for nothing.
 *
 * The value resolved from the original can differ from the clone's own
 * computed value in its non-URL parts when the caller overrides `width`/
 * `height` and the background is layout-dependent (a percentage
 * `background-size`, say). The URL is always correct, and the two agree
 * whenever the dimensions are not overridden.
 */
function getFirstHitFromProperty(
  originalStyles: CSSStyleDeclaration,
  clonedNode: HTMLElement | SVGElement,
  props: ReadonlyArray<string>,
) {
  for (const prop of props) {
    const inlined = clonedNode.style?.getPropertyValue(prop);
    if (inlined && shouldEmbed(inlined)) {
      return { value: inlined, prop };
    }
  }

  for (const prop of props) {
    const computed = originalStyles.getPropertyValue(prop);
    if (computed && shouldEmbed(computed)) {
      return { value: computed, prop };
    }
  }

  return {};
}
