import { createImage } from '@/node/image'
import { Cloner } from './types'

export const cloneCanvasElement: Cloner<HTMLCanvasElement> = ({ node }) => {
  const dataURL = node.toDataURL()

  if (dataURL === 'data:,') {
    return node.cloneNode(false) as HTMLCanvasElement
  }

  return createImage(dataURL)
}
