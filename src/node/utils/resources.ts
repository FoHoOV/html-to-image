import type { Context } from "@/context";
import { fetchResource, getMimeType, isDataUrl, resolveUrl } from "@/utils";

// Built per scan rather than shared: a `/g` regex carries `lastIndex` between
// calls, which would make two callers corrupt each other's iteration.
const URL_PATTERN = /url\((['"]?)([^'"]+?)\1\)/;

function createUrlMatcher() {
  return new RegExp(URL_PATTERN.source, "g");
}

/** One `url(...)` argument, located so it can be replaced without rescanning. */
type URLToken = {
  end: number;
  start: number;
  url: string;
};

export type EmbeddableResourceResult = {
  cssText: string;
  /**
   * At least one resource could not be embedded and no placeholder stood in
   * for it, so the value references something the output cannot reach.
   */
  failed: boolean;
};

export function shouldEmbed(cssValue: string): boolean {
  return URL_PATTERN.test(cssValue);
}

/**
 * Replaces every non-data `url(...)` in a CSS value with an inlined data URL.
 * Resources load concurrently and are written back by position, so one slow or
 * failing resource cannot reorder the value.
 */
export async function getEmbeddableResource(
  cssValue: string,
  baseUrl: string | undefined,
  placeHolder: string | undefined,
  context: Context,
): Promise<EmbeddableResourceResult> {
  const tokens = getURLTokens(cssValue);
  if (tokens.length === 0) {
    return { cssText: cssValue, failed: false };
  }

  const urls = new Set<string>();
  for (const token of tokens) {
    urls.add(token.url);
  }

  const replacements = new Map<string, string>();
  const pending: Array<Promise<boolean>> = [];
  for (const url of urls) {
    pending.push(
      loadReplacement(url, baseUrl, placeHolder, replacements, context),
    );
  }
  const failed = (await Promise.all(pending)).some(Boolean);

  return { cssText: applyReplacements(cssValue, tokens, replacements), failed };
}

/** Resolves to `true` when the resource could not be embedded or replaced. */
async function loadReplacement(
  url: string,
  baseUrl: string | undefined,
  placeHolder: string | undefined,
  replacements: Map<string, string>,
  context: Context,
) {
  try {
    replacements.set(url, await loadResource(url, baseUrl, context));
    return false;
  } catch (error) {
    console.warn("cannot convert resource to dataurl", error);
    replacements.set(url, placeHolder ?? "");
    return !placeHolder;
  }
}

function applyReplacements(
  cssText: string,
  tokens: ReadonlyArray<URLToken>,
  replacements: ReadonlyMap<string, string>,
) {
  const parts: string[] = [];
  let cursor = 0;
  for (const token of tokens) {
    parts.push(
      cssText.slice(cursor, token.start),
      replacements.get(token.url) ?? token.url,
    );
    cursor = token.end;
  }
  parts.push(cssText.slice(cursor));
  return parts.join("");
}

function getURLTokens(cssText: string) {
  const tokens: URLToken[] = [];
  const matcher = createUrlMatcher();

  while (true) {
    const match = matcher.exec(cssText);
    if (!match) {
      break;
    }
    const url = match[2];
    if (!isDataUrl(url)) {
      // `url(` plus the opening quote, if any.
      const start = match.index + 4 + match[1].length;
      tokens.push({ end: start + url.length, start, url });
    }
  }

  return tokens;
}

async function loadResource(
  resourceUrl: string,
  baseUrl: string | undefined,
  context: Context,
) {
  const resolvedURL = baseUrl ? resolveUrl(resourceUrl, baseUrl) : resourceUrl;
  const contentType = getMimeType(resourceUrl);
  const response = await fetchResource(resolvedURL, contentType, context);
  return response.asDataUrl();
}
