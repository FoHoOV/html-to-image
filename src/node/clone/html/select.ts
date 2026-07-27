import { Cloner } from './types'

export const cloneSelectElement: Cloner<HTMLSelectElement> = ({ node }) => {
  const cloned = node.cloneNode(false) as HTMLSelectElement
  const selectedOption = getActiveSelectOption(node)

  if (selectedOption) {
    selectedOption.setAttribute('selected', '')
  }

  return cloned
}

function getActiveSelectOption(node: HTMLSelectElement) {
  for (let i = 0; i < node.children.length; i++) {
    const option = node.children[i]
    if (option.getAttribute('value') === node.value) {
      return option
    }
  }
  return null
}
