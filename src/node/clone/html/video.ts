import { createImage } from '@/node/image'
import { getMimeType, imageToDataUrl } from '@/utils'
import { Cloner } from './types'

export const cloneVideoElement: Cloner<HTMLVideoElement> = async ({
  node,
  options,
}) => {
  if (node.currentSrc) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width = node.clientWidth
    canvas.height = node.clientHeight
    context?.drawImage(node, 0, 0, canvas.width, canvas.height)

    return createVideoImage(canvas.toDataURL())
  }

  const poster = node.poster
  const dataURL = await imageToDataUrl(poster, getMimeType(poster), options)
  return createVideoImage(dataURL)
}

async function createVideoImage(dataURL: string) {
  const image = await createImage(dataURL)
  return image
}
