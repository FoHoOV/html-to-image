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
  return rule.type === CSSRule.FONT_FACE_RULE;
}

export function isImportRule(rule: CSSRule): rule is CSSImportRule {
  return rule.type === CSSRule.IMPORT_RULE;
}

export function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
  return "cssRules" in rule;
}

export function isCSSStyleSheet(sheet: StyleSheet): sheet is CSSStyleSheet {
  return "cssRules" in sheet;
}

/**
 * Compares against the rule-type constants of the rule's own realm, since a
 * rule from an iframe does not share this realm's `CSSRule`.
 */
export function isRuleType(
  rule: CSSRule,
  type: string,
  sourceDocument: Document,
) {
  const ruleTypes = sourceDocument.defaultView?.CSSRule as unknown as
    Record<string, number> | undefined;
  return ruleTypes?.[type] === rule.type;
}

export function getConditionText(rule: CSSRule) {
  return "conditionText" in rule && typeof rule.conditionText === "string"
    ? rule.conditionText
    : "";
}

/** The text before a rule's block, for example `@layer base`. */
export function getRulePrelude(cssText: string) {
  const blockStart = cssText.indexOf("{");
  return blockStart === -1 ? "" : cssText.slice(0, blockStart).trim();
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

export function getInlineStyleText(sheet: StyleSheet) {
  const ownerNode = sheet.ownerNode;
  return ownerNode?.nodeName.toLowerCase() === "style"
    ? ownerNode.textContent
    : null;
}
