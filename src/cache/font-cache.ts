/**
 * An enclosing `@media`, `@supports`, or `@layer` block that a discovered
 * `@font-face` rule was nested in. `id` keeps sibling blocks distinct so
 * serialization can reopen and close them in source order.
 */
export type WebFontWrapper = Readonly<{
  id: number;
  prelude: string;
}>;

/** One discovered `@font-face` rule, captured as text rather than as CSSOM. */
export type WebFontSource = Readonly<{
  baseUrl?: string;
  cssText: string;
  wrappers?: ReadonlyArray<WebFontWrapper>;
}>;

/**
 * A snapshot of every `@font-face` rule found for one family, plus the embedded
 * CSS produced from it. Entries never retain the document, stylesheet, or rule
 * objects they were discovered from.
 *
 * A snapshot records the faces that were active when it was taken. Conditions
 * are not reevaluated on reuse, so a cache outliving a media or feature change
 * must be replaced by the caller.
 */
export class WebFontEntry {
  readonly sources: ReadonlyArray<WebFontSource>;
  private readonly processedCSS = new Map<string, Promise<string>>();

  constructor(sources: ReadonlyArray<WebFontSource>) {
    this.sources = sources.map(copySource);
  }

  matches(sources: ReadonlyArray<WebFontSource>) {
    return (
      this.sources.length === sources.length &&
      this.sources.every((cached, index) =>
        isSameSource(cached, sources[index]),
      )
    );
  }

  hasProcessed(format: string) {
    return this.processedCSS.has(format);
  }

  /**
   * Memoizes the embedded CSS per preferred font format. Empty and failed
   * results are released so a later render can retry them.
   */
  process(format: string, embed: () => Promise<string>) {
    const cached = this.processedCSS.get(format);
    if (cached) {
      return cached;
    }

    const pending = embed();
    this.processedCSS.set(format, pending);

    return pending.then(
      (cssText) => {
        if (!cssText) {
          this.release(format, pending);
        }
        return cssText;
      },
      (error: unknown) => {
        this.release(format, pending);
        throw error;
      },
    );
  }

  private release(format: string, pending: Promise<string>) {
    if (this.processedCSS.get(format) === pending) {
      this.processedCSS.delete(format);
    }
  }
}

/**
 * Caller-owned store for automatically discovered web fonts. It holds discovery
 * results only; it never parses or normalizes CSS, and it holds no per-render
 * state, so every output still builds its own font style element.
 */
export class FontCache {
  private entriesByFamily = new Map<string, WebFontEntry[]>();
  private missingFamiliesByDocument = new WeakMap<Document, Set<string>>();

  /**
   * Drops every discovered font, so the next render rediscovers them. Use it
   * when the page's `@font-face` rules change, or when a `@media` or
   * `@supports` condition that guards them flips.
   */
  reset() {
    this.entriesByFamily = new Map();
    this.missingFamiliesByDocument = new WeakMap();
  }

  findOrCreateEntry(family: string, sources: ReadonlyArray<WebFontSource>) {
    let entries = this.entriesByFamily.get(family);
    if (!entries) {
      entries = [];
      this.entriesByFamily.set(family, entries);
    }

    const cached = entries.find((entry) => entry.matches(sources));
    if (cached) {
      return cached;
    }

    const entry = new WebFontEntry(sources);
    entries.push(entry);
    return entry;
  }

  /**
   * Every entry discovered for a family. When `preferProcessedFormat` is given,
   * entries already embedded for that format come first so a usable result is
   * found without re-fetching.
   */
  *candidates(family: string, preferProcessedFormat: string | null) {
    const entries = this.entriesByFamily.get(family);
    if (!entries) {
      return;
    }
    if (preferProcessedFormat === null) {
      yield* entries;
      return;
    }

    for (const entry of entries) {
      if (entry.hasProcessed(preferProcessedFormat)) {
        yield entry;
      }
    }
    for (const entry of entries) {
      if (!entry.hasProcessed(preferProcessedFormat)) {
        yield entry;
      }
    }
  }

  /** A family a fully readable document definitively does not define. */
  rememberMissing(document: Document, family: string) {
    let families = this.missingFamiliesByDocument.get(document);
    if (!families) {
      families = new Set();
      this.missingFamiliesByDocument.set(document, families);
    }
    families.add(family);
  }

  isMissing(document: Document, family: string) {
    return this.missingFamiliesByDocument.get(document)?.has(family) ?? false;
  }
}

function copySource(source: WebFontSource): WebFontSource {
  return {
    ...source,
    wrappers: source.wrappers?.map((wrapper) => ({ ...wrapper })),
  };
}

function isSameSource(cached: WebFontSource, source: WebFontSource) {
  return (
    cached.baseUrl === source.baseUrl &&
    cached.cssText === source.cssText &&
    isSameWrappers(cached.wrappers, source.wrappers)
  );
}

function isSameWrappers(
  cached: ReadonlyArray<WebFontWrapper> | undefined,
  source: ReadonlyArray<WebFontWrapper> | undefined,
) {
  if (cached === source) {
    return true;
  }
  if (!cached || !source || cached.length !== source.length) {
    return false;
  }
  return cached.every(
    (wrapper, index) =>
      wrapper.id === source[index].id &&
      wrapper.prelude === source[index].prelude,
  );
}
