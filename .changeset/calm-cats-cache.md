---
"@fohoov/html-to-image": major
---

Remove `getFontEmbedCSS`. Add caller-owned `FetchCache` and `FontCache` instances that can be composed through `Cache` to control fetched-resource and processed-font persistence independently. Resource entry methods move from `Cache` to `FetchCache`, which also coalesces simultaneous requests shared across renders. `FontCache` stores automatically discovered font state without parsing or normalizing CSS itself; use `fontEmbedCSS` to supply font CSS manually. Each output embeds only the families used by that DOM tree while preserving every applicable face that can be embedded successfully.

`Cache`, `FetchCache`, and `FontCache` each expose `reset()`, which empties them in place so a caller holding a reference does not have to reassign it. A `FontCache` holds one document's fonts and clears itself when a render targets a different document, so faces discovered for one document are never reused for another.

Web fonts declared inside `@media`, `@supports`, or `@layer` are embedded without the enclosing block. Every condition is evaluated against the live page, in the engine that renders the output, before a face is embedded; replaying it around the result only re-asks a question already answered, and for `@media` the exported SVG would resolve the query against the output size rather than the page viewport, which can drop a font the page is using.

Font families used anywhere in the captured tree are collected, including by elements inside an iframe, and all of them are resolved against the rendered node's own document. An iframe's own `@font-face` rules are not discovered; supply those through `fontEmbedCSS`.

Font discovery snapshots the `@font-face` rules that apply when it runs, and a reused `FontCache` does not reevaluate `@media` or `@supports` conditions. Replace the `FontCache` when such a condition changes. A single render is always correct; only a cache that outlives a condition change is affected.
