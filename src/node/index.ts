import type { Options } from '@/types'
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

export async function cloneAsSvg(node: Node, options: Options) {
  const clonedNode =
    ((await cloneNodeTree(node, options)) as HTMLElement | null) ??
    document.createElement('div')

  applyStyle(clonedNode, options)

  const removeElement = addHiddenDomElement(node, clonedNode)
  try {
    await nextFrame()
    const { width, height } = getImageSize(clonedNode, options)
    removeElement()
    await embedWebFonts({
      clonedNode,
      clonedParentNode: null,
      options,
      originalNode: node as typeof clonedNode,
    })
    const svg = wrapInSvg(clonedNode, width, height)
    return { svg, width, height }
  } catch (error) {
    removeElement()
    throw error
  }
}

export async function cloneNodeTree(startingNode: Node, options: Options) {
  async function cloneSubtree(node: Node, clonedParentNode: Node | null) {
    const filter = options.filter?.(node as Node) ?? 'keep'
    if (filter === 'remove') {
      return null
    }

    const clonedCurrentNode =
      filter === 'unwrap'
        ? document.createDocumentFragment()
        : await cloneSingleNode(node, clonedParentNode, options)

    for (const element of traverseChildren(node)) {
      const clonedChild = await cloneSubtree(element, clonedCurrentNode)
      if (clonedChild) {
        clonedCurrentNode.appendChild(clonedChild)
      }
    }
    // TODO: all embed calls can fired, but awaited at the end, that will be much faster
    await embed(node, clonedCurrentNode, clonedParentNode, options)
    return clonedCurrentNode
  }

  return (await cloneSubtree(startingNode, null)) as HTMLElement
}

function cloneSingleNode(
  originalNode: Node,
  clonedParentNode: Node | null,
  options: Options,
) {
  function createContext<TNode extends Node>(node: TNode) {
    return {
      originalNode: node,
      options,
      clonedParentNode,
    }
  }

  if (isInstanceOfElement(originalNode, HTMLCanvasElement)) {
    return cloneCanvasElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLVideoElement)) {
    return cloneVideoElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLIFrameElement)) {
    return cloneIFrameElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLTextAreaElement)) {
    return cloneTextAreaElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLInputElement)) {
    return cloneInputElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLOptionElement)) {
    return cloneOptionElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, HTMLSelectElement)) {
    return cloneSelectElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, SVGUseElement)) {
    return cloneUseElement(createContext(originalNode))
  }
  if (isInstanceOfElement(originalNode, SVGElement)) {
    return cloneSvgElement(createContext(originalNode))
  }

  return originalNode.cloneNode(false)
}

async function embed(
  originalNode: Node,
  clonedNode: Node,
  clonedParentNode: Node | null,
  options: Options,
) {
  if (
    (isInstanceOfElement(originalNode, HTMLElement) ||
      isInstanceOfElement(originalNode, SVGElement)) &&
    (isInstanceOfElement(clonedNode, HTMLElement) ||
      isInstanceOfElement(clonedNode, SVGElement))
  ) {
    const context = { originalNode, clonedNode, clonedParentNode, options }
    embedCssText(context)
    embedPseudoElements(context)
    // TODO: think about this, i believe `embedStyles` should be done AFTER cloned dom tree is available
    // why? because an empty div that doesnt have its children yet, cannot inline its props using getPropertyValue
    // but, if that isnt the calculated browser value at that time, this could be ok and even a better approach,
    // meaning the value is the final applied css prop who won.
    embedStyles(context)
    await embedImages(context)
  }
}
