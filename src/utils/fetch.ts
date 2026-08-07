import type { Context } from "@/context";
import type { Resource } from "@/cache";

export async function fetchResource(
  url: string,
  forcedContentType: string | undefined,
  context: Context,
) {
  let requestUrl = url;
  if (context.options.cacheBust) {
    requestUrl += `${/\?/.test(requestUrl) ? "&" : "?"}${Date.now()}`;
  }
  const cacheUrl =
    context.options.includeQueryParams === false
      ? requestUrl.replace(/\?.*/, "")
      : requestUrl;
  const cacheKey = cacheUrl + forcedContentType;

  if (context.options.cacheBust) {
    return makeRequest(requestUrl, forcedContentType, context);
  }

  return context.options.cache.fetchCache.load(cacheKey, () =>
    makeRequest(requestUrl, forcedContentType, context),
  );
}

async function makeRequest(
  requestUrl: string,
  forcedContentType: string | undefined,
  { options }: Context,
): Promise<Resource> {
  const res = await fetch(requestUrl, options.fetchRequestInit);

  if (!res.ok) {
    throw new Error(
      `cannot fetch(${res.status} ${res.statusText}): "${res.url}"`,
    );
  }

  const response = await res.arrayBuffer();
  const contentType =
    forcedContentType || res.headers.get("Content-Type") || "";

  return {
    asDataUrl: createAsDataUrl(response, contentType),
    asString: createAsString(response),
    contentType,
  };
}

function createAsString(response: ArrayBuffer) {
  let cachedEncoding: string | undefined = undefined;
  let cachedResult: string | undefined = undefined;

  return (encoding = "utf-8") => {
    if (cachedEncoding === encoding && cachedResult) {
      return cachedResult;
    }
    const result = new TextDecoder(encoding).decode(response);
    cachedEncoding = encoding;
    cachedResult = result;
    return result;
  };
}

function createAsDataUrl(response: ArrayBuffer, contentType: string) {
  // Holds the pending read while it runs and the string once it settles, so
  // concurrent callers share one read. A failed read is released to be retried.
  let result: string | Promise<string> | undefined = undefined;

  return () => {
    if (result === undefined) {
      result = readAsDataUrl(response, contentType).then(
        (dataUrl) => (result = dataUrl),
        (error: unknown) => {
          result = undefined;
          throw error;
        },
      );
    }
    return result;
  };
}

function readAsDataUrl(response: ArrayBuffer, contentType: string) {
  const blob = new Blob([response], { type: contentType });

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => resolve(reader.result as string);

    reader.readAsDataURL(blob);
  });
}
