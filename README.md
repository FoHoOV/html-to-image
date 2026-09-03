<h1 align="center">html-to-image</h1>

<p align="center"><strong>✂️ Generates an image from a DOM node using HTML5 canvas and SVG.</strong></p>

<p align="center">Originally created by <a href="https://github.com/bubkoo" rel="nofollow">bubkoo</a> from <a href="https://github.com/tsayen/dom-to-image" rel="nofollow">dom-to-image</a>. This maintained fork continues development at <a href="https://github.com/FoHoOV/html-to-image">FoHoOV/html-to-image</a>.</p>

<p align="center">
<a href="https://github.com/FoHoOV/html-to-image/actions/workflows/ci.yml"><img alt="build" src="https://img.shields.io/github/actions/workflow/status/FoHoOV/html-to-image/ci.yml?branch=master&logo=github&style=for-the-badge"></a>
<a href="https://www.npmjs.com/package/@fohoov/html-to-image" rel="nofollow"><img alt="NPM Package" src="https://img.shields.io/npm/v/@fohoov/html-to-image.svg?logo=npm&style=for-the-badge" /></a>
<a href="https://www.npmjs.com/package/@fohoov/html-to-image" rel="nofollow"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/@fohoov/html-to-image.svg?logo=npm&style=for-the-badge" /></a>


</p>

<p align="center">
<a href="/LICENSE"><img src="https://img.shields.io/github/license/FoHoOV/html-to-image?style=for-the-badge" alt="MIT License"></a>
<a href="https://www.typescriptlang.org"><img alt="Language" src="https://img.shields.io/badge/language-TypeScript-blue.svg?style=for-the-badge"></a>
<a href="https://github.com/FoHoOV/html-to-image/pulls"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=for-the-badge"></a>
</p>

## Install

```shell
npm install --save @fohoov/html-to-image
```

## Usage

```js
/* ES modules */
import * as htmlToImage from '@fohoov/html-to-image';
import {
  Cache,
  toBlob,
  toCanvas,
  toJpeg,
  toPixelData,
  toPng,
  toSvg,
  toDataUrl
} from '@fohoov/html-to-image';

/* CommonJS */
var htmlToImage = require('@fohoov/html-to-image');
```

The rendering functions below accept a DOM node and rendering options, and return a promise with the corresponding output:

