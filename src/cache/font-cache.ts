/** One discovered `@font-face` rule, captured as text rather than as CSSOM. */
export type WebFontSource = Readonly<{
  baseUrl?: string;
  cssText: string;
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
    this.sources = [...sources];
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
 *
 * A cache holds one document's fonts. Fonts are discovered in the rendered
 * node's own document, so a render for a different document starts from an
 * empty cache rather than answering with another document's faces.
 */
export class FontCache {
  private entries = new Map<string, WebFontEntry>();
  private missingFamilies = new Set<string>();
  /**
   * Which document the current contents were discovered in. Weak, so binding a
   * cache to a document never keeps that document alive; `WeakRef` is newer
   * than the supported browser floor, and only identity is ever needed here.
   */
  private boundDocument = new WeakSet<Document>();

  /**
   * Drops every discovered font, so the next render rediscovers them. Use it
   * when the page's `@font-face` rules change, or when a `@media` or
   * `@supports` condition that guards them flips.
   */
  reset() {
    this.entries = new Map();
    this.missingFamilies = new Set();
    this.boundDocument = new WeakSet();
  }

  /** Whether the current contents were discovered in `document`. */
  holds(document: Document) {
    return this.boundDocument.has(document);
  }

  /** Records which document the contents belong to, after a `reset()`. */
  bind(document: Document) {
    this.boundDocument.add(document);
  }

  getEntry(family: string) {
    return this.entries.get(family);
  }

  setEntry(family: string, sources: ReadonlyArray<WebFontSource>) {
    const entry = new WebFontEntry(sources);
    this.entries.set(family, entry);
    return entry;
  }

  /** A family a fully readable document definitively does not define. */
  rememberMissing(family: string) {
    this.missingFamilies.add(family);
  }

  isMissing(family: string) {
    return this.missingFamilies.has(family);
  }
}
