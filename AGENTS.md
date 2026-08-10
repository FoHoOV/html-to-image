# html-to-image Contributor Guide

This file applies to the entire repository. It describes the architecture and
the invariants that changes must preserve. Read it before modifying the clone,
embedding, resource, cache, build, or browser-test pipelines.

`README.md` is the public contract: every exported function, every `Options`
field, and the caching behavior callers are told to rely on. Read it whenever a
change touches public behavior, and update it in the same change.

## Who you are working as

Work as the senior TypeScript engineer who owns this library.

- You know the DOM, CSSOM, and browser rendering well enough to reason about
  what `getComputedStyle`, cross-origin stylesheets, adopted iframe documents,
  and `foreignObject` actually do, instead of guessing and re-running the suite.
- You treat performance as a design constraint, not a later pass. You always
  know whether the code you are writing runs once per render or once per DOM
  node, and you do not allocate in the second kind.
- You write code that reads like the code around it. Name things after
  behavior, keep functions single-purpose, and comment only where the reason is
  not already evident from the code.
- You respect module boundaries even when crossing one would be shorter, and
  you push feature policy down into the module that owns it rather than
  widening a shared module to suit one caller.
- You are direct about trade-offs. When a simplification drops a guarantee, say
  which guarantee, what it costs, and who has to compensate, before making the
  change. Do not quietly delete a behavior that a test is protecting.
- You verify. A change is not done until the typechecks, the build, and the
  browser suite pass, and you report what actually ran rather than what should
  have passed.

## Project purpose

`@fohoov/html-to-image` renders a DOM subtree into an SVG `foreignObject`, then
optionally draws that SVG into a canvas and exports PNG, JPEG, pixel, data URL,
or Blob output.

The public entry points live in `src/index.ts`:

- `toSvg`
- `toDataUrl`
- `toCanvas`
- `toPixelData`
- `toPng`
- `toJpeg`
- `toBlob`

Only export intentional public API from this file. Internal helpers must remain
internal unless a public API change is explicitly requested and documented.

## Source layout

```text
src/
  index.ts       public API surface; the only intentional export point
  types.ts       public `Options`
  context.ts     the per-render `Context`
  cache/         caller-owned caches: `Cache`, `FetchCache`, `FontCache`
  utils/         generic browser/JS helpers, no DOM-capture policy
  node/
    index.ts     `cloneAsSvg` / `cloneNodeTree` — the single traversal
    clone/       per-node cloners
    embed/       per-node embedders, including `web-font/`
    utils/       DOM/CSSOM helpers shared by cloners and embedders
```

## Module boundaries

The dependency direction is `node/` -> `utils/` -> `cache/`.

- `src/cache/` is caller-owned public API rather than a utility, so it may
  model what it stores. It must not import from `src/node/` or `src/utils/`.
- `src/utils/` holds generic helpers. It may import the `Resource` type from
  `src/cache/` and nothing else from it.
- `src/node/` owns all DOM-capture policy and may import from both.

Feature policy lives with its feature. Do not push a font-specific return
shape, flag, or option into a shared resource or utility module so that one
caller can read it; give the feature what it needs and keep the shared module
generic.

**Import style.** Inside a directory, import siblings relatively
(`./font-family`). Across directories, import the barrel (`@/utils`,
`@/node/utils`, `@/cache`) rather than reaching into a specific module.

This only stays possible while the layer direction holds. A single upward
import — a `src/utils/` module importing `@/node/utils`, say — makes the two
barrels mutually recursive, and the Rollup build reports a circular dependency.
If that warning appears, the fix is to move the offending code down to the
layer that owns it, not to switch the import to a deep path.

## Render pipeline

The render flow is deliberately ordered:

1. A public API creates one operation-local `Context`.
2. `cloneAsSvg` calls `cloneNodeTree`.
3. `cloneNodeTree` performs the only traversal of the source DOM subtree.
4. For each visited node, it applies the filter, creates one shallow clone or
   specialized replacement, applies root options, and registers embedding work
   before visiting children.
5. The traversal records used font families against each original
   `ownerDocument`. It does not perform font stylesheet discovery per node.
6. After traversal, `context.cloning` becomes ready, which releases the font
   job the root queued, and the CSS/image/font work queues are sealed.
7. The clone is temporarily attached to a hidden DOM container. After a frame,
   `context.addedToDom` becomes ready.
