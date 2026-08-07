import type { WebFontSource, WebFontWrapper } from "@/cache";
import type { Context } from "@/context";
import { shouldEmbed } from "@/node/utils";
import { fetchResource, resolveUrl } from "@/utils";
import { BlockReader } from "./blocks";
import {
  getInlineStyleText,
  getStyleSheetMedia,
  isCSSStyleSheet,
  isFontFaceRule,
  isGroupingRule,
  isImportRule,
  parseCSS,
} from "./cssom";
import { normalizeFontFamily } from "./font-family";

/**
 * Where a stylesheet sits: its base URL and the blocks enclosing it. Only
 * currently-applying sheets are ever walked, so a frame is always active.
 */
type SheetFrame = {
  baseUrl: string;
  wrappers: WebFontWrapper[];
};

type RuleFrame = SheetFrame & {
  /**
   * Rules parsed from text rather than read from live CSSOM. Their `@import`
   * rules have no `styleSheet`, so the imported sheet must be fetched.
   */
  fetchImports: boolean;
};

export type FontFaceCollection = {
  /**
   * Every stylesheet was readable. Only then does a family's absence prove it
   * is undefined here, which is what makes a negative result cacheable.
   */
  complete: boolean;
  sourcesByFamily: Map<string, WebFontSource[]>;
};

/**
 * Finds the `@font-face` rules a document declares for the wanted families,
 * walking stylesheets, imports, and grouping rules read-only and following
 * cross-origin sheets by refetching their text.
 */
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

class FontFaceCollector {
  private readonly blocks: BlockReader;
  private readonly sourcesByFamily = new Map<string, WebFontSource[]>();
  /** Stylesheet URLs on the current path, so `@import` cycles terminate. */
  private readonly activeUrls = new Set<string>();
  private readonly seenUrls = new Set<string>();
  private readonly seenSheets = new Set<StyleSheet>();
  private complete = true;

  constructor(
    private readonly document: Document,
    private readonly wantedFamilies: Set<string>,
    private readonly context: Context,
  ) {
    this.blocks = new BlockReader(document);
  }

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
    // consume a wrapper id on its way to being skipped.
    if (sheet.disabled) {
      return;
    }

    const mediaText = getStyleSheetMedia(sheet);
    if (mediaText && !this.blocks.matchesMedia(mediaText)) {
      return;
    }

    await this.collectSheet(sheet, {
      baseUrl: this.document.baseURI,
      wrappers: mediaText ? [this.blocks.createMediaWrapper(mediaText)] : [],
    });
  }

  private async collectSheet(sheet: StyleSheet, frame: SheetFrame) {
    if (sheet.disabled) {
      return;
    }

    if (this.seenSheets.has(sheet)) {
      return;
    }
    this.seenSheets.add(sheet);

    const sheetUrl = sheet.href
      ? resolveUrl(sheet.href, frame.baseUrl)
      : undefined;
    const baseUrl = sheetUrl ?? frame.baseUrl;

    if (
      sheetUrl &&
      (this.activeUrls.has(sheetUrl) || this.seenUrls.has(sheetUrl))
    ) {
      return;
    }

    // Cross-origin: the rules are unreadable, so the text is refetched instead.
    if (!isCSSStyleSheet(sheet)) {
      if (sheetUrl) {
        await this.collectSheetByUrl(sheetUrl, frame.wrappers);
      } else {
        this.complete = false;
      }
      return;
    }

    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch (error) {
      if (sheetUrl) {
        await this.collectSheetByUrl(sheetUrl, frame.wrappers);
      } else {
        await this.collectUnreadableInlineSheet(sheet, frame, error);
      }
      return;
    }

    // Only URL-addressed sheets take part in cycle detection. An inline sheet
    // would otherwise register the document's own base URI as in flight.
    if (sheetUrl) {
      this.activeUrls.add(sheetUrl);
    }
    try {
      await this.collectRules(rules, {
        ...frame,
        baseUrl,
        fetchImports: false,
      });
      if (sheetUrl) {
        this.seenUrls.add(sheetUrl);
      }
    } finally {
      if (sheetUrl) {
        this.activeUrls.delete(sheetUrl);
      }
    }
  }

  /** A same-origin `<style>` whose rules cannot be read, but whose text can. */
  private async collectUnreadableInlineSheet(
    sheet: StyleSheet,
    frame: SheetFrame,
    error: unknown,
  ) {
    const inlineCSS = getInlineStyleText(sheet);
    if (!inlineCSS) {
      this.complete = false;
      console.error("Error while reading inline stylesheet", error);
      return;
    }

    try {
      if (!(await this.collectParsedSheet(inlineCSS, frame))) {
        this.complete = false;
      }
    } catch (parseError) {
      this.complete = false;
      console.error("Error while parsing inline stylesheet", parseError);
    }
  }

  private async collectRules(rules: CSSRuleList, frame: RuleFrame) {
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index];

      if (isFontFaceRule(rule)) {
        this.collectFontFace(rule, frame);
        continue;
      }
      if (isImportRule(rule)) {
        await this.collectImport(rule, frame);
        continue;
      }
      if (isGroupingRule(rule)) {
        const group = this.blocks.getGroupingWrapper(rule);
        if (group?.active) {
          await this.collectRules(rule.cssRules, {
            ...frame,
            wrappers: [...frame.wrappers, group.wrapper],
          });
        }
      }
    }
  }

  private collectFontFace(rule: CSSFontFaceRule, frame: RuleFrame) {
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
      baseUrl: rule.parentStyleSheet?.href ?? frame.baseUrl,
      cssText: rule.cssText,
      wrappers: frame.wrappers,
    });
  }

  private async collectImport(rule: CSSImportRule, frame: RuleFrame) {
    const imported = this.blocks.getImportWrappers(rule);
    if (!imported.active) {
      return;
    }

    const importUrl = resolveUrl(rule.href, frame.baseUrl);
    const wrappers = [...frame.wrappers, ...imported.wrappers];

    // A live imported sheet is walked directly; only one reached from parsed
    // text has no `styleSheet` and has to be refetched.
    if (!frame.fetchImports && rule.styleSheet) {
      await this.collectSheet(rule.styleSheet, {
        baseUrl: importUrl,
        wrappers,
      });
      return;
    }

    await this.collectSheetByUrl(importUrl, wrappers);
  }

  /** Fetches a stylesheet's text and walks it. Deduplicated and cycle-safe. */
  private async collectSheetByUrl(url: string, wrappers: WebFontWrapper[]) {
    if (this.seenUrls.has(url) || this.activeUrls.has(url)) {
      return;
    }

    this.seenUrls.add(url);
    this.activeUrls.add(url);
    try {
      const response = await fetchResource(url, undefined, this.context);
      const parsed = await this.collectParsedSheet(response.asString(), {
        baseUrl: url,
        wrappers,
      });
      if (!parsed) {
        throw new Error("Could not parse stylesheet");
      }
    } catch (error) {
      this.complete = false;
      console.error(`Error loading remote stylesheet ${url}`, error);
    } finally {
      this.activeUrls.delete(url);
    }
  }

  private async collectParsedSheet(cssText: string, frame: SheetFrame) {
    const rules = parseCSS(cssText, frame.baseUrl, this.document);
    if (!rules) {
      return false;
    }

    await this.collectRules(rules, { ...frame, fetchImports: true });
    return true;
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
