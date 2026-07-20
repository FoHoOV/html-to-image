import type { Options } from '../types'
import { imageToDataUrl } from '../dataurl'
import { getMimeType } from '../mimes'
import { setStyleSource } from '../style'
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

    return createVideoImage(video, canvas.toDataURL())
  }

  const poster = video.poster
  const dataURL = await imageToDataUrl(poster, getMimeType(poster), options)
  return createVideoImage(video, dataURL)
}

async function createVideoImage(video: HTMLVideoElement, dataURL: string) {
  const image = await createImage(dataURL)
  setStyleSource(image, video)
  return image
}
