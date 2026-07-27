import { Cloner } from './types'

export const cloneIFrameElement: Cloner<HTMLIFrameElement> = ({
  originalNode,
}) => {
  return originalNode.cloneNode(false)
}
