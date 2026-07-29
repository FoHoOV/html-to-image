import type { Options } from '@/types'

type Resource = {
  contentType: string
  asString: (encoding?: string) => string
  asDataUrl: () => string | Promise<string>
}

const pendingRequests = new Map<string, Promise<Resource>>()

export async function fetchResource(
  url: string,
  forcedContentType: string | undefined,
  options: Options,
) {
  let requestUrl = url
  if (options.cacheBust) {
    requestUrl += `${/\?/.test(requestUrl) ? '&' : '?'}${Date.now()}`
  }
  const cacheUrl =
    options.includeQueryParams === false
      ? requestUrl.replace(/\?.*/, '')
      : requestUrl
  const cacheKey = cacheUrl + forcedContentType

  if (options.cacheBust) {
    return requestResource(requestUrl, forcedContentType, options)
  }

  const cachedResource = options.cache?.get(cacheKey)
  if (cachedResource) {
    return cachedResource
  }

  let request = pendingRequests.get(cacheKey)
  if (!request) {
    request = requestResource(requestUrl, forcedContentType, options)
    pendingRequests.set(cacheKey, request)
  }

  try {
    const resource = await request
    options.cache?.add(cacheKey, resource)
    return resource
  } finally {
    if (pendingRequests.get(cacheKey) === request) {
      pendingRequests.delete(cacheKey)
    }
  }
}

async function requestResource(
  requestUrl: string,
  forcedContentType: string | undefined,
  options: Options,
): Promise<Resource> {
  const res = await fetch(requestUrl, options.fetchRequestInit)

  if (!res.ok) {
    throw new Error(
      `cannot fetch(${res.status} ${res.statusText}): "${res.url}"`,
    )
  }

  const response = await res.arrayBuffer()
  const contentType = forcedContentType || res.headers.get('Content-Type') || ''

  return {
    asDataUrl: createAsDataUrl(response, contentType),
    asString: createAsString(response),
    contentType,
  }
}

function createAsString(response: ArrayBuffer) {
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

function createAsDataUrl(response: ArrayBuffer, contentType: string) {
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
