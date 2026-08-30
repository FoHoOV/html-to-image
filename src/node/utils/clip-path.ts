const URL_VALUE = /^url\(\s*(['"]?)(.*?)\1\s*\)$/;
const SRCDOC_URL = /^about:srcdoc(?:#.*)?$/;

/**
 * Rewrites a same-document `clip-path` reference to a local fragment.
 *
 * A reference reaches us absolute when the author wrote it that way. That
 * stops resolving once the tree is serialized into a standalone SVG, so the
 * document part is dropped. References into another document are left
 * exactly as they are.
 *
 * The attribute and the inline declaration are normalized independently:
 * `clip-path` is a presentation attribute on SVG only, so a declaration
 * cannot be folded into an attribute without silently dropping the clip on
 * HTML elements.
 */
export function normalizeClipPath(node: Element) {
  const attribute = node.getAttribute("clip-path");
  if (attribute) {
    const local = localizeClipPath(attribute, node);
    if (local) {
      node.setAttribute("clip-path", local);
    }
  }

  const style =
    "style" in node ? (node as HTMLElement | SVGElement).style : null;
  const declaration = style?.getPropertyValue("clip-path");
  if (style && declaration) {
    const local = localizeClipPath(declaration, node);
    if (local) {
      style.setProperty(
        "clip-path",
        local,
        style.getPropertyPriority("clip-path"),
      );
    }
  }
}

/**
 * Returns the local form of a `clip-path` value resolved against `node`'s
 * document, or `null` when it is not a same-document reference and must be
 * preserved verbatim.
 *
 * `serializeComputedStyles` calls this directly: a computed value is already
 * resolved to an absolute URL by the CSS engine, so it needs this same
 * localization without a DOM read/write round trip.
 */
export function localizeClipPath(value: string, node: Element) {
  // Runs for every node carrying computed styles, where the value is almost
  // always `none`. Reject those before touching the regular expression.
  if (!value.startsWith("url(")) {
    return null;
  }

  const reference = URL_VALUE.exec(value.trim())?.[2];
  const hashIndex = reference?.indexOf("#") ?? -1;
  if (!reference || hashIndex === -1) {
    return null;
  }
  if (hashIndex === 0) {
    return null; // Already local.
  }

  const ownerUrl = node.ownerDocument.URL;
  // `about:srcdoc` cannot act as a URL base, and an inline iframe document has
  // no address of its own, so every reference inside one is same-document.
  const inSrcdoc = SRCDOC_URL.test(ownerUrl);
  if (!inSrcdoc && !pointsAtOwnerDocument(reference, ownerUrl)) {
    return null;
  }

  // The fragment is taken from the source text rather than from the parsed
  // URL, so an id that the URL parser would re-encode survives unchanged.
  const fragment = reference.slice(hashIndex).replace(/[\\"]/g, "\\$&");
  return `url("${fragment}")`;
}

function pointsAtOwnerDocument(reference: string, ownerUrl: string) {
  try {
    const resolved = new URL(reference, ownerUrl);
    const owner = new URL(ownerUrl);
    return (
      resolved.origin === owner.origin && resolved.pathname === owner.pathname
    );
  } catch {
    return false;
  }
}
