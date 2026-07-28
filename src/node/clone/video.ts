import { createImage } from '@/node/utils'
import { getMimeType, resourceToDataUrl } from '@/utils'
import { Cloner } from './types'

export const cloneVideoElement: Cloner<HTMLVideoElement> = async ({
  originalNode,
  options,
}) => {
  if (originalNode.currentSrc) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width = originalNode.clientWidth
    canvas.height = originalNode.clientHeight
    context?.drawImage(originalNode, 0, 0, canvas.width, canvas.height)

    return createVideoImage(canvas.toDataURL())
  }

  const poster = originalNode.poster
  const dataURL = await resourceToDataUrl(poster, getMimeType(poster), options)
  return createVideoImage(dataURL)
}

async function createVideoImage(dataURL: string) {
  const image = await createImage(dataURL)
  return image
}
