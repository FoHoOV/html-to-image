export function normalizeClipPath(node: Element) {
  const style =
    "style" in node ? (node as HTMLElement | SVGElement).style : null;
  const clipPath =
    node.getAttribute("clip-path") || style?.getPropertyValue("clip-path");

  if (!clipPath || !clipPath.startsWith("url")) {
    return;
  }

  const match = /^url\(\s*(['"]?)(.*?)\1\s*\)$/.exec(clipPath);
  if (!match?.[2]) {
    return;
  }

  const ownerUrl = node.ownerDocument.URL;
  const referenceUrl = isInsideSrcdocIframe(node)
    ? new URL(match[2], "http://localhost")
    : new URL(match[2], ownerUrl);

  if (
    isInsideSrcdocIframe(node) ||
    (referenceUrl.origin === location.origin &&
      referenceUrl.pathname === location.pathname)
  ) {
    style?.removeProperty("clip-path");
    node.setAttribute("clip-path", `url('${referenceUrl.hash}')`);
  }
}

function isInsideSrcdocIframe(element: Element) {
  return /^about:srcdoc(?:#.*)?$/.test(element.ownerDocument.URL);
}