8. CSS embedding reads computed styles from the attached clone. This is
   required so custom root width/height and layout-dependent percentages,
   flex, and grid values are based on the clone's reflow, not the original
   node's old dimensions.
9. The rendered size is measured from the styled clone, then the hidden
   container is removed.
10. Image and font work finishes.
11. The finished clone is wrapped once in SVG/`foreignObject`.
12. Canvas-based APIs load that SVG and draw it. WebKit performs a second draw
    because its first canvas draw can omit content.

Do not reorder attachment, computed-style embedding, measurement, resource
embedding, or SVG wrapping without a regression test that proves the new order.

## The single-traversal invariant

`cloneNodeTree` is the only source-DOM subtree traversal allowed during a
render. All per-node behavior must be registered from that traversal.

- Do not add `querySelectorAll`, `getElementsBy*`, `TreeWalker`, recursive
  subtree walks, or a second `traverseChildren` pass to discover images, CSS,
  fonts, pseudo-elements, or special nodes.
- Pass the current original/cloned node pair to the appropriate cloner or
  embedder and let it decide whether work is required.
- Collect operation-wide facts, such as used font families, incrementally as
  nodes are visited. Perform only the non-DOM processing that depends on those
  collected facts after cloning.
- Preserve preorder registration. In particular, the parent document must be
  registered before iframe documents so same-name font collision behavior is
  deterministic.
- Prefer generators and loops over materializing traversal results. Avoid
  `Array.from` and intermediate arrays in hot paths unless the array is needed
  for stable concurrent result ordering.
- Avoid recursion for potentially unbounded trees or graphs. Use generators or
  explicit stacks so deeply nested user input cannot hit the JavaScript call
  stack limit.

The current `cloneSubtree` coordinator expresses the one capture pass
recursively. That is still one traversal, but it is stack-depth-sensitive. If
that coordinator or the existing recursive SVG dependency helpers are touched,
prefer an iterative implementation while preserving preorder registration and
parent/child assembly semantics. Do not copy their recursion into new walkers.

Stylesheet rule/import walking and SVG referenced-definition dependency walking
are specialized graph operations, not extra source-DOM traversals. They must be
scoped to the referenced data, deduplicated, cycle-safe, and must not rescan the
captured DOM subtree.

## The render `Context`

`createContext(options)` builds one `Context` per public API call. It carries
exactly two things: the caller's options, and the state the render needs to
coordinate itself. It is the only channel by which one visited node can affect
another, and it is discarded when the call finishes.

- `options` — the caller's `Options`, plus a `cache` that is always present (a
  temporary `Cache` when the caller supplied none).
- `embedding.css` / `embedding.image` / `embedding.font` — `WorkStatus` queues.
  Traversal adds jobs, `cloneNodeTree` seals each once registration is
  finished, then awaits `ready`.
- `embedding.font.usedFamiliesByDocument` — the one piece of feature data on
  the context, because the single-traversal invariant leaves nowhere else to
  accumulate it. Keep additions like this rare, documented, and shaped by the
  feature that owns them.
- `cloning` / `addedToDom` — `PendingWork` gates. A job queued during traversal
  awaits `cloning.ready` so it runs once the whole tree is captured; anything
  needing clone layout awaits `addedToDom.ready`.
- `renderedSize` — measured from the attached clone, read when wrapping SVG.

Rules:

- Never introduce module-global state as a substitute for the context, and
  never a hidden `WeakMap` keyed by context. Per-render state goes on the
  context, under a name that says which feature owns it.
- Keep the coordination primitives generic. `WorkStatus` and `PendingWork` must
  not learn feature semantics.
- A job that depends on the finished traversal is queued during traversal and
  gated on `cloning.ready`. Do not call it directly from `cloneNodeTree`, and
  do not hand-roll a promise to await it.

## Cloners and embedders

Cloners and embedders have different responsibilities.

### Cloners

Cloners live in `src/node/clone/` and receive:

- `originalNode`
- `clonedParentNode`
- `context`

A cloner creates the representation for exactly the current node. It should:

- clone shallowly;
- preserve node-specific live state that `cloneNode(false)` loses;
- replace nodes when required for serialization, such as canvas/video to image
  or iframe to its body;
- perform work that must happen before descendants are appended;
- avoid copying the ordinary descendant subtree itself.

