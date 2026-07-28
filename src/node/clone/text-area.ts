import { Cloner } from './types'

export const cloneTextAreaElement: Cloner<HTMLTextAreaElement> = ({
  originalNode,
}) => {
  const cloned = originalNode.cloneNode(false) as HTMLTextAreaElement
  cloned.innerText = originalNode.value
  return cloned
}
