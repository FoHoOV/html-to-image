/**
 * Read-only CSSOM access shared by the collector and the condition reader.
 * Nothing here mutates a source stylesheet or document.
 */

/**
 * Parses CSS text into rules using a throwaway document, so the source document
 * is never given a temporary stylesheet. The rules stay valid while the caller
 * walks them, including across awaits for nested imports.
 */
export function parseCSS(
  cssText: string,
  baseUrl: string,
  sourceDocument: Document,
) {
  const parserDocument = sourceDocument.implementation.createHTMLDocument();
  const base = parserDocument.createElement("base");
  base.href = baseUrl;
  const style = parserDocument.createElement("style");
  style.textContent = cssText;
  parserDocument.head.append(base, style);
  return style.sheet?.cssRules;
}

export function isFontFaceRule(rule: CSSRule): rule is CSSFontFaceRule {
  return isRuleType(rule, globalThis.CSSFontFaceRule, CSSRule.FONT_FACE_RULE);
}

export function isImportRule(rule: CSSRule): rule is CSSImportRule {
  return isRuleType(rule, globalThis.CSSImportRule, CSSRule.IMPORT_RULE);
}

export function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
  return "cssRules" in rule;
}

/**
 * Identifies a rule's type without leaning on the deprecated numeric `type`
 * code as the primary check: `instanceof` against the given constructor, then
 * a same-name walk up the prototype chain for a rule from another realm — an
 * iframe's own `CSSSupportsRule`, say, is not this realm's constructor, so a
 * plain `instanceof` never matches it. The numeric code is only the last
 * resort, for an engine where the constructor itself isn't exposed globally.
 */
export function isRuleType<T extends CSSRule>(
  rule: CSSRule,
  ctor: (new () => T) | undefined,
  legacyType: number,
): rule is T {
  if (ctor) {
    if (rule instanceof ctor) {
      return true;
    }
    for (
      let prototype = Object.getPrototypeOf(rule) as object | null;
      prototype;
      prototype = Object.getPrototypeOf(prototype) as object | null
    ) {
      if (prototype.constructor.name === ctor.name) {
        return true;
      }
    }
  }
  return rule.type === legacyType;
}

export function isCSSStyleSheet(sheet: StyleSheet): sheet is CSSStyleSheet {
  return "cssRules" in sheet;
}

export function getConditionText(rule: CSSRule) {
  return "conditionText" in rule && typeof rule.conditionText === "string"
    ? rule.conditionText
    : "";
}

export function getStyleSheetMedia(sheet: StyleSheet) {
  return getMediaText("media" in sheet ? sheet.media : null) ?? "";
}

export function getMediaText(media: unknown) {
  return typeof media === "object" &&
    media != null &&
    "mediaText" in media &&
    typeof media.mediaText === "string"
    ? media.mediaText
    : null;
}
