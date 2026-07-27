import { Cloner } from './types'

export const cloneIFrameElement: Cloner<HTMLIFrameElement> = ({ node }) => {
  return node.cloneNode(false)
}
