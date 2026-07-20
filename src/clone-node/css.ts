import type { ClonableElement } from './types'
import type { Options } from '../types'
import { getStyleProperties } from '../util'

export function cloneCSSText<T extends ClonableElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  preserveReplacementStyle: boolean,
) {
  const targetStyle = clonedNode.style
  if (!targetStyle) {
    return
  }

  const sourceStyle = window.getComputedStyle(nativeNode)
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText
    targetStyle.transformOrigin = sourceStyle.transformOrigin
    return
  }

  if (preserveReplacementStyle && nativeNode.tagName !== clonedNode.tagName) {
    getStyleProperties(options).forEach((name) => {
      targetStyle.setProperty(
        name,
        sourceStyle.getPropertyValue(name),
        sourceStyle.getPropertyPriority(name),
      )
    })
  }
}
