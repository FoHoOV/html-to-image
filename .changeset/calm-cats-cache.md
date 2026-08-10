---
"@fohoov/html-to-image": major
---

Remove `getFontEmbedCSS`. Add caller-owned `FetchCache` and `FontCache` instances that can be composed through `Cache` to control fetched-resource and processed-font persistence independently. Resource entry methods move from `Cache` to `FetchCache`, which also coalesces simultaneous requests shared across renders. `FontCache` stores automatically discovered font state without parsing or normalizing CSS itself; use `fontEmbedCSS` to supply font CSS manually. Each output embeds only the families used by that DOM tree while preserving every applicable face that can be embedded successfully.

`Cache`, `FetchCache`, and `FontCache` each expose `reset()`, which empties them in place so a caller holding a reference does not have to reassign it.

Web fonts declared inside `@media` are now embedded without their `@media` wrapper. The query is evaluated against the page when the render starts; the exported SVG resolves media queries against the output size instead, so replaying the wrapper could drop a font the page was using. `@supports` and `@layer` wrappers are still emitted.

Font discovery snapshots the `@font-face` rules that apply when it runs, and a reused `FontCache` does not reevaluate `@media` or `@supports` conditions. Replace the `FontCache` when such a condition changes. A single render is always correct; only a cache that outlives a condition change is affected.
