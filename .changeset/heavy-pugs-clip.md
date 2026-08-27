---
"@fohoov/html-to-image": patch
---

Localize same-document `clip-path` references that arrive through CSS.

The CSS engine resolves `url()` against the document, so a `clip-path` coming
from a stylesheet, a computed value, or `options.style` reached the output as
an absolute URL that no longer resolves once the tree is serialized into a
standalone SVG. Computed styles are now localized as they are serialized, so
this catches those references instead of only the ones an author wrote inline
on an SVG element. References into another document are still preserved byte
for byte.
