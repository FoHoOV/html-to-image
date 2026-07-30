import type { Context } from '@/context'
import { addHiddenDomElement, nextFrame } from '@/utils'
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
} from './clone'
import {
  embedCssText,
  embedPseudoElements,
  embedStyles,
  embedImages,
  embedWebFonts,
} from './embed'
import { applyStyle, getImageSize, wrapInSvg } from './utils'
import { isInstanceOfElement, traverseChildren } from './utils/traverse'

export async function cloneAsSvg(node: Node, context: Context) {
  const clonedNode =
    ((await cloneNodeTree(node, context)) as HTMLElement | null) ??
    document.createElement('div')

  applyStyle(clonedNode, context)

  const removeElement = addHiddenDomElement(node, clonedNode)
  try {
    await nextFrame()
    const { width, height } = getImageSize(clonedNode, context.options)
    removeElement()
    await embedWebFonts({
      clonedNode,
      clonedParentNode: null,
      context,
      originalNode: node as typeof clonedNode,
    })
    const svg = wrapInSvg(clonedNode, width, height)
    return { svg, width, height }
  } catch (error) {
    removeElement()
    throw error
  }
}

export async function cloneNodeTree(startingNode: Node, context: Context) {
  const queuedEmbedPromises: Promise<void>[] = []
  async function cloneSubtree(node: Node, clonedParentNode: Node | null) {
    const filter = context.options.filter?.(node as Node) ?? 'keep'
    if (filter === 'remove') {
      return null
    }

    const clonedCurrentNode =
      filter === 'unwrap'
        ? document.createDocumentFragment()
        : await cloneSingleNode(node, clonedParentNode, context)

    for (const element of traverseChildren(node)) {
      const clonedChild = await cloneSubtree(element, clonedCurrentNode)
      if (clonedChild) {
        clonedCurrentNode.appendChild(clonedChild)
      }
    }
    queuedEmbedPromises.push(
      embed(node, clonedCurrentNode, clonedParentNode, context),
    )
    return clonedCurrentNode
  }

  const result = (await cloneSubtree(startingNode, null)) as HTMLElement
  await Promise.all(queuedEmbedPromises)
  return result
}

function cloneSingleNode(
  originalNode: Node,
  clonedParentNode: Node | null,
  context: Context,
) {
  function createConfig<TNode extends Node>(node: TNode) {
    return {
      originalNode: node,
      context,
      clonedParentNode,
    }
  }

  if (isInstanceOfElement(originalNode, HTMLCanvasElement)) {
    return cloneCanvasElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLVideoElement)) {
    return cloneVideoElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLIFrameElement)) {
    return cloneIFrameElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLTextAreaElement)) {
    return cloneTextAreaElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLInputElement)) {
    return cloneInputElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLOptionElement)) {
    return cloneOptionElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLSelectElement)) {
    return cloneSelectElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, SVGUseElement)) {
    return cloneUseElement(createConfig(originalNode))
  }
  if (isInstanceOfElement(originalNode, SVGElement)) {
    return cloneSvgElement(createConfig(originalNode))
  }

  return originalNode.cloneNode(false)
}

async function embed(
  originalNode: Node,
  clonedNode: Node,
  clonedParentNode: Node | null,
  context: Context,
) {
  if (
    (isInstanceOfElement(originalNode, HTMLElement) ||
      isInstanceOfElement(originalNode, SVGElement)) &&
    (isInstanceOfElement(clonedNode, HTMLElement) ||
      isInstanceOfElement(clonedNode, SVGElement))
  ) {
    const config = { originalNode, clonedNode, clonedParentNode, context }
    embedCssText(config)
    embedPseudoElements(config)
    // TODO: think about this, i believe `embedStyles` should be done AFTER cloned dom tree is available
    // why? because an empty div that doesnt have its children yet, cannot inline its props using getPropertyValue
    // but, if that isnt the calculated browser value at that time, this could be ok and even a better approach,
    // meaning the value is the final applied css prop who won.
    embedStyles(config)
    await embedImages(config)
  }
}
