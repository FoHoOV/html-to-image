import { fetchResource } from './fetch'
import { Options } from './types'

export function isDataUrl(url: string) {
  return url.search(/^(data:)/) !== -1
}

export function makeDataUrl(content: string, mimeType: string) {
  return `data:${mimeType};base64,${content}`
}

export async function imageToDataUrl(
  resourceUrl: string,
  forcedContentType: string | undefined,
  options: Options,
) {
  try {
    const response = await fetchResource(
      resourceUrl,
      forcedContentType,
      options,
    )
    return response.asDataUrl()
  } catch (error) {
    console.warn('Failed to convert image to a data URL', error)
    return options.imagePlaceholder || ''
  }
}

export async function fontToDataUrl(
  resourceUrl: string,
  forcedContentType: string | undefined,
  options: Options,
) {
  const response = await fetchResource(resourceUrl, forcedContentType, options)
  return `url(${await response.asDataUrl()})`
}
