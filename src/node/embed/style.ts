import { getStyleProperties } from '@/node/utils'
import { Embedder } from '../embed/types'

export const embedStyles: Embedder<HTMLElement> = ({
  clonedNode,
  originalNode,
  options,
}) => {
  const styleProps = getStyleProperties(options)
  if (isChildOfSvg(clonedNode)) {
    return
  }

  // @ts-expect-error - TODO: bad min support
  const computedStyles = originalNode.computedStyleMap(clonedNode)
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

    let value = computedStyles.get(name)
    if (name === 'font-kerning') {
      value = 'normal'
    }

    if (name === 'd' && clonedNode.getAttribute('d')) {
      value = `path(${clonedNode.getAttribute('d')})`
    }

    nodeStyles.set(name, {
      value,
      priority: '',
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
