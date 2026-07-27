const XLINK_NS = 'http://www.w3.org/1999/xlink'

export function normalizeHref(node: Element) {
  const href = getHref(node)

  if (href) {
    setHref(node, href)
  }
}

export function getHref(node: Element) {
  return (
    node.getAttribute('href') ??
    node.getAttribute('xlink:href') ??
    node.getAttributeNS(XLINK_NS, 'href')
  )
}

export function setHref(node: Element, value: string) {
  node.setAttribute('href', value)
  node.setAttributeNS(XLINK_NS, 'xlink:href', value)
}
