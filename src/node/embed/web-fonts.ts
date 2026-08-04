// TODO: cleanup and refactor + then review again

import type { Context } from "@/context";
import { fetchResource, fontToDataUrl } from "@/utils";
import { shouldEmbed, getEmbeddableResource } from "../utils/resources";
import type { Embedder } from "./types";
import { getComputedStyle } from "../utils";

export const embedWebFonts: Embedder<HTMLElement, Promise<void>> = async ({
  clonedNode,
  context,
}) => {
  const cssText =
    context.options.fontEmbedCSS != null
      ? context.options.fontEmbedCSS
      : context.options.skipFonts
        ? null
        : await getWebFontCSS(clonedNode, context);

  if (cssText) {
    const styleNode = document.createElement("style");
    const sytleContent = document.createTextNode(cssText);

    styleNode.appendChild(sytleContent);

    if (clonedNode.firstChild) {
      clonedNode.insertBefore(styleNode, clonedNode.firstChild);
    } else {
      clonedNode.appendChild(styleNode);
    }
  }
};

type Metadata = {
  url: string;
  cssText: string;
};

const PROPERTY_FONT_FAMILY = "font-family";

async function fetchCSS(url: string, context: Context) {
  const response = await fetchResource(url, undefined, context);
  return { url, cssText: response.asString() };
}

async function embedFonts(data: Metadata, context: Context): Promise<string> {
  let cssText = data.cssText;
  const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
  const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
  const loadFonts = fontLocs.map(async (loc: string) => {
    let url = loc.replace(regexUrl, "$1");
    if (!url.startsWith("https://")) {
      url = new URL(url, data.url).href;
    }

    const { dataUrl } = await fontToDataUrl(url, undefined, context);
    cssText = cssText.replace(loc, dataUrl);
    return [loc, dataUrl];
  });

  return Promise.all(loadFonts).then(() => cssText);
}

function parseCSS(source: string) {
  if (source == null) {
    return [];
  }

  const result: string[] = [];
  const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
  // strip out comments
  let cssText = source.replace(commentsRegex, "");

  const keyframesRegex = new RegExp(
    "((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})",
    "gi",
  );

  while (true) {
    const matches = keyframesRegex.exec(cssText);
    if (matches === null) {
      break;
    }
    result.push(matches[0]);
  }
  cssText = cssText.replace(keyframesRegex, "");

  const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
  // to match css & media queries together
  const combinedCSSRegex =
    "((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]" +
    "*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})";
  // unified regex
  const unifiedRegex = new RegExp(combinedCSSRegex, "gi");

  while (true) {
    let matches = importRegex.exec(cssText);
    if (matches === null) {
      matches = unifiedRegex.exec(cssText);
      if (matches === null) {
        break;
      } else {
        importRegex.lastIndex = unifiedRegex.lastIndex;
      }
    } else {
      unifiedRegex.lastIndex = importRegex.lastIndex;
    }
    result.push(matches[0]);
  }

  return result;
}

