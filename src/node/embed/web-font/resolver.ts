import type { FontCache, WebFontEntry, WebFontSource } from "@/cache";
import type { Context } from "@/context";
import { embedFontSources } from "./serialize";

/**
 * Chooses one embeddable CSS text per font family for a single render, and
 * holds the per-render state that must not leak into the caller-owned
 * `FontCache`: which families this output already covers, and which cache
 * entries turned out to be unembeddable this time.
 *
 * A family is resolved in two steps: `includeCached`, so a document whose
 * families are already embedded is never scanned, then `includeDiscovered`
 * with the faces a scan just found.
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

  isResolved(family: string) {
    return this.included.has(family);
  }

  /**
   * Reuses a cached embedding for each family that has one, so a document whose
   * families are all cached is never scanned.
   */
  includeCached(families: Iterable<string>) {
    return this.include(families, (family) => this.resolveCached(family));
  }

  includeDiscovered(sourcesByFamily: ReadonlyMap<string, WebFontSource[]>) {
    return this.include(sourcesByFamily.keys(), (family) =>
      this.resolveDiscovered(family, sourcesByFamily.get(family) ?? []),
    );
  }

  private async include(
    families: Iterable<string>,
    resolve: (family: string) => Promise<string>,
  ) {
    const ordered: string[] = [];
    const pending: Array<Promise<string>> = [];
    for (const family of families) {
      ordered.push(family);
      pending.push(resolve(family));
    }
    this.record(ordered, await Promise.all(pending));
  }

  /**
   * Families resolve concurrently but are recorded in iteration order, so the
   * generated `@font-face` blocks come out the same on every render.
   */
  private record(
    families: ReadonlyArray<string>,
    cssTexts: ReadonlyArray<string>,
  ) {
    cssTexts.forEach((cssText, index) => {
      if (cssText) {
        this.included.set(families[index], cssText);
      }
    });
  }

  private async resolveDiscovered(
    family: string,
    sources: ReadonlyArray<WebFontSource>,
  ) {
    if (this.included.has(family) || sources.length === 0) {
      return "";
    }

    const entry = this.cache.findOrCreateEntry(family, sources);
    return this.rejected.has(entry) ? "" : this.embed(family, entry);
  }

  private async resolveCached(family: string) {
    if (this.included.has(family)) {
      return "";
    }

    // Under `cacheBust` nothing processed is reused, so leave candidates in
    // discovery order rather than promoting already embedded ones.
    const preferProcessed = this.context.options.cacheBust ? null : this.format;

    for (const entry of this.cache.candidates(family, preferProcessed)) {
      if (this.rejected.has(entry)) {
        continue;
      }

      const cssText = await this.embed(family, entry);
      if (cssText) {
        return cssText;
      }
    }
    return "";
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
