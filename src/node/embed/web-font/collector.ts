import type { WebFontSource } from "@/cache";
import type { Context } from "@/context";
import { shouldEmbed } from "@/node/utils";
import { fetchResource, resolveUrl } from "@/utils";
import { isActiveGroup, isActiveImport, matchesMedia } from "./blocks";
import {
  getStyleSheetMedia,
  isCSSStyleSheet,
  isFontFaceRule,
  isGroupingRule,
  isImportRule,
  parseCSS,
} from "./cssom";
import { normalizeFontFamily } from "./font-family";

export type FontFaceCollection = {
  /**
   * Every stylesheet was readable. Only then does a family's absence prove it
   * is undefined here, which is what makes a negative result cacheable.
   */
  complete: boolean;
  sourcesByFamily: Map<string, WebFontSource[]>;
};

export function collectDocumentFontFaces(
  sourceDocument: Document,
  wantedFamilies: Set<string>,
  context: Context,
): Promise<FontFaceCollection> {
  return new FontFaceCollector(
    sourceDocument,
    wantedFamilies,
    context,
  ).collect();
}

export class FontFaceCollector {
  private readonly sourcesByFamily = new Map<string, WebFontSource[]>();
  /** Stylesheet URLs already walked or currently being walked, so `@import`
   * cycles terminate and no sheet is walked twice. */
  private readonly visitedUrls = new Set<string>();
  private readonly seenSheets = new Set<StyleSheet>();
  private complete = true;

  constructor(
    private readonly document: Document,
    private readonly wantedFamilies: Set<string>,
    private readonly context: Context,
  ) {}

  /**
   * Finds the `@font-face` rules a document declares for the wanted families,
   * walking stylesheets, imports, and grouping rules read-only and following
   * cross-origin sheets by refetching their text.
   */
  async collect(): Promise<FontFaceCollection> {
    const styleSheets = this.document.styleSheets;
    const styleSheetCount = styleSheets.length;

    for (let index = 0; index < styleSheetCount; index += 1) {
      await this.collectDocumentSheet(styleSheets[index]);
    }

    return {
      complete: this.complete,
      sourcesByFamily: this.sourcesByFamily,
    };
  }

  /** A sheet owned by the document, whose own media attribute still applies. */
  private async collectDocumentSheet(sheet: StyleSheet) {
    // Checked here as well as in `collectSheet`, so a disabled sheet does not
    // get marked visited on its way to being skipped.
    if (sheet.disabled) {
      return;
    }

    const mediaText = getStyleSheetMedia(sheet);
    if (mediaText && !matchesMedia(mediaText, this.document)) {
      return;
    }

    await this.collectSheet(sheet, this.document.baseURI);
  }

  private async collectSheet(sheet: StyleSheet, parentBaseUrl: string) {
    if (sheet.disabled) {
      return;
    }

    if (this.seenSheets.has(sheet)) {
      return;
    }
    this.seenSheets.add(sheet);

    const sheetUrl = sheet.href
      ? resolveUrl(sheet.href, parentBaseUrl)
      : undefined;
    const baseUrl = sheetUrl ?? parentBaseUrl;

    if (sheetUrl && this.visitedUrls.has(sheetUrl)) {
      return;
    }

    // Cross-origin: the rules are unreadable, so the text is refetched instead.
    if (!isCSSStyleSheet(sheet)) {
      if (sheetUrl) {
        await this.collectSheetByUrl(sheetUrl);
      } else {
        this.complete = false;
      }
      return;
    }

    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Only a linked stylesheet with a distinct origin can throw here; an
      // inline sheet has no origin of its own to fail that check.
      if (sheetUrl) {
        await this.collectSheetByUrl(sheetUrl);
      }
      return;
    }

    if (sheetUrl) {
      this.visitedUrls.add(sheetUrl);
    }
    await this.collectRules(rules, baseUrl, false);
  }

  /**
   * `fetchImports` marks rules parsed from text rather than read from live
   * CSSOM. Their `@import` rules have no `styleSheet`, so the imported sheet
   * has to be fetched.
   */
  private async collectRules(
    rules: CSSRuleList,
    baseUrl: string,
    fetchImports: boolean,
  ) {
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index];

      if (isFontFaceRule(rule)) {
        this.collectFontFace(rule, baseUrl);
        continue;
      }
      if (isImportRule(rule)) {
        await this.collectImport(rule, baseUrl, fetchImports);
        continue;
      }
      if (isGroupingRule(rule) && isActiveGroup(rule, this.document)) {
        await this.collectRules(rule.cssRules, baseUrl, fetchImports);
      }
    }
  }

  private collectFontFace(rule: CSSFontFaceRule, baseUrl: string) {
    const family = this.getWantedFamily(rule);
    if (!family) {
      return;
    }

    let sources = this.sourcesByFamily.get(family);
    if (!sources) {
      sources = [];
      this.sourcesByFamily.set(family, sources);
    }
    sources.push({
      // The declaring sheet resolves the face's relative font URLs.
      baseUrl: rule.parentStyleSheet?.href ?? baseUrl,
      cssText: rule.cssText,
    });
  }

  private async collectImport(
    rule: CSSImportRule,
    baseUrl: string,
    fetchImports: boolean,
  ) {
    if (!isActiveImport(rule, this.document)) {
      return;
    }

    const importUrl = resolveUrl(rule.href, baseUrl);

    // A live imported sheet is walked directly; only one reached from parsed
    // text has no `styleSheet` and has to be refetched. On WebKit, a sheet
    // parsed into a throwaway document never gets a `styleSheet` either way.
    if (!fetchImports && rule.styleSheet) {
      await this.collectSheet(rule.styleSheet, importUrl);
      return;
    }

    await this.collectSheetByUrl(importUrl);
  }

  /** Fetches a stylesheet's text and walks it. Deduplicated and cycle-safe. */
  private async collectSheetByUrl(url: string) {
    if (this.visitedUrls.has(url)) {
      return;
    }
    this.visitedUrls.add(url);

    try {
      const response = await fetchResource(url, undefined, this.context);
      const rules = parseCSS(response.asString(), url, this.document);
      if (!rules) {
        throw new Error("Could not parse stylesheet");
      }
      await this.collectRules(rules, url, true);
    } catch (error) {
      this.complete = false;
      console.error(`Error loading remote stylesheet ${url}`, error);
    }
  }

  private getWantedFamily(rule: CSSFontFaceRule) {
    const family = normalizeFontFamily(
      rule.style.getPropertyValue("font-family"),
    );
    return family &&
      this.wantedFamilies.has(family) &&
      shouldEmbed(rule.style.getPropertyValue("src"))
      ? family
      : null;
  }
}
