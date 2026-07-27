import type { Options } from '@/types'

export async function fetchResource(
  url: string,
  forcedContentType: string | undefined,
  options: Options,
) {
  // TODO: add a lock for each url, requests to same url should await the previously fired request!
  // the request should be able to be retried based on Options.fetchRetryCount or something

  let requestUrl = url
  if (options.cacheBust) {
    requestUrl += `${/\?/.test(requestUrl) ? '&' : '?'}${Date.now()}`
  }
  const cacheUrl =
    options.includeQueryParams === false
      ? requestUrl.replace(/\?.*/, '')
      : requestUrl
  const cacheKey = cacheUrl + forcedContentType

  if (!options.cacheBust && options.cache?.has(cacheKey)) {
    return options.cache.get(cacheKey)!
  }

  const res = await fetch(requestUrl, options.fetchRequestInit)

  if (!res.ok) {
    throw new Error(
      `cannot fetch(${res.status} ${res.statusText}): "${res.url}"`,
    )
  }

  const response = await res.arrayBuffer()
  const contentType = forcedContentType || res.headers.get('Content-Type') || ''

  function createAsString() {
    let cachedEncoding: string | undefined = undefined
    let cachedResult: string | undefined = undefined

    return (encoding = 'utf-8') => {
      if (cachedEncoding === encoding && cachedResult) {
        return cachedResult
      }
      const result = new TextDecoder(encoding).decode(response)
      cachedEncoding = encoding
      cachedResult = result
      return result
    }
  }

  function createAsDataUrl() {
    let cachedResult: string | undefined = undefined
    return () => {
      if (cachedResult) {
        return cachedResult
      }
      const blob = new Blob([response], { type: contentType })

      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.onerror = () => reject(reader.error)
        reader.onloadend = () => {
          cachedResult = reader.result as string
          resolve(reader.result as string)
        }

        reader.readAsDataURL(blob)
      })
    }
  }

  const result = {
    asDataUrl: createAsDataUrl(),
    asString: createAsString(),
    contentType,
  }

  if (!options.cacheBust) {
    options.cache?.add(cacheKey, result)
  }

  return result
}
