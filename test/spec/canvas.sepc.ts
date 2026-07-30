import { test } from '../fixtures'

describe('work with canvas element', () => {
  test.skip('should render canvas element', async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      'canvas/node.html',
      'canvas/style.css',
      'canvas/image',
    )
    const canvas = node.querySelector('#content') as HTMLCanvasElement
    const context = canvas.getContext('2d')!

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#000000'
    context.font = '40px serif'
    context.fillText('AB2哈', 40, 40)

    await renderAndCheck(node)
  })
})