async function getCSSRules(
  styleSheets: StyleSheetList,
  context: Context,
): Promise<CSSStyleRule[]> {
  const ret: CSSStyleRule[] = [];
  const deferreds: Promise<number | void>[] = [];
  let sheetWithNullHref: CSSStyleSheet | null = null;
  // First loop inlines imports
  for (let i = 0; i < styleSheets.length; i++) {
    const sheet = styleSheets[i];
    if (sheet.href === null && !sheetWithNullHref) {
      sheetWithNullHref = sheet;
    }
    if (!("cssRules" in sheet)) {
      continue;
    }
    try {
      for (let y = 0; y < sheet.cssRules.length; y++) {
        const rule = sheet.cssRules[y];
        // TODO: fix deprecated usage, but keep it for backward compatibility.
        // meaning use new thing if it exists otherwise fallback to this deprecated thing
        if (rule.type !== CSSRule.IMPORT_RULE) {
          continue;
        }
        let importIndex = y + 1;
        const url = (rule as CSSImportRule).href;
        const deferred = fetchCSS(url, context)
          .then((metadata) => embedFonts(metadata, context))
          .then((cssText) =>
            parseCSS(cssText).forEach((rule) => {
              try {
                sheet.insertRule(
                  rule,
                  rule.startsWith("@import")
                    ? (importIndex += 1)
                    : sheet.cssRules.length,
                );
              } catch (error) {
                console.error("Error inserting rule from remote css", {
                  rule,
                  error,
                });
              }
            }),
          )
          .catch((e) => {
            console.error("Error loading remote css", e.toString());
          });

        deferreds.push(deferred);
      }
    } catch (e) {
      const inline = sheetWithNullHref || document.styleSheets[0];
      if (sheet.href != null) {
        deferreds.push(
          fetchCSS(sheet.href, context)
            .then((metadata) => embedFonts(metadata, context))
            .then((cssText) =>
              parseCSS(cssText).forEach((rule) => {
                inline.insertRule(rule, inline.cssRules.length);
              }),
            )
            .catch((err: unknown) => {
              console.error("Error loading remote stylesheet", err);
            }),
        );
      }
      console.error("Error inlining remote css file", e);
    }
  }

  return Promise.all(deferreds).then(() => {
    // Second loop parses rules
    for (let i = 0; i < styleSheets.length; i++) {
      const sheet = styleSheets[i];
      if (!("cssRules" in sheet)) {
        continue;
      }
      try {
        for (let y = 0; y < sheet.cssRules.length; y++) {
          ret.push(sheet.cssRules[y] as CSSStyleRule);
        }
      } catch (e) {
        console.error(`Error while reading CSS rules from ${sheet.href}`, e);
      }
    }

    return ret;
  });
}

function getWebFontRules(cssRules: CSSStyleRule[]): CSSStyleRule[] {
  return cssRules
    .filter(
      (rule) =>
        rule.type === CSSRule.FONT_FACE_RULE ||
        rule.constructor.name === CSSFontFaceRule.name ||
        rule instanceof CSSFontFaceRule,
    )
    .filter((rule) => shouldEmbed(rule.style.getPropertyValue("src")));
}

async function parseWebFontRules<T extends HTMLElement>(
  node: T,
  context: Context,
) {
  if (node.ownerDocument == null) {
    throw new Error("Provided element is not within a Document");
  }

  const cssRules = await getCSSRules(node.ownerDocument.styleSheets, context);

  return getWebFontRules(cssRules);
}

function normalizeFontFamily(font: string) {
  return font.trim().replace(/["']/g, "");
}

function getUsedFonts(node: HTMLElement) {
  const fonts = new Set<string>();
  function traverse(node: HTMLElement) {
    const fontFamily =
      node.style.getPropertyValue(PROPERTY_FONT_FAMILY) ||
      getComputedStyle(node).getPropertyValue(PROPERTY_FONT_FAMILY) ||
      node.style.fontFamily;
    fontFamily.split(",").forEach((font) => {
      fonts.add(normalizeFontFamily(font));
    });

    Array.from(node.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        traverse(child);
      }
    });
  }
  traverse(node);
  return fonts;
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  context: Context,
): Promise<string> {
  const rules = await parseWebFontRules(node, context);
  const usedFonts = getUsedFonts(node);
  const cssTexts = await Promise.all(
    rules
      .filter((rule) =>
        usedFonts.has(
          normalizeFontFamily(
            rule.style.getPropertyValue(PROPERTY_FONT_FAMILY),
          ),
        ),
      )
      .map((rule) => {
        const baseUrl = rule.parentStyleSheet
          ? rule.parentStyleSheet.href
          : null;
        return getEmbeddableResource(
          rule.cssText,
          baseUrl ?? undefined,
          undefined,
          context,
        );
      }),
  );

  return cssTexts.join("\n");
}
