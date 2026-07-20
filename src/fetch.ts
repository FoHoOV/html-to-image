import type { CacheValue } from './cache'
import type { Options } from './types'

function getCacheKey(
  url: string,
  contentType: string | undefined,
  includeQueryParams: boolean | undefined,
) {
  const key = includeQueryParams ? url : url.replace(/\?.*/, '')
  return contentType ? `[${contentType}]${key}` : key
}

function asDataUrl({ response, contentType }: CacheValue) {
  const blob = new Blob([response], { type: contentType })

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(reader.error)
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

function createResource(value: CacheValue) {
  return {
    contentType: value.contentType,
    asString: (encoding = 'utf-8') =>
      new TextDecoder(encoding).decode(value.response),
    asDataUrl: () => asDataUrl(value),
  }
}

export async function fetchResource(
  url: string,
  forcedContentType: string | undefined,
  options: Options,
) {
  const cacheKey = getCacheKey(
    url,
    forcedContentType,
    options.includeQueryParams,
  )

  if (!options.cacheBust) {
    const cached = options.cache?.get(cacheKey)
    if (cached) {
      return createResource(cached)
    }
  }

  const requestUrl = options.cacheBust
    ? `${url}${/\?/.test(url) ? '&' : '?'}${Date.now()}`
    : url
  const res = await fetch(requestUrl, options.fetchRequestInit)

  if (!res.ok) {
    throw new Error(
      `cannot fetch(${res.status} ${res.statusText}): "${res.url}"`,
    )
  }

  const value: CacheValue = {
    response: await res.arrayBuffer(),
    contentType: forcedContentType || res.headers.get('Content-Type') || '',
  }

  if (!options.cacheBust) {
    options.cache?.add(cacheKey, value)
  }

  return createResource(value)
}
