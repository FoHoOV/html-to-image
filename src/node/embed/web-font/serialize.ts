import type { WebFontSource, WebFontWrapper } from "@/cache";
import type { Context } from "@/context";
import { getEmbeddableResource, shouldEmbed } from "@/node/utils";

const URL_WITH_FORMAT_PATTERN = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/;
const FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;

/**
 * Inlines every source's resources concurrently, then serializes them back in
 * discovery order so enclosing blocks nest the way they did at the source.
 */
export async function embedFontSources(
  sources: ReadonlyArray<WebFontSource>,
  context: Context,
) {
  const pending: Array<Promise<string | null>> = [];
  for (const source of sources) {
    pending.push(embedFontSource(source, context));
  }
  return serializeFontSources(sources, await Promise.all(pending));
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

/**
 * Emits the faces in order, opening each enclosing block once and closing it
 * only when the next face no longer shares it.
 *
 * Contextual blocks are left out. Their condition was already evaluated
 * against the live page when the face was collected, and the exported SVG
 * renders in a different context, so re-emitting them could suppress a face
 * the page is actually using.
 */
function serializeFontSources(
  sources: ReadonlyArray<WebFontSource>,
  cssTexts: ReadonlyArray<string | null>,
) {
  const openWrappers: WebFontWrapper[] = [];
  const parts: string[] = [];
  const nextLine = () => {
    if (parts.length > 0) {
      parts.push("\n");
    }
  };

  for (let index = 0; index < sources.length; index += 1) {
    const cssText = cssTexts[index];
    if (!cssText) {
      continue;
    }

    const wrappers = (sources[index].wrappers ?? []).filter(
      (wrapper) => !wrapper.contextual,
    );
    let sharedWrappers = 0;
    while (
      sharedWrappers < openWrappers.length &&
      sharedWrappers < wrappers.length &&
      openWrappers[sharedWrappers].id === wrappers[sharedWrappers].id
    ) {
      sharedWrappers += 1;
    }

    while (openWrappers.length > sharedWrappers) {
      nextLine();
      parts.push("}");
      openWrappers.pop();
    }
    for (
      let wrapperIndex = sharedWrappers;
      wrapperIndex < wrappers.length;
      wrapperIndex += 1
    ) {
      const wrapper = wrappers[wrapperIndex];
      nextLine();
      parts.push(wrapper.prelude, " {");
      openWrappers.push(wrapper);
    }

    nextLine();
    parts.push(cssText);
  }

  while (openWrappers.length > 0) {
    nextLine();
    parts.push("}");
    openWrappers.pop();
  }

  return parts.join("");
}
