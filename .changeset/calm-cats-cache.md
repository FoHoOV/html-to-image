---
"@fohoov/html-to-image": major
---

breaking: remove `getFontEmbedCSS`. Add caller-owned `FetchCache` and `FontCache` instances that can be composed through `Cache` to control fetched-resource and processed-font persistence independently. Resource entry methods move from `Cache` to `FetchCache`, which also coalesces simultaneous requests shared across renders. `FontCache` stores automatically discovered font state without parsing or normalizing CSS itself.

`Cache`, `FetchCache`, and `FontCache` each expose `reset()`, which empties them in place so a caller holding a reference does not have to reassign it. A `FontCache` holds one document's fonts and clears itself when a render targets a different document, so faces discovered for one document are never reused for another.

Font discovery snapshots the `@font-face` rules that apply when it runs, and a reused `FontCache` does not reevaluate `@media` or `@supports` conditions. Replace the `FontCache` when such a condition changes. A single render is always correct; only a cache that outlives a condition change is affected.
