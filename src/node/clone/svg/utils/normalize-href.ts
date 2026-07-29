const XLINK_NS = 'http://www.w3.org/1999/xlink'

export function normalizeHref(node: Element) {
  const href = getHref(node)

  if (href) {
    setHref(node, href)
  }
}

export function normalizeClipPath(node: Element) {
  const style =
    'style' in node ? (node as HTMLElement | SVGElement).style : null
  const clipPath =
    node.getAttribute('clip-path') || style?.getPropertyValue('clip-path')

  if (!clipPath || !clipPath.startsWith('url')) {
    return
  }

  const match = /^url\(\s*(['"]?)(.*?)\1\s*\)$/.exec(clipPath)
  if (!match?.[2]) {
    return
  }

  const ownerUrl = node.ownerDocument.URL
  const referenceUrl = isInsideSrcdocIframe(node)
    ? new URL(match[2], 'http://localhost')
    : new URL(match[2], ownerUrl)

  if (
    isInsideSrcdocIframe(node) ||
    (referenceUrl.origin === location.origin &&
      referenceUrl.pathname === location.pathname)
  ) {
    style?.removeProperty('clip-path')
    node.setAttribute('clip-path', `url('${referenceUrl.hash}')`)
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

function isInsideSrcdocIframe(element: Element) {
  return /^about:srcdoc(?:#.*)?$/.test(element.ownerDocument.URL)
}
