import type { WebFontSource } from "@/cache";
import type { Context } from "@/context";
import { getEmbeddableResource, shouldEmbed } from "@/node/utils";

const URL_WITH_FORMAT_PATTERN = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/;
const FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;

/**
 * Inlines every source's resources concurrently, then joins the results back
 * in discovery order. Each face is embedded bare: the block it was found in
 * was already evaluated as active against the live page in this same engine,
 * so replaying that condition around the output would only ask a question
 * already answered.
 */
export async function embedFontSources(
  sources: ReadonlyArray<WebFontSource>,
  context: Context,
) {
  const pending: Array<Promise<string | null>> = [];
  for (const source of sources) {
    pending.push(embedFontSource(source, context));
  }
  const cssTexts = await Promise.all(pending);
  return cssTexts.filter((cssText): cssText is string => !!cssText).join("\n");
}

/** Prepends the one generated font style element for an output tree. */
export function addFontStyleNode(element: Element, cssTexts: Iterable<string>) {
  const parts: string[] = [];
  for (const cssText of cssTexts) {
    if (cssText) {
      parts.push(cssText);
    }
  }
  if (parts.length === 0) {
    return;
  }

  const document = element.ownerDocument;
  const styleNode = document.createElement("style");
  styleNode.appendChild(document.createTextNode(parts.join("\n")));
  element.insertBefore(styleNode, element.firstChild);
}

async function embedFontSource(source: WebFontSource, context: Context) {
  const cssText = filterPreferredFontFormat(
    source.cssText,
    context.options.preferredFontFormat,
  );

  // The preferred-format filter can drop every `src:` entry. The face is then
  // unusable rather than merely unembeddable, so the family falls through to
  // another candidate.
  if (shouldEmbed(source.cssText) && !shouldEmbed(cssText)) {
    return null;
  }

  const result = await getEmbeddableResource(
    cssText,
    source.baseUrl,
    undefined,
    context,
  );
  return result.failed ? null : result.cssText;
}

/** Keeps only the `src:` entries declaring the caller's preferred format. */
function filterPreferredFontFormat(
  cssText: string,
  preferredFormat: string | undefined,
) {
  if (!preferredFormat) {
    return cssText;
  }

  return cssText.replace(FONT_SRC_REGEX, (match) => {
    // Built per match: a shared `/g` regex would carry `lastIndex` across the
    // `src:` declarations this callback walks.
    const matcher = new RegExp(URL_WITH_FORMAT_PATTERN.source, "g");
    while (true) {
      const [src, , format] = matcher.exec(match) ?? [];
      if (!format) {
        return "";
      }
      if (format === preferredFormat) {
        return `src: ${src};`;
      }
    }
  });
}
