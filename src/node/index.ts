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

  await embedWebFonts({
    clonedNode,
    clonedParentNode: null,
    context,
    originalNode: node as typeof clonedNode,
  });
  const svg = wrapInSvg(clonedNode, width, height);
  return { svg, width, height };
}

export async function cloneNodeTree(startingNode: Node, context: Context) {
  async function cloneSubtree(node: Node, clonedParentNode: Node | null) {
    const filter = context.options.filter?.(node as Node) ?? "keep";
    if (filter === "remove") {
      return null;
    }

    const clonedCurrentNode =
      filter === "unwrap"
        ? document.createDocumentFragment()
        : await cloneSingleNode(node, clonedParentNode, context);

    registerEmbedding(node, clonedCurrentNode, clonedParentNode, context);

    for (const element of traverseChildren(node)) {
      const clonedChild = await cloneSubtree(element, clonedCurrentNode);
      if (clonedChild) {
        clonedCurrentNode.appendChild(clonedChild);
      }
    }
    return clonedCurrentNode;
  }

  const result = await cloneSubtree(startingNode, null);
  context.status.embedding.css.seal();
  context.status.embedding.image.seal();

  let node: HTMLElement | undefined = undefined;
  if (!result) {
    node = createReplacementWrapper();
  }

  if (!node && result instanceof DocumentFragment) {
    const wrapper = createReplacementWrapper();
    wrapper.appendChild(result);
    node = wrapper;
  }

  if (!node) {
    node = result as HTMLElement;
  }

  // TODO: could create a race condition with embedStyles for root node
  // TODO: another idea, what if we always apply the computed styles of original, but when adding svgWrapper
  // scale it down/up using css based on user provided size? or scaling can cause bad quality, use
  // a css prop, that the child with fixed values should resize based on fixed ROOT size of user custom provided values?
  applyCustomStyles(node, context);

  const removeElement = addHiddenDomElement(startingNode, node);
  try {
    await nextFrame();
    context.status.addedToDom.markAsReady();

    await context.status.embedding.css.ready;
    removeElement();

    await context.status.embedding.image.ready;
    context.status.renderedSize = getImageSize(node, context.options);
  } catch {
    removeElement();
  }

  return node;
}

function createReplacementWrapper() {
  const wrapper = document.createElement("div");
  wrapper.style.display = "block";
  return wrapper;
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
