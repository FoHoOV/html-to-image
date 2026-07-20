---
"html-to-image": major
---

Rework cloning, rendering, resource caching, and package distribution for the 2.0 release.

**Breaking changes:**

- `filter` now runs for the root and every descendant element and must return `keep`, `unwrap`, or `remove`; boolean callbacks no longer exclude nodes.
- Remove the standalone `backgroundColor` option; use `style.backgroundColor` instead.
- Measure output dimensions from the styled and filtered clone. Consumer-provided `width`, `height`, and layout-changing `style` values now affect layout before capture, and filtering can change the resulting bounds.
- Remove the module-global resource and stylesheet caches. Cross-render reuse is now opt-in through a caller-owned `Cache`, and `includeQueryParams` now defaults to `true`.
- Remove `getApiAvailability` and the browser share/save capability checks from the public API.
- Restrict package exports to the documented root entry point. Generated ESM, CommonJS, browser, and declaration artifacts now live under `dist`; legacy deep imports from `es`, `lib`, or `src` are no longer published.

**Features:**

- Export a reusable, caller-owned `Cache` for images, fonts, stylesheets, and external SVG resources without retaining fetched resource data globally for the application lifecycle.
- Add tri-state filtering, including `unwrap` for removing an element while preserving its children.
- Inline external SVG `use` definitions and their referenced dependencies.
- Capture browser-computed styles from a live off-screen clone before serialization.

**Bug fixes:**

- On iOS, wait for WebKit rendering to settle, then clear and redraw canvas-based output on a later frame to prevent images or other elements from being omitted by the first draw.
- Use traversal compatible with older iOS versions when collecting SVG definitions and dependencies.
- Honor consumer-provided dimensions and layout-changing styles before measuring the clone, including reflow when only one dimension is supplied.
- Preserve logical dimensions and the full rendered image at high pixel ratios and after automatic canvas scaling.
- Preserve computed width, height, `object-fit`, and other styles when video frames or posters are replaced with images.
- Wait for image readiness, treat a handled image load error as recovered, and propagate exceptions or rejected promises from `onImageErrorHandler`.
- Apply caller fetch options consistently, reject non-successful HTTP responses, and keep cache busting independent from cache reuse.
- Avoid separately inlining descendant styles inside SVG elements and preserve namespaced references.
- Improve cross-browser font-face detection and used-font matching.
- Remove clone-time font-size alteration so selected options render using their actual computed styles.

**Performance:**

- Collect computed styles before applying them in a batched write pass to reduce layout thrashing.

**Maintenance:**

- Support pnpm 11.11 with a compatible lockfile and pinned Node.js type definitions.
- Replace maintainer-specific toolchain packages with public dependencies and local configuration.
- Publish native-safe `.mjs` and `.cjs` bundles, a minified browser bundle, portable source maps, and one declaration tree under `dist`.
- Adopt Changesets with verified, `master`-only release automation.