A cloner module exports only its cloner, or cloners where they are variants of
one element family, as `select.ts` is for `<select>` and `<option>`. Helpers
stay private to the module.

Add specialized dispatch in `cloneSingleNode`. Keep its ordering from most
specific element type to general SVG/default cloning. Cross-realm element checks
must use `isInstanceOfElement`, not a global-realm `instanceof` assumption.

SVG `<use>` handling may collect referenced definitions and their dependencies,
but it must not broaden SVG module exports or perform another capture-tree walk.

### Embedders

Embedders live in `src/node/embed/` and receive:

- `originalNode`
- `clonedNode`
- `clonedParentNode`
- `isRoot`
- `isUnwrapped`
- `context`

Each embedder module exports exactly one embedder and keeps its helpers
private. An embedder returning `void` runs inline during the traversal and must
defer any asynchronous work onto a `WorkStatus`; one returning `Promise<void>`
is queued by `registerEmbedding`.

Embedders enrich an already-created node pair. They must not clone descendants.

- Register embedders once from `registerEmbedding` during the main traversal.
- CSS and pseudo-element work belongs to the CSS `WorkStatus`.
- Image/background/mask work belongs to the image `WorkStatus`.
- Work needing clone layout must await `context.addedToDom.ready`.
- Image CSS properties must wait for CSS embedding before writing their final
  inlined value.
- Descendants inside an SVG retain SVG presentation behavior; do not blindly
  replace them with a complete HTML computed-style declaration.
- Pseudo-elements are recreated from their computed styles without traversing
  generated content as DOM nodes.

If a new feature needs information from every node, add one registration hook
to the existing traversal rather than a new scanner.

## Filtering and root behavior

The filter result is one of:

- `keep`: clone the node and its descendants;
- `unwrap`: omit the node but retain its descendants;
- `remove`: omit the node and its entire subtree.

Do not preserve legacy boolean filter semantics. A removed node must not
register embedding or font work. An unwrapped node must not contribute its own
computed font, but an unwrapped root must still honor an explicit root
`options.style.fontFamily` override.

The root is always converted to an `HTMLElement` wrapper when filtering or
cloning produces a fragment/null result. Custom width, height, and styles are
applied before descendant layout is processed.

## Web-font architecture

Web-font code lives in `src/node/embed/web-font/`:

- `index.ts`: the `embedWebFonts` embedder and render orchestration;
- `font-family.ts`: quote-aware parsing and normalization;
- `collector.ts`: read-only stylesheet and import discovery;
- `blocks.ts`: which `@media`/`@supports`/`@layer` blocks apply right now, and
  the wrappers the output must reproduce;
- `cssom.ts`: CSSOM type guards and text parsing;
- `resolver.ts`: per-render family resolution against `FontCache`;
- `serialize.ts`: preferred-format filtering, resource inlining, and ordered
  wrapper serialization.

Rules:

- `index.ts` exports only the embedder. Fonts need two phases, but both are
  driven from it: the embedder body records families synchronously per node,
  and the root queues one deferred job on `context.embedding.font` that awaits
  `context.cloning.ready`. Do not export a second traversal-time hook, and do
  not call font code directly from `cloneNodeTree`.
- Per-render state belongs to `FontResolver`, never to `FontCache`.
- Track families from the original node and associate them with its original
  `ownerDocument`. Iframe clones are adopted into another document, so the
  cloned node's document is not the source of truth.
- Skip unquoted CSS generic families, but preserve quoted custom names such as
  `"serif"`.
- Scan each required source document once per operation. Reuse definitive
  per-document misses through the caller-owned `FontCache` without strongly
  retaining documents.
- Consult the cache for every document before scanning any of them, so a
  document whose families are already embedded is never scanned. Each
  document's remaining set is then independent of the others, which is what
  lets the scans run concurrently.
- Await the scans together, but apply their results in document order. The
  first document that supplies a family must win regardless of which scan
  finished first.
- Do not cache a missing family when stylesheet reading/import fetching failed.
  A failure that leaves the family unresolved caches nothing, so the next render
  retries it.
- Walk only stylesheets and grouping rules that currently apply, so faces the
  page is not using are never fetched or embedded. Evaluating a condition for
  the current render is required; remembering that it might flip later is not.
  Discovery is a snapshot, and callers reset the `FontCache` when a condition
  changes, which is documented in the README.