- [toDataUrl](#toDataUrl)
- [toPng](#toPng)
- [toSvg](#toSvg)
- [toJpeg](#toJpeg)
- [toBlob](#toBlob)
- [toCanvas](#toCanvas)
- [toPixelData](#toPixelData)

Go with the following examples.

#### toPng
Get a PNG image base64-encoded data URL and display it right away:

```js
const node = document.getElementById('my-node');

htmlToImage
  .toPng(node)
  .then((dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    document.body.appendChild(img);
  })
  .catch((err) => {
    console.error('oops, something went wrong!', err);
  });
```

Get a PNG image base64-encoded data URL and download it (using [download](https://github.com/rndme/download)):

```js
htmlToImage
  .toPng(document.getElementById('my-node'))
  .then((dataUrl) => download(dataUrl, 'my-node.png'));
```

#### toSvg
Get an SVG element, but filter out all the `<i>` elements:

```js
function filter(node) {
  return node.tagName === 'I' ? 'remove' : 'keep';
}

htmlToImage
  .toSvg(document.getElementById('my-node'), { filter: filter })
  .then(function (svgElement) {
    /* do something */
  });
```

#### toDataUrl
Get the rendered SVG as a data URL:

```js
htmlToImage
  .toDataUrl(document.getElementById('my-node'))
  .then(function (dataUrl) {
    document.querySelector("#my-image-element").src = dataUrl
  });
```

#### toJpeg
Save and download a compressed JPEG image:

```js
htmlToImage
  .toJpeg(document.getElementById('my-node'), { quality: 0.95 })
  .then(function (dataUrl) {
    var link = document.createElement('a');
    link.download = 'my-image-name.jpeg';
    link.href = dataUrl;
    link.click();
  });
```

#### toBlob
Get a PNG image blob and download it (using [FileSaver](https://github.com/eligrey/FileSaver.js)):

```js
htmlToImage
  .toBlob(document.getElementById('my-node'))
  .then(function (blob) {
    if (window.saveAs) {
      window.saveAs(blob, 'my-node.png');
    } else {
     FileSaver.saveAs(blob, 'my-node.png');
   }
  });
```

#### toCanvas
Get a HTMLCanvasElement, and display it right away:

```js
htmlToImage
  .toCanvas(document.getElementById('my-node'))
  .then(function (canvas) {
    document.body.appendChild(canvas);
  });
```

#### toPixelData
Get the raw pixel data as a [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) with every 4 array elements representing the RGBA data of a pixel:

```js
var node = document.getElementById('my-node');

htmlToImage
  .toPixelData(node)
  .then(function (pixels) {
    for (var y = 0; y < node.scrollHeight; ++y) {
      for (var x = 0; x < node.scrollWidth; ++x) {
        pixelAtXYOffset = (4 * y * node.scrollHeight) + (4 * x);
        /* pixelAtXY is a Uint8Array[4] containing RGBA values of the pixel at (x, y) in the range 0..255 */
        pixelAtXY = pixels.slice(pixelAtXYOffset, pixelAtXYOffset + 4);
      }
    }
  });
```

#### React
```tsx
import React, { useCallback, useRef } from 'react';
import { toPng } from '@fohoov/html-to-image';

const App: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)

  const onButtonClick = useCallback(() => {
    if (ref.current === null) {
      return
    }

    toPng(ref.current, { cacheBust: true, })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = 'my-image-name.png'
        link.href = dataUrl
        link.click()
      })
      .catch((err) => {
        console.log(err)
      })
  }, [ref])

  return (
    <>
      <div ref={ref}>
      {/* DOM nodes you want to convert to PNG */}
      </div>
      <button onClick={onButtonClick}>Click me</button>
    </>
  )
}
```

## Migration

Every breaking change is recorded per release in the [release notes](/CHANGELOG.md) — read them when upgrading. This section collects the ones that need an edit to your code, whether you are arriving from upstream [`html-to-image`](https://github.com/bubkoo/html-to-image) or upgrading between versions of this fork.

| If your code has | Change it to |
| --- | --- |
| `filter` returning a boolean | `'keep'`, `'unwrap'`, or `'remove'` — see [filter](#filter). It now runs for the root as well as every node beneath it, including text nodes. |
| `backgroundColor: '#fff'` | `style: { backgroundColor: '#fff' }` |
| `toSvg(node)` used as a data URL string | `toSvg` resolves with an `SVGSVGElement`; use [`toDataUrl`](#toDataUrl) for the string. |
| `getFontEmbedCSS(node, options)` | Removed. Use [`fonts`](#fonts)`: { strategy: 'provided', fontFaces }`. |
| `skipFonts: true` | `fonts: { strategy: 'none' }` |
| `fontEmbedCSS: css` | `fonts: { strategy: 'provided', fontFaces: css }` |
| `onImageErrorHandler` | [`onEmbeddedImageError`](#onEmbeddedImageError) |
| `cache.add(...)` / `cache.get(...)` / `cache.has(...)` | Resource entries live on `FetchCache`; `Cache` composes it with a `FontCache` — see [cache](#cache). |
| Imports from `es/`, `lib/`, or `src/` | The package root only. Bundles are published under `dist`. |

Two changes need no edit but can change what you get:

- **Output bounds are measured from the styled and filtered clone.** Consumer-provided dimensions and layout-changing styles therefore affect the output size, and filtering can reduce it.
- **Cross-call resource caching is opt-in.** Without a supplied [`cache`](#cache), resources are cached only for the duration of the current call; nothing is retained in a module-global for the application lifetime. `includeQueryParams` defaults to `true`.

The published bundles are ES2015 — see [Browsers](#browsers) for the supported floor.

## Options

### filter

```ts
(node: Node) => 'keep' | 'unwrap' | 'remove'
```

A function invoked for the root node and every node visited beneath it. Return `keep` to preserve the node and process its descendants, `unwrap` to omit only the node while preserving its descendants, node with unwrap is replaced with a document fragment, or `remove` to omit the node and its entire subtree.

It is called for **every** node the capture walks, not only elements — text and comment nodes reach it too. So narrow before touching anything element-specific, as the optional chaining below does; `classList` is `undefined` on a text node, and reading `.contains` on it would throw.

You can add a filter to every image function. For example:

```ts
const filter = (node: Node) => {
  const exclusionClasses = ['remove-me', 'secret-div'];
  return exclusionClasses.some((classname) =>
    (node as HTMLElement).classList?.contains(classname),
  )
    ? 'remove'
    : 'keep';
}

htmlToImage.toJpeg(node, { quality: 0.95, filter });
```

### width, height

Width and height in CSS pixels applied to the cloned root before layout and computed-style capture. They determine the logical SVG or canvas output size without modifying the original DOM node. If only one dimension is supplied, the other is measured after the clone has reflowed.

### canvasWidth, canvasHeight

Scale the final canvas, including its contents, to the given logical width and height in pixels. These options do not change the cloned node's layout; use `width` and `height` for that.

### style

An object whose properties are applied to the cloned root before layout and output-size measurement. Layout-changing properties such as `width` and `height` therefore affect the capture bounds. The original DOM node is not modified.

To set the output background, provide it through `style`:

```js
htmlToImage.toPng(node, {
  style: { backgroundColor: '#fff' },
});
```

See the [CSS properties reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Properties_Reference) for JavaScript property names.

### quality

A number between `0` and `1` indicating image quality (e.g. `0.92` => `92%`) of the JPEG image.

Defaults to `1.0` (`100%`)

### cacheBust

Set to `true` to append the current time as a query string to resource requests. Cache-busted requests bypass cache reads and writes.

Defaults to `false`

### cache

Every top-level API call uses a composite cache. When `cache` is omitted, the library creates a temporary `Cache`, `FetchCache`, and `FontCache` for that call. This deduplicates repeated requests and font processing within the operation, but none of those caches are retained for later API calls. The library does not create a module-global cache that remains alive for the application lifecycle.

Pass caller-owned component caches to control fetched-resource and processed-font persistence independently. `Cache` accepts a `FetchCache` followed by a `FontCache`. Each rendered node still receives only the font families it uses:

```js
import {
  Cache,
  FetchCache,
  FontCache,
  toPng,
} from '@fohoov/html-to-image';

const fetchCache = new FetchCache();
const fontCache = new FontCache();
const cache = new Cache(fetchCache, fontCache);
await toPng(firstNode, { cache });
await toPng(secondNode, { cache });
```

You can also reuse only one kind of cached work by creating a new composite cache for each call while retaining only the desired component:

```js
await toPng(firstNode, { cache: new Cache(fetchCache) });
await toPng(secondNode, { cache: new Cache(fetchCache) });

await toPng(firstNode, {
  cache: new Cache(new FetchCache(), fontCache),
});
await toPng(secondNode, {
  cache: new Cache(new FetchCache(), fontCache),
});
```

Stop retaining a component cache, or replace it with a new instance, to allow its entries to be released. Resource entry methods live on `FetchCache`; `Cache` only composes the two cache types. A shared `FetchCache` also coalesces simultaneous requests for the same resource across renders.

### Emptying a cache

`Cache`, `FetchCache`, and `FontCache` each expose `reset()`, which drops their contents while keeping the instance usable. Use it instead of constructing a replacement when the cache is held somewhere awkward to reassign, such as a module singleton or a React ref:

```js
const cache = new Cache();

cache.reset(); // both component caches
cache.fontCache.reset(); // only the discovered fonts
cache.fetchCache.reset(); // only the fetched resources
```

Automatic font discovery normalizes family names before accessing `FontCache`; the cache itself does not parse or normalize CSS.

`@font-face` rules are discovered in the rendered node's own document. Font families used anywhere in the captured tree are collected — including by elements inside an iframe — and every one of them is resolved against that single document's stylesheets.

An iframe's *own* `@font-face` rules are therefore not discovered. If an iframe defines a face that the surrounding page does not, supply it through [`fontFaces`](#fonts), or define the same family in the page's own stylesheets.

A `FontCache` holds one document's fonts. If a later render targets a node from a different document — a node living inside an iframe, say — the cache clears itself and rediscovers, so one document's faces are never reused for another's.

Cached font definitions are snapshots. Reset the `FontCache` after adding, removing, or changing `@font-face` rules, or after enabling or disabling their stylesheets. If a changed font stylesheet was fetched externally, also reset the `FetchCache` so its previous response is not reused.

A snapshot records the `@font-face` rules that were active when it was taken, and conditions are **not** reevaluated when it is reused. If you place `@font-face` rules inside `@media` or `@supports` blocks — a dark-mode or viewport-dependent font, for example — reset the `FontCache` when that condition changes:

```js
const cache = new Cache();

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  cache.fontCache.reset(); // conditions changed, so the font snapshot is stale
});
```

Without this, a render after the change reuses the faces discovered before it. A single render is always correct; only a cache that outlives a condition change is affected. `@font-face` rules that are not inside a conditional block are unaffected.

`@font-face` rules nested in `@media`, `@supports`, or `@layer` are evaluated against the live page, in the same engine that renders the output, when the render starts. Only faces behind a currently-active condition are embedded, and they are embedded bare — the enclosing block is not reproduced in the output. Replaying it would ask a question already answered: for `@media`, against the wrong viewport (the exported SVG's own output size, not the page's); for `@supports` and `@layer`, redundantly, since the engine evaluating it is the same one that just did.

Fonts registered only through the `FontFace` constructor cannot be recovered from browser CSSOM because their original source is not exposed. Supply those fonts through [`fontFaces`](#fonts) alongside `"discover"`, so the rest of the tree's fonts are still found automatically. `fontFaces` does not populate `FontCache`.

### includeQueryParams

Controls resource cache keys. `true` keeps the query string, so `/image.png?v=1` and `/image.png?v=2` use different entries. `false` strips the query string before constructing the key, so those URLs share an entry. The requested URL is never changed by this option.

Defaults to `true`

### imagePlaceholder

A data URL substituted for a resource that **cannot be fetched**. It applies to image element sources, `<video>` posters, and CSS `url()` values.

Defaults to an empty string. What an unfetchable resource does then depends on where it was used:

| Where the resource was used | Result |
| --- | --- |
| `<img>`, SVG `<image>`, `<video>` poster | The source fails to load, which is reported through [`onEmbeddedImageError`](#onEmbeddedImageError). With no handler, **the render rejects**. |
| CSS `url()` (`background`, `mask`) | The value becomes `url("")`, so the area renders empty and the render continues. |

Supplying a placeholder that itself fails to load behaves exactly like the empty default. So an image whose source cannot be downloaded does not silently render as an empty area unless you handle it — see below.

### onEmbeddedImageError

An error handler called when an image element's **inlined source fails to load or decode**.

This is a different failure from the one `imagePlaceholder` covers. By the time this runs the image data is ready, so what failed is the browser rendering that source, not downloading it.

- Return normally and the failure is treated as handled: the element keeps its broken or empty source, and the output paints an empty area.
- Supply no handler, throw, or return a rejected promise, and that terminates image generation with that error.

It covers `<img>`, SVG `<image>`, and `<video>` poster replacements. A CSS `url()` that cannot be fetched does not reach it; it degrades as described above.

```js
htmlToImage.toPng(node, {
  imagePlaceholder: 'data:image/png;base64,...', // used when a fetch fails
  onEmbeddedImageError: (event) => {
    // reached when the resulting source will not render
    console.warn('image could not be embedded', event);
  },
});
```

### pixelRatio

The pixel ratio of the captured image. Default use the actual pixel ratio of the device. Set `1` to
use as initial-scale `1` for the image.

### preferredFontFormat

The format required for font embedding. This is a useful optimisation when a webfont provider
specifies several different formats for fonts in the CSS, for example:

```css
@font-face {
  name: 'proxima-nova';
  src: url("...") format("woff2"), url("...") format("woff"), url("...") format("opentype");
}
```

Instead of embedding each format, all formats other than the one specified will be discarded. If
this option is not specified then all formats will be downloaded and embedded.

### fonts

Controls font embedding. Omitted defaults to `{ strategy: 'discover' }`: automatically find and embed the `@font-face` rules used by the captured tree, as described above.

```javascript
htmlToImage.toSvg(element, {
  fonts: { strategy: 'discover' },
});
```

`fontFaces`, alongside `'discover'`, maps a family name to complete, ready-to-use `@font-face` CSS text — `url()`s already as `data:` URLs, since a `fontFaces` entry is used verbatim and is not run through resource fetching. A family listed here is not searched for in any stylesheet at all; discovery is narrowed to skip it, not merged with it. Supply every variant (weight, style) you want for that family in the one string — other variants for a family listed here are not additionally discovered.

```javascript
htmlToImage.toSvg(element, {
  fonts: {
    strategy: 'discover',
    fontFaces: {
      Inter: '@font-face { font-family: "Inter"; src: url("data:..."); }',
    },
  },
});
```

`{ strategy: 'provided', fontFaces }` uses `fontFaces` verbatim for the *whole* output and skips automatic discovery entirely. An empty string intentionally disables font embedding without adding a style element.

```javascript
htmlToImage.toSvg(element, {
  fonts: { strategy: 'provided', fontFaces: '@font-face { font-family: "Inter"; src: url("data:..."); }' },
});
```

`{ strategy: 'none' }` emits no font style and performs no discovery.

```javascript
htmlToImage.toSvg(element, {
  fonts: { strategy: 'none' },
});
```

Font failures degrade instead of failing the render. A `@font-face` whose source cannot be fetched is dropped from the embedded output, and a stylesheet that cannot be read or fetched is logged and skipped, so the render continues with the faces that did resolve. Neither [`imagePlaceholder`](#imagePlaceholder) nor [`onEmbeddedImageError`](#onEmbeddedImageError) applies to fonts — a placeholder image is not a usable font. When a scan ends incomplete, nothing is recorded as a definitive miss, so a later render using the same `FontCache` retries it.

### skipAutoScale

When supplied, the library will skip the process of scaling extra large doms into the canvas object.
You may experience loss of parts of the image if set to `true` and you are exporting a very large image.

Defaults to `false`  

### type

A string indicating the image format. The default type is image/png; that type is also used if the given type isn't supported.
When supplied, the toCanvas function will return a blob matching the given image type and quality. 

Defaults to `image/png`

### includeStyleProperties

An array of style property names. Can be used to manually specify which style properties are included when cloning nodes. This can be useful for performance-critical scenarios.

## Browsers

The published bundles use ES2015 syntax The supported browser floor is:

- Chrome 64+
- Edge 79+
- Firefox 68+
- Safari 12+
- iOS Safari 12+

These fixed minimums account for both the emitted syntax and the browser APIs
used by the library. Only standard browser APIs are used, including:

- [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- SVG `<foreignObject>` tag
- `fetch()`
- `HTMLImageElement.decode()`
- `TextDecoder`
- `CSS.escape()`

Chrome generally performs better on large DOM trees.

### WebKit

For canvas-based outputs, WebKit browsers wait for rendering to settle and draw the generated SVG to the canvas a second time on a later frame. This is an automatic workaround for a WebKit issue where images or other elements can be missing from the first canvas draw.

*Internet Explorer is not (and will not be) supported, as it does not support SVG `<foreignObject>` tag.*

## How it works

There might some day exist (or maybe already exists?) a simple and standard way of exporting parts of the HTML to image (and then this script can only serve as an evidence of all the hoops I had to jump through in order to get such obvious thing done) but I haven't found one so far.

This library uses a feature of SVG that allows having arbitrary HTML content inside of the `<foreignObject>` tag. So, in order to render that DOM node for you, following steps are taken:

1. Walk the source subtree **once**. Every node is visited a single time, and everything that node will need later — its styles, its images, its fonts — is registered onto a queue as it is passed, so nothing has to descend the tree again looking for work.

   Each visited node is filtered (`keep`, `unwrap`, `remove`), then shallow-cloned or replaced:
   - Canvas and video elements become `<img>`, carrying the original element's attributes. A video contributes its current frame, or its poster when it has no loaded source; a canvas that yields no image data at all is left as a canvas. CSS selectors written against `canvas` or `video` no longer match the replacement, because it is an `<img>` now.
   - External SVG `<use>` definitions and the definitions those reference are copied in.
   - Live state that `cloneNode` drops — a text area's value, a select's chosen option — is carried over by hand.
   - The font families in use are noted as they are seen, rather than searched for afterwards.

   The cloned root also receives any consumer `width`, `height`, and `style`.

2. Attach the clone to a hidden off-screen container and wait a frame for the browser to lay it out.

3. Read computed styles from that **attached clone**, not from the original node, so layout-dependent values — percentages, flex, grid — come from the clone's own reflow with the consumer's dimensions applied. Each node's declaration is written in one pass rather than property by property.

   - and don't forget to recreate pseudo-elements, as they are not cloned in any way, of course

4. Measure the output size from the styled, filtered clone — which is why filtering or a layout-changing `style` can change the size of what you get — and then detach it.

5. Drain the queues from step 1, concurrently:
   - `<img>`, SVG `<image>`, and video-poster sources are downloaded and inlined as data URLs
   - so are the `url()`s inside `background` and `mask`
   - the font families noted in step 1 are resolved against the rendered node's own document, walking only the stylesheets and `@media`/`@supports`/`@layer` blocks that currently apply. The faces found are downloaded, base64-inlined, and written into a single `<style>` element on the clone — carrying only the families this output actually uses.

6. Serialize the clone to XML, wrap it in `<foreignObject>` inside an SVG, and make that a data URL.

7. For canvas-based output, load that SVG into an image, draw it to an off-screen canvas, and read PNG, JPEG, or raw pixels back. On WebKit, clear and redraw the same canvas on a later frame, because its first draw can omit content.

8. Done!


## Things to watch out for

- If the DOM node you want to render includes a `<canvas>` element with something drawn on it, it should be handled fine, unless the canvas is [tainted](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image) - in this case rendering will rather not succeed.
- Rendering will failed on huge DOM due to the dataURI [limit varies](https://stackoverflow.com/questions/695151/data-protocol-url-size-limitations/41755526#41755526).

## Contributing

Please let us know how we can help. Check the [issues](https://github.com/FoHoOV/html-to-image/issues) for existing bug reports or suggestions first.

To become a contributor, please follow our [contributing guide](/CONTRIBUTING.md).

This fork preserves the work of bubkoo and all contributors to the original project. The contributor gallery below records that history; new activity is tracked in this repository.

<a href="https://github.com/FoHoOV/html-to-image/graphs/contributors">
  <img src="/CONTRIBUTORS.svg" alt="Contributors" width="740" />
</a>


## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
