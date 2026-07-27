import type { Options } from '@/types'
import {
  cloneSvgElement,
  cloneUseElement,
  cloneIFrameElement,
  cloneInputElement,
  cloneSelectElement,
  cloneCanvasElement,
  cloneTextAreaElement,
  cloneVideoElement,
  embedCssText,
  embedPseudoElements,
} from './html'
import { isInstanceOfElement, traverseChildren } from './traverse'

export async function cloneNodeTree(startingNode: Node, options: Options) {
  async function cloneSubtree(node: Node, clonedParentNode: Node | null) {
    const filter = options.filter?.(node as Node) ?? 'keep'
    if (filter === 'remove') {
      return clonedParentNode
    }

    const clonedCurrentNode =
      filter === 'unwrap'
        ? document.createDocumentFragment()
        : await cloneSingleNode(node, clonedParentNode, options)
    decorate(node, clonedCurrentNode, clonedParentNode, options)

    for (const element of traverseChildren(node)) {
      const clonedChild = await cloneSubtree(element, clonedCurrentNode)
      if (clonedChild) {
        clonedCurrentNode.appendChild(clonedChild)
      }
    }
    return node
  }

  return await cloneSubtree(startingNode, null)
}

async function cloneSingleNode(
  originalNode: Node,
  clonedParentNode: Node | null,
  options: Options,
): Promise<Node> {
  if (isInstanceOfElement(originalNode, HTMLCanvasElement)) {
    return cloneCanvasElement({ originalNode, options, clonedParentNode })
  }
  if (isInstanceOfElement(originalNode, HTMLVideoElement)) {
    return cloneVideoElement({ originalNode, options, clonedParentNode })
  }
  if (isInstanceOfElement(originalNode, HTMLIFrameElement)) {
    return cloneIFrameElement({ originalNode, options, clonedParentNode })
  }
  if (isInstanceOfElement(originalNode, HTMLTextAreaElement)) {
    return cloneTextAreaElement({ originalNode, options, clonedParentNode })
  }
  if (isInstanceOfElement(originalNode, HTMLInputElement)) {
    return cloneInputElement({ originalNode, options, clonedParentNode })
  }
  if (isInstanceOfElement(originalNode, HTMLSelectElement)) {
    return cloneSelectElement({ originalNode, options, clonedParentNode })
  }
  if (isInstanceOfElement(originalNode, SVGElement)) {
    return cloneSvgElement({ originalNode, options, clonedParentNode })
  }
  if (isInstanceOfElement(originalNode, SVGUseElement)) {
    return cloneUseElement({ originalNode, options, clonedParentNode })
  }

  return originalNode.cloneNode(false)
}

async function decorate(
  originalNode: Node,
  clonedNode: Node,
  clonedParentNode: Node | null,
  options: Options,
) {
  if (
    isInstanceOfElement(originalNode, HTMLElement) &&
    isInstanceOfElement(clonedNode, HTMLElement)
  ) {
    const context = { originalNode, clonedNode, clonedParentNode, options }
    embedCssText(context)
    embedPseudoElements(context)
  }
}
