---
"@fohoov/html-to-image": major
---

breaking: rename `onImageErrorHandler` to `onEmbeddedImageError`. The new name says which failure it reports: it is called when an image element's already-inlined source fails to load or decode, which is distinct from the fetch failure `imagePlaceholder` covers.

A `<video>` poster that cannot be fetched now consults that handler too, instead of always rejecting the render. As with `<img>`, returning normally leaves the replacement image with its empty source and the render continues; with no handler the render still rejects.

Documents what an unfetchable resource actually does per call site: image elements and video posters fail to load (rejecting unless handled), while CSS `url()` values become `url("")` and render empty. The previous claim that failed images always "render empty areas" was only true of the CSS path. `imagePlaceholder` covers those two; `@font-face` sources do not use it, and a face whose source cannot be fetched is dropped instead.