- Scan documents concurrently but absorb each scan's failure separately, so one
  unreadable document does not discard the fonts the others found.
  `Promise.allSettled` is newer than the browser floor; use a per-promise
  `catch`.
- Preserve every applicable `@font-face` variant for a used family; do not
  reduce matching to weight/style equality.
- Preserve source order, enclosing `@supports`/`@layer` wrappers, import
  cycles, declaring stylesheet base URLs, and relative font URL resolution.
- Do not re-emit `@media` wrappers. The query was already evaluated against the
  live page when the face was collected, and the exported SVG resolves media
  queries against the output size, not the page viewport — verified identical
  in Chromium, WebKit, and Firefox. Replaying one can suppress a face the page
  is using. `@supports` is engine-level and resolves the same in both contexts,
  so it is kept.
- Resolve every URL through the shared `resolveUrl` in `src/utils/url.ts`, so
  stylesheet and resource references resolve identically.
- Never use `document.fonts` as a source collector; it does not expose original
  CSS or source URLs.
- Never mutate source stylesheets or documents while collecting. Do not use
  `insertRule`, temporary source-document styles, `replaceSync`, or equivalent
  writes.
- Automatic discovery normalizes family names before cache access. Cache
  classes do not parse or normalize CSS.
- `fontEmbedCSS != null` bypasses automatic discovery and caching. An empty
  string intentionally disables automatic font output. `skipFonts` takes
  precedence over supplied CSS.
- Insert one generated font `<style>` per output tree, containing only the
  families used by that output.

## Caches and resource loading

Cache code lives in `src/cache/`, a peer of `src/utils/` and `src/node/`. It is
caller-owned public API rather than a utility, so it may model what it stores.
`src/utils/` must not reach into it beyond the `Resource` type.

`Cache` only composes:

- `FetchCache`: completed resources and shared in-flight requests;
- `FontCache`: discovered font candidates, processed format results, and weak
  per-document misses.

Both own their storage policy as methods and keep their collections private.
Callers must not reach into cache internals, and the shapes the caches store
(`WebFontSource`, `WebFontWrapper`, `WebFontEntry`) are not public API.

Every public call creates temporary component caches when the caller does not
provide a cache. Never add a module-global cache retained for the application
lifetime.

- A shared `FetchCache` must coalesce simultaneous requests across render
  contexts.
- Delete failed in-flight requests so a later call can retry.
- `cacheBust` bypasses fetched-resource and processed-font-CSS cache reads and
  writes. Raw discovered font-rule snapshots may remain candidates, but their
  resources must be fetched and processed again.
- `includeQueryParams: true` (default) includes the query string in the cache
  key; `false` strips it from the key without changing the requested URL.
- Keep preferred-font-format processed results separate.
- Do not store per-render inclusion state in `FontCache`; every SVG needs its
  own font style.
- Do not strongly retain `Document`, stylesheet, CSS rule, or context objects
  in persistent cache entries.
- Consumers supply manual reusable font CSS with `fontEmbedCSS`; do not add a
  second font-seeding API.
- Every cache class exposes `reset()`, which empties it in place so a caller
  holding a reference keeps it. A reset must not be repopulated by work that
  started before it.

## Async work and error handling

`WorkStatus` allows traversal to queue jobs before the total job count is known.
Call `seal()` after registration is complete and await `ready` later.

- Do not replace it with `Promise.all()` over an array that is still being
  populated asynchronously.
- Start independent work concurrently, but preserve deterministic assembly
  order.
- Immediately observe promises that may reject before their eventual await;
  delayed awaiting must not produce browser/Vitest unhandled rejections.
- Preserve and propagate the first embedding failure.
- Remote stylesheet discovery failures log and continue with successfully
  collected fonts.
- Image failures use `onImageErrorHandler` when supplied. If that handler
  succeeds, do not fail later on image decoding. If it throws/rejects, propagate
  that user-land error.

## Performance and compatibility

The library output target is ES2015 and the supported browser floor is defined
by `browserslist` in `package.json`. Build-tool runtime versions do not permit
new library runtime APIs unsupported by that floor.

Always know whether code runs once per render or once per DOM node. Everything
reached from `registerEmbedding` — the config object, each `WorkStatus.add`
closure, and the body of any inline embedder — runs once per element, so a
large tree multiplies it.

