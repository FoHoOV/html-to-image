import { getConditionText, getMediaText, isRuleType } from "./cssom";

/**
 * Answers whether the `@media`, `@supports`, or `@layer` block enclosing a
 * `@font-face` rule applies *right now*, in this source document.
 *
 * This is evaluation for the current render, not tracking across renders. A
 * block that does not apply is never walked, so its faces are not fetched or
 * embedded at all; the caller does not remember that it might apply later.
 * Discovery is a snapshot, and callers reset the `FontCache` when a condition
 * changes.
 *
 * A face collected from an active block is embedded without it: the block was
 * evaluated against the live page in the same engine that renders the output,
 * so replaying its condition would only ask a question already answered
 * against this render.
 */
export function isActiveGroup(rule: CSSGroupingRule, document: Document) {
  const mediaText = getMediaText("media" in rule ? rule.media : null);
  if (mediaText != null) {
    return matchesMedia(mediaText, document);
  }

  // Rule types added since the numeric `type` code was deprecated — `@layer`,
  // `@container`, `@scope` — aren't `CSSSupportsRule`, so they fall through to
  // being walked rather than evaluated, which is what they should do: a
  // container query cannot be answered against the page the way `@supports`
  // can.
  if (isRuleType(rule, globalThis.CSSSupportsRule, CSSRule.SUPPORTS_RULE)) {
    const condition = getConditionText(rule);
    return !condition || supports(condition, document);
  }

  // `@layer` and any other grouping rule apply unconditionally; only their
  // contents are still subject to their own nested conditions.
  return true;
}

/** Whether an `@import` rule's own `media`/`supports` conditions apply. */
export function isActiveImport(rule: CSSImportRule, document: Document) {
  const mediaText = rule.media?.mediaText ?? "";
  if (mediaText && !matchesMedia(mediaText, document)) {
    return false;
  }

  const supportsText =
    "supportsText" in rule && typeof rule.supportsText === "string"
      ? rule.supportsText
      : "";
  return !supportsText || supports(supportsText, document);
}

export function matchesMedia(mediaText: string, document: Document) {
  return document.defaultView?.matchMedia(mediaText).matches ?? true;
}

function supports(condition: string, document: Document) {
  return document.defaultView?.CSS?.supports(condition) ?? true;
}
