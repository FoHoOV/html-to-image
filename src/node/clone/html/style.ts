import { getStyleProperties } from '@/node/style-props'
import { Embedder } from './types'

export const embedStyles: Embedder<HTMLElement> = ({ clonedNode, options }) => {
  const styleProps = getStyleProperties(options)
  if (isChildOfSvg(clonedNode)) {
    return
  }

  const computedStyles = window.getComputedStyle(clonedNode)
  const isParentGridOrFlex =
    clonedNode.parentElement &&
    isFlexOrGridDisplay(
      window.getComputedStyle(clonedNode.parentElement).display,
    )

  const nodeStyles = new Map<string, { value: string; priority: string }>()

  styleProps.forEach((name) => {
    if (SKIPPED_STYLE_PROPS.has(name)) {
      return
    }

    if ((name === 'width' || name === 'inline-size') && isParentGridOrFlex) {
      return
    }

    let value = computedStyles.getPropertyValue(name)
    if (name === 'font-kerning') {
      value = 'normal'
    }

    if (name === 'd' && clonedNode.getAttribute('d')) {
      value = `path(${clonedNode.getAttribute('d')})`
    }

    nodeStyles.set(name, {
      value,
      priority: computedStyles.getPropertyPriority(name),
    })
  })

  nodeStyles.forEach(({ value, priority }, key) => {
    clonedNode.style.setProperty(key, value, priority)
  })
}

const SKIPPED_STYLE_PROPS = new Set([
  '-webkit-text-fill-color',
  '-webkit-text-stroke',
  '-webkit-text-stroke-color',
  '-webkit-text-stroke-width',
])

function isChildOfSvg(node: Element) {
  const closestSvg = node.closest('svg')

  return closestSvg != null && closestSvg !== node
}

function isFlexOrGridDisplay(display: string) {
  return display.includes('flex') || display.includes('grid')
}
