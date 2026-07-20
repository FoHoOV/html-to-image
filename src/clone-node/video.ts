import type { Options } from '../types'
import { imageToDataUrl } from '../dataurl'
import { getMimeType } from '../mimes'
import { createImage } from '../util'

export async function cloneVideoElement(
  video: HTMLVideoElement,
  options: Options,
) {
  if (video.currentSrc) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width = video.clientWidth
    canvas.height = video.clientHeight
    context?.drawImage(video, 0, 0, canvas.width, canvas.height)

    return createImage(canvas.toDataURL())
  }

  const poster = video.poster
  const dataURL = await imageToDataUrl(poster, getMimeType(poster), options)
  return createImage(dataURL)
}
