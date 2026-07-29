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

export const isInstanceOfElement = <
  T extends
    | typeof Element
    | typeof HTMLElement
    | typeof SVGElement
    | typeof SVGImageElement
    | typeof Node,
>(
  node: Element | HTMLElement | SVGElement | SVGImageElement | Node,
  instance: T,
): node is T['prototype'] => {
  if (node instanceof instance) return true

  const nodePrototype = Object.getPrototypeOf(node)

  if (nodePrototype === null) return false

  return (
    nodePrototype.constructor.name === instance.name ||
    isInstanceOfElement(nodePrototype, instance)
  )
}
