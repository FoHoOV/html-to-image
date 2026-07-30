import { isInstanceOfElement } from './instance'

export function* traverseChildren(node: Node) {
  let children: Array<Node> | NodeListOf<ChildNode>
  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return
  }
  if (isInstanceOfElement(node, HTMLSlotElement) && node.assignedNodes) {
    children = node.assignedNodes()
  } else if (
    isInstanceOfElement(node, HTMLIFrameElement) &&
    node.contentDocument?.body
  ) {
    children = node.contentDocument.body.childNodes
  } else {
    children = ((node as HTMLElement).shadowRoot ?? node).childNodes
  }
  for (let i = 0; i < children.length; i++) {
    yield children[i]
  }
}
