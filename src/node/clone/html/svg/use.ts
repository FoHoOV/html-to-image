import { getHref, normalizeHref, setHref, createOrGetSvgDefs } from './utils'
import { Cloner } from '../types'
import { Options } from '@/types'
import { fetchResource } from '@/utils'
import { isInstanceOfElement } from '@/node/clone/traverse'

export const cloneUseElement: Cloner<SVGUseElement> = async ({
  originalNode,
  clonedParentNode,
  options,
}) => {
  const cloned = originalNode.cloneNode(false) as SVGUseElement
  if (!clonedParentNode || !isInstanceOfElement(clonedParentNode, Element)) {
    return cloned
  }

  const ownerSvg = clonedParentNode.closest('svg')
  if (!ownerSvg) {
    return cloned
  }

  const href = getHref(cloned)
  const parsed = href ? splitSvgHref(href) : null
  if (!href || !parsed?.id) {
    return cloned
  }

  if (!hasDefinition(ownerSvg, parsed.id)) {
    await embedDefinition(ownerSvg, href, options)
    setHref(cloned, `#${parsed.id}`)
  }

  setHref(cloned, `#${parsed.id}`)
  return cloned
}

function hasDefinition(ownerSvg: SVGSVGElement, id: string) {
  return ownerSvg.querySelector(`#${CSS.escape(id)}`) !== null
}

function splitSvgHref(href: string) {
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) {
    return null
  }

  return {
    url: href.slice(0, hashIndex),
    id: href.slice(hashIndex + 1),
  }
}

function collectDefinitionWithDependencies(
  definition: SVGElement,
  ownerDocument: Document,
) {
  const collectedIds = new Set<string>()
  const collectedDefinitions: SVGElement[] = []

  function collect(element: SVGElement) {
    const id = element.getAttribute('id')
    if (id && collectedIds.has(id)) {
      return
    }

    if (id) {
      collectedIds.add(id)
      collectedDefinitions.push(element)
    }

    getReferencedIds(element).forEach((referencedId) => {
      const referencedElement = ownerDocument.getElementById(referencedId)
      if (
        referencedElement &&
        isInstanceOfElement(referencedElement, SVGElement)
      ) {
        collect(referencedElement)
      }
    })
  }

  collect(definition)
  return collectedDefinitions
}

async function fetchSvgDefinitions(href: string, options: Options) {
  const parsed = splitSvgHref(href)
  if (!parsed?.id) {
    return []
  }

  const ownerDocument = parsed.url
    ? await fetchExternalSvgDocument(parsed.url, options)
    : document
  if (!ownerDocument) {
    return []
  }

  const definition = ownerDocument.getElementById(parsed.id)
  if (!definition || !isInstanceOfElement(definition, SVGElement)) {
    return []
  }

  return collectDefinitionWithDependencies(definition, ownerDocument)
}

async function fetchExternalSvgDocument(url: string, options: Options) {
  try {
    const response = await fetchResource(url, undefined, options)
    const document = new DOMParser().parseFromString(
      response.asString(),
      'image/svg+xml',
    )

    if (document.querySelector('parsererror')) {
      console.warn(`Failed to parse external SVG: ${url}`)
      return null
    }

    return document
  } catch (error) {
    console.warn(`Failed to inline external SVG: ${url}`, error)
    return null
  }
}

function getReferencedIds(element: Element) {
  const ids = new Set<string>()

  Array.from(element.attributes).forEach((attribute) => {
    const matches = attribute.value.matchAll(
      /url\(\s*["']?#([^)"'\s]+)["']?\s*\)/g,
    )
    Array.from(matches).forEach((match) => {
      if (match[1]) {
        ids.add(match[1])
      }
    })
  })

  const href = getHref(element)
  if (href?.startsWith('#')) {
    ids.add(href.slice(1))
  }
  return ids
}

async function embedDefinition(
  ownerSvg: SVGSVGElement,
  href: string,
  options: Options,
) {
  const definitions = await fetchSvgDefinitions(href, options)
  const svgDefElement = createOrGetSvgDefs(ownerSvg)
  definitions.forEach((definition) => {
    const id = definition.getAttribute('id')
    if (!id) {
      return
    }

    const clonedDefinition = definition.cloneNode(true) as SVGElement
    normalizeHref(clonedDefinition)
    if (!hasDefinition(ownerSvg, id)) {
      svgDefElement.appendChild(definition)
    }
  })
}
