import type { Context } from "@/context";
import { addHiddenDomElement, nextFrame } from "@/utils";
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
import {
  isInstanceOfElement,
  traverseChildren,
  applyCustomStyles,
  getImageSize,
  wrapInSvg,
} from "./utils";

export async function cloneAsSvg(node: Node, context: Context) {
  const clonedNode = await cloneNodeTree(node, context);

  const renderedSize = context.status.renderedSize;
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

    for (const element of traverseChildren(node)) {
      const clonedChild = await cloneSubtree(element, clonedCurrentNode, false);
      if (clonedChild) {
        clonedCurrentNode.appendChild(clonedChild);
      }
    }

    registerEmbedding(node, clonedCurrentNode, clonedParentNode, context);
    return clonedCurrentNode;
  }

  const result = toHtmlElement(await cloneSubtree(startingNode, null, true));
  context.status.embedding.css.seal();
  context.status.embedding.image.seal();

  // TODO: could create a race condition with embedStyles for root node
  // TODO: another idea, what if we always apply the computed styles of original, but when adding svgWrapper
  // scale it down/up using css based on user provided size? or scaling can cause bad quality, use
  // a css prop, that the child with fixed values should resize based on fixed ROOT size of user custom provided values?

  const removeElement = addHiddenDomElement(result, startingNode, context);
  try {
    await nextFrame();
    context.status.addedToDom.markAsReady();

    await context.status.embedding.css.ready;

    context.status.renderedSize = getImageSize(result, context.options);
    removeElement();

    await Promise.all([
      context.status.embedding.image.ready,
      embedWebFonts({
        clonedNode: result,
        clonedParentNode: null,
        originalNode: startingNode as typeof result,
        context,
      }),
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

function registerEmbedding(
  originalNode: Node,
  clonedNode: Node,
  clonedParentNode: Node | null,
  context: Context,
) {
  if (!isElementLike(originalNode) || !isElementLike(clonedNode)) {
    return;
  }

  const config = { originalNode, clonedNode, clonedParentNode, context };
  context.status.embedding.css.add(async () => {
    await embedStyles(config);
    await embedPseudoElements(config);
  });
  context.status.embedding.image.add(async () => {
    await embedImages(config);
  });
}

function isElementLike(node: Node): node is HTMLElement | SVGElement {
  return (
    isInstanceOfElement(node, HTMLElement) ||
    isInstanceOfElement(node, SVGElement)
  );
}
