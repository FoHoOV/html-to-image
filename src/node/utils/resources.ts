// TODO: review

import { getMimeType } from "../../utils/mimes";
import {
  isDataUrl,
  makeDataUrl,
  resourceToDataUrl,
} from "../../utils/data-url";
import type { Context } from "@/context";

const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
const URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
const FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;

function toRegex(url: string): RegExp {
  // eslint-disable-next-line no-useless-escape
  const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, "g");
}

export function parseURLs(cssText: string): string[] {
  const urls: string[] = [];

  cssText.replace(URL_REGEX, (raw, _quotation, url) => {
    urls.push(url);
    return raw;
  });

  return urls.filter((url) => !isDataUrl(url));
}

function resolveUrl(url: string, baseUrl: string | null): string {
  // url is absolute already
  if (url.match(/^[a-z]+:\/\//i)) {
    return url;
  }

  // url is absolute already, without protocol
  if (url.match(/^\/\//)) {
    return window.location.protocol + url;
  }

  // dataURI, mailto:, tel:, etc.
  if (url.match(/^[a-z]+:/i)) {
    return url;
  }

  const doc = document.implementation.createHTMLDocument();
  const base = doc.createElement("base");
  const a = doc.createElement("a");

  doc.head.appendChild(base);
  doc.body.appendChild(a);

  if (baseUrl) {
    base.href = baseUrl;
  }

  a.href = url;

  return a.href;
}

export async function embed(
  cssText: string,
  resourceURL: string,
  baseURL: string | null,
  context: Context,
  getContentFromUrl?: (url: string) => Promise<string>,
): Promise<string> {
  try {
    const resolvedURL = baseURL
      ? resolveUrl(resourceURL, baseURL)
      : resourceURL;
    const contentType = getMimeType(resourceURL);
    let dataURL: string;
    if (getContentFromUrl) {
      const content = await getContentFromUrl(resolvedURL);
      dataURL = makeDataUrl(content, contentType);
    } else {
      dataURL = await resourceToDataUrl(resolvedURL, contentType, context);
    }
    return cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`);
  } catch (_error) {
    // pass
  }
  return cssText;
}

function filterPreferredFontFormat(str: string, { options }: Context): string {
  return !options.preferredFontFormat
    ? str
    : str.replace(FONT_SRC_REGEX, (match: string) => {
        while (true) {
          const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || [];
          if (!format) {
            return "";
          }

          if (format === options.preferredFontFormat) {
            return `src: ${src};`;
          }
        }
      });
}

export function shouldEmbed(url: string): boolean {
  return url.search(URL_REGEX) !== -1;
}

export async function embedResources(
  cssText: string,
  baseUrl: string | null,
  context: Context,
): Promise<string> {
  if (!shouldEmbed(cssText)) {
    return cssText;
  }

  const filteredCSSText = filterPreferredFontFormat(cssText, context);
  const urls = parseURLs(filteredCSSText);
  return urls.reduce(
    (deferred, url) =>
      deferred.then((css) => embed(css, url, baseUrl, context)),
    Promise.resolve(filteredCSSText),
  );
}
