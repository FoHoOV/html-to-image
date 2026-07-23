import { isInstanceOfElement } from '../util'

export function cloneInputValue(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
) {
  if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
    clonedNode.textContent = nativeNode.value
  }

  if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
    clonedNode.setAttribute('value', nativeNode.value)
  }
}
