import { Cloner } from './types'

export const cloneInputElement: Cloner<HTMLInputElement> = ({ node }) => {
  const cloned = node.cloneNode(false) as HTMLInputElement
  cloned.setAttribute('value', node.value)
  return cloned
}
