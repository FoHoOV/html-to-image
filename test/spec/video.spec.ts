import { cloneNodeTree } from '../../src/node'
import { createContext } from '../../src/context'
import { test } from '../fixtures'

describe('work with video element', () => {
  test('should render video element', async ({
    bootstrap,
    delay,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      'video/node.html',
      'video/style.css',
      'video/image',
    )
    await delay(1000)
    await renderAndCheck(node)
  })

  test('should render video element with poster', async ({
    bootstrap,
    delay,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      'video/poster.html',
      'video/style.css',
      'video/image-poster',
    )
    await delay(1000)
    await renderAndCheck(node)
  })

  test('should copy computed video styles to the replacement image', async ({
    bootstrap,
  }) => {
    const root = await bootstrap('video/poster.html', 'video/style.css')
    const video = root.querySelector('video')!
    video.style.objectFit = 'cover'
    video.style.objectPosition = '25% 75%'
    const originalNodeStyles = window.getComputedStyle(video)

    const image = await cloneNodeTree(video, createContext())
    const clonedNodeStyles = window.getComputedStyle(image)
    root.appendChild(image)

    expect(image).toEqual(expect.any(HTMLImageElement))
    expect(clonedNodeStyles.width).toBe(originalNodeStyles.width)
    expect(clonedNodeStyles.height).toBe(originalNodeStyles.height)
    expect(clonedNodeStyles.objectFit).toBe(originalNodeStyles.objectFit)
    expect(clonedNodeStyles.objectPosition).toBe(
      originalNodeStyles.objectPosition,
    )

    image.remove()
  })
})
