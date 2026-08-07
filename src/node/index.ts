import type { Context } from "@/context";
import { nextFrame } from "@/utils";
import {
  cloneSvgElement,
  cloneUseElement,
  cloneIFrameElement,
  cloneInputElement,
  cloneOptionElement,
  cloneSelectElement,
  cloneCanvasElement,
  cloneTextAreaElement,
  cloneVideoElement,
} from "./clone";
import {
  embedPseudoElements,
  embedStyles,
  embedImages,
  embedWebFonts,
} from "./embed";
import type { EmbedContext } from "./embed/types";
import {
  addHiddenDomElement,
  isInstanceOfElement,
  traverseChildren,
  applyCustomStyles,
  getImageSize,
  wrapInSvg,
} from "./utils";

export async function cloneAsSvg(node: Node, context: Context) {
  const clonedNode = await cloneNodeTree(node, context);

  const renderedSize = context.renderedSize;
  if (!renderedSize) {
    throw new Error("The cloned node was not measured");
  }
  const { width, height } = renderedSize;
  const svg = wrapInSvg(clonedNode, width, height);

  return { svg, width, height };
}

export async function cloneNodeTree(startingNode: Node, context: Context) {
  async function cloneSubtree(
    node: Node,
    clonedParentNode: Node | null,
    isRoot: boolean,
  ) {
    const filter = context.options.filter?.(node as Node) ?? "keep";
    if (filter === "remove") {
      return null;
    }

    let clonedCurrentNode =
      filter === "unwrap"
        ? document.createDocumentFragment()
        : await cloneSingleNode(node, clonedParentNode, context);

    if (isRoot) {
      clonedCurrentNode = toHtmlElement(clonedCurrentNode);
      applyCustomStyles(clonedCurrentNode as HTMLElement, context);
    }

    registerEmbedding({
      originalNode: node,
      clonedNode: clonedCurrentNode,
      clonedParentNode,
      isRoot,
      isUnwrapped: filter === "unwrap",
      context,
    });

    for (const element of traverseChildren(node)) {
      const clonedChild = await cloneSubtree(element, clonedCurrentNode, false);
      if (clonedChild) {
        clonedCurrentNode.appendChild(clonedChild);
      }
    }

    return clonedCurrentNode;
  }

  const result = toHtmlElement(await cloneSubtree(startingNode, null, true));

  // Every family the traversal could contribute is now recorded, which releases
  // the deferred font job queued by the root.
  context.cloning.markAsReady();

  context.embedding.css.seal();
  context.embedding.image.seal();
  context.embedding.font.seal();

  // what if we always apply the computed styles of original, but when adding svgWrapper
  // scale it down/up using css based on user provided size? or scaling can cause bad quality, use
  // a css prop, that the child with fixed values should resize based on fixed ROOT size of user custom provided values?

  const removeElement = addHiddenDomElement(result, startingNode, context);
  try {
    await nextFrame();
    context.addedToDom.markAsReady();

    await context.embedding.css.ready;

    context.renderedSize = getImageSize(result, context.options);
    removeElement();

    await Promise.all([
      context.embedding.image.ready,
      context.embedding.font.ready,
    ]);
  } catch (error) {
    removeElement();
    throw error;
  }

  return result;
}

function toHtmlElement(node: Node | null) {
  const createWrapper = () => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "inline-block";
    return wrapper;
  };

  if (!node) {
    return createWrapper();
  }

  if (node instanceof DocumentFragment) {
    const wrapper = createWrapper();
    wrapper.appendChild(node);
    return wrapper;
  }

  return node as HTMLElement;
}

async function cloneSingleNode(
  originalNode: Node,
  clonedParentNode: Node | null,
  context: Context,
) {
  function createConfig<TNode extends Node>(node: TNode) {
    return {
      originalNode: node,
      context,
      clonedParentNode,
    };
  }

  if (isInstanceOfElement(originalNode, HTMLCanvasElement)) {
    return cloneCanvasElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, HTMLVideoElement)) {
    return cloneVideoElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, HTMLIFrameElement)) {
    return cloneIFrameElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, HTMLTextAreaElement)) {
    return cloneTextAreaElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, HTMLInputElement)) {
    return cloneInputElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, HTMLOptionElement)) {
    return cloneOptionElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, HTMLSelectElement)) {
    return cloneSelectElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, SVGUseElement)) {
    return cloneUseElement(createConfig(originalNode));
  }
  if (isInstanceOfElement(originalNode, SVGElement)) {
    return cloneSvgElement(createConfig(originalNode));
  }

  return originalNode.cloneNode(false);
}

/**
 * Called once per visited node, so it reuses the config object the caller
 * already built rather than deriving another one per node.
 */
function registerEmbedding(config: EmbedContext<Node>) {
  if (
    !isElementLike(config.originalNode) ||
    !isElementLike(config.clonedNode)
  ) {
    return;
  }

  const elementConfig = config as EmbedContext<HTMLElement | SVGElement>;

  // Runs inline: it only records the families this node uses, and defers its
  // own asynchronous work onto the font work status.
  embedWebFonts(elementConfig);

  config.context.embedding.css.add(async () => {
    await embedStyles(elementConfig);
    await embedPseudoElements(elementConfig);
  });
  config.context.embedding.image.add(async () => {
    await embedImages(elementConfig);
  });
}

function isElementLike(node: Node): node is HTMLElement | SVGElement {
  return (
    isInstanceOfElement(node, HTMLElement) ||
    isInstanceOfElement(node, SVGElement)
  );
}
