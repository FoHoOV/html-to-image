---
"@fohoov/html-to-image": patch
---

fix: a `<video>` poster that cannot be fetched now consults `onEmbeddedImageError` instead of always rejecting the render.