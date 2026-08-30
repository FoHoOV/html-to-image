---
"@fohoov/html-to-image": major
---

breaking: replace `skipFonts` and `fontEmbedCSS` with a single discriminated `fonts` option: `{ strategy: 'discover' }` (the default), `{ strategy: 'provided', fontFaces }`, or `{ strategy: 'none' }`. `skipFonts: true` becomes `fonts: { strategy: 'none' }`; `fontEmbedCSS: css` becomes `fonts: { strategy: 'provided', fontFaces: css }`.

This also fixes a bug where supplying `fontEmbedCSS` still triggered automatic discovery alongside it, producing two font `<style>` elements. The new shape makes `"provided"` and `"discover"` mutually exclusive by construction, so the bug has nowhere to live.
