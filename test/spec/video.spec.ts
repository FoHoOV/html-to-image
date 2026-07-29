import './setup'
import { bootstrap, renderAndCheck, delay } from './helper'
import { cloneNodeTree } from '../../src/node'

describe('work with video element', () => {
  it('should render video element', (done) => {
    bootstrap('video/node.html', 'video/style.css', 'video/image')
      .then(delay(1000))
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render video element with poster', (done) => {
    bootstrap('video/poster.html', 'video/style.css', 'video/image-poster')
      .then(delay(1000))
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should copy computed video styles to the replacement image', async () => {
    const root = await bootstrap('video/poster.html', 'video/style.css')
    const video = root.querySelector('video')!
    video.style.objectFit = 'cover'
    video.style.objectPosition = '25% 75%'
    const originalNodeStyles = window.getComputedStyle(video)

    const image = await cloneNodeTree(video, {})
    const clonedNodeStyles = window.getComputedStyle(image)
    root.appendChild(image)
    expect(image).toEqual(jasmine.any(HTMLImageElement))
    expect(clonedNodeStyles.width).toBe(originalNodeStyles.width)
    expect(clonedNodeStyles.height).toBe(originalNodeStyles.height)
    expect(clonedNodeStyles.objectFit).toBe(originalNodeStyles.objectFit)
    expect(clonedNodeStyles.objectPosition).toBe(
      originalNodeStyles.objectPosition,
    )
    image.remove()
  })
})