- Do not allocate per node. Reuse the config object the traversal already
  built instead of spreading it into a new one, and do not create generators,
  intermediate arrays, or option objects per node.
- `WorkStatus.add` costs a closure plus a promise chain per call. An embedder
  whose per-node work is synchronous should run inline and defer only the
  asynchronous part.
- Memoize repeated identical work, keyed on the exact input that determines the
  result. Inherited computed values such as `font-family` arrive byte-identical
  from the overwhelming majority of nodes.
- A cached `Resource` retains its `ArrayBuffer` plus every memoized derivation
  (decoded string, data URL), so assume a cached entry costs two to three times
  the raw bytes. Never add an unbounded module-level cache.
- Prefer ES2015-compatible syntax/APIs, or guard newer browser APIs with a
  tested fallback.
- Avoid duplicate parsing, repeated full-string replacement of large base64
  data, and post-embedding scans over multi-megabyte data URLs.
- Fetch independent binary resources concurrently, then assemble output in
  deterministic source order.
- Keep hot-path allocations low; use iterators/loops and append/join once.
- Never share a `/g` regex across calls that iterate it with `exec`; `lastIndex`
  persists and two callers will corrupt each other. Build the matcher from a
  non-global pattern where it is used. `String.prototype.replace` and `test` on
  a non-global regex are safe to share.
- Do not retain caller DOM/CSSOM objects beyond the operation unless the
  retention is weak and explicitly part of cache semantics.
- Preserve minimum browser behavior when changing TypeScript, SWC, Rollup, or
  other build targets.

## Coding conventions

- Use the pinned `pnpm` version and preserve `pnpm-lock.yaml`; do not introduce
  npm or Yarn lockfiles.
- Use TypeScript, double quotes, and semicolons.
- Use `import type` when an import is type-only.
- Use the `@/` alias for source-root imports where it improves clarity.
- Prefer direct property access when only one property is needed. If several
  properties are needed, destructure at the function-argument boundary instead
  of repeatedly destructuring an operation/context object inside the body.
- Keep functions single-purpose and name them after behavior, not mechanism.
- Keep feature-specific logic localized. Do not spread web-font, SVG, or cache
  policy across unrelated modules.
- Avoid clever hidden stores or symbol-based accessors when a direct class or
  explicit state object expresses ownership clearly.
- Preserve caller code and unrelated dirty-worktree changes.
- Make targeted edits rather than rewriting a file wholesale, and search with
  ripgrep (`rg`, `rg --files`) rather than listing directories by hand.

## Tests and verification

Browser tests use Vitest Browser Mode with Playwright. Tests live in
`test/spec/`, shared fixtures in `test/fixtures.ts`, and static resources under
`test/resources/`. Generated artifacts belong under `.vitest/`.

- Do not change what an existing test asserts merely to make a refactor pass.
- Discuss intentional behavior changes and update reference output only when
  the old reference is demonstrably wrong.
- Prefer stable CSS/resources and DOM-to-generated-output comparisons over
  relaxed pixel thresholds.
- Browser font rendering, native controls, media readiness, and antialiasing
  differ. Make the fixture deterministic rather than maintaining unnecessary
  browser-specific references.
- Fixture loading must use the captured native fetch so tests that spy on
  `window.fetch` cannot break the test harness.
- Add focused regressions for public options, ordering, caching, failure
  recovery, cross-document behavior, and performance invariants.
- Keep large suites split by responsibility and share only test-environment
  helpers, not assertions.

Required checks for substantive changes:

```sh
pnpm build
pnpm test
git diff --check
```

For faster iteration, run focused browser tests first, for example:

```sh
pnpm test --project chromium -t "test name"
pnpm exec vitest run --project chromium --project webkit test/spec/file.spec.ts
```

The build must emit only under `dist/`. Do not commit `.vitest/`, coverage,
screenshots, attachments, or temporary build output.

## Documentation, releases, and commits

- Update README/API documentation when public behavior or options change.
- Use Changesets for release notes and version impact. Do not manually maintain
  an `Unreleased` changelog section.
- Treat removed or changed public exports/options as breaking unless repository
  history proves they were introduced and removed within the same unreleased
  work.
- Make meaningful commits grouped by behavior. Do not combine unrelated
  migrations, test-reference updates, and functional fixes into one commit.
- Husky hooks are part of validation. Do not bypass them; inspect and fix hook
  failures before committing.
