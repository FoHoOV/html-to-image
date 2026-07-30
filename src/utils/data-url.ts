import { fetchResource } from "./fetch";
import { Context } from "@/context";

export function isDataUrl(url: string) {
  return url.search(/^(data:)/) !== -1;
}

export function makeDataUrl(content: string, mimeType: string) {
  return `data:${mimeType};base64,${content}`;
}

export function nodeToDataUrl(node: Node) {
  const serialized = new XMLSerializer().serializeToString(node);
  const encoded = encodeURIComponent(serialized);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export async function resourceToDataUrl(
  resourceUrl: string,
  forcedContentType: string | undefined,
  context: Context,
) {
  try {
    const response = await fetchResource(
      resourceUrl,
      forcedContentType,
      context,
    );
    return makeDataUrl(
      getContentFromDataUrl(await response.asDataUrl()),
      response.contentType,
    );
  } catch (error) {
    console.warn("cannot convert image to dataurl", error);
    return context.options.imagePlaceholder || "";
  }
}

export async function fontToDataUrl(
  resourceUrl: string,
  forcedContentType: string | undefined,
  context: Context,
) {
  const response = await fetchResource(resourceUrl, forcedContentType, context);
  const dataUrl = makeDataUrl(
    getContentFromDataUrl(await response.asDataUrl()),
    response.contentType,
  );
  return {
    resourceUrl,
    dataUrl: `url(${dataUrl})`,
  };
}

function getContentFromDataUrl(dataURL: string) {
  return dataURL.split(/,/)[1];
}
