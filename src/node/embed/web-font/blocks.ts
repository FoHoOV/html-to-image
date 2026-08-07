import type { WebFontWrapper } from "@/cache";
import {
  getConditionText,
  getMediaText,
  getRulePrelude,
  isRuleType,
} from "./cssom";

/**
 * Reads the `@media`, `@supports`, and `@layer` blocks enclosing a
 * `@font-face` rule, and answers whether each one applies *right now*, in this
 * source document.
 *
 * This is evaluation for the current render, not tracking across renders. A
 * block that does not apply is never walked, so its faces are not fetched or
 * embedded at all; the caller does not remember that it might apply later.
 * Discovery is a snapshot, and callers reset the `FontCache` when a condition
 * changes.
 *
 * Every block that does apply becomes a wrapper the output must reproduce.
 * Wrapper ids are unique per collection so serialization can tell sibling
 * blocks apart.
 */
export class BlockReader {
  private nextWrapperId = 0;

  constructor(private readonly document: Document) {}

  matchesMedia(mediaText: string) {
    return this.document.defaultView?.matchMedia(mediaText).matches ?? true;
  }

  createMediaWrapper(mediaText: string) {
    return this.createWrapper(`@media ${mediaText}`);
  }

  /** The wrapper for a `@media`, `@supports`, or `@layer` block. */
  getGroupingWrapper(rule: CSSGroupingRule) {
    const mediaText = getMediaText("media" in rule ? rule.media : null);
    if (mediaText != null) {
      return {
        active: this.matchesMedia(mediaText),
        wrapper: this.createMediaWrapper(mediaText),
      };
    }

    if (isRuleType(rule, "SUPPORTS_RULE", this.document)) {
      const condition = getConditionText(rule);
      return condition
        ? {
            active: this.supports(condition),
            wrapper: this.createSupportsWrapper(condition),
          }
        : null;
    }

    if (isRuleType(rule, "LAYER_BLOCK_RULE", this.document)) {
      const name =
        "name" in rule && typeof rule.name === "string" ? rule.name : "";
      return { active: true, wrapper: this.createLayerWrapper(name) };
    }

    const prelude = getRulePrelude(rule.cssText);
    if (!prelude) {
      return null;
    }
    return { active: true, wrapper: this.createWrapper(prelude) };
  }

  /** The wrappers an `@import` rule contributes to the sheet it pulls in. */
  getImportWrappers(rule: CSSImportRule) {
    const wrappers: WebFontWrapper[] = [];
    let active = true;

    const mediaText = rule.media?.mediaText ?? "";
    if (mediaText) {
      active = this.matchesMedia(mediaText);
      wrappers.push(this.createMediaWrapper(mediaText));
    }

    const supportsText =
      "supportsText" in rule && typeof rule.supportsText === "string"
        ? rule.supportsText
        : "";
    if (supportsText) {
      active = active && this.supports(supportsText);
      wrappers.push(this.createSupportsWrapper(supportsText));
    }

    if ("layerName" in rule && typeof rule.layerName === "string") {
      wrappers.push(this.createLayerWrapper(rule.layerName));
    }

    return { active, wrappers };
  }

  private supports(condition: string) {
    return this.document.defaultView?.CSS?.supports(condition) ?? true;
  }

  private createSupportsWrapper(condition: string) {
    // A bare `prop: value` condition has to be reparenthesized to serialize.
    const trimmed = condition.trim();
    const prelude = /^[\w-]+\s*:/.test(trimmed) ? `(${trimmed})` : trimmed;
    return this.createWrapper(`@supports ${prelude}`);
  }

  private createLayerWrapper(name: string) {
    return this.createWrapper(name ? `@layer ${name}` : "@layer");
  }

  private createWrapper(prelude: string): WebFontWrapper {
    this.nextWrapperId += 1;
    return { id: this.nextWrapperId, prelude };
  }
}
