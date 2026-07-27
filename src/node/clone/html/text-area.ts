import { Cloner } from './types'

export const cloneTextAreaElement: Cloner<HTMLTextAreaElement> = ({ node }) => {
  const cloned = node.cloneNode(false) as HTMLTextAreaElement
  cloned.innerText = node.value
  return cloned
}
