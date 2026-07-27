import { getStyleProperties } from '@/node/style-props'
import { Options } from '@/types'
import { uuid } from '@/utils'
import { Embedder } from './types'

export const embedPseudoElements: Embedder<Element> = ({
  originalNode,
  clonedNode,
  options,
}) => {
  ;[':before', ':after'].forEach((target) => {
    const style = window.getComputedStyle(originalNode, target)
    const content = style.getPropertyValue('content')
    if (content === '' || content === 'none') {
      return
    }

    const className = uuid()
    try {
      clonedNode.classList.add(className)
    } catch {
      return
    }

    const styleElement = document.createElement('style')
    styleElement.appendChild(
      getPseudoElementStyle(className, target, style, options),
    )
    clonedNode.appendChild(styleElement)
  })
}

function formatCSSText(style: CSSStyleDeclaration) {
  const content = style.getPropertyValue('content')
  return `${style.cssText} content: '${content.replace(/'|"/g, '')}';`
}

function formatCSSProperties(style: CSSStyleDeclaration, options: Options) {
  return getStyleProperties(options)
    .map((name) => {
      const value = style.getPropertyValue(name)
      const priority = style.getPropertyPriority(name)

      return `${name}: ${value}${priority ? ' !important' : ''};`
    })
    .join(' ')
}

function getPseudoElementStyle(
  className: string,
  target: string,
  style: CSSStyleDeclaration,
  options: Options,
): Text {
  const selector = `.${className}:${target}`
  const cssText = style.cssText
    ? formatCSSText(style)
    : formatCSSProperties(style, options)

  return document.createTextNode(`${selector}{${cssText}}`)
}
