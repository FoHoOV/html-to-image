import { fetchResource } from './fetch'
import { Options } from '@/types'

export function isDataUrl(url: string) {
  return url.search(/^(data:)/) !== -1
}

export function makeDataUrl(content: string, mimeType: string) {
  return `data:${mimeType};base64,${content}`
}

export function nodeToDataUrl(node: Node) {
  const serialized = new XMLSerializer().serializeToString(node)
  const encoded = encodeURIComponent(serialized)
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

export async function resourceToDataUrl(
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
    return makeDataUrl(
      getContentFromDataUrl(await response.asDataUrl()),
      response.contentType,
    )
  } catch (error) {
    console.warn('cannot convert image to dataurl', error)
    return options.imagePlaceholder || ''
  }
}

export async function fontToDataUrl(
  resourceUrl: string,
  forcedContentType: string | undefined,
  options: Options,
) {
  const response = await fetchResource(resourceUrl, forcedContentType, options)
  const dataUrl = makeDataUrl(
    getContentFromDataUrl(await response.asDataUrl()),
    response.contentType,
  )
  return {
    resourceUrl,
    dataUrl: `url(${dataUrl})`,
  }
}

function getContentFromDataUrl(dataURL: string) {
  return dataURL.split(/,/)[1]
}
