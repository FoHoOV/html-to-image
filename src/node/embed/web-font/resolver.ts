import type { FontCache, WebFontEntry, WebFontSource } from "@/cache";
import type { Context } from "@/context";
import type { FontFaceCollection } from "./collector";
import { collectDocumentFontFaces } from "./collector";
import { embedFontSources } from "./serialize";

/**
 * Chooses one embeddable CSS text per font family for a single render, and
 * holds the per-render state that must not leak into the caller-owned
 * `FontCache`: which families this output already covers, and which cache
 * entries turned out to be unembeddable this time.
 *
 * A family is resolved in two steps: from the cache first, so a document whose
 * families are all already embedded is never scanned, then from the faces the
 * one stylesheet scan found.
 */
export class FontResolver {
  private readonly included = new Map<string, string>();
  private readonly rejected = new Set<WebFontEntry>();
  private readonly cache: FontCache;
  private readonly format: string;

  constructor(private readonly context: Context) {
    this.cache = context.options.cache.fontCache;
    this.format = context.options.preferredFontFormat ?? "";
  }

  /** The chosen CSS texts, in the order the families were resolved. */
  get cssTexts() {
    return this.included.values();
  }

  /**
   * Resolves every family the captured tree used against one source document:
   * cached embeddings first, so a document whose families are all already
   * covered is never scanned at all, then one stylesheet scan for the rest.
   */
  async resolveAll(sourceDocument: Document, families: ReadonlySet<string>) {
    // The cache holds one document's fonts. Rendering a node from another
    // document starts fresh rather than answering with the first one's faces.
    if (!this.cache.holds(sourceDocument)) {
      this.cache.reset();
      this.cache.bind(sourceDocument);
    }

    await this.include(families, (family) => this.resolveCached(family));

    const wanted = new Set<string>();
    for (const family of families) {
      if (!this.included.has(family) && !this.cache.isMissing(family)) {
        wanted.add(family);
      }
    }
    if (wanted.size === 0) {
      return;
    }

    let collection: FontFaceCollection;
    try {
      collection = await collectDocumentFontFaces(
        sourceDocument,
        wanted,
        this.context,
      );
    } catch (error) {
      console.error("Error while collecting web fonts", error);
      return;
    }

    const { complete, sourcesByFamily } = collection;

    // Only a fully readable document proves a family is absent, so a failed
    // stylesheet read leaves the family retryable on the next render.
    if (complete) {
      for (const family of wanted) {
        if (!sourcesByFamily.has(family)) {
          this.cache.rememberMissing(family);
        }
      }
    }

    await this.include(sourcesByFamily.keys(), (family) =>
      this.resolveDiscovered(family, sourcesByFamily.get(family) ?? []),
    );
  }

  /**
   * Families resolve concurrently but are recorded in iteration order, so the
   * generated `@font-face` blocks come out the same on every render.
   */
  private async include(
    families: Iterable<string>,
    resolve: (family: string) => Promise<string>,
  ) {
    const pending: Array<[family: string, cssText: Promise<string>]> = [];
    for (const family of families) {
      pending.push([family, resolve(family)]);
    }
    for (const [family, cssText] of pending) {
      const resolved = await cssText;
      if (resolved) {
        this.included.set(family, resolved);
      }
    }
  }

  private async resolveDiscovered(
    family: string,
    sources: ReadonlyArray<WebFontSource>,
  ) {
    if (this.included.has(family) || sources.length === 0) {
      return "";
    }

    const entry = this.cache.setEntry(family, sources);
    return this.rejected.has(entry) ? "" : this.embed(family, entry);
  }

  private async resolveCached(family: string) {
    if (this.included.has(family)) {
      return "";
    }

    const entry = this.cache.getEntry(family);
    if (!entry || this.rejected.has(entry)) {
      return "";
    }
    return this.embed(family, entry);
  }

  private async embed(family: string, entry: WebFontEntry) {
    const embed = () => embedFontSources(entry.sources, this.context);

    try {
      const cssText = await (this.context.options.cacheBust
        ? embed()
        : entry.process(this.format, embed));
      if (!cssText) {
        this.rejected.add(entry);
      }
      return cssText;
    } catch (error) {
      this.rejected.add(entry);
      console.warn(`Could not embed web font "${family}"`, error);
      return "";
    }
  }
}
