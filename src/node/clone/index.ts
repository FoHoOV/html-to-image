import type { Options } from '@/types'
import {
  cloneCanvasElement,
  cloneIFrameElement,
  cloneInputElement,
  cloneSelectElement,
  cloneSvgElement,
  cloneTextAreaElement,
  cloneVideoElement,
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

export async function cloneSingleNode(
  node: Node,
  clonedParentNode: Node | null,
  options: Options,
): Promise<Node> {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return cloneCanvasElement({ node, options, clonedParentNode })
  }
  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return cloneVideoElement({ node, options, clonedParentNode })
  }
  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement({ node, options, clonedParentNode })
  }
  if (isInstanceOfElement(node, SVGElement)) {
    return cloneSvgElement({ node, options, clonedParentNode })
  }
  if (isInstanceOfElement(node, HTMLTextAreaElement)) {
    return cloneTextAreaElement({ node, options, clonedParentNode })
  }
  if (isInstanceOfElement(node, HTMLInputElement)) {
    return cloneInputElement({ node, options, clonedParentNode })
  }
  if (isInstanceOfElement(node, HTMLSelectElement)) {
    return cloneSelectElement({ node, options, clonedParentNode })
  }

  return node.cloneNode(false)
}
